import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, StatusBar, Animated, ImageBackground, Image, Modal, Share, Easing,
} from "react-native";
import { ScrollView as GestureScrollView, TouchableOpacity as GestureTouchableOpacity } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORKOUT_PLAN } from "../data/workoutData";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, GRADIENTS, APP_VERSION } from "../utils/theme";
import {
    getStreak, getTotalWorkouts, getLastWorkoutDate,
    getLastFreezeDate, withdrawStreakFreeze, checkAndCleanStreak,
    getStreakLocal, getTotalWorkoutsLocal, applyStreakFreeze,
    getXP, getXPLocal, getRecordStreak, getRecordStreakLocal,
    getWorkoutHistory, getWorkoutHistoryLocal, getPreviousFreezeDate,
    getActiveWorkoutSession, clearActiveWorkoutSession
} from "../utils/storage";
import MaskedView from "@react-native-masked-view/masked-view";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText, Polygon, Line } from "react-native-svg";
import WorkoutCalendar from "../components/WorkoutCalendar";
import SkeletonBlock from "../components/SkeletonBlock";
import { getRankData, RANKS } from "./RankScreen";
import { syncAndroidWidget } from "../utils/widgetSync";


// Auth
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function totalTime(day) {
    let s = 0;
    day.exercises.forEach((ex) => {
        const setDuration = ex.type === 'reps' ? 45 : ex.activeTimeSec;
        s += ex.sets * setDuration + (ex.sets - 1) * ex.restTimeSec;
        if (ex.unilateral) s += ex.sets * setDuration;
    });
    return Math.ceil(s / 60);
}

function getMuscleColor(target) {
    if (!target) return "#8E8E93";
    const t = String(target).toUpperCase();
    if (t.includes("CHEST") || t.includes("TRICEPS") || t.includes("PUSH")) return "#E31E24";
    if (t.includes("BACK") || t.includes("BICEPS") || t.includes("PULL")) return "#FF9500";
    if (t.includes("SHOULDERS") || t.includes("CORE") || t.includes("ARMS") || t.includes("ABS")) return "#30B0C7";
    if (t.includes("LEGS") || t.includes("QUADS") || t.includes("LOWER") || t.includes("CALVES")) return "#D1D1D1";
    if (t.includes("RECOVERY") || t.includes("REST") || t.includes("MOBILITY") || t.includes("MINDFULNESS")) return "#30D158";
    return "#8E8E93";
}

const LIBRARY_DAYS = [
    ...WORKOUT_PLAN,
    {
        day: 7,
        dayName: "Sunday",
        target: "Active Recovery",
        isRest: true,
        exercises: [],
    },
];

const getLibraryDayCode = (day) => {
    if (day?.dayName) return day.dayName.slice(0, 3).toUpperCase();
    return `0${day?.day || 1}`;
};

const getLibraryTitle = (day) => {
    if (day.day === 1) return "Chest &\nTriceps";
    if (day.day === 2) return "Back &\nBiceps";
    if (day.day === 3) return "Shoulders &\nAbs";
    if (day.day === 4) return "Legs";
    if (day.day === 5) return "Chest &\nBack";
    if (day.day === 6) return "Arms &\nAbs";
    if (day.day === 7) return "Active\nRecovery";
    return (day.target || "").replace(/\s*\+\s*/g, " &\n");
};

function GradientText({ text, style, colors = GRADIENTS.diamond, height = 50 }) {
    return (
        <MaskedView
            style={{ height, width: '100%' }}
            maskElement={
                <Text style={style} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            }
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            >
                <Text style={[style, { opacity: 0 }]} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            </LinearGradient>
        </MaskedView>
    );
}

function MetallicText({ text, style, height = 44 }) {
    return (
        <MaskedView
            style={{ height, width: '100%' }}
            maskElement={
                <Text style={style} numberOfLines={1}>
                    {text}
                </Text>
            }
        >
            <LinearGradient
                colors={["#FFFFFF", "#D1D1D6", "#FFFFFF", "#8E8E93", "#E5E5EA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                style={StyleSheet.absoluteFill}
            />
        </MaskedView>
    );
}

function LiveStatusStrip({ total, streak, xp }) {
    const currentRank = getRankData(total);
    const nextRank = currentRank.index < RANKS.length - 1 ? RANKS[currentRank.index + 1] : null;
    const progressInRank = nextRank
        ? Math.min((total - currentRank.min) / (nextRank.min - currentRank.min), 1)
        : 1;
    const progressPercent = total === 0 ? 0 : Math.round(progressInRank * 100);

    const items = total === 0 ? [
        "WELCOME TO CONQUER ONE",
        "START YOUR FIRST WORKOUT",
        "6-DAY ELITE SPLIT",
        "RANK · RECRUIT",
    ] : [
        `${total} SESSIONS LOGGED`,
        `${streak} DAY STREAK`,
        `${currentRank.title} · RANK`,
        nextRank ? `${progressPercent}% TO ${nextRank.title}` : "100% MAX RANK",
    ];

    const [index, setIndex] = useState(0);
    const textAnim = useRef(new Animated.Value(1)).current;
    const dotPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(dotPulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
                Animated.timing(dotPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const cycle = () => {
            if (!isMounted) return;
            Animated.sequence([
                Animated.delay(2100),
                Animated.timing(textAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished && isMounted) {
                    setIndex((prev) => (prev + 1) % items.length);
                    textAnim.setValue(0);
                    Animated.timing(textAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(cycle);
                }
            });
        };
        cycle();
        return () => { isMounted = false; };
    }, []);

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
            paddingVertical: 10, paddingHorizontal: SPACING.base, marginBottom: 18,
            overflow: 'hidden',
        }}>
            <Animated.View style={{
                width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary,
                opacity: dotPulse,
            }} />
            <View style={{ height: 14, flex: 1, overflow: 'hidden' }}>
                <Animated.Text
                    numberOfLines={1}
                    style={{
                        fontFamily: FAMILY.mono, fontSize: 10, fontWeight: '600',
                        letterSpacing: 1.5, color: COLORS.textSub, textTransform: 'uppercase',
                        opacity: textAnim,
                        transform: [{
                            translateY: textAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] })
                        }],
                    }}
                >
                    {items[index]}
                </Animated.Text>
            </View>
        </View>
    );
}

const getWeekStats = (history, lastFreezeDate) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const completedDays = [];
    const freezeDays = [];
    const completedTargets = {};

    if (history && Array.isArray(history)) {
        history.forEach(item => {
            if (!item.date) return;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            const diffTime = itemDate - monday;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 6) {
                const dayOfWeek = diffDays + 1; // 1 = Mon, 7 = Sun
                if (!completedDays.includes(dayOfWeek)) {
                    completedDays.push(dayOfWeek);
                }
                if (item.target) {
                    completedTargets[dayOfWeek] = item.target;
                } else if (item.day) {
                    const wDay = WORKOUT_PLAN.find(d => d.day === item.day);
                    if (wDay) completedTargets[dayOfWeek] = wDay.target;
                }
            }
        });
    }

    if (lastFreezeDate) {
        const freezeDate = new Date(lastFreezeDate);
        freezeDate.setHours(0, 0, 0, 0);
        const diffTime = freezeDate - monday;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 6) {
            const dayOfWeek = diffDays + 1;
            freezeDays.push(dayOfWeek);
        }
    }

    return { completedDays, freezeDays, completedTargets };
};

const getWeeklyHistoryData = (history) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeklyCounts = [0, 0, 0, 0]; // Index 0: 3 weeks ago, Index 1: 2 weeks ago, ...

    const oneDay = 24 * 60 * 60 * 1000;

    if (history && Array.isArray(history)) {
        history.forEach(item => {
            if (!item.date) return;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((today - itemDate) / oneDay);
            if (diffDays >= 0 && diffDays < 28) {
                const weekIndex = 3 - Math.floor(diffDays / 7);
                if (weekIndex >= 0 && weekIndex <= 3) {
                    weeklyCounts[weekIndex]++;
                }
            }
        });
    }

    return weeklyCounts;
};

const getStreakTierInfo = (streak) => {
    if (streak >= 10) {
        return {
            name: "TITAN",
            multiplier: "2.0x",
            color: "#EDEAE3",
            badge: "Tier IV",
            desc: "20 XP per session reward rate.",
            range: "10+ Days"
        };
    } else if (streak >= 5) {
        return {
            name: "OVERLOAD",
            multiplier: "1.5x",
            color: "#EDEAE3",
            badge: "Tier III",
            desc: "15 XP per session reward rate.",
            range: "5–9 Days"
        };
    } else if (streak >= 3) {
        return {
            name: "IGNITION",
            multiplier: "1.2x",
            color: "#EDEAE3",
            badge: "Tier II",
            desc: "12 XP per session reward rate.",
            range: "3–4 Days"
        };
    } else {
        return {
            name: "SPARK",
            multiplier: "1.0x",
            color: streak > 0 ? "#EDEAE3" : "#8A8A8E",
            badge: "Tier I",
            desc: "10 XP per session reward rate.",
            range: "1–2 Days"
        };
    }
};

