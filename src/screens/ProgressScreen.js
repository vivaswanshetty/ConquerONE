import React, { useState, useCallback, useRef, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, StatusBar, Dimensions, Animated, KeyboardAvoidingView, Platform,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
import Svg, { Polyline, Circle, Path, Defs, LinearGradient as SvgGradient, Stop, Line, G } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import {
    getBodyStats, saveBodyStat, getPRRecords, getWorkoutHistory,
    getStreak, getLatestUserBodyweight, getDailyReadiness,
    getActiveProgram, getProgramVersions, saveActiveProgram, resetToDefaultProgram,
    createDefaultProgramVersion
} from "../utils/storage";
import { getSettings, displayWeight } from "../utils/settings";
import {
    getWeeklyTrainingSummary,
    getWeeklyMuscleVolume,
    getExerciseProgressionData,
    getAllCategorizedPRs,
    calculateEstimated1RM,
    getProgressInsights,
    getRolling7DayAverageBodyweight,
    getBodyMeasurementDeltas,
    getTrainingLoadTrend,
    getDeloadRecommendation,
    getPreIndexedExerciseSessions,
    getExerciseStallStatus,
    getAthleteProgressionProfile,
    getProgramPerformanceSummary,
    getWeeklyTrainingDistribution,
    getAthleteLongTermProfile,
    getProposedDeloadPlan,
    getExercisePerformanceTrajectory,
    getExercisePerformanceVelocity,
    getExerciseMilestoneForecast,
    getExercisePlateauRisk,
    getMuscleGroupResponseMatrix,
    getBodyweightPerformanceCorrelation,
    getAthletePredictiveSummary,
} from "../utils/analytics";
import { getAllPlanExercises, getExerciseLoadCategory, getExerciseMuscleGroup } from "../data/workoutData";
import ProgramStatusCard from "../components/ProgramStatusCard";
import ProgramVersionBadge from "../components/ProgramVersionBadge";
import DeloadProposalModal from "../components/DeloadProposalModal";
import PerformanceTrajectoryCard from "../components/PerformanceTrajectoryCard";
import MilestoneForecastCard from "../components/MilestoneForecastCard";
import PlateauRiskCard from "../components/PlateauRiskCard";
import MuscleResponseMatrix from "../components/MuscleResponseMatrix";

const { width } = Dimensions.get("window");
const CARD_W = width - 40;
const CHART_W = CARD_W - 32;
const CHART_H = 130;

function formatSecsToHM(seconds) {
    if (!seconds || seconds <= 0) return "0m";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
        return `${hrs}h ${remMins}m`;
    }
    return `${mins}m`;
}

/* ── Mini Body Stats Line Chart ───────────────────────────────── */
function MiniChart({ data, color = COLORS.accent, label }) {
    if (!data || data.length < 2) {
        return (
            <View style={mc.empty}>
                <Ionicons name="bar-chart-outline" size={20} color="rgba(255,255,255,0.1)" style={{ marginBottom: 12 }} />
                <Text style={mc.emptyText}>Track workouts to generate analytics</Text>
            </View>
        );
    }
    const values = data.map(d => d.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;

    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * CHART_W,
        y: CHART_H - ((d.value - minVal) / range) * (CHART_H * 0.7) - 10,
        ...d,
    }));

    const polyPoints = pts.map(p => `${p.x},${p.y}`).join(" ");
    const areaPath =
        `M${pts[0].x},${CHART_H} ` +
        pts.map(p => `L${p.x},${p.y}`).join(" ") +
        ` L${pts[pts.length - 1].x},${CHART_H} Z`;

    const trend = values[values.length - 1] - values[0];

    return (
        <View style={mc.wrap}>
            <View style={mc.header}>
                <View style={mc.labelBox}>
                    <View style={[mc.indicator, { backgroundColor: color }]} />
                    <Text style={mc.label}>{label?.toUpperCase()}</Text>
                </View>
                <View style={[mc.trendBadge, { backgroundColor: "rgba(255,255,255,0.03)" }]}>
                    <Text style={[mc.trendText, { color: trend >= 0 ? "#A0A0A0" : COLORS.accent }]}>
                        {trend >= 0 ? "+" : ""}{trend.toFixed(1)}
                    </Text>
                </View>
            </View>
            <Svg width={CHART_W} height={CHART_H}>
                <Defs>
                    <SvgGradient id={`grad_${label}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.2" />
                        <Stop offset="1" stopColor={color} stopOpacity="0.0" />
                    </SvgGradient>
                </Defs>
                <Path d={areaPath} fill={`url(#grad_${label})`} />
                <Polyline
                    points={polyPoints}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {pts.map((p, i) => (
                    <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4.5 : 3} fill={color} />
                ))}
            </Svg>
        </View>
    );
}

/* ── Exercise Progression SVG Curve ──────────────────────────── */
function ProgressionCurveChart({ data, weightUnit = "kg" }) {
    if (!data || data.length === 0) {
        return (
            <View style={pc.empty}>
                <Ionicons name="trending-up-outline" size={24} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
                <Text style={pc.emptyText}>No session data recorded for this exercise yet.</Text>
                <Text style={pc.emptySub}>Complete workout sessions to track strength curves.</Text>
            </View>
        );
    }

    if (data.length === 1) {
        const d = data[0];
        return (
            <View style={pc.singleSessionBox}>
                <View style={pc.singleSessionHeader}>
                    <Text style={pc.singleSessionDate}>{d.date}</Text>
                    <View style={pc.singleSessionBadge}>
                        <Text style={pc.singleSessionBadgeText}>1 SESSION LOGGED</Text>
                    </View>
                </View>
                <Text style={pc.singleSessionVal}>
                    {d.value} <Text style={pc.singleSessionUnit}>{d.metricLabel}</Text>
                </Text>
                <Text style={pc.singleSessionSub}>
                    {d.weight > 0 ? `${d.weight} ${weightUnit} × ${d.reps} reps` : `${d.reps} reps`} · {d.setsCount} sets completed
                </Text>
            </View>
        );
    }

    const values = data.map(d => d.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;

    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * CHART_W,
        y: CHART_H - ((d.value - minVal) / range) * (CHART_H * 0.65) - 16,
        ...d,
    }));

    const polyPoints = pts.map(p => `${p.x},${p.y}`).join(" ");
    const areaPath =
        `M${pts[0].x},${CHART_H} ` +
        pts.map(p => `L${p.x},${p.y}`).join(" ") +
        ` L${pts[pts.length - 1].x},${CHART_H} Z`;

    const firstVal = values[0];
    const lastVal = values[values.length - 1];
    const diff = lastVal - firstVal;

    return (
        <View style={pc.wrap}>
            <View style={pc.summaryRow}>
                <View>
                    <Text style={pc.latestLabel}>CURRENT PEAK</Text>
                    <Text style={pc.latestVal}>
                        {lastVal} <Text style={pc.latestUnit}>{data[data.length - 1].metricLabel}</Text>
                    </Text>
                </View>
                <View style={[pc.deltaBadge, { backgroundColor: diff >= 0 ? "rgba(0, 200, 83, 0.12)" : "rgba(227, 30, 36, 0.12)" }]}>
                    <Ionicons name={diff >= 0 ? "arrow-up" : "arrow-down"} size={12} color={diff >= 0 ? "#00C853" : COLORS.primary} />
                    <Text style={[pc.deltaText, { color: diff >= 0 ? "#00C853" : COLORS.primary }]}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)} {data[data.length - 1].metricLabel}
                    </Text>
                </View>
            </View>

            <Svg width={CHART_W} height={CHART_H}>
                <Defs>
                    <SvgGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.25" />
                        <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0.0" />
                    </SvgGradient>
                </Defs>
                <Path d={areaPath} fill="url(#progGrad)" />
                <Polyline
                    points={polyPoints}
                    fill="none"
                    stroke={COLORS.primary}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {pts.map((p, i) => (
                    <G key={i}>
                        <Circle
                            cx={p.x}
                            cy={p.y}
                            r={i === pts.length - 1 ? 5 : 3.5}
                            fill={i === pts.length - 1 ? "#FFF" : COLORS.primary}
                            stroke={COLORS.primary}
                            strokeWidth={1.5}
                        />
                    </G>
                ))}
            </Svg>

            <View style={pc.dateAxis}>
                <Text style={pc.dateAxisText}>{data[0].date}</Text>
                <Text style={pc.dateAxisText}>{data[data.length - 1].date}</Text>
            </View>
        </View>
    );
}

/* ── Input Row ─────────────────────────────────────────────────── */
function StatInput({ label, unit, value, onChangeText }) {
    return (
        <View style={si.row}>
            <Text style={si.label}>{label}</Text>
            <View style={si.inputWrap}>
                <TextInput
                    style={si.input}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={COLORS.textMuted}
                    returnKeyType="done"
                />
                <Text style={si.unit}>{unit}</Text>
            </View>
        </View>
    );
}