const renderSvgChart = (weeklyData) => {
    const chartWidth = width - 64;
    const chartHeight = 145;
    const padding = 25;

    // Coordinates
    const points = weeklyData.map((val, i) => {
        const x = padding + (i / 3) * (chartWidth - 2 * padding);
        const y = chartHeight - padding - (Math.min(val, 7) / 7) * (chartHeight - 2 * padding);
        return { x, y, value: val };
    });

    // Create polyline / path
    let d = "";
    points.forEach((p, idx) => {
        if (idx === 0) d += `M ${p.x} ${p.y}`;
        else {
            const prev = points[idx - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp1y = prev.y;
            const cp2x = prev.x + 2 * (p.x - prev.x) / 3;
            const cp2y = p.y;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
        }
    });

    // Path for fill (under the curve)
    let fillD = d;
    if (points.length > 0) {
        fillD += ` L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;
    }

    const labels = ["3 Wks Ago", "2 Wks Ago", "1 Wk Ago", "This Wk"];
    const currentWeekSessions = weeklyData[weeklyData.length - 1] || 0;

    return (
        <View style={styles.chartWrapper}>
            <View style={styles.chartHeaderRow}>
                <View>
                    <Text style={styles.chartTitle}>WEEKLY CONSISTENCY</Text>
                    <Text style={styles.chartSubTitle}>4-Week training volume profile</Text>
                </View>
                <View style={styles.chartBadge}>
                    <View style={styles.chartBadgeDot} />
                    <Text style={styles.chartBadgeText}>
                        <Text style={{ fontFamily: FAMILY.monoBold, color: COLORS.text }}>{currentWeekSessions}</Text> SESSIONS
                    </Text>
                </View>
            </View>

            <View style={styles.svgContainer}>
                <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                        {/* Crimson to Gold ambient glow under curve */}
                        <SvgGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.32" />
                            <Stop offset="60%" stopColor="#FF9500" stopOpacity="0.08" />
                            <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.0" />
                        </SvgGradient>
                        {/* High-voltage gradient stroke across line */}
                        <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="#FF9500" />
                            <Stop offset="100%" stopColor={COLORS.primary} />
                        </SvgGradient>
                    </Defs>

                    {/* Grid Lines */}
                    {[0, 1, 2, 3].map((g) => {
                        const y = padding + (g / 3) * (chartHeight - 2 * padding);
                        return (
                            <Path
                                key={g}
                                d={`M ${padding} ${y} L ${chartWidth - padding} ${y}`}
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />
                        );
                    })}

                    {/* Gradient Fill under path */}
                    {points.length > 0 && (
                        <Path d={fillD} fill="url(#chartGlow)" />
                    )}

                    {/* Curve Line */}
                    {points.length > 0 && (
                        <Path
                            d={d}
                            fill="none"
                            stroke="url(#lineGrad)"
                            strokeWidth={2.8}
                        />
                    )}

                    {/* Data Points */}
                    {points.map((p, idx) => {
                        const isLatest = idx === points.length - 1;
                        const pointColor = isLatest ? COLORS.primary : "#FF9500";
                        return (
                            <React.Fragment key={idx}>
                                <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isLatest ? 8 : 6}
                                    fill={pointColor}
                                    fillOpacity={isLatest ? 0.35 : 0.2}
                                />
                                <Circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isLatest ? 4.5 : 3.5}
                                    fill="#FFFFFF"
                                    stroke={pointColor}
                                    strokeWidth={isLatest ? 2 : 1.5}
                                />
                                <SvgText
                                    x={p.x}
                                    y={p.y - 9}
                                    fill={isLatest ? "#FFFFFF" : "#D1D1D1"}
                                    fontSize="10"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    fontFamily={FAMILY.mono}
                                >
                                    {p.value}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>
            </View>
            <View style={styles.chartLabelsRow}>
                {labels.map((lbl, idx) => {
                    const isLatest = idx === labels.length - 1;
                    return (
                        <Text
                            key={lbl}
                            style={[
                                styles.chartLabelText,
                                isLatest && { color: COLORS.primary, fontFamily: FAMILY.bold }
                            ]}
                        >
                            {lbl.toUpperCase()}
                        </Text>
                    );
                })}
            </View>
        </View>
    );
};

export default function HomeScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { user, profile = null } = useAuth();
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [todayDay, setTodayDay] = useState(1);
    const [greeting, setGreeting] = useState("COMMANDER");
    const [isFrozen, setIsFrozen] = useState(false);
    const [lastFreezeDate, setLastFreezeDate] = useState(null);
    const [previousFreezeDate, setPreviousFreezeDate] = useState(null);
    const [freezeModal, setFreezeModal] = useState(false);
    const [streakResetModal, setStreakResetModal] = useState(false);
    const [prevStreak, setPrevStreak] = useState(0);
    const [xp, setXP] = useState(0);
    const [recordStreak, setRecordStreak] = useState(0);
    const [completedDays, setCompletedDays] = useState([]);
    const [completedTargets, setCompletedTargets] = useState({});
    const [freezeDays, setFreezeDays] = useState([]);
    const [history, setHistory] = useState([]);
    const [streakAnalyticsVisible, setStreakAnalyticsVisible] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const greetingAnim = useRef(new Animated.Value(0)).current;
    const navAnim = useRef(new Animated.Value(0)).current;
    const heroAnim = useRef(new Animated.Value(0)).current;

    // Animations
    const avatarGlow = useRef(new Animated.Value(0.3)).current;
    const avatarScale = useRef(new Animated.Value(1)).current;
    const dotOpacity = useRef(new Animated.Value(0.4)).current;
    const sparkAnims = useRef([4, 6, 3, 8, 5, 9, 7].map(() => new Animated.Value(0))).current;

    const displayName = profile?.fullName?.split(" ")[0] || user?.displayName?.split(" ")[0] || "ATHLETE";

    const [initialLoading, setInitialLoading] = useState(true);
    const contentFadeAnim = useRef(new Animated.Value(0)).current;
    const isInitialMountRef = useRef(true);

    const finishInitialLoading = () => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            setInitialLoading(false);
            Animated.timing(contentFadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    };

    useFocusEffect(useCallback(() => {
        loadStats(false); // Instantly load local cache on focus (0ms latency, no blocking)
        (async () => {
            const sess = await getActiveWorkoutSession();
            setActiveSession(sess);
        })();

        if (route.params?.openStreakIntelligence) {
            setStreakAnalyticsVisible(true);
            navigation.setParams({ openStreakIntelligence: false });
        }
    }, [route.params?.openStreakIntelligence]));

    useEffect(() => {
        // Run a full background cloud sync once when the component mounts
        loadStats(true);

        const h = new Date().getHours();
        let g = "Good morning";
        if (h >= 12 && h < 17) g = "Good afternoon";
        else if (h >= 17) g = "Good evening";
        setGreeting(g);

        const d = new Date().getDay();
        setTodayDay(d === 0 ? 7 : d);

        // Breathing avatar loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(avatarGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(avatarGlow, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        // Blinking indicator dot loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(dotOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(dotOpacity, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        // Animate sparkline graph
        const animations = sparkAnims.map((anim, i) => {
            const targets = [4, 6, 3, 8, 5, 9, 7];
            return Animated.timing(anim, {
                toValue: targets[i] * 2.2,
                duration: 650 + i * 90,
                useNativeDriver: false,
            });
        });

        Animated.parallel([
            Animated.stagger(120, [
                Animated.timing(greetingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(navAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(heroAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]),
            ...animations
        ]).start();
    }, []);

    const loadStats = async (forceCloudSync = false) => {
        // 1. Immediate local cache load
        try {
            const cachedStreak = await getStreakLocal();
            const cachedTotal = await getTotalWorkoutsLocal();
            const cachedXP = await getXPLocal();
            const cachedRecord = await getRecordStreakLocal();
            const cachedHistory = await getWorkoutHistoryLocal();
            const cachedFreeze = await getLastFreezeDate();
            const cachedPrevFreeze = await getPreviousFreezeDate();

            setStreak(cachedStreak);
            setTotal(cachedTotal);
            setXP(cachedXP);
            setRecordStreak(cachedRecord);
            setHistory(cachedHistory);
            setLastFreezeDate(cachedFreeze);
            setPreviousFreezeDate(cachedPrevFreeze);
            setIsFrozen(cachedFreeze === new Date().toISOString().split("T")[0]);

            const { completedDays: localComp, freezeDays: localFrz, completedTargets: localTargets } = getWeekStats(cachedHistory, cachedFreeze);
            setCompletedDays(localComp);
            setFreezeDays(localFrz);
            setCompletedTargets(localTargets || {});

            finishInitialLoading();
        } catch (e) {
            console.warn("Failed to load cached stats in HomeScreen", e);
            finishInitialLoading();
        }

        // 2. checkAndCleanStreak (which resets streak if broken)
        try {
            const { wasReset, previousStreak } = await checkAndCleanStreak();
            if (wasReset) {
                setPrevStreak(previousStreak);
                setStreakResetModal(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
                setStreak(0); // update instantly to 0 in UI
            }
        } catch (e) {
            console.warn("checkAndCleanStreak failed in loadStats", e);
        }

        // 3. Background cloud sync (only on app boot or explicit actions)
        if (forceCloudSync) {
            try {
                const [nextStreak, nextTotal, lastFreeze, nextXP, nextRecord, nextHistory, nextPrevFreeze] = await Promise.all([
                    getStreak(),
                    getTotalWorkouts(),
                    getLastFreezeDate(),
                    getXP(),
                    getRecordStreak(),
                    getWorkoutHistory(),
                    getPreviousFreezeDate(),
                ]);
                setStreak(nextStreak);
                setTotal(nextTotal);
                setIsFrozen(lastFreeze === new Date().toISOString().split("T")[0]);
                setLastFreezeDate(lastFreeze);
                setPreviousFreezeDate(nextPrevFreeze);
                setXP(nextXP);
                setRecordStreak(nextRecord);
                setHistory(nextHistory);

                const { completedDays: syncComp, freezeDays: syncFrz, completedTargets: syncTargets } = getWeekStats(nextHistory, lastFreeze);
                setCompletedDays(syncComp);
                setFreezeDays(syncFrz);
                setCompletedTargets(syncTargets || {});

                finishInitialLoading();
            } catch (e) {
                console.warn("HomeScreen background sync failed", e);
                finishInitialLoading();
            }
        }

        // Sync Android Widget with latest streak & day target
        syncAndroidWidget().catch(() => {});
    };

    const handleUnfreeze = async () => {
        const success = await withdrawStreakFreeze();
        if (success) {
            setIsFrozen(false);
            setFreezeModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadStats(true);
        }
    };

    const handleFreezeToggle = async () => {
        if (isFrozen) {
            const success = await withdrawStreakFreeze();
            if (success) {
                setIsFrozen(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
                loadStats(true);
            }
        } else {
            const success = await applyStreakFreeze();
            if (success) {
                setIsFrozen(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
                loadStats(true);
            }
        }
    };

    const handleAvatarPressIn = () => {
        Animated.spring(avatarScale, {
            toValue: 0.92,
            useNativeDriver: true,
        }).start();
    };

    const handleAvatarPressOut = () => {
        Animated.spring(avatarScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("Profile");
    };

    const handleWeekCellPress = (day) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("WorkoutDetail", { day });
    };

    const todayWorkout = todayDay <= 6 ? WORKOUT_PLAN[todayDay - 1] : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Ambient Glow */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={["rgba(237, 234, 227, 0.04)", "transparent", "transparent"]}
                    style={{ height: width * 1.2, width: width, position: "absolute", top: -width * 0.2 }}
                />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingTop: insets.top + SPACING.base, paddingBottom: 0 }}
            >
                {/* ── Header ── */}
                <View style={styles.headerRow}>
                    <Animated.View
                        style={[
                            styles.headerTop,
                            {
                                opacity: greetingAnim,
                                transform: [{
                                    translateY: greetingAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                                }],
                            }
                        ]}
                    >
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={styles.greeting}>{greeting},</Text>
                            {/* DO NOT REMOVE — intentional metallic gradient effect on the name, 
                                do not simplify to a plain Text component during unrelated edits */}
                            <MetallicText text={displayName.toUpperCase()} style={styles.name} height={42} />
                        </View>

                        <View style={styles.avatarContainer}>
                            <TouchableOpacity
                                style={styles.profileCircle}
                                onPressIn={handleAvatarPressIn}
                                onPressOut={handleAvatarPressOut}
                                activeOpacity={0.85}
                            >
                                {profile?.photoURL ? (
                                    <Image source={{ uri: profile.photoURL }} style={styles.headerAvatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <LiveStatusStrip total={total} streak={streak} xp={xp} />

                    {/* Action Shortcut Bar */}
                    <Animated.View
                        style={{
                            opacity: navAnim,
                            transform: [{
                                translateY: navAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                            }],
                        }}
                    >
                        <View style={styles.shortcutRow}>
                            <TouchableOpacity
                                style={styles.shortcutItem}
                                onPress={() => navigation.navigate("AICoach")}
                                activeOpacity={0.7}
                            >
                                <View style={styles.shortcutIconBox}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.textSub} />
                                </View>
                                <Text style={styles.shortcutLabel}>Coach</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.shortcutItem}
                                onPress={() => navigation.navigate("History")}
                                activeOpacity={0.7}
                            >
                                <View style={styles.shortcutIconBox}>
                                    <Ionicons name="time-outline" size={18} color={COLORS.textSub} />
                                </View>
                                <Text style={styles.shortcutLabel}>History</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.shortcutItem}
                                onPress={() => navigation.navigate("Settings")}
                                activeOpacity={0.7}
                            >
                                <View style={styles.shortcutIconBox}>
                                    <Ionicons name="settings-outline" size={18} color={COLORS.textSub} />
                                </View>
                                <Text style={styles.shortcutLabel}>Settings</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.shortcutItem}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setStreakAnalyticsVisible(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={styles.shortcutIconBox}>
                                    <Ionicons name="flame-outline" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.shortcutLabel}>Streak</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>

                {/* Active Workout Resume Banner */}
                {activeSession && activeSession.day && Array.isArray(activeSession.day.exercises) && (
                    <TouchableOpacity
                        style={styles.resumeCard}
                        activeOpacity={0.9}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate("ActiveWorkout", { day: activeSession.day, resume: true });
                        }}
                    >
                        <View style={styles.resumeIconBox}>
                            <Ionicons name="play" size={18} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={styles.resumeDot} />
                                <Text style={styles.resumeTag}>SESSION IN PROGRESS</Text>
                            </View>
                            <Text style={styles.resumeTitle}>{String(activeSession.day?.dayName || activeSession.day?.target || activeSession.day?.day || "Active Workout")}</Text>
                            <Text style={styles.resumeSub}>Tap to pick up where you left off</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.resumeDiscardBtn}
                            onPress={async () => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await clearActiveWorkoutSession();
                                setActiveSession(null);
                            }}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Ionicons name="close" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}

                {initialLoading ? (
                    <View style={{ width: "100%" }}>
                        {/* Hero Card Skeleton */}
                        <SkeletonBlock
                            width="100%"
                            height={220}
                            borderRadius={0}
                            index={0}
                            style={{ alignSelf: "stretch" }}
                        />

                        {/* Unified Dashboard Card Skeleton */}
                        <SkeletonBlock
                            width="auto"
                            height={88}
                            borderRadius={18}
                            index={1}
                            style={{ marginHorizontal: SPACING.base, marginTop: 14 }}
                        />

                        {/* 7-Day Consistency Grid Skeleton */}
                        <SkeletonBlock
                            width="auto"
                            height={126}
                            borderRadius={RADIUS.lg}
                            index={2}
                            style={{ marginHorizontal: SPACING.base, marginTop: 12 }}
                        />
                    </View>
                ) : (
                    <Animated.View style={{ opacity: contentFadeAnim }}>
                        {/* ── Today's Workout Hero Card (Focal Point) ── */}
                        <Animated.View
                            style={{
                                opacity: heroAnim,
                                transform: [{
                                    translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })
                                }],
                            }}
                        >
                            {todayWorkout ? (
                                <TouchableOpacity
                                    style={styles.heroCard}
                                    activeOpacity={0.9}
                                    onPress={() => navigation.navigate("WorkoutDetail", { day: todayWorkout })}
                                >
                                    <ImageBackground
                                        source={todayWorkout.headerImage || require("../../assets/home_hero_bg.png")}
                                        style={StyleSheet.absoluteFill}
                                        resizeMode="cover"
                                    >
                                        <LinearGradient
                                            colors={["rgba(0,0,0,0.3)", "rgba(10,10,11,0.85)", "rgba(10,10,11,0.98)"]}
                                            style={StyleSheet.absoluteFill}
                                        />

                                        {/* Large Faded Day Number in Background */}
                                        <Text
                                            style={styles.heroBgNumber}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit={false}
                                            pointerEvents="none"
                                        >
                                            {todayWorkout.day < 10 ? `0${todayWorkout.day}` : todayWorkout.day}
                                        </Text>

                                        <View style={styles.heroContent}>
                                            <View>
                                                <View style={styles.heroBadge}>
                                                    <Svg
                                                        width={total === 0 ? 176 : 164}
                                                        height={26}
                                                        viewBox={`0 0 ${total === 0 ? 176 : 164} 26`}
                                                        style={StyleSheet.absoluteFillObject}
                                                    >
                                                        <Defs>
                                                            <SvgGradient id="heroBadgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                <Stop offset="0%" stopColor="#280A0A" stopOpacity="0.95" />
                                                                <Stop offset="100%" stopColor="#3C1A0C" stopOpacity="0.95" />
                                                            </SvgGradient>
                                                        </Defs>
                                                        <Polygon points={`0,0 ${total === 0 ? 164 : 152},0 ${total === 0 ? 176 : 164},26 0,26`} fill="url(#heroBadgeGrad)" stroke="rgba(255, 100, 40, 0.4)" strokeWidth={1} />
                                                    </Svg>
                                                    <View style={styles.heroBadgeContent}>
                                                        <View style={styles.heroBadgeDot} />
                                                        <Text style={styles.heroBadgeText}>
                                                            {total === 0 ? "START HERE · DAY 01" : `TODAY · DAY 0${todayWorkout.day}`}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit>
                                                    {total === 0 ? "READY WHEN YOU ARE" : (todayWorkout.dayName ? todayWorkout.dayName.toUpperCase() : (todayWorkout.target.toUpperCase().includes("DAY") ? todayWorkout.target.toUpperCase() : `${todayWorkout.target.toUpperCase()} (HEAVY)`))}
                                                </Text>
                                                <Text style={styles.heroSub}>
                                                    {total === 0 ? `Your 6-day split begins with ${todayWorkout.target.toLowerCase()}` : "6-day split · pull & push combined"}
                                                </Text>
                                            </View>

                                            <View style={styles.heroMetaRow}>
                                                <View style={{ flexDirection: "row", gap: 20 }}>
                                                    <View style={styles.heroMeta}>
                                                        <Text style={styles.heroMetaLabel}>VOLUME</Text>
                                                        <Text style={styles.heroMetaValue}>{todayWorkout.exercises.length} EX</Text>
                                                    </View>
                                                    <View style={styles.heroMeta}>
                                                        <Text style={styles.heroMetaLabel}>DURATION</Text>
                                                        <Text style={styles.heroMetaValue}>{totalTime(todayWorkout)} MIN</Text>
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.heroCta}
                                                    activeOpacity={0.85}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                        navigation.navigate("WorkoutDetail", { day: todayWorkout });
                                                    }}
                                                >
                                                    <Svg
                                                        width={total === 0 ? 180 : 128}
                                                        height={42}
                                                        viewBox={`0 0 ${total === 0 ? 180 : 128} 42`}
                                                        style={StyleSheet.absoluteFillObject}
                                                    >
                                                        <Polygon points={`10,0 ${total === 0 ? 180 : 128},0 ${total === 0 ? 180 : 128},42 0,42`} fill={COLORS.primary} />
                                                    </Svg>
                                                    <Text style={styles.heroCtaText}>
                                                        {total === 0 ? "Start your first session ›" : "Start session ›"}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </ImageBackground>
                                </TouchableOpacity>
                            ) : (
                                <RestDayCard navigation={navigation} />
                            )}
                        </Animated.View>

                        {/* ── Unified Dashboard Card ── */}
                        {(() => {
                            const currentRank = getRankData(total);
                            const nextRank = currentRank.index < RANKS.length - 1 ? RANKS[currentRank.index + 1] : null;
                            const progressInRank = nextRank
                                ? Math.min((total - currentRank.min) / (nextRank.min - currentRank.min), 1)
                                : 1;
                            const progressPercent = total === 0 ? 0 : Math.round(progressInRank * 100);
                            const radius = 36;
                            const strokeWidth = 4.5;
                            const circumference = 2 * Math.PI * radius; // ~226.19
                            const strokeDashoffset = total === 0 ? circumference : (circumference - (circumference * progressInRank));
                            const categoryColor = total === 0 ? "rgba(255,255,255,0.08)" : (todayWorkout?.target ? getMuscleColor(todayWorkout.target) : COLORS.primary);

                            return (
                                <View style={[styles.dashboardCard, { borderColor: `${categoryColor}4D` }]}>
                                    {/* Subtle Matte Linear Gradient */}
                                    <LinearGradient
                                        colors={[COLORS.bgCard, COLORS.bgRaised]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFillObject}
                                        pointerEvents="none"
                                    />

                                    {/* Left: SVG Rank Progress Ring */}
                                    <TouchableOpacity
                                        style={styles.dashboardRingWrapper}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            navigation.navigate("Rank");
                                        }}
                                    >
                                        <Svg width={86} height={86} style={{ transform: [{ rotate: "-90deg" }] }}>
                                            <Circle
                                                cx={43}
                                                cy={43}
                                                r={radius}
                                                stroke="rgba(255,255,255,0.06)"
                                                strokeWidth={strokeWidth}
                                                fill="none"
                                            />
                                            <Circle
                                                cx={43}
                                                cy={43}
                                                r={radius}
                                                stroke={total === 0 ? "rgba(255,255,255,0.06)" : (currentRank.color || COLORS.primary)}
                                                strokeWidth={strokeWidth}
                                                fill="none"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                            />
                                        </Svg>
                                        <View style={styles.dashboardRingTextContainer} pointerEvents="none">
                                            <Text style={[styles.dashboardRingPercent, total === 0 && { color: COLORS.textMuted }]}>
                                                {total === 0 ? "0%" : `${progressPercent}%`}
                                            </Text>
                                            <Text style={styles.dashboardRingLabel}>PROGRESS</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Right: 3 Stats Cells */}
                                    <View style={styles.dashboardStatsRow}>
                                        {/* Streak Cell */}
                                        <TouchableOpacity
                                            style={styles.dashboardStatCell}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setStreakAnalyticsVisible(true);
                                            }}
                                        >
                                            <Ionicons
                                                name="flame"
                                                size={14}
                                                color={total === 0 ? COLORS.textMuted : "#FF9500"}
                                                style={{ marginBottom: 3 }}
                                            />
                                            <Text style={styles.dashboardStatLabel}>STREAK</Text>
                                            <Text
                                                style={[
                                                    styles.dashboardStatValue,
                                                    { color: total === 0 ? COLORS.textMuted : "#FF9500" }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {total === 0 ? "0D" : `${streak}D`}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Diagonal Divider */}
                                        <Svg width={10} height={38} style={{ marginHorizontal: 2 }}>
                                            <Line x1="7" y1="0" x2="3" y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeLinecap="round" />
                                        </Svg>

                                        {/* Sessions Cell */}
                                        <View style={styles.dashboardStatCell}>
                                            <Ionicons
                                                name="checkmark-done"
                                                size={14}
                                                color={total === 0 ? COLORS.textMuted : COLORS.textSub}
                                                style={{ marginBottom: 3 }}
                                            />
                                            <Text style={styles.dashboardStatLabel}>SESSIONS</Text>
                                            <Text
                                                style={[
                                                    styles.dashboardStatValue,
                                                    { color: total === 0 ? COLORS.textMuted : "#FFFFFF" }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {total}
                                            </Text>
                                        </View>

                                        {/* Diagonal Divider */}
                                        <Svg width={10} height={38} style={{ marginHorizontal: 2 }}>
                                            <Line x1="7" y1="0" x2="3" y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeLinecap="round" />
                                        </Svg>

                                        {/* Rank Cell */}
                                        <TouchableOpacity
                                            style={styles.dashboardStatCell}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                navigation.navigate("Rank");
                                            }}
                                        >
                                            <Ionicons
                                                name={currentRank.icon}
                                                size={14}
                                                color={total === 0 ? COLORS.textMuted : currentRank.color}
                                                style={{ marginBottom: 3 }}
                                            />
                                            <Text style={styles.dashboardStatLabel}>RANK</Text>
                                            <Text
                                                style={[
                                                    styles.dashboardStatValue,
                                                    styles.dashboardRankValue,
                                                    { color: total === 0 ? COLORS.textMuted : currentRank.color }
                                                ]}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                            >
                                                {currentRank.title}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* ── 7-Day Consistency Grid Card ── */}
                        <TouchableOpacity
                            style={styles.consistencyCard}
                            activeOpacity={0.88}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setStreakAnalyticsVisible(true);
                            }}
                        >
                            <LinearGradient
                                colors={[COLORS.bgCard, COLORS.bgRaised]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                                pointerEvents="none"
                            />
                            <View style={styles.consistencyHeader}>
                                <View>
                                    <Text style={styles.consistencyTitle}>THIS WEEK</Text>
                                    <Text style={styles.consistencySubtitle}>Colored by muscle group</Text>
                                </View>
                                <View style={styles.consistencyBadge}>
                                    <Text style={styles.consistencyBadgeText}>
                                        <Text style={{ fontFamily: FAMILY.monoBold, color: total === 0 ? COLORS.textMuted : COLORS.text }}>
                                            {total === 0 ? 0 : completedDays.length}
                                        </Text>/6 SESSIONS
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.consistencyGridContainer}>
                                {DAY_LABELS.map((label, index) => {
                                    const dayNum = index + 1;
                                    const isCompleted = total > 0 && completedDays.includes(dayNum);
                                    const isDayFrozen = total > 0 && freezeDays.includes(dayNum);
                                    const isToday = total > 0 && todayDay === dayNum;
                                    const isSunday = dayNum === 7;
                                    const dayTarget = isSunday ? "Active Recovery" : (completedTargets[dayNum] || (WORKOUT_PLAN.find(d => d.day === dayNum)?.target));
                                    const muscleColor = isSunday ? "#30D158" : getMuscleColor(dayTarget);

                                    return (
                                        <View key={label} style={styles.gridCellWrapper}>
                                            <Text style={[
                                                styles.gridCellDayLabel,
                                                isToday && { color: muscleColor, fontFamily: FAMILY.bold },
                                                isCompleted && { color: COLORS.text, fontFamily: FAMILY.bold }
                                            ]}>
                                                {label[0]}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.gridCircle,
                                                    isCompleted && {
                                                        backgroundColor: muscleColor,
                                                        borderColor: "rgba(255, 255, 255, 0.25)",
                                                    },
                                                    isToday && !isCompleted && {
                                                        borderColor: isSunday ? "rgba(48, 209, 88, 0.6)" : muscleColor,
                                                        borderWidth: 2,
                                                        backgroundColor: isSunday ? "rgba(48, 209, 88, 0.12)" : `${muscleColor}1F`,
                                                    },
                                                    isDayFrozen && styles.gridCircleFrozen,
                                                    !isCompleted && !isDayFrozen && !isToday && styles.gridCircleInactive,
                                                ]}
                                            >
                                                {isCompleted ? (
                                                    <Ionicons name="flash" size={13} color="#FFFFFF" />
                                                ) : isDayFrozen ? (
                                                    <Ionicons name="snow" size={12} color="#30B0C7" />
                                                ) : isToday ? (
                                                    isSunday ? (
                                                        <Ionicons name="moon" size={12} color="#30D158" />
                                                    ) : (
                                                        <View style={[styles.gridCircleTodayDot, { backgroundColor: muscleColor }]} />
                                                    )
                                                ) : isSunday ? (
                                                    <Ionicons name="moon-outline" size={11} color="rgba(255, 255, 255, 0.15)" />
                                                ) : null}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Legend Row */}
                            <View style={styles.consistencyLegendRow}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#E31E24" }]} />
                                    <Text style={styles.legendText}>Chest/triceps</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
                                    <Text style={styles.legendText}>Back/biceps</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#30B0C7" }]} />
                                    <Text style={styles.legendText}>Shoulders/core</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#D1D1D1" }]} />
                                    <Text style={styles.legendText}>Legs</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* ── Workout Library ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>WORKOUT LIBRARY</Text>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.libraryScroll}
                >
                    {LIBRARY_DAYS.map((day) => {
                        const color = day.isRest ? COLORS.success : getMuscleColor(day.target);
                        return (
                            <TouchableOpacity
                                key={day.day}
                                style={styles.libraryCard}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (day.isRest || day.day === 7) {
                                        navigation.navigate("RestDay");
                                    } else {
                                        navigation.navigate("WorkoutDetail", { day });
                                    }
                                }}
                                activeOpacity={0.75}
                            >
                                <LinearGradient
                                    colors={[`${color}18`, "transparent"]}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 0.85, y: 0.5 }}
                                    style={StyleSheet.absoluteFillObject}
                                    pointerEvents="none"
                                />
                                <View style={[styles.libraryCardSpine, { backgroundColor: color }]} />
                                <View>
                                    <Text style={styles.libraryDayText}>{getLibraryDayCode(day)}</Text>
                                    <Text style={styles.libraryTitleText}>{getLibraryTitle(day)}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.customCard, { marginTop: 10 }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate("ProtocolIntel");
                    }}
                    activeOpacity={0.8}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customTitle}>Plan Intelligence</Text>
                        <Text style={styles.customSub}>The Science · Rules · 12-Week System</Text>
                    </View>
                    <View style={styles.customIconWrap}>
                        <Ionicons name="book-outline" size={18} color={COLORS.text} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.customCard, { marginTop: 10 }]}
                    onPress={() => navigation.navigate("CustomWorkout")}
                    activeOpacity={0.8}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customTitle}>Craft Session</Text>
                        <Text style={styles.customSub}>Design and log your bespoke workout</Text>
                    </View>
                    <View style={styles.customIconWrap}>
                        <Ionicons name="flash-outline" size={18} color={COLORS.text} />
                    </View>
                </TouchableOpacity>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerVersion}>CONQUER ONE · {APP_VERSION}</Text>
                    <Text style={styles.footerAuthor}>BUILT FOR PERFORMANCE BY <Text style={{ color: COLORS.primary, fontFamily: FAMILY.bold }}>VIVASWAN SHETTY</Text></Text>
                </View>
            </ScrollView>

            <Modal
                visible={freezeModal}
                transparent
                animationType="fade"
                onRequestClose={() => setFreezeModal(false)}
            >
                <View style={styles.freezeOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFreezeModal(false)} activeOpacity={1} />
                    <View style={styles.freezeModalContent}>
                        {/* macOS Liquid Glass Gradient */}
                        <LinearGradient
                            colors={['rgba(24, 46, 92, 0.90)', 'rgba(10, 18, 36, 0.96)', 'rgba(5, 8, 18, 0.99)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.2, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Top Gloss Specular Highlight */}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.20)', 'rgba(255, 255, 255, 0.03)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }}
                            pointerEvents="none"
                        />
                        <View style={styles.iceEffect} />

                        <View style={styles.freezeModalHeader}>
                            <View style={styles.snowCircle}>
                                <Ionicons name="snow" size={38} color="#60A5FA" />
                            </View>
                            <Text style={styles.freezeStatus}>STREAK FROZEN</Text>
                            <Text style={styles.freezeTitle}>RECOVERY MODE ACTIVE</Text>
                        </View>

                        <Text style={styles.freezeDesc}>
                            Your {streak}-day streak is locked in. No matter what happens today, your progress remains untouchable. Rest up, Athlete.
                        </Text>

                        <View style={styles.protectionBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#60A5FA" />
                            <Text style={styles.protectionText}>SHIELD ACTIVE · 24H PROTECTED</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.freezeCloseBtn}
                            onPress={() => setFreezeModal(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.freezeCloseText}>UNDERSTOOD</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.unfreezeLink}
                            onPress={handleUnfreeze}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.unfreezeLinkText}>UNFREEZE & WORKOUT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Streak Reset Alert Modal */}
            <Modal
                visible={streakResetModal}
                transparent
                animationType="fade"
                onRequestClose={() => setStreakResetModal(false)}
            >
                <View style={styles.resetOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setStreakResetModal(false)} activeOpacity={1} />
                    <View style={styles.resetModalContent}>
                        {/* macOS Liquid Glass Gradient */}
                        <LinearGradient
                            colors={['rgba(36, 36, 44, 0.94)', 'rgba(16, 16, 20, 0.98)', 'rgba(8, 8, 10, 0.99)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.2, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Top Gloss Specular Highlight */}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }}
                            pointerEvents="none"
                        />
                        <View style={styles.resetGlowEffect} />

                        <View style={styles.resetModalHeader}>
                            <View style={styles.brokenFlameCircle}>
                                <Ionicons name="flame" size={36} color={COLORS.textSub} />
                            </View>
                            <Text style={styles.resetStatus}>STREAK RESET</Text>
                            <Text style={styles.resetTitle}>DISCIPLINE INTERRUPTED</Text>
                        </View>

                        <Text style={styles.resetDesc}>
                            Your consecutive <Text style={{ color: COLORS.text, fontFamily: FAMILY.monoBold }}>{prevStreak}-day</Text> workout streak has been broken. Your streak resets after a missed day.
                        </Text>

                        <View style={styles.warningBadge}>
                            <Ionicons name="alert-circle-outline" size={14} color={COLORS.textSub} />
                            <Text style={styles.warningBadgeText}>STREAK CLASSIFIED: 0 DAYS</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.resetCloseBtn}
                            onPress={() => {
                                setStreakResetModal(false);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.resetCloseText}>RESTART STREAK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Streak Analytics Modal Sheet */}
            <Modal
                visible={streakAnalyticsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setStreakAnalyticsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setStreakAnalyticsVisible(false)}
                        activeOpacity={1}
                    />
                    <View style={styles.modalSheet}>
                        <LinearGradient
                            colors={["rgba(26, 26, 32, 0.96)", "rgba(10, 10, 12, 0.99)"]}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Top Gloss Specular Highlight */}
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
                            pointerEvents="none"
                        />

                        {/* Drag Handle */}
                        <View style={styles.dragHandle} />

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="flame" size={18} color="#FF9500" />
                                <Text style={styles.modalHeaderTitle}>STREAK INTELLIGENCE</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setStreakAnalyticsVisible(false)}
                            >
                                <Ionicons name="close" size={18} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                            {/* Summary Metrics */}
                            {(() => {
                                const tierInfo = getStreakTierInfo(streak);
                                return (
                                    <View style={styles.summaryMetricsRow}>
                                        <View style={[styles.metricCard, { borderColor: "rgba(255, 149, 0, 0.35)" }]}>
                                            <LinearGradient
                                                colors={["rgba(255, 149, 0, 0.10)", "transparent"]}
                                                style={StyleSheet.absoluteFillObject}
                                                pointerEvents="none"
                                            />
                                            <View style={styles.metricHeaderRow}>
                                                <Text style={styles.metricLabel}>ACTIVE STREAK</Text>
                                                <Ionicons name="flame" size={14} color="#FF9500" />
                                            </View>
                                            <Text style={[styles.metricValue, { color: "#FF9500" }]}>
                                                {streak} <Text style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FAMILY.mono }}>DAYS</Text>
                                            </Text>
                                            <Text style={[styles.metricSub, { color: tierInfo.color, fontFamily: FAMILY.monoBold }]}>{tierInfo.name} TIER ACTIVE</Text>
                                        </View>
                                        <View style={styles.metricCard}>
                                            <LinearGradient
                                                colors={["rgba(255, 255, 255, 0.03)", "transparent"]}
                                                style={StyleSheet.absoluteFillObject}
                                                pointerEvents="none"
                                            />
                                            <View style={styles.metricHeaderRow}>
                                                <Text style={styles.metricLabel}>ALL-TIME RECORD</Text>
                                                <Ionicons name="trophy-outline" size={14} color={COLORS.accent} />
                                            </View>
                                            <Text style={[styles.metricValue, { color: COLORS.text }]}>
                                                {recordStreak} <Text style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FAMILY.mono }}>DAYS</Text>
                                            </Text>
                                            <Text style={styles.metricSub}>RECORD TO BEAT</Text>
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* SVG Consistency Graph */}
                            {renderSvgChart(getWeeklyHistoryData(history))}

                            {/* Monthly Progress Calendar */}
                            <View style={{ marginVertical: 12 }}>
                                <Text style={styles.modalSectionTitle}>MONTHLY PROGRESS CALENDAR</Text>
                                <WorkoutCalendar history={history} style={{ marginTop: 8 }} />
                            </View>

                            {/* Tiers Breakdown */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>STREAK TIERS & XP MULTIPLIERS</Text>
                                {["SPARK", "IGNITION", "OVERLOAD", "TITAN"].map((tName) => {
                                    let tierRange = "";
                                    let tierMult = "";
                                    let tierCol = "";
                                    let isActive = false;

                                    if (tName === "SPARK") {
                                        tierRange = "1–2 Days";
                                        tierMult = "1.0x XP";
                                        tierCol = streak > 0 ? "#EF4444" : "#6B7280";
                                        isActive = streak > 0 && streak <= 2;
                                    } else if (tName === "IGNITION") {
                                        tierRange = "3–4 Days";
                                        tierMult = "1.2x XP";
                                        tierCol = "#F97316";
                                        isActive = streak >= 3 && streak <= 4;
                                    } else if (tName === "OVERLOAD") {
                                        tierRange = "5–9 Days";
                                        tierMult = "1.5x XP";
                                        tierCol = "#EAB308";
                                        isActive = streak >= 5 && streak <= 9;
                                    } else if (tName === "TITAN") {
                                        tierRange = "10+ Days";
                                        tierMult = "2.0x XP";
                                        tierCol = "#A855F7";
                                        isActive = streak >= 10;
                                    }

                                    return (
                                        <View
                                            key={tName}
                                            style={[
                                                styles.tierRow,
                                                isActive && [styles.tierRowActive, { borderColor: `${tierCol}80`, backgroundColor: `${tierCol}14` }]
                                            ]}
                                        >
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                                <View style={[styles.tierIconWrap, { backgroundColor: `${tierCol}18` }]}>
                                                    <Ionicons name={isActive ? "flame" : "flame-outline"} size={16} color={tierCol} />
                                                </View>
                                                <View>
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                        <Text style={[styles.tierRowName, { color: isActive ? tierCol : COLORS.text }]}>{tName}</Text>
                                                        {isActive && (
                                                            <View style={[styles.activeTierPill, { backgroundColor: tierCol }]}>
                                                                <Text style={styles.activeTierText}>CURRENT</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.tierRowRange}>{tierRange}</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.tierMultiplierBadge, { backgroundColor: `${tierCol}1F`, borderColor: `${tierCol}4D` }]}>
                                                <Text style={[styles.tierMultiplierText, { color: tierCol }]}>{tierMult}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Quick Streak Freeze Action */}
                            <View style={styles.freezeActionSection}>
                                <LinearGradient
                                    colors={isFrozen ? ["rgba(48, 176, 199, 0.14)", "rgba(48, 176, 199, 0.02)"] : ["rgba(255, 255, 255, 0.03)", "transparent"]}
                                    style={StyleSheet.absoluteFillObject}
                                    pointerEvents="none"
                                />
                                <View style={styles.freezeActionTextWrap}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                        <Ionicons name={isFrozen ? "snow" : "shield-checkmark"} size={14} color={isFrozen ? "#30B0C7" : COLORS.primary} />
                                        <Text style={styles.freezeSectionTitle}>STREAK SHIELD STATUS</Text>
                                    </View>
                                    <Text style={styles.freezeSectionDesc}>
                                        {isFrozen
                                            ? "Today is frozen. Missing a session won't break your streak."
                                            : "Freeze today if you need a recovery or rest day. Shields active."}
                                    </Text>
                                    {(() => {
                                        const displayDate = isFrozen ? previousFreezeDate : lastFreezeDate;
                                        if (!displayDate) return null;
                                        try {
                                            const date = new Date(displayDate);
                                            const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
                                            return (
                                                <Text style={styles.previousFreezeText}>
                                                    PREVIOUS SHIELD: {formatted}
                                                </Text>
                                            );
                                        } catch {
                                            return null;
                                        }
                                    })()}
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.freezeToggleButton,
                                        isFrozen ? styles.freezeToggleButtonActive : { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                                    ]}
                                    onPress={handleFreezeToggle}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons
                                        name={isFrozen ? "snow" : "shield-outline"}
                                        size={15}
                                        color="#FFFFFF"
                                    />
                                    <Text style={[styles.freezeToggleText, { color: "#FFFFFF" }]}>
                                        {isFrozen ? "FROZEN (MELT)" : "ACTIVATE"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}


function MomentsGallery({ streak, total, profile = null }) {
    const [expandedMoment, setExpandedMoment] = useState(null);
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (expandedMoment) {
            Animated.timing(anim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            }).start();
        } else {
            anim.setValue(0);
        }
    }, [expandedMoment]);

    const MOMENTS = [
        {
            id: 'start',
            title: 'WORKOUT STARTED',
            sub: 'WELCOME TO CONQUER ONE',
            desc: "Your training regimen is officially live. The hard part is starting, and you've already conquered that. Focus on the next set, the next rep, and the next day. You are built for this.",
            icon: 'shield-checkmark',
            color: COLORS.accent,
            show: true
        },
        {
            id: 'first_blood',
            title: 'FIRST BLOOD',
            sub: 'THE JOURNEY BEGINS',
            desc: "The first session is the most important one. You've officially broken the seal and stepped into the arena. Remember this feeling—it's the foundation of everything you will become.",
            icon: 'skull',
            color: COLORS.accent,
            show: total >= 1
        },
        {
            id: 'streak',
            title: 'STREAK MASTERY',
            sub: `${streak} DAYS OF DISCIPLINE`,
            desc: "Discipline is the bridge between goals and accomplishment. Consistent effort is what separates the elite from the average. Keep building that momentum—your future self is watching.",
            icon: 'flame',
            color: COLORS.accent,
            show: streak >= 3
        },
        {
            id: 'heatwave',
            title: 'HEATWAVE',
            sub: '7 DAY STREAK UNLOCKED',
            desc: "You are officially on fire. Seven days of zero excuses. This isn't a fluke anymore—it's a habit. The momentum is now working for you. Don't let the fire go out.",
            icon: 'bonfire',
            color: COLORS.accent,
            show: streak >= 7
        },
        {
            id: 'elite',
            title: 'CONQUEROR STATUS',
            sub: `${total} SESSIONS COMPLETED`,
            desc: "The archives don't lie. You've consistently shown up and put in the work. You are no longer just 'trying'—you are an athlete in pursuit of absolute performance. Respect the grind.",
            icon: 'trophy',
            color: COLORS.accent,
            show: total >= 10
        },
        {
            id: 'titan',
            title: 'TITAN REACH',
            sub: '50 SESSIONS LOGGED',
            desc: "Halfway to a century. You've moved weights, crushed sets, and evolved. You've proven that you have the endurance for the long game. You are becoming a Titan of the arena.",
            icon: 'medal',
            color: COLORS.accent,
            show: total >= 50
        },
        {
            id: 'century',
            title: 'IRON CENTURY',
            sub: '100 SESSIONS OF POWER',
            desc: "One hundred sessions. A monumental feat of human willpower. You have reconstructed yourself through pure iron and sweat. You are part of the elite 1% who never quit. Legend status.",
            icon: 'trending-up',
            color: COLORS.accent,
            show: total >= 100
        },
        {
            id: 'gratitude',
            title: 'DAILY GRATITUDE',
            sub: 'CHASE PROGRESS, NOT PERFECTION',
            desc: "Take a breath and appreciate what your body is capable of today. Every session is a gift to your future self. Be proud of how far you've come while staying hungry for where you're going.",
            icon: 'heart',
            color: COLORS.accent,
            show: true
        }
    ];

    const today = new Date();
    // Weekly Recap (Available on Sundays)
    if (today.getDay() === 0 || today.getDay() === 1) { // Sunday or Monday
        MOMENTS.push({
            id: 'weekly_recap',
            title: 'WEEKLY EVOLUTION',
            sub: `${streak}D STREAK · ${total} SESSIONS`,
            desc: `Weekly briefing: ${streak}-day streak and ${total} total sessions completed. Rest and recharge for the next cycle.`,
            icon: 'bar-chart',
            color: COLORS.accent,
            show: total > 0
        });
    }

    const dob = profile?.dateOfBirth;
    if (dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        if (today.getDate() === birthDate.getDate() && today.getMonth() === birthDate.getMonth()) {
            MOMENTS.unshift({
                id: 'birthday',
                title: 'HAPPY BIRTHDAY',
                sub: `HAPPY BIRTHDAY, ${profile?.fullName?.split(" ")[0] || "ATHLETE"}!`,
                desc: "A new year of life means a new year of strength. Celebrate how far you've come and take this momentum forward into your next year. Have an incredible day!",
                icon: 'gift',
                color: COLORS.accent,
                show: true
            });
        }
    }

    const activeMoments = MOMENTS.filter(m => m.show).reverse();

    return (
        <>
            <GestureScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14, marginBottom: 8 }}
            >
                {activeMoments.map((m, i) => (
                    <TouchableOpacity
                        key={m.id}
                        style={styles.momentCard}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setExpandedMoment(m);
                        }}
                    >
                        <View style={styles.momentIconWrap}>
                            <Ionicons name={m.icon} size={16} color={COLORS.text} />
                        </View>
                        <View>
                            <Text style={styles.momentTitle}>{m.title}</Text>
                            <Text style={styles.momentSub} numberOfLines={1}>{m.sub}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </GestureScrollView>

            <Modal
                visible={!!expandedMoment}
                transparent
                animationType="none"
                onRequestClose={() => setExpandedMoment(null)}
            >
                <Animated.View style={[styles.momentDetailBlur, { opacity: anim }]}>
                    <LinearGradient
                        colors={["rgba(0,0,0,0.6)", "#000", "#000", "rgba(0,0,0,0.6)"]}
                        locations={[0, 0.2, 0.8, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setExpandedMoment(null)}
                        activeOpacity={1}
                    />
                    <Animated.View style={[
                        styles.momentDetailContent,
                        {
                            opacity: anim.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1] }),
                            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }]
                        }
                    ]}>
                        <LinearGradient
                            colors={["rgba(32, 32, 40, 0.94)", "rgba(14, 14, 18, 0.98)"]}
                            style={styles.momentDetailCard}
                        >
                            {/* Top Gloss Specular Highlight */}
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
                                pointerEvents="none"
                            />
                            <TouchableOpacity
                                style={styles.closeMomentBtn}
                                onPress={() => setExpandedMoment(null)}
                            >
                                <Ionicons name="close" size={20} color={COLORS.text} />
                            </TouchableOpacity>

                            <View style={styles.momentDetailIconWrap}>
                                <Ionicons name={expandedMoment?.icon} size={32} color={COLORS.text} />
                            </View>

                            <Text style={styles.momentDetailTitle}>
                                {expandedMoment?.title}
                            </Text>
                            <Text style={styles.momentDetailSub}>
                                {expandedMoment?.sub}
                            </Text>
                            <Text style={styles.momentDetailDesc}>
                                {expandedMoment?.desc}
                            </Text>

                            <TouchableOpacity
                                style={styles.momentActionBtn}
                                onPress={() => setExpandedMoment(null)}
                            >
                                <Text style={styles.momentActionText}>RECOGNIZED</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.momentShareBtn}
                                onPress={() => Share.share({
                                    message: `🏆 Just hit a milestone: ${expandedMoment?.title}! Training with CONQUER ONE.

Download: https://conquer-one.app`, title: expandedMoment?.title
                                })}
                            >
                                <Ionicons name="share-social-outline" size={14} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                                <Text style={styles.momentShareText}>SHARE ACHIEVEMENT</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </>
    );
}

function RestDayCard({ navigation }) {
    const RECOVERY_PLAN = [
        {
            icon: "walk-outline",
            metric: "10 MIN",
            title: "Active Mobility",
            desc: "Joint flow & dynamic stretching",
        },
        {
            icon: "water-outline",
            metric: "3.0 L",
            title: "Hydration",
            desc: "Baseline water & electrolytes",
        },
        {
            icon: "moon-outline",
            metric: "8-9 HRS",
            title: "Sleep Cycle",
            desc: "Deep restorative cellular repair",
        },
    ];

    return (
        <TouchableOpacity
            style={styles.restCard}
            activeOpacity={0.92}
            onPress={() => navigation.navigate("RestDay")}
        >
            <ImageBackground
                source={require("../../assets/onboarding_bg.png")}
                style={styles.restCardBg}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={["rgba(10,10,11,0.65)", "rgba(10,10,11,0.92)", "rgba(10,10,11,0.98)"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.restContent}>
                    {/* Header Row */}
                    <View style={styles.restEyebrowRow}>
                        <View style={styles.restStatusPill}>
                            <View style={styles.restStatusDot} />
                            <Text style={styles.restEyebrow}>REST & RECOVERY</Text>
                        </View>
                        <Text style={styles.restDayTag}>DAY 07</Text>
                    </View>

                    <Text style={styles.restTitle}>RECOVERY IS{"\n"}THE GOAL.</Text>

                    {/* Rest Protocols */}
                    <View style={styles.restTimeline}>
                        {RECOVERY_PLAN.map((item, i) => (
                            <View key={i} style={styles.restPoint}>
                                <View style={styles.restIconWrap}>
                                    <Ionicons name={item.icon} size={15} color={COLORS.text} />
                                </View>
                                <View style={styles.restPointBody}>
                                    <View style={styles.restPointHeader}>
                                        <Text style={styles.restPointTitle}>{item.title}</Text>
                                        <Text style={styles.restPointMetric}>{item.metric}</Text>
                                    </View>
                                    <Text style={styles.restPointDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Bottom Action Footer */}
                    <View style={styles.restFooterRow}>
                        <Text style={styles.restFooterText}>View Full Protocol</Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    headerRow: {
        paddingHorizontal: SPACING.base,
        marginBottom: 20,
    },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },

    // Live Status Strip
    liveStatusContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
        overflow: "hidden",
    },
    liveStatusText: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        letterSpacing: 1.5,
        color: COLORS.textSub,
        textTransform: "uppercase",
    },

    // Avatar
    avatarContainer: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
    },
    profileCircle: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.12)",
        overflow: "hidden", backgroundColor: "#1C1C1E",
        alignItems: "center", justifyContent: "center",
    },
    headerAvatar: { width: "100%", height: "100%" },
    avatarPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text },

    greeting: {
        fontSize: 13,
        color: COLORS.primary,
        fontFamily: FAMILY.bold,
        letterSpacing: 1.2,
        marginBottom: 2,
        textTransform: "uppercase",
    },
    name: {
        fontSize: 30,
        color: "#FFFFFF",
        fontFamily: FAMILY.bold,
        letterSpacing: 0,
        lineHeight: 36,
    },

    // Action Shortcuts
    shortcutRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 4,
    },
    shortcutItem: {
        alignItems: "center",
        flex: 1,
    },
    shortcutIconBox: {
        width: 58,
        height: 58,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
        alignItems: "center",
        justifyContent: "center",
    },
    shortcutLabel: {
        fontSize: 11,
        fontFamily: FAMILY.medium,
        color: COLORS.textSub,
        marginTop: 8,
        textAlign: "center",
    },

    // Hero Card
    heroCard: {
        width: width,
        height: 220,
        backgroundColor: "#0C0C0E",
        overflow: "hidden",
        marginHorizontal: 0,
        borderRadius: 0,
        alignSelf: "stretch",
    },
    heroBgNumber: {
        position: "absolute",
        top: -35,
        right: 10,
        fontFamily: "BebasNeue_400Regular",
        fontSize: 170,
        lineHeight: 170,
        color: "rgba(255, 255, 255, 0.06)",
        zIndex: 1,
    },
    heroContent: {
        paddingVertical: 22,
        paddingHorizontal: SPACING.base,
        zIndex: 2,
        justifyContent: "space-between",
        flex: 1,
    },
    heroBadge: {
        width: 164,
        height: 26,
        alignSelf: "flex-start",
        marginBottom: 8,
        justifyContent: "center",
    },
    heroBadgeContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 12,
        gap: 8,
    },
    heroBadgeDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: "#FF5E3A",
    },
    heroBadgeText: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },
    heroTitle: {
        fontSize: 26,
        fontFamily: FAMILY.accent2,
        color: "#FFFFFF",
        letterSpacing: 0.6,
        lineHeight: 30,
        marginTop: 4,
    },
    heroSub: {
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        marginTop: 4,
    },
    heroMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 22,
    },
    heroMeta: {
        gap: 2,
    },
    heroMetaLabel: {
        fontSize: 9,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    heroMetaValue: {
        fontSize: 13,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    heroCta: {
        width: 128,
        height: 42,
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 6,
    },
    heroCtaText: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },

    // Unified Horizontal Dashboard Card
    dashboardCard: {
        marginHorizontal: SPACING.base,
        marginTop: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
    },
    dashboardRingWrapper: {
        width: 86,
        height: 86,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    dashboardRingTextContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    dashboardRingPercent: {
        fontSize: 20,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        lineHeight: 22,
        includeFontPadding: false,
        textAlign: "center",
    },
    dashboardRingLabel: {
        fontSize: 8,
        fontFamily: FAMILY.mono,
        letterSpacing: 1.2,
        color: COLORS.textSub,
        lineHeight: 10,
        includeFontPadding: false,
        marginTop: 2,
        textAlign: "center",
    },
    dashboardStatsRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dashboardStatCell: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    dashboardStatLabel: {
        fontSize: 9,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
    },
    dashboardStatValue: {
        fontSize: 22,
        fontFamily: FAMILY.monoBold,
        textAlign: "center",
    },
    dashboardRankValue: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        letterSpacing: 0.3,
    },
    dashboardStatDivider: {
        width: 1,
        height: 32,
        backgroundColor: COLORS.border,
    },

    // 7-Day Consistency Card
    consistencyCard: {
        marginHorizontal: SPACING.base,
        marginTop: 12,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        padding: 18,
        overflow: "hidden",
    },
    consistencyHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    consistencyTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        letterSpacing: 0.8,
        color: COLORS.text,
    },
    consistencySubtitle: {
        fontSize: 10.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        marginTop: 1,
    },
    consistencyBadge: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    consistencyBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
    consistencyGridContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    gridCellWrapper: {
        alignItems: "center",
        gap: 8,
    },
    gridCellDayLabel: {
        fontFamily: FAMILY.medium,
        fontSize: 11,
        color: COLORS.textMuted,
        textAlign: "center",
    },
    gridCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    gridCircleToday: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
    },
    gridCircleTodayDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    gridCircleFrozen: {
        borderColor: "rgba(48, 176, 199, 0.4)",
        backgroundColor: "rgba(48, 176, 199, 0.12)",
    },
    gridCircleInactive: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    consistencyLegendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
        marginTop: 16,
        paddingTop: 14,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        fontFamily: FAMILY.medium,
        color: COLORS.textSub,
    },

    // Streak Analytics Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        width: "100%",
        height: "82%",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.14)",
        borderBottomWidth: 0,
        backgroundColor: "rgba(20, 20, 24, 0.95)",
        overflow: "hidden",
        paddingTop: 12,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignSelf: "center",
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
    },
    modalHeaderTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 16,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    modalScrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        paddingTop: 20,
    },
    summaryMetricsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 22,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.10)",
        padding: 16,
        overflow: "hidden",
    },
    metricHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
    },
    metricLabel: {
        fontFamily: FAMILY.bold,
        fontSize: 10,
        color: COLORS.textSub,
        letterSpacing: 1.2,
    },
    metricValue: {
        fontFamily: FAMILY.monoBold,
        fontSize: 22,
        marginVertical: 4,
        color: COLORS.text,
    },
    metricSub: {
        fontFamily: FAMILY.regular,
        fontSize: 9.5,
        color: COLORS.textMuted,
    },
    chartWrapper: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 20,
    },
    chartHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    chartTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 12.5,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    chartSubTitle: {
        fontSize: 10,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        marginTop: 1,
    },
    chartBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.25)",
    },
    chartBadgeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    chartBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
    svgContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    chartLabelsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        marginTop: 8,
    },
    chartLabelText: {
        fontFamily: FAMILY.mono,
        fontSize: 8.5,
        color: COLORS.textMuted,
    },
    modalSection: {
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 12.5,
        color: COLORS.text,
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    tierRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        marginBottom: 8,
    },
    tierRowActive: {
        borderWidth: 1.5,
    },
    tierIconWrap: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    tierRowName: {
        fontFamily: FAMILY.bold,
        fontSize: 13,
        color: COLORS.text,
    },
    activeTierPill: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: RADIUS.xs,
    },
    activeTierText: {
        fontSize: 8,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    tierRowRange: {
        fontFamily: FAMILY.mono,
        fontSize: 10,
        color: COLORS.textSub,
    },
    tierMultiplierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tierMultiplierText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
    },
    freezeActionSection: {
        flexDirection: "row",
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        overflow: "hidden",
    },
    freezeActionTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    freezeSectionTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 13,
        color: COLORS.text,
        marginBottom: 4,
    },
    freezeSectionDesc: {
        fontFamily: FAMILY.regular,
        fontSize: 11,
        color: COLORS.textSub,
        lineHeight: 16,
    },
    previousFreezeText: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textSub,
        marginTop: 6,
    },
    freezeToggleButton: {
        paddingHorizontal: 14,
        height: 38,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    freezeToggleButtonActive: {
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.4)",
    },
    freezeToggleText: {
        fontFamily: FAMILY.bold,
        fontSize: 11,
        color: COLORS.text,
    },

    // Section headers
    sectionHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
        paddingHorizontal: SPACING.base, marginBottom: 12, marginTop: 24,
    },
    sectionLabel: {
        fontSize: 16, fontFamily: FAMILY.accent2, color: COLORS.text, letterSpacing: 0.6,
    },

    // Rest Card
    restCard: {
        marginHorizontal: SPACING.base,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        marginBottom: 20,
        marginTop: 4,
    },
    restCardBg: {
        width: "100%",
    },
    restContent: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    restEyebrowRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    restStatusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(48, 209, 88, 0.12)",
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.25)",
    },
    restStatusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#30D158",
    },
    restEyebrow: {
        fontSize: 9, fontFamily: FAMILY.bold,
        color: "#30D158", letterSpacing: 1.2,
    },
    restDayTag: {
        fontSize: 10, fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted, letterSpacing: 1,
    },
    restTitle: {
        fontSize: 28, fontFamily: FAMILY.bold,
        color: COLORS.text, lineHeight: 32, marginBottom: 18, letterSpacing: -0.5,
    },
    restTimeline: { gap: 9, marginBottom: 16 },
    restPoint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: RADIUS.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    restIconWrap: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    restPointBody: { flex: 1 },
    restPointHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    restPointTitle: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.2,
    },
    restPointMetric: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    restPointDesc: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    restFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        marginTop: 4,
    },
    restFooterText: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },

    // Week Grid
    weekCell: {
        width: 104, paddingVertical: 18, paddingHorizontal: 12,
        borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: COLORS.border, alignItems: "center", gap: 6,
        overflow: "hidden",
    },
    weekCellActive: {
        backgroundColor: "rgba(237, 234, 227, 0.06)",
        borderColor: COLORS.border,
    },
    weekDay: { fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    weekDayActive: { color: COLORS.text },
    weekTarget: { fontSize: 12, color: COLORS.text, fontFamily: FAMILY.medium, textAlign: "center", width: "100%" },
    activeIndicator: {
        position: "absolute", bottom: 8, width: 4, height: 4,
        borderRadius: 2, backgroundColor: COLORS.accent
    },

    // Muscle Legend
    muscleLegendRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: SPACING.base,
        marginBottom: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 10,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
    },

    // Library Horizontal Cards
    libraryScroll: {
        paddingHorizontal: SPACING.base,
        gap: 12,
        paddingBottom: 4,
    },
    libraryCard: {
        width: 142,
        height: 104,
        backgroundColor: COLORS.bgCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingTop: 16,
        paddingBottom: 14,
        paddingHorizontal: 16,
        paddingLeft: 18,
        justifyContent: "flex-start",
        position: "relative",
        overflow: "hidden",
    },
    libraryCardSpine: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3.5,
    },
    libraryDayText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: "rgba(255, 255, 255, 0.45)",
        letterSpacing: 1.2,
        marginBottom: 6,
    },
    libraryTitleText: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        lineHeight: 19,
        letterSpacing: -0.2,
    },

    customCard: {
        marginHorizontal: SPACING.base, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
        padding: 20,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    customTitle: { fontSize: 16, fontFamily: FAMILY.semibold, color: COLORS.text },
    customSub: { fontSize: 11, color: COLORS.textSub, marginTop: 4, fontFamily: FAMILY.regular },
    customIconWrap: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: "rgba(237, 234, 227, 0.05)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: COLORS.border,
    },

    // Moments
    momentCard: {
        width: 180, height: 110, padding: 16, borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
        justifyContent: "space-between", overflow: "hidden"
    },
    momentIconWrap: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: "rgba(237, 234, 227, 0.06)", alignItems: "center", justifyContent: "center" },
    momentTitle: { fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.textSub, letterSpacing: 1, marginBottom: 4 },
    momentSub: { fontSize: 13, fontFamily: FAMILY.semibold, color: COLORS.text },

    // Moment Detail
    momentDetailBlur: { flex: 1, justifyContent: "center", alignItems: "center" },
    momentDetailContent: { width: '90%', maxWidth: 400 },
    momentDetailCard: {
        borderRadius: 28, padding: 24, alignItems: "center",
        borderWidth: 1.2, borderColor: "rgba(255, 255, 255, 0.16)",
        backgroundColor: "rgba(22, 22, 26, 0.92)",
        overflow: "hidden",
    },
    closeMomentBtn: { position: "absolute", top: 16, right: 16, padding: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: RADIUS.pill, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.12)" },
    momentDetailIconWrap: { width: 64, height: 64, borderRadius: RADIUS.pill, backgroundColor: "rgba(255, 255, 255, 0.08)", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.14)" },
    momentDetailTitle: { fontSize: 10, fontFamily: FAMILY.semibold, letterSpacing: 2, marginBottom: 8, color: COLORS.textSub },
    momentDetailSub: { fontSize: 20, fontFamily: FAMILY.bold, color: COLORS.text, textAlign: "center", marginBottom: 16, lineHeight: 24 },
    momentDetailDesc: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, textAlign: "center", lineHeight: 20, marginBottom: 24 },
    momentActionBtn: { width: '100%', height: 50, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
    momentActionText: { fontSize: 12, fontFamily: FAMILY.semibold, color: COLORS.text, letterSpacing: 1 },
    momentShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14, paddingVertical: 8 },
    momentShareText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textSub },

    // Freeze Modal
    freezeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    freezeModalContent: {
        width: '100%', maxWidth: 380, borderRadius: 28, padding: 26, alignItems: 'center',
        borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.18)', backgroundColor: 'rgba(16, 26, 48, 0.85)',
        overflow: 'hidden',
    },
    snowCircle: {
        width: 68, height: 68, borderRadius: RADIUS.pill, backgroundColor: 'rgba(96, 165, 250, 0.12)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        borderWidth: 1.2, borderColor: 'rgba(96, 165, 250, 0.25)',
    },
    freezeStatus: { fontSize: 9.5, fontFamily: FAMILY.semibold, color: '#93C5FD', letterSpacing: 2, marginBottom: 6 },
    freezeTitle: { fontSize: 20, fontFamily: FAMILY.bold, color: COLORS.text, textAlign: 'center', lineHeight: 24 },
    freezeDesc: {
        fontSize: 13, fontFamily: FAMILY.regular, color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center', lineHeight: 20, marginBottom: 20
    },
    protectionBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(96, 165, 250, 0.10)', paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: RADIUS.pill, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.22)'
    },
    protectionText: { fontSize: 10, fontFamily: FAMILY.semibold, color: '#BFDBFE', letterSpacing: 0.5 },
    freezeCloseBtn: {
        width: '100%', height: 50, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center'
    },
    freezeCloseText: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1 },
    unfreezeLink: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 16 },
    unfreezeLinkText: { fontSize: 11, fontFamily: FAMILY.semibold, color: 'rgba(255, 255, 255, 0.45)', letterSpacing: 0.8 },
    
    // Footer
    footer: { alignItems: "center", marginTop: 20, paddingHorizontal: SPACING.base },
    footerDivider: { width: 28, height: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", marginBottom: 10 },
    footerVersion: { fontSize: 9.5, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginBottom: 3 },
    footerAuthor: { fontSize: 8.5, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 0.4 },

    // Streak Reset Modal Styles
    resetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    resetModalContent: {
        width: '100%', maxWidth: 380, borderRadius: 28, padding: 26, alignItems: 'center',
        borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.16)', backgroundColor: 'rgba(24, 24, 28, 0.88)',
        overflow: 'hidden',
    },
    brokenFlameCircle: {
        width: 68, height: 68, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    resetStatus: { fontSize: 9.5, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
    resetTitle: { fontSize: 20, fontFamily: FAMILY.bold, color: COLORS.text, textAlign: 'center', lineHeight: 24 },
    resetDesc: {
        fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub,
        textAlign: 'center', lineHeight: 20, marginBottom: 20
    },
    warningBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: RADIUS.pill, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)'
    },
    warningBadgeText: { fontSize: 10, fontFamily: FAMILY.semibold, color: COLORS.textSub, letterSpacing: 0.5 },
    resetCloseBtn: {
        width: '100%', height: 50, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    resetCloseText: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1 },

    // Resume Card Styles
    resumeCard: {
        width: "100%", backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary,
        padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
        marginBottom: 16,
    },
    resumeIconBox: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: "rgba(122, 46, 34, 0.15)", borderWidth: 1, borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center",
    },
    resumeDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary,
    },
    resumeTag: { fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.primary, letterSpacing: 1 },
    resumeTitle: { fontSize: 15, fontFamily: FAMILY.semibold, color: COLORS.text, marginTop: 2 },
    resumeSub: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    resumeDiscardBtn: {
        width: 26, height: 26, borderRadius: RADIUS.pill,
        backgroundColor: "rgba(237, 234, 227, 0.05)", borderWidth: 1, borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center",
    },
});