/* ── Categorized PR Row Component ─────────────────────────────── */
function CategorizedPRCard({ record, weightUnit = "kg" }) {
    const { exerciseName, muscleGroup, category, weightKg, addedWeightKg, reps, durationSec, totalSystemLoadKg, effectiveLoadKg, bodyweightKg, date } = record;
    const dateStr = date ? new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "RECORDED";

    let primaryText = "";
    let subText = "";

    if (category === "timed") {
        primaryText = `${durationSec || reps || 0} SECONDS`;
        subText = "Isometric Hold Duration";
    } else if (category === "bodyweight") {
        primaryText = `${reps} REPS (BODYWEIGHT)`;
        subText = typeof bodyweightKg === "number" ? `Bodyweight: ${bodyweightKg} kg` : "Bodyweight Set";
    } else if (category === "weighted_bodyweight") {
        primaryText = `+${displayWeight(addedWeightKg || weightKg, weightUnit)} × ${reps} REPS`;
        subText = typeof totalSystemLoadKg === "number"
            ? `Total System Load: ${totalSystemLoadKg} kg`
            : "Added Load over Bodyweight";
    } else if (category === "assisted_bodyweight") {
        primaryText = `-${displayWeight(weightKg, weightUnit)} × ${reps} REPS`;
        subText = typeof effectiveLoadKg === "number"
            ? `Effective Load: ${effectiveLoadKg} kg`
            : "Assisted Load";
    } else if (category === "machine") {
        primaryText = `${displayWeight(weightKg, weightUnit)} × ${reps} REPS`;
        subText = "Machine Stack Resistance";
    } else {
        primaryText = `${displayWeight(weightKg, weightUnit)} × ${reps} REPS`;
        const e1rm = calculateEstimated1RM(weightKg, reps, "free_weight");
        subText = e1rm !== null ? `Estimated 1RM: ${displayWeight(e1rm, weightUnit)}` : "Free-Weight Load";
    }

    const catBadgeColor =
        category === "bodyweight" ? "#007AFF" :
        category === "weighted_bodyweight" ? "#5856D6" :
        category === "machine" ? "#FF9500" :
        category === "timed" ? "#34C759" : COLORS.primary;

    return (
        <View style={prc.card}>
            <View style={prc.header}>
                <View style={prc.left}>
                    <Text style={prc.name} numberOfLines={1}>{exerciseName}</Text>
                    <View style={prc.tagsRow}>
                        <View style={[prc.catBadge, { backgroundColor: `${catBadgeColor}20` }]}>
                            <Text style={[prc.catBadgeText, { color: catBadgeColor }]}>
                                {category === "weighted_bodyweight" ? "WEIGHTED BW" : category.toUpperCase().replace("_", " ")}
                            </Text>
                        </View>
                        <Text style={prc.muscleTag}>{muscleGroup}</Text>
                    </View>
                </View>
                <View style={prc.right}>
                    <Text style={prc.primaryVal}>{primaryText}</Text>
                    <Text style={prc.subVal}>{subText}</Text>
                    <Text style={prc.dateText}>{dateStr}</Text>
                </View>
            </View>
        </View>
    );
}

/* ── TABS ─────────────────────────────────────────────────────── */
const TABS = ["Performance", "Predictive Intel", "Body Stats"];
const STAT_FIELDS = [
    { key: "weightKg", label: "Body Weight", unit: "kg", color: COLORS.accent },
    { key: "chest", label: "Chest", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "shoulders", label: "Shoulders", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "waist", label: "Waist", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "hips", label: "Hips", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "arms", label: "Upper Arm", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "forearms", label: "Forearm", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "thighs", label: "Thigh", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "calves", label: "Calf", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
];

const PR_CATEGORIES = [
    { id: "all", label: "ALL" },
    { id: "free_weight", label: "FREE WEIGHT" },
    { id: "machine", label: "MACHINE" },
    { id: "weighted_bodyweight", label: "WEIGHTED BW" },
    { id: "bodyweight", label: "BODYWEIGHT" },
    { id: "timed", label: "TIMED" },
];

/* ── MAIN COMPONENT ────────────────────────────────────────────── */
export default function ProgressScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
    const [tab, setTab] = useState(0); // Default to Performance tab
    const [weekOffset, setWeekOffset] = useState(0); // 0 = This Week, 1 = Last Week
    const [selectedExercise, setSelectedExercise] = useState("Barbell Bench Press");
    const [prFilter, setPRFilter] = useState("all");

    const [bodyStats, setBodyStats] = useState([]);
    const [prRecords, setPRRecords] = useState({});
    const [history, setHistory] = useState([]);
    const [streak, setStreak] = useState(0);
    const [userBodyweight, setUserBodyweight] = useState(null);
    const [readinessHistory, setReadinessHistory] = useState([]);
    const [settings, setSettings] = useState({ weightUnit: "kg" });

    // ── Phase 4 Adaptive System State ──
    const [activeProgram, setActiveProgram] = useState(createDefaultProgramVersion);
    const [programVersions, setProgramVersions] = useState(() => [createDefaultProgramVersion()]);
    const [deloadProposalModalVisible, setDeloadProposalModalVisible] = useState(false);
    const [proposedDeloadPlan, setProposedDeloadPlan] = useState(null);

    const [form, setForm] = useState({
        weightKg: "",
        chest: "",
        shoulders: "",
        waist: "",
        hips: "",
        arms: "",
        forearms: "",
        thighs: "",
        calves: "",
    });
    const [saving, setSaving] = useState(false);
    const flashAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        const [stats, prs, hist, strk, bw, s, readHist, prog, vers] = await Promise.all([
            getBodyStats(),
            getPRRecords(),
            getWorkoutHistory(),
            getStreak(),
            getLatestUserBodyweight(),
            getSettings(),
            getDailyReadiness(60),
            getActiveProgram(),
            getProgramVersions(),
        ]);
        setBodyStats(Array.isArray(stats) ? stats : []);
        setPRRecords(prs && typeof prs === "object" ? prs : {});
        setHistory(Array.isArray(hist) ? hist : []);
        setStreak(strk || 0);
        setUserBodyweight(bw);
        setSettings(s || { weightUnit: "kg" });
        setReadinessHistory(Array.isArray(readHist) ? readHist : []);
        setActiveProgram(prog || createDefaultProgramVersion());
        setProgramVersions(Array.isArray(vers) && vers.length > 0 ? vers : [createDefaultProgramVersion()]);

        if (stats && stats.length > 0) {
            const latest = stats[0];
            setForm({
                weightKg: latest.weightKg != null ? String(latest.weightKg) : "",
                chest: latest.chest != null ? String(latest.chest) : "",
                shoulders: latest.shoulders != null ? String(latest.shoulders) : "",
                waist: latest.waist != null ? String(latest.waist) : "",
                hips: latest.hips != null ? String(latest.hips) : "",
                arms: latest.arms != null ? String(latest.arms) : "",
                forearms: latest.forearms != null ? String(latest.forearms) : "",
                thighs: latest.thighs != null ? String(latest.thighs) : "",
                calves: latest.calves != null ? String(latest.calves) : "",
            });
        }
    };

    const handleSaveStats = async () => {
        const parsed = {};
        let hasAny = false;
        Object.entries(form).forEach(([k, v]) => {
            const num = parseFloat(v);
            if (!isNaN(num)) {
                parsed[k] = num;
                hasAny = true;
            }
        });
        if (!hasAny) {
            showDialog("Input Required", "Please enter at least one metric to save.");
            return;
        }
        setSaving(true);
        await saveBodyStat(parsed);
        setSaving(false);
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
        load();
    };

    // Analytics Calculations (Pure functions)
    const indexedSessions = useMemo(() => {
        return getPreIndexedExerciseSessions(history, userBodyweight);
    }, [history, userBodyweight]);

    const trainingLoad = useMemo(() => {
        return getTrainingLoadTrend(history, userBodyweight);
    }, [history, userBodyweight]);

    const deloadRecommendation = useMemo(() => {
        return getDeloadRecommendation(history, readinessHistory, userBodyweight);
    }, [history, readinessHistory, userBodyweight]);

    const programPerformanceSummary = useMemo(() => {
        return getProgramPerformanceSummary(activeProgram, history);
    }, [activeProgram, history]);

    const weeklyDistribution = useMemo(() => {
        return getWeeklyTrainingDistribution(activeProgram, history);
    }, [activeProgram, history]);

    const longTermProfile = useMemo(() => {
        return getAthleteLongTermProfile(activeProgram, history, bodyStats, readinessHistory, prRecords, userBodyweight);
    }, [activeProgram, history, bodyStats, readinessHistory, prRecords, userBodyweight]);

    const handleAcceptDeload = async (plan) => {
        setDeloadProposalModalVisible(false);
        const updated = await saveActiveProgram(plan, "Activated 7-day structured deload protocol");
        setActiveProgram(updated);
        const vers = await getProgramVersions();
        setProgramVersions(vers);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleResetProgram = async () => {
        const res = await resetToDefaultProgram();
        setActiveProgram(res);
        const vers = await getProgramVersions();
        setProgramVersions(vers);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Medium);
    };

    const stallRegistry = useMemo(() => {
        const planExercises = getAllPlanExercises();
        const stalled = [];
        planExercises.forEach((exName) => {
            const stall = getExerciseStallStatus(exName, history, userBodyweight, indexedSessions);
            if (stall.status === "STALLING") {
                stalled.push({
                    name: exName,
                    ...stall,
                });
            }
        });
        return stalled;
    }, [history, userBodyweight, indexedSessions]);

    const athleteProfile = useMemo(() => {
        return getAthleteProgressionProfile(history, prRecords, userBodyweight);
    }, [history, prRecords, userBodyweight]);

    const weeklySummary = useMemo(() => {
        return getWeeklyTrainingSummary(history, streak, weekOffset, userBodyweight);
    }, [history, streak, weekOffset, userBodyweight]);

    const weeklyMuscleVolumes = useMemo(() => {
        return getWeeklyMuscleVolume(history, weekOffset, userBodyweight);
    }, [history, weekOffset, userBodyweight]);

    const allExercisesList = useMemo(() => {
        const planExercises = getAllPlanExercises();
        const historyExercises = [];
        history.forEach(w => {
            (w.exercises || []).forEach(e => {
                if (e?.name && !historyExercises.includes(e.name)) {
                    historyExercises.push(e.name);
                }
            });
        });
        const combined = Array.from(new Set([...planExercises, ...historyExercises]));
        return combined;
    }, [history]);

    const progressionData = useMemo(() => {
        return getExerciseProgressionData(selectedExercise, history, userBodyweight);
    }, [selectedExercise, history, userBodyweight]);

    const categorizedPRs = useMemo(() => {
        const reg = getAllCategorizedPRs(history, prRecords, userBodyweight);
        const allList = [];
        Object.entries(reg).forEach(([cat, list]) => {
            list.forEach(item => {
                allList.push({ ...item, category: cat });
            });
        });
        if (prFilter === "all") return allList;
        return allList.filter(item => item.category === prFilter);
    }, [history, prRecords, userBodyweight, prFilter]);

    const progressInsights = useMemo(() => {
        return getProgressInsights(history, bodyStats, prRecords, userBodyweight);
    }, [history, bodyStats, prRecords, userBodyweight]);

    const rollingBW = useMemo(() => {
        return getRolling7DayAverageBodyweight(bodyStats);
    }, [bodyStats]);

    const physiqueDeltas = useMemo(() => {
        return getBodyMeasurementDeltas(bodyStats);
    }, [bodyStats]);

    const predictiveSummary = useMemo(() => {
        return getAthletePredictiveSummary(activeProgram, history, bodyStats, readinessHistory, prRecords, userBodyweight);
    }, [activeProgram, history, bodyStats, readinessHistory, prRecords, userBodyweight]);

    const selectedTrajectory = useMemo(() => {
        return getExercisePerformanceTrajectory(selectedExercise, history, userBodyweight);
    }, [selectedExercise, history, userBodyweight]);

    const chartData = (key) =>
        [...bodyStats]
            .reverse()
            .filter(s => s[key] != null)
            .map(s => ({ date: s.date, value: s[key] }));

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>ANALYTICS & PROGRESS</Text>
                    {tab === 2 ? (
                        <Animated.View style={[styles.savedBadge, { opacity: flashAnim }]}>
                            <Text style={styles.savedText}>SAVED</Text>
                        </Animated.View>
                    ) : (
                        <View style={{ width: 36 }} />
                    )}
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    {TABS.map((t, i) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.tab, tab === i && styles.tabActive]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setTab(i);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>
                                {t.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {tab === 0 ? (
                    /* ══════════════════════════════════════════════════════════ */
                    /* PERFORMANCE HUB TAB                                       */
                    /* ══════════════════════════════════════════════════════════ */
                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={styles.scrollContent}>
                        {/* ── 0. Active Adaptive Program & Versions ── */}
                        {activeProgram && programPerformanceSummary && (
                            <View style={{ marginTop: 14, marginBottom: 8 }}>
                                <ProgramStatusCard
                                    summary={programPerformanceSummary}
                                    activeProgram={activeProgram}
                                />
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 10, paddingHorizontal: 16 }}>
                                    <ProgramVersionBadge
                                        activeProgram={activeProgram}
                                        versions={programVersions}
                                    />
                                    <TouchableOpacity
                                        onPress={handleResetProgram}
                                        style={styles.resetProgramBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="refresh-outline" size={11} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                                        <Text style={styles.resetProgramBtnText}>
                                            RESET ROUTINE
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ── Dynamic Weekly Training Distribution ── */}
                        {weeklyDistribution && (
                            <View style={{ marginBottom: 16 }}>
                                <View style={[styles.sectionHeaderRow, { marginTop: 8 }]}>
                                    <View style={styles.sectionTitleGroup}>
                                        <Ionicons name="pie-chart-outline" size={15} color={COLORS.primary} />
                                        <Text style={styles.sectionLabel}>WEEKLY TRAINING DISTRIBUTION</Text>
                                    </View>
                                    <View style={[styles.statusBadgeSmall, { backgroundColor: weeklyDistribution.isBalanced ? "rgba(48, 209, 88, 0.12)" : "rgba(255, 159, 10, 0.12)", borderColor: weeklyDistribution.isBalanced ? "rgba(48, 209, 88, 0.3)" : "rgba(255, 159, 10, 0.3)" }]}>
                                        <Text style={[styles.statusBadgeSmallText, { color: weeklyDistribution.isBalanced ? "#30D158" : "#FF9F0A" }]}>
                                            {weeklyDistribution.isBalanced ? "SPLIT BALANCED" : "DISTRIBUTION DELTA"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.card}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.04)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                        pointerEvents="none"
                                    />
                                    <View style={styles.distGrid}>
                                        {(weeklyDistribution.muscleGroups || weeklyDistribution.distribution || []).map((mg) => {
                                            const muscleName = (mg.muscle || mg.muscleGroup || "").toUpperCase();
                                            const actual = mg.actualFreq ?? mg.actualFrequency ?? 0;
                                            const expected = mg.expectedFreq ?? mg.expectedFrequency ?? 0;
                                            const isMet = actual >= expected && expected > 0;
                                            const isUnstimulated = actual === 0 && expected > 0;
                                            const fillPct = Math.min(100, (actual / (expected || 1)) * 100);

                                            return (
                                                <View key={muscleName} style={styles.distCell}>
                                                    <Text style={styles.distMuscleText} numberOfLines={1}>{muscleName}</Text>
                                                    <View style={styles.distBarRow}>
                                                        <Text style={[styles.distFreqVal, { color: isMet ? "#30D158" : isUnstimulated ? "#FF453A" : "#FF9F0A" }]}>
                                                            {actual}
                                                        </Text>
                                                        <Text style={styles.distExpectedText}>/ {expected}x</Text>
                                                    </View>
                                                    <View style={styles.distMiniTrack}>
                                                        <View
                                                            style={[
                                                                styles.distMiniFill,
                                                                {
                                                                    width: `${fillPct}%`,
                                                                    backgroundColor: isMet ? "#30D158" : isUnstimulated ? "#FF453A" : "#FF9F0A"
                                                                }
                                                            ]}
                                                        />
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {(weeklyDistribution.consecutiveTrainingDays >= 5 || weeklyDistribution.maxConsecutiveTrainingDays >= 5) && (
                                        <View style={styles.consecutiveWarningBox}>
                                            <Ionicons name="warning-outline" size={13} color="#FF9F0A" style={{ marginRight: 6 }} />
                                            <Text style={styles.consecutiveWarningText}>
                                                {weeklyDistribution.consecutiveTrainingDays || weeklyDistribution.maxConsecutiveTrainingDays} consecutive training days detected. Ensure recovery protocols are observed.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* ── Multi-Dimensional Longitudinal Profile ── */}
                        {longTermProfile && (
                            <View style={{ marginBottom: 16 }}>
                                <View style={[styles.sectionHeaderRow, { marginTop: 8 }]}>
                                    <View style={styles.sectionTitleGroup}>
                                        <Ionicons name="finger-print-outline" size={15} color={COLORS.primary} />
                                        <Text style={styles.sectionLabel}>LONG-TERM ATHLETE PROFILE</Text>
                                    </View>
                                </View>

                                <View style={styles.card}>
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.04)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                        pointerEvents="none"
                                    />
                                    <View style={styles.loadGrid}>
                                        <View style={styles.loadGridCol}>
                                            <Text style={styles.loadGridVal}>{longTermProfile.volumeResponseTier || "OPTIMAL"}</Text>
                                            <Text style={styles.loadGridLabel}>VOLUME RESPONSE</Text>
                                            <Text style={styles.profileSubMini}>{longTermProfile.meanWeeklySets ?? 0} sets/wk</Text>
                                        </View>
                                        <View style={styles.summaryMetricDivider} />
                                        <View style={styles.loadGridCol}>
                                            <Text style={[styles.loadGridVal, { color: "#30D158" }]}>{longTermProfile.progressionRatePercent ?? 0}%</Text>
                                            <Text style={styles.loadGridLabel}>PROGRESSION RATE</Text>
                                            <Text style={styles.profileSubMini}>Across load types</Text>
                                        </View>
                                        <View style={styles.summaryMetricDivider} />
                                        <View style={styles.loadGridCol}>
                                            <Text style={styles.loadGridVal}>{longTermProfile.consistencyTier || "HIGH"}</Text>
                                            <Text style={styles.loadGridLabel}>CONSISTENCY</Text>
                                            <Text style={styles.profileSubMini}>{longTermProfile.meanWeeklyWorkouts ?? 0} workouts/wk</Text>
                                        </View>
                                    </View>

                                    <View style={styles.profileDivider} />

                                    {/* Load Type Rates */}
                                    <Text style={styles.profileSectionTitle}>PROGRESSION BY LOAD TAXONOMY</Text>
                                    <View style={styles.taxonomyRatesGrid}>
                                        {Object.entries(longTermProfile.loadTypeProgressionRates || {}).map(([type, stats]) => (
                                            <View key={type} style={styles.taxRateItem}>
                                                <Text style={styles.taxRateLabel}>{type.replace(/_/g, " ").toUpperCase()}</Text>
                                                <Text style={styles.taxRateVal}>
                                                    {stats.rate}% <Text style={{ fontSize: 9, color: COLORS.textMuted }}>({stats.count})</Text>
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* ── 1. Athlete Intelligence Insights ── */}
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>ATHLETE INTELLIGENCE</Text>
                            </View>
                        </View>

                        <View style={styles.insightsWrap}>
                            {progressInsights.map((ins) => {
                                const insColor =
                                    ins.type === "strength" ? "#00C853" :
                                    ins.type === "consistency" ? "#38BDF8" :
                                    ins.type === "bodyweight" ? "#FF9500" :
                                    ins.type === "volume" ? COLORS.primary : "#EDEAE3";
                                const insIcon =
                                    ins.type === "strength" ? "trending-up" :
                                    ins.type === "consistency" ? "calendar" :
                                    ins.type === "bodyweight" ? "body" :
                                    ins.type === "volume" ? "barbell" : "information-circle";

                                return (
                                    <View key={ins.id} style={styles.insightCard}>
                                        <LinearGradient
                                            colors={[`${insColor}15`, "transparent"]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0.8, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.insightHeaderRow}>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                                                <View style={[styles.insightIconBox, { backgroundColor: `${insColor}20` }]}>
                                                    <Ionicons name={insIcon} size={12} color={insColor} />
                                                </View>
                                                <Text style={styles.insightTitle}>{ins.title}</Text>
                                            </View>
                                            {ins.badge && (
                                                <View style={[styles.insightBadge, { borderColor: `${insColor}40`, backgroundColor: `${insColor}15` }]}>
                                                    <Text style={[styles.insightBadgeText, { color: insColor }]}>{ins.badge}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.insightMsg}>{ins.message}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* ── 2. Training Load & Stress Monitoring ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="pulse" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>TRAINING LOAD & STRESS MONITORING</Text>
                            </View>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: `${trainingLoad.trendColor}1A`, borderColor: `${trainingLoad.trendColor}40` }]}>
                                <Text style={[styles.statusBadgeSmallText, { color: trainingLoad.trendColor }]}>{trainingLoad.trendLabel.toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.04)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            <View style={styles.loadHeaderRow}>
                                <View>
                                    <Text style={styles.loadSubLabel}>ACUTE : CHRONIC WORKLOAD RATIO</Text>
                                    <Text style={styles.loadRatioValue}>
                                        {trainingLoad.workloadRatio.toFixed(2)}<Text style={styles.loadRatioUnit}>x</Text>
                                    </Text>
                                </View>
                                <View style={styles.loadTonnageBreakdown}>
                                    <Text style={styles.loadTonnageLabel}>7-DAY ACUTE LOAD</Text>
                                    <Text style={styles.loadTonnageVal}>
                                        {trainingLoad.currentWeekTonnageKg.toLocaleString()} <Text style={{ fontSize: 10.5, fontFamily: FAMILY.mono, color: COLORS.textMuted }}>kg tonnage</Text>
                                    </Text>
                                    <Text style={styles.loadBWCount}>+ {trainingLoad.currentWeekSets} completed sets</Text>
                                </View>
                            </View>

                            {/* Load Metrics 3-Col Grid */}
                            <View style={styles.loadGrid}>
                                <View style={styles.loadGridCol}>
                                    <Text style={styles.loadGridVal}>{trainingLoad.currentWeekTonnageKg > 0 ? `${trainingLoad.currentWeekTonnageKg.toLocaleString()} kg` : "—"}</Text>
                                    <Text style={styles.loadGridLabel}>CURRENT (7D)</Text>
                                </View>
                                <View style={styles.summaryMetricDivider} />
                                <View style={styles.loadGridCol}>
                                    <Text style={styles.loadGridVal}>{trainingLoad.chronicBaselineTonnageKg > 0 ? `${trainingLoad.chronicBaselineTonnageKg.toLocaleString()} kg` : "—"}</Text>
                                    <Text style={styles.loadGridLabel}>4-WK BASELINE</Text>
                                </View>
                                <View style={styles.summaryMetricDivider} />
                                <View style={styles.loadGridCol}>
                                    <Text style={[styles.loadGridVal, { color: trainingLoad.trendColor }]}>
                                        {trainingLoad.workloadRatio > 1 ? `+${Math.round((trainingLoad.workloadRatio - 1) * 100)}%` : trainingLoad.workloadRatio < 1 ? `-${Math.round((1 - trainingLoad.workloadRatio) * 100)}%` : "0%"}
                                    </Text>
                                    <Text style={styles.loadGridLabel}>STIMULUS DELTA</Text>
                                </View>
                            </View>

                            <Text style={styles.loadSummaryText}>{trainingLoad.summaryMessage}</Text>

                            {/* Deload / Fatigue Advisory Box (rendered when active deload is advised) */}
                            {deloadRecommendation.status !== "NORMAL" && (
                                <View style={[styles.deloadAlertBox, { borderColor: `${deloadRecommendation.color}40`, backgroundColor: `${deloadRecommendation.color}10`, marginTop: 10 }]}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                        <Ionicons name="alert-circle" size={14} color={deloadRecommendation.color} />
                                        <Text style={[styles.deloadAlertTitle, { color: deloadRecommendation.color }]}>
                                            {deloadRecommendation.label.toUpperCase()} ADVISORY
                                        </Text>
                                    </View>
                                    <Text style={styles.deloadAlertReason}>{deloadRecommendation.reason}</Text>
                                    {deloadRecommendation.observations.length > 0 && (
                                        <View style={{ marginTop: 6, gap: 2 }}>
                                            {deloadRecommendation.observations.map((obs, idx) => (
                                                <Text key={idx} style={styles.deloadObsBullet}>• {obs}</Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* ── 3. Plateau & Stall Registry ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="shield-checkmark" size={15} color={stallRegistry.length > 0 ? "#FF5E3A" : "#00C853"} />
                                <Text style={styles.sectionLabel}>PLATEAU & STALL REGISTRY</Text>
                            </View>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: stallRegistry.length > 0 ? "rgba(255, 94, 58, 0.15)" : "rgba(0, 200, 83, 0.15)", borderColor: stallRegistry.length > 0 ? "rgba(255, 94, 58, 0.4)" : "rgba(0, 200, 83, 0.4)" }]}>
                                <Text style={[styles.statusBadgeSmallText, { color: stallRegistry.length > 0 ? "#FF5E3A" : "#00C853" }]}>
                                    {stallRegistry.length > 0 ? `${stallRegistry.length} STALLED` : "ALL PROGRESSING"}
                                </Text>
                            </View>
                        </View>

                        {stallRegistry.length === 0 ? (
                            <View style={styles.card}>
                                <View style={styles.stallNominalRow}>
                                    <View style={styles.stallNominalIconBox}>
                                        <Ionicons name="shield-checkmark" size={20} color="#00C853" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stallNominalTitle}>ALL MOVEMENTS PROGRESSING NORMALLY</Text>
                                        <Text style={styles.stallNominalSub}>
                                            No 3-session plateaus detected. All tracked compound and accessory lifts are maintaining positive or stable performance.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={{ marginHorizontal: 16, gap: 10 }}>
                                {stallRegistry.map((item, idx) => (
                                    <View key={item.name || idx} style={styles.stallCard}>
                                        <View style={styles.stallCardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.stallCardExName}>{item.name.toUpperCase()}</Text>
                                                <Text style={styles.stallCardMeta}>
                                                    Stalled at {item.currentBestWeight} kg × {item.currentBestReps} reps
                                                </Text>
                                            </View>
                                            <View style={styles.stallBadge}>
                                                <Text style={styles.stallBadgeText}>3 CONSECUTIVE SESSIONS</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.stallCardDesc}>{item.description}</Text>
                                        <View style={styles.stallActionBox}>
                                            <Ionicons name="bulb-outline" size={13} color="#FF9500" />
                                            <Text style={styles.stallActionText}>
                                                Adjustment: Consider micro-loading (+1kg), changing rep targets, or a brief 10% volume deload.
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* ── 4. Athlete Macro Progression Profile ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="stats-chart" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>ATHLETE PROGRESSION PROFILE</Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.04)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            {athleteProfile.hasSufficientData ? (
                                <View>
                                    <Text style={styles.profileSectionTitle}>TOP PROGRESSING MOVEMENTS</Text>
                                    {athleteProfile.fastestProgressing.length > 0 ? (
                                        athleteProfile.fastestProgressing.map((p, idx) => (
                                            <View key={p.name || idx} style={[styles.progProfileRow, idx < athleteProfile.fastestProgressing.length - 1 && styles.progProfileBorder]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.progProfileExName} numberOfLines={1}>{p.name}</Text>
                                                    <Text style={styles.progProfileSub}>+{p.weightDelta} kg overall increase</Text>
                                                </View>
                                                <View style={styles.gainPill}>
                                                    <Text style={styles.gainPillText}>+{p.percentGain}%</Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.profileEmptySub}>Continue lifting to compute multi-session progression velocity.</Text>
                                    )}

                                    <View style={styles.profileDivider} />

                                    <Text style={styles.profileSectionTitle}>CONSISTENCY MATRIX</Text>
                                    <View style={styles.consistencyRow}>
                                        {athleteProfile.consistentWeekdays.length > 0 ? (
                                            athleteProfile.consistentWeekdays.map((d) => (
                                                <View key={d.day} style={styles.weekdayChip}>
                                                    <Text style={styles.weekdayName}>{d.day.slice(0, 3).toUpperCase()}</Text>
                                                    <Text style={styles.weekdayCount}>{d.count} session{d.count > 1 ? "s" : ""}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.profileEmptySub}>Log workouts across days of the week to reveal consistency trends.</Text>
                                        )}
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.profileEmptyWrap}>
                                    <Ionicons name="barbell-outline" size={22} color={COLORS.textMuted} style={{ marginBottom: 6 }} />
                                    <Text style={styles.profileEmptyTitle}>Building Longitudinal Profile</Text>
                                    <Text style={styles.profileEmptySub}>
                                        Complete 2 or more workouts to reveal macro progression velocity, fastest progressing lifts, and weekly training distribution.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── 5. Weekly Training Summary Card ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>WEEKLY TRAINING SUMMARY</Text>
                            </View>
                            <View style={styles.weekToggleContainer}>
                                <TouchableOpacity
                                    style={[styles.weekToggleBtn, weekOffset === 0 && styles.weekToggleBtnActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setWeekOffset(0);
                                    }}
                                >
                                    <Text style={[styles.weekToggleText, weekOffset === 0 && styles.weekToggleTextActive]}>This Week</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.weekToggleBtn, weekOffset === 1 && styles.weekToggleBtnActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setWeekOffset(1);
                                    }}
                                >
                                    <Text style={[styles.weekToggleText, weekOffset === 1 && styles.weekToggleTextActive]}>Last Week</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.04)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            {/* Card Top: Adherence */}
                            <View style={styles.summaryTopRow}>
                                <View>
                                    <Text style={styles.summaryDateRange}>
                                        {weeklySummary.weekStartDateStr} – {weeklySummary.weekEndDateStr}
                                    </Text>
                                    <Text style={styles.summaryHeadline}>
                                        {weeklySummary.completedWorkouts} of {weeklySummary.plannedWorkouts} Workouts Completed
                                    </Text>
                                </View>
                                <View style={[styles.adherenceBadge, { backgroundColor: weeklySummary.adherenceRate >= 80 ? "rgba(0, 200, 83, 0.15)" : "rgba(227, 30, 36, 0.15)" }]}>
                                    <Text style={[styles.adherenceText, { color: weeklySummary.adherenceRate >= 80 ? "#00C853" : COLORS.primary }]}>
                                        {weeklySummary.adherenceRate}% ADHERENCE
                                    </Text>
                                </View>
                            </View>

                            {/* Progress bar */}
                            <View style={styles.summaryProgressBar}>
                                <View style={[styles.summaryProgressFill, { width: `${weeklySummary.adherenceRate}%` }]} />
                            </View>

                            {/* Metrics Grid */}
                            <View style={styles.summaryMetricsGrid}>
                                <View style={styles.summaryMetricItem}>
                                    <Text style={styles.summaryMetricVal}>{weeklySummary.totalWorkingSets}</Text>
                                    <Text style={styles.summaryMetricLabel}>WORKING SETS</Text>
                                </View>
                                <View style={styles.summaryMetricDivider} />
                                <View style={styles.summaryMetricItem}>
                                    <Text style={styles.summaryMetricVal}>{weeklySummary.totalVolumeLoadKg.toLocaleString()}</Text>
                                    <Text style={styles.summaryMetricLabel}>VOLUME (KG)*</Text>
                                </View>
                                <View style={styles.summaryMetricDivider} />
                                <View style={styles.summaryMetricItem}>
                                    <Text style={styles.summaryMetricVal}>{formatSecsToHM(weeklySummary.totalDurationSec)}</Text>
                                    <Text style={styles.summaryMetricLabel}>ACTIVE DURATION</Text>
                                </View>
                            </View>
                            <Text style={styles.volumeDisclaimer}>*Volume tonnage applies strictly to Free-Weight & Machine movements.</Text>
                        </View>

                        {/* ── 3. Muscle Group Volume Breakdown (11 Muscle Groups) ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="barbell-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>WEEKLY MUSCLE GROUP VOLUME</Text>
                            </View>
                            <View style={styles.infoPill}>
                                <Text style={styles.infoPillText}>10–20 Sets Ref Range</Text>
                            </View>
                        </View>

                        <View style={[styles.card, { paddingVertical: 14 }]}>
                            <Text style={styles.hypertrophyNotice}>
                                Hypertrophy guidelines (10–20 working sets/week) serve as an informational reference range.
                            </Text>

                            {weeklyMuscleVolumes.map((item, idx) => {
                                const count = item.workingSets;
                                const maxRef = 20;
                                const pct = Math.min(100, Math.round((count / maxRef) * 100));
                                const inRange = count >= 10 && count <= 20;
                                const aboveRange = count > 20;

                                const barColor = inRange ? "#00C853" : aboveRange ? "#FF9500" : count > 0 ? COLORS.primary : COLORS.border;

                                return (
                                    <View key={item.muscleGroup} style={[styles.muscleVolRow, idx < weeklyMuscleVolumes.length - 1 && styles.muscleVolRowBorder]}>
                                        <View style={styles.muscleVolNameWrap}>
                                            <Text style={styles.muscleVolName}>{item.muscleGroup}</Text>
                                            <Text style={styles.muscleVolCount}>
                                                {count} <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>sets</Text>
                                            </Text>
                                        </View>
                                        <View style={styles.muscleVolTrack}>
                                            <View style={[styles.muscleVolFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                                            {/* Reference marker at 10 sets (50%) */}
                                            <View style={styles.muscleVolMarker} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* ── 4. Strength Progression Explorer ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="trending-up" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>STRENGTH PROGRESSION CURVE</Text>
                            </View>
                        </View>

                        {/* Exercise Picker Horizontal Scroll */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exercisePickerScroll}>
                            {allExercisesList.map((exName) => {
                                const isSelected = selectedExercise === exName;
                                return (
                                    <TouchableOpacity
                                        key={exName}
                                        style={[styles.exPickerPill, isSelected && styles.exPickerPillActive]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedExercise(exName);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[styles.exPickerPillText, isSelected && styles.exPickerPillTextActive]}>
                                            {exName}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Progression Chart Card */}
                        <View style={styles.card}>
                            <View style={styles.progCardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.progExName}>{selectedExercise.toUpperCase()}</Text>
                                    <View style={styles.progBadgeRow}>
                                        <View style={styles.progCategoryBadge}>
                                            <Text style={styles.progCategoryBadgeText}>
                                                {getExerciseLoadCategory(selectedExercise).toUpperCase().replace("_", " ")}
                                            </Text>
                                        </View>
                                        <Text style={styles.progMuscleGroupText}>{getExerciseMuscleGroup(selectedExercise)}</Text>
                                    </View>
                                </View>
                            </View>

                            <ProgressionCurveChart data={progressionData} weightUnit={settings.weightUnit} />
                        </View>

                        {/* ── 5. Categorized PR Registry ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="trophy-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>ALL-TIME PERSONAL RECORDS</Text>
                            </View>
                        </View>

                        {/* PR Category Filter Pills */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prFilterScroll}>
                            {PR_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.prFilterPill, prFilter === cat.id && styles.prFilterPillActive]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setPRFilter(cat.id);
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.prFilterPillText, prFilter === cat.id && styles.prFilterPillTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {categorizedPRs.length === 0 ? (
                            <View style={styles.emptyPRCard}>
                                <Ionicons name="trophy-outline" size={28} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
                                <Text style={styles.emptyTitle}>No Categorized Records Yet</Text>
                                <Text style={styles.emptySub}>Log workout performances to establish baseline records.</Text>
                            </View>
                        ) : (
                            <View style={styles.prListWrap}>
                                {categorizedPRs.map((record, i) => (
                                    <CategorizedPRCard key={`${record.exerciseName}_${i}`} record={record} weightUnit={settings.weightUnit} />
                                ))}
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                ) : tab === 1 ? (
                    /* ══════════════════════════════════════════════════════════ */
                    /* PREDICTIVE INTEL TAB (PHASE 5)                             */
                    /* ══════════════════════════════════════════════════════════ */
                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={styles.scrollContent}>
                        {/* ── 1. Performance Trajectory & Velocity Deck ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="trending-up" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>PERFORMANCE TRAJECTORY</Text>
                            </View>
                            <View style={styles.infoPill}>
                                <Text style={styles.infoPillText}>Theil-Sen Robust Slope</Text>
                            </View>
                        </View>

                        {/* Exercise Selector Chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={[styles.exPillsScroll, { marginBottom: 12 }]}
                        >
                            {allExercisesList.map((exName) => {
                                const isSelected = selectedExercise === exName;
                                return (
                                    <TouchableOpacity
                                        key={exName}
                                        style={[styles.exPill, isSelected && styles.exPillActive]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedExercise(exName);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.exPillText, isSelected && styles.exPillTextActive]} numberOfLines={1}>
                                            {exName}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={{ marginHorizontal: 16 }}>
                            <PerformanceTrajectoryCard trajectoryData={selectedTrajectory} />
                        </View>

                        {/* ── 2. Upcoming Performance Milestones ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="flag-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>UPCOMING MILESTONES</Text>
                            </View>
                            <View style={styles.infoPill}>
                                <Text style={styles.infoPillText}>Velocity Horizon</Text>
                            </View>
                        </View>

                        <View style={{ marginHorizontal: 16 }}>
                            {predictiveSummary.upcomingMilestones.length > 0 ? (
                                predictiveSummary.upcomingMilestones.map((m, idx) => (
                                    <MilestoneForecastCard key={`${m.exerciseName}_${idx}`} milestoneData={m} />
                                ))
                            ) : (
                                <View style={styles.emptyPRCard}>
                                    <Ionicons name="flag-outline" size={24} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
                                    <Text style={styles.emptyTitle}>Building Milestone Horizons</Text>
                                    <Text style={styles.emptySub}>Maintain consistent progressive overload across workouts to project milestones.</Text>
                                </View>
                            )}
                        </View>

                        {/* ── 3. Movement Friction & Plateau Risk ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="shield-alert-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>MOVEMENT FRICTION & PLATEAU RADAR</Text>
                            </View>
                            <View style={[styles.statusBadgeSmall, {
                                backgroundColor: predictiveSummary.plateauRiskMovements.length === 0 ? "rgba(0, 200, 83, 0.15)" : "rgba(255, 94, 58, 0.15)",
                                borderColor: predictiveSummary.plateauRiskMovements.length === 0 ? "rgba(0, 200, 83, 0.4)" : "rgba(255, 94, 58, 0.4)"
                            }]}>
                                <Text style={[styles.statusBadgeSmallText, {
                                    color: predictiveSummary.plateauRiskMovements.length === 0 ? "#00C853" : "#FF5E3A"
                                }]}>
                                    {predictiveSummary.plateauRiskMovements.length === 0 ? "ALL MOVEMENTS NOMINAL" : `${predictiveSummary.plateauRiskMovements.length} MOVEMENT(S) AT RISK`}
                                </Text>
                            </View>
                        </View>

                        <View style={{ marginHorizontal: 16 }}>
                            {predictiveSummary.plateauRiskMovements.length > 0 ? (
                                predictiveSummary.plateauRiskMovements.map((r, idx) => (
                                    <PlateauRiskCard key={`${r.exerciseName}_${idx}`} riskData={r} />
                                ))
                            ) : (
                                <View style={styles.stallNominalRow}>
                                    <View style={styles.stallNominalIconBox}>
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#00C853" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stallNominalTitle}>Zero Plateau Friction Detected</Text>
                                        <Text style={styles.stallNominalSub}>
                                            All active movements are progressing smoothly with optimal set consistency and low chronic fatigue.
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* ── 4. Muscle Group Performance Response Matrix ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="grid-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>MUSCLE GROUP PERFORMANCE RESPONSE</Text>
                            </View>
                            <View style={styles.infoPill}>
                                <Text style={styles.infoPillText}>28-Day Volume vs Slope</Text>
                            </View>
                        </View>

                        <View style={{ marginHorizontal: 16 }}>
                            <MuscleResponseMatrix responseData={predictiveSummary.muscleResponseMatrix} />
                        </View>

                        {/* ── 5. Bodyweight & Strength Vector ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="swap-horizontal-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>BODYWEIGHT & STRENGTH CORRELATION</Text>
                            </View>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: "rgba(255, 255, 255, 0.04)", borderColor: "rgba(255, 255, 255, 0.08)" }]}>
                                <Text style={[styles.statusBadgeSmallText, { color: COLORS.text }]}>
                                    {predictiveSummary.bodyweightCorrelation.statusLabel}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.loadGrid}>
                                <View style={styles.loadGridCol}>
                                    <Text style={[styles.loadGridVal, { color: predictiveSummary.bodyweightCorrelation.bodyweightVelocityKgPerWeek >= 0 ? "#FF9500" : "#38BDF8" }]}>
                                        {predictiveSummary.bodyweightCorrelation.bodyweightVelocityKgPerWeek >= 0 ? "+" : ""}
                                        {predictiveSummary.bodyweightCorrelation.bodyweightVelocityKgPerWeek} kg/wk
                                    </Text>
                                    <Text style={styles.loadGridLabel}>BW VELOCITY</Text>
                                    <Text style={styles.profileSubMini}>7-day rolling</Text>
                                </View>
                                <View style={styles.summaryMetricDivider} />
                                <View style={styles.loadGridCol}>
                                    <Text style={[styles.loadGridVal, { color: predictiveSummary.bodyweightCorrelation.strengthVelocityAvg >= 0 ? "#00C853" : COLORS.primary }]}>
                                        {predictiveSummary.bodyweightCorrelation.strengthVelocityAvg >= 0 ? "+" : ""}
                                        {predictiveSummary.bodyweightCorrelation.strengthVelocityAvg} kg/wk
                                    </Text>
                                    <Text style={styles.loadGridLabel}>COMPOUND VELOCITY</Text>
                                    <Text style={styles.profileSubMini}>Key barbell lifts</Text>
                                </View>
                            </View>
                            <Text style={[styles.loadSummaryText, { marginTop: 8 }]}>
                                {predictiveSummary.bodyweightCorrelation.explanation}
                            </Text>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                ) : (
                    /* ══════════════════════════════════════════════════════════ */
                    /* BODY STATS & PHYSIQUE TAB                                  */
                    /* ══════════════════════════════════════════════════════════ */
                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={styles.scrollContent}>
                        {/* ── 1. 7-Day Rolling Average Bodyweight Card ── */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>BODYWEIGHT PROGRESSION</Text>
                        </View>
                        <View style={styles.card}>
                            <View style={styles.bwRollingHeader}>
                                <View>
                                    <Text style={styles.bwRollingTitle}>7-DAY ROLLING AVERAGE</Text>
                                    <Text style={styles.bwRollingValue}>
                                        {rollingBW.rolling7DayAvg ? `${rollingBW.rolling7DayAvg} kg` : "—"}
                                    </Text>
                                </View>
                                {rollingBW.hasData && (
                                    <View style={[styles.bwDeltaPill, {
                                        backgroundColor: Math.abs(rollingBW.deltaFromAvg) < 0.2 ? "rgba(255,255,255,0.06)" : rollingBW.deltaFromAvg > 0 ? "rgba(255, 149, 0, 0.12)" : "rgba(56, 189, 248, 0.12)"
                                    }]}>
                                        <Text style={[styles.bwDeltaPillText, {
                                            color: Math.abs(rollingBW.deltaFromAvg) < 0.2 ? COLORS.textSub : rollingBW.deltaFromAvg > 0 ? "#FF9500" : "#38BDF8"
                                        }]}>
                                            {rollingBW.deltaFromAvg > 0 ? "+" : ""}{rollingBW.deltaFromAvg} kg vs 7d avg
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.bwRollingSub}>
                                {rollingBW.hasData
                                    ? `Latest: ${rollingBW.latestWeight} kg · Calculated across ${rollingBW.count} valid measurement${rollingBW.count > 1 ? "s" : ""} in 7-day calendar window.`
                                    : "Log daily weight measurements to compute rolling trend lines and reduce daily water fluctuations."}
                            </Text>
                        </View>

                        {/* ── 2. 8-Metric Physique Progression Grid ── */}
                        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
                            <View style={styles.sectionTitleGroup}>
                                <Ionicons name="body-outline" size={15} color={COLORS.primary} />
                                <Text style={styles.sectionLabel}>PHYSIQUE MEASUREMENT DELTAS</Text>
                            </View>
                        </View>

                        <View style={styles.physiqueGrid}>
                            {STAT_FIELDS.map((f) => {
                                const deltaObj = physiqueDeltas[f.key] || {};
                                const current = deltaObj.current;
                                const delta = deltaObj.delta;
                                const pct = deltaObj.percentChange;

                                return (
                                    <View key={f.key} style={styles.physiqueCard}>
                                        <Text style={styles.physiqueLabel}>{f.label.toUpperCase()}</Text>
                                        <Text style={styles.physiqueVal}>
                                            {current != null ? `${current} ${f.unit}` : "—"}
                                        </Text>
                                        <View style={styles.physiqueDeltaRow}>
                                            {delta != null ? (
                                                <Text style={[styles.physiqueDeltaText, { color: delta >= 0 ? "#00C853" : COLORS.primary }]}>
                                                    {delta >= 0 ? "+" : ""}{delta} {f.unit} {pct != null ? `(${pct >= 0 ? "+" : ""}${pct}%)` : ""}
                                                </Text>
                                            ) : (
                                                <Text style={styles.physiqueDeltaMuted}>Baseline</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* ── 3. Weight Line Chart ── */}
                        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                            <Text style={styles.sectionLabel}>WEIGHT TREND CURVE</Text>
                        </View>
                        <View style={styles.card}>
                            <MiniChart
                                data={chartData("weightKg")}
                                color={COLORS.accent}
                                label="Weight"
                            />
                        </View>

                        {/* ── 4. Measurements Entry Form ── */}
                        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                            <Text style={styles.sectionLabel}>LOG MEASUREMENTS</Text>
                        </View>
                        <View style={styles.card}>
                            {STAT_FIELDS.map(f => (
                                <StatInput
                                    key={f.key}
                                    label={f.label}
                                    unit={f.unit}
                                    value={form[f.key]}
                                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                                />
                            ))}
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveStats}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveBtnText}>{saving ? "SAVING..." : "SAVE TODAY'S STATS"}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── 5. History Table ── */}
                        {bodyStats.length > 0 && (
                            <>
                                <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                                    <Text style={styles.sectionLabel}>RECENT LOGS</Text>
                                </View>
                                <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
                                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                        <Text style={[styles.tableCell, styles.tableHeader, { flex: 1.4, textAlign: "left" }]}>DATE</Text>
                                        {STAT_FIELDS.slice(0, 3).map(f => (
                                            <Text key={f.key} style={[styles.tableCell, styles.tableHeader]}>{f.label.split(" ")[0].toUpperCase()}</Text>
                                        ))}
                                    </View>
                                    {bodyStats.slice(0, 10).map((s, i) => (
                                        <View key={i} style={[styles.tableRow, i < bodyStats.length - 1 && styles.tableBorder]}>
                                            <Text style={[styles.tableCell, styles.tableDateCell]}>
                                                {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                                            </Text>
                                            {STAT_FIELDS.slice(0, 3).map(f => (
                                                <Text key={f.key} style={styles.tableValueCell}>
                                                    {s[f.key] != null ? s[f.key].toFixed(1) : "—"}
                                                </Text>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}

                {/* Structured Deload Proposal Modal */}
                <DeloadProposalModal
                    visible={deloadProposalModalVisible}
                    deloadPlan={proposedDeloadPlan}
                    onAccept={handleAcceptDeload}
                    onClose={() => setDeloadProposalModalVisible(false)}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

/* ── STYLES ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { paddingBottom: 60 },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.bgCard,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
    headerTitle: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.8 },
    savedBadge: { backgroundColor: "rgba(255, 255, 255, 0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
    savedText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text },

    tabs: {
        flexDirection: "row", paddingHorizontal: 16,
        gap: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    tab: { paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 0.5 },
    tabTextActive: { color: COLORS.text, fontFamily: FAMILY.bold },

    sectionHeader: { paddingHorizontal: 16, marginTop: 24, marginBottom: 10 },
    sectionHeaderRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
    },
    sectionTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
    sectionLabel: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.0 },

    // Insights Cards
    insightsWrap: { marginHorizontal: 16, gap: 10 },
    insightCard: {
        backgroundColor: "#131316", borderRadius: 14,
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", padding: 14, overflow: "hidden",
    },
    insightHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    insightIconBox: { width: 22, height: 22, borderRadius: RADIUS.xs, alignItems: "center", justifyContent: "center" },
    insightTitle: { fontSize: 11, fontFamily: FAMILY.monoBold, color: COLORS.text, letterSpacing: 0.8 },
    insightBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs, borderWidth: 1 },
    insightBadgeText: { fontSize: 8.5, fontFamily: FAMILY.monoBold, letterSpacing: 0.5 },
    insightMsg: { fontSize: 11.5, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 16 },

    // 7-day BW rolling
    bwRollingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    bwRollingTitle: { fontSize: 10, fontFamily: FAMILY.monoBold, color: COLORS.textMuted, letterSpacing: 0.8 },
    bwRollingValue: { fontSize: 22, fontFamily: FAMILY.monoBold, color: COLORS.text, marginTop: 2 },
    bwDeltaPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
    bwDeltaPillText: { fontSize: 9.5, fontFamily: FAMILY.monoBold },
    bwRollingSub: { fontSize: 10.5, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 6, lineHeight: 14 },

    // Physique Grid
    physiqueGrid: {
        marginHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 8,
    },
    physiqueCard: {
        width: (width - 40) / 2, backgroundColor: "#131316",
        borderRadius: 14, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 12,
    },
    physiqueLabel: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.textMuted, letterSpacing: 0.5 },
    physiqueVal: { fontSize: 15, fontFamily: FAMILY.monoBold, color: COLORS.text, marginTop: 3 },
    physiqueDeltaRow: { marginTop: 4 },
    physiqueDeltaText: { fontSize: 9.5, fontFamily: FAMILY.monoBold },
    physiqueDeltaMuted: { fontSize: 9.5, fontFamily: FAMILY.mono, color: COLORS.textMuted },

    weekToggleContainer: {
        flexDirection: "row", backgroundColor: COLORS.bgCard, borderRadius: RADIUS.pill,
        borderWidth: 1, borderColor: COLORS.border, padding: 2,
    },
    weekToggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
    weekToggleBtnActive: { backgroundColor: COLORS.primary },
    weekToggleText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted },
    weekToggleTextActive: { color: "#FFF", fontFamily: FAMILY.bold },

    infoPill: {
        backgroundColor: "rgba(255, 255, 255, 0.04)", paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
    },
    infoPillText: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textSub },

    card: {
        marginHorizontal: 16, backgroundColor: "#131316",
        borderRadius: 18, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 16, overflow: "hidden", marginBottom: 14,
    },

    summaryTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    summaryDateRange: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted, textTransform: "uppercase" },
    summaryHeadline: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text, marginTop: 2 },
    adherenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
    adherenceText: { fontSize: 10, fontFamily: FAMILY.monoBold },

    summaryProgressBar: {
        height: 6, width: "100%", backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 3, overflow: "hidden", marginBottom: 16,
    },
    summaryProgressFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 3 },

    summaryMetricsGrid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    summaryMetricItem: { flex: 1, alignItems: "center" },
    summaryMetricDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
    summaryMetricVal: { fontSize: 16, fontFamily: FAMILY.monoBold, color: COLORS.text },
    summaryMetricLabel: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted, marginTop: 4 },
    volumeDisclaimer: { fontSize: 9, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 12, textAlign: "center" },

    hypertrophyNotice: {
        fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textMuted,
        marginBottom: 12, lineHeight: 14,
    },
    muscleVolRow: { paddingVertical: 8 },
    muscleVolRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.04)" },
    muscleVolNameWrap: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    muscleVolName: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.text },
    muscleVolCount: { fontSize: 12, fontFamily: FAMILY.monoBold, color: COLORS.text },
    muscleVolTrack: { height: 6, width: "100%", backgroundColor: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden", position: "relative" },
    muscleVolFill: { height: "100%", borderRadius: 3 },
    muscleVolMarker: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.5, backgroundColor: "rgba(255, 255, 255, 0.2)" },

    exercisePickerScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    exPickerPill: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    },
    exPickerPillActive: { backgroundColor: "rgba(227, 30, 36, 0.15)", borderColor: COLORS.primary },
    exPickerPillText: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub },
    exPickerPillTextActive: { color: "#FFF", fontFamily: FAMILY.bold },

    progCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    progExName: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text },
    progBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    progCategoryBadge: { backgroundColor: "rgba(255, 255, 255, 0.08)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
    progCategoryBadgeText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.textSub },
    progMuscleGroupText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted },

    prFilterScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    prFilterPill: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    },
    prFilterPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    prFilterPillText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted },
    prFilterPillTextActive: { color: "#FFF", fontFamily: FAMILY.bold },

    prListWrap: { marginHorizontal: 16, gap: 10 },
    emptyPRCard: {
        marginHorizontal: 16, backgroundColor: "#131316", borderRadius: 14,
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", padding: 28, alignItems: "center", justifyContent: "center",
    },

    saveBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingVertical: 14, alignItems: "center", marginTop: 20,
    },
    saveBtnText: { fontSize: 13, fontFamily: FAMILY.bold, color: "#FFFFFF", letterSpacing: 0.5 },

    tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 },
    tableHeaderRow: { backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableCell: { flex: 1, textAlign: "center" },
    tableHeader: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 0.5 },
    tableDateCell: { flex: 1.4, color: COLORS.textSub, fontFamily: FAMILY.mono, fontSize: 10 },
    tableValueCell: { flex: 1, fontSize: 12, fontFamily: FAMILY.monoBold, color: COLORS.text, textAlign: "center" },

    emptyTitle: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text, marginBottom: 4 },
    emptySub: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", fontFamily: FAMILY.regular },

    // Phase 3 Intelligence Styles
    statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1 },
    statusBadgeSmallText: { fontSize: 8.5, fontFamily: FAMILY.monoBold, letterSpacing: 0.5 },

    loadHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
    loadSubLabel: { fontSize: 8.5, fontFamily: FAMILY.monoBold, color: COLORS.textMuted, letterSpacing: 0.8 },
    loadRatioValue: { fontSize: 26, fontFamily: FAMILY.monoBold, color: "#FFFFFF", marginTop: 2, fontVariant: ["tabular-nums"] },
    loadRatioUnit: { fontSize: 14, fontFamily: FAMILY.monoBold, color: COLORS.textMuted },
    loadTonnageBreakdown: { alignItems: "flex-end" },
    loadTonnageLabel: { fontSize: 8.5, fontFamily: FAMILY.monoBold, color: COLORS.textMuted, letterSpacing: 0.5 },
    loadTonnageVal: { fontSize: 13.5, fontFamily: FAMILY.monoBold, color: "#FFFFFF", marginTop: 2, fontVariant: ["tabular-nums"] },
    loadBWCount: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 2 },

    loadGrid: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        marginVertical: 4,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    loadGridCol: { flex: 1, alignItems: "center" },
    loadGridVal: { fontSize: 13.5, fontFamily: FAMILY.monoBold, color: "#FFFFFF", fontVariant: ["tabular-nums"] },
    loadGridLabel: { fontSize: 8.5, fontFamily: FAMILY.monoBold, color: COLORS.textMuted, letterSpacing: 0.5, marginTop: 3 },
    loadSummaryText: { fontSize: 11, fontFamily: FAMILY.body, color: "#B0B0B8", lineHeight: 16, marginTop: 10 },

    deloadAlertBox: { borderRadius: RADIUS.sm, padding: 12, borderWidth: 1 },
    deloadAlertTitle: { fontSize: 10, fontFamily: FAMILY.monoBold, letterSpacing: 0.5 },
    deloadAlertReason: { fontSize: 11, fontFamily: FAMILY.body, color: COLORS.textSub, lineHeight: 15 },
    deloadObsBullet: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted },

    stallNominalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
    stallNominalIconBox: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: "rgba(0, 200, 83, 0.12)", alignItems: "center", justifyContent: "center" },
    stallNominalTitle: { fontSize: 12, fontFamily: FAMILY.monoBold, color: "#00C853", letterSpacing: 0.5 },
    stallNominalSub: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 3, lineHeight: 15 },

    stallCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
    stallCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
    stallCardExName: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text },
    stallCardMeta: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 2 },
    stallBadge: { backgroundColor: "rgba(255, 94, 58, 0.15)", borderColor: "rgba(255, 94, 58, 0.4)", borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
    stallBadgeText: { fontSize: 8.5, fontFamily: FAMILY.monoBold, color: "#FF5E3A" },
    stallCardDesc: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 15, marginBottom: 8 },
    stallActionBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "rgba(255, 149, 0, 0.08)", padding: 8, borderRadius: RADIUS.xs },
    stallActionText: { flex: 1, fontSize: 10.5, fontFamily: FAMILY.regular, color: "#FF9500", lineHeight: 14 },

    profileSectionTitle: { fontSize: 10, fontFamily: FAMILY.monoBold, color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 8 },
    progProfileRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
    progProfileBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
    progProfileExName: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.text },
    progProfileSub: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 2 },
    gainPill: { backgroundColor: "rgba(0, 200, 83, 0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: "rgba(0, 200, 83, 0.3)" },
    gainPillText: { fontSize: 10, fontFamily: FAMILY.monoBold, color: "#00C853" },
    profileDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginVertical: 12 },
    consistencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    weekdayChip: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border },
    weekdayName: { fontSize: 9.5, fontFamily: FAMILY.monoBold, color: COLORS.text },
    weekdayCount: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 1 },
    profileEmptyWrap: { alignItems: "center", paddingVertical: 12 },
    profileEmptyTitle: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, marginBottom: 4 },
    profileEmptySub: { fontSize: 10.5, fontFamily: FAMILY.regular, color: COLORS.textMuted, textAlign: "center", lineHeight: 14 },

    // Phase 4 Training Distribution Matrix
    distGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    distCell: {
        width: (CARD_W - 36 - 16) / 3,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        padding: 8,
    },
    distMuscleText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    distBarRow: {
        flexDirection: "row",
        alignItems: "baseline",
        marginBottom: 4,
    },
    distFreqVal: {
        fontSize: 13,
        fontFamily: FAMILY.monoBold,
    },
    distExpectedText: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: "rgba(255, 255, 255, 0.4)",
        marginLeft: 2,
    },
    distMiniTrack: {
        height: 3,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 1.5,
        overflow: "hidden",
    },
    distMiniFill: {
        height: "100%",
        borderRadius: 1.5,
    },
    consecutiveWarningBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 149, 0, 0.08)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 149, 0, 0.25)",
        padding: 8,
        marginTop: 10,
    },
    consecutiveWarningText: {
        flex: 1,
        fontSize: 10,
        fontFamily: FAMILY.sans,
        color: "#FF9500",
        lineHeight: 14,
    },

    // Phase 4 Long-Term Profile Styles
    profileSubMini: {
        fontSize: 8.5,
        fontFamily: FAMILY.mono,
        color: "rgba(255, 255, 255, 0.4)",
        marginTop: 2,
    },
    taxonomyRatesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    taxRateItem: {
        width: (CARD_W - 36 - 8) / 2,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        padding: 8,
    },
    taxRateLabel: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    taxRateVal: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    resetProgramBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    resetProgramBtnText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
});

const mc = StyleSheet.create({
    wrap: { paddingTop: 4 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    labelBox: { flexDirection: "row", alignItems: "center", gap: 8 },
    indicator: { width: 3, height: 12, borderRadius: 1.5 },
    label: { fontSize: 11, fontFamily: FAMILY.semibold, color: COLORS.textSub },
    trendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg },
    trendText: { fontSize: 10, fontFamily: FAMILY.monoBold },
    empty: { height: 90, alignItems: "center", justifyContent: "center" },
    emptyText: { fontSize: 11, color: COLORS.textMuted, fontFamily: FAMILY.regular },
});

const pc = StyleSheet.create({
    wrap: { width: "100%" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    latestLabel: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.textMuted },
    latestVal: { fontSize: 18, fontFamily: FAMILY.monoBold, color: COLORS.text, marginTop: 2 },
    latestUnit: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textSub },
    deltaBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
    deltaText: { fontSize: 10, fontFamily: FAMILY.monoBold },
    dateAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
    dateAxisText: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    empty: { height: 110, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
    emptyText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textSub, textAlign: "center" },
    emptySub: { fontSize: 10, color: COLORS.textMuted, textAlign: "center", marginTop: 4 },
    singleSessionBox: { paddingVertical: 12, alignItems: "center" },
    singleSessionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    singleSessionDate: { fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    singleSessionBadge: { backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
    singleSessionBadgeText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.textSub },
    singleSessionVal: { fontSize: 24, fontFamily: FAMILY.monoBold, color: COLORS.text },
    singleSessionUnit: { fontSize: 14, color: COLORS.textSub },
    singleSessionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
});

const si = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    label: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textSub },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    input: {
        fontSize: 14, fontFamily: FAMILY.monoBold, color: COLORS.text,
        textAlign: "right", padding: 0, minWidth: 40,
    },
    unit: { fontSize: 10, color: COLORS.textMuted, fontFamily: FAMILY.mono, width: 24 },
});

const prc = StyleSheet.create({
    card: {
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border, padding: 14,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    left: { flex: 1, marginRight: 12 },
    name: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text },
    tagsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
    catBadgeText: { fontSize: 9, fontFamily: FAMILY.monoBold },
    muscleTag: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted },
    right: { alignItems: "flex-end" },
    primaryVal: { fontSize: 13, fontFamily: FAMILY.monoBold, color: COLORS.text },
    subVal: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    dateText: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 4 },
});
