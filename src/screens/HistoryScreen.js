import React, { useState, useCallback, useMemo } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Share,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
import Svg, { Polyline, Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { getWorkoutHistory, getStreak, getTotalWorkouts, formatDuration, getStreakLocal, getTotalWorkoutsLocal, getWorkoutHistoryLocal } from "../utils/storage";
import { WORKOUT_PLAN } from "../data/workoutData";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const CARD_PADDING = 24;
const CHART_W = width - CARD_PADDING * 4;
const CHART_H = 100;

/* ── helpers ─────────────────────────────────────────────── */

/**
 * Safely convert a completedAt value to a JS Date.
 * Handles: Firestore Timestamp (has .seconds), ISO string, Date object.
 */
function toDate(completedAt) {
    if (!completedAt) return new Date(0);
    if (typeof completedAt === 'object' && completedAt.seconds) {
        // Firestore Timestamp
        return new Date(completedAt.seconds * 1000);
    }
    if (completedAt instanceof Date) return completedAt;
    return new Date(completedAt);
}

function getWeekLabel(date) {
    const now = new Date();
    const thisWeek = new Date(now);
    thisWeek.setDate(now.getDate() - now.getDay());
    thisWeek.setHours(0, 0, 0, 0);
    const lastWeek = new Date(thisWeek);
    lastWeek.setDate(thisWeek.getDate() - 7);
    if (date >= thisWeek) return "This Week";
    if (date >= lastWeek) return "Last Week";
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function computeWeeklyData(history) {
    const now = new Date();
    return Array.from({ length: 8 }, (_, w) => {
        const wk = 7 - w;
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - wk * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        const count = history.filter(h => {
            const d = toDate(h.completedAt);
            return d >= start && d < end;
        }).length;
        return { label: wk === 0 ? "NOW" : `W-${wk}`, count };
    });
}

function computePRs(history) {
    const map = {};
    history.forEach(h => {
        if (!map[h.target] || h.durationSec > map[h.target].durationSec) {
            map[h.target] = h;
        }
    });
    return Object.values(map).sort((a, b) => b.durationSec - a.durationSec).slice(0, 3);
}

/* ── Line chart ────────────────────────────────────────────── */
function LineChart({ data }) {
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * CHART_W;
        const y = CHART_H - (d.count / maxVal) * CHART_H * 0.7;
        return { x, y, ...d };
    });
    const polyPoints = pts.map(p => `${p.x},${p.y}`).join(" ");
    const areaPath = `M${pts[0].x},${CHART_H} ` +
        pts.map(p => `L${p.x},${p.y}`).join(" ") +
        ` L${pts[pts.length - 1].x},${CHART_H} Z`;

    return (
        <View style={lc.wrap}>
            <View style={lc.header}>
                <Text style={lc.title}>WEEKLY ACTIVITY</Text>
            </View>
            <Svg width={CHART_W} height={CHART_H + 20}>
                <Defs>
                    <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.15" />
                        <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0.0" />
                    </SvgGradient>
                </Defs>
                <Path d={areaPath} fill="url(#areaGrad)" />
                <Polyline
                    points={polyPoints}
                    fill="none"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={COLORS.primary} />
            </Svg>
            <View style={lc.labels}>
                {pts.map((p, i) => (
                    (i === 0 || i === pts.length - 1 || i % 2 === 0) && (
                        <Text key={i} style={lc.label}>{p.label}</Text>
                    )
                ))}
            </View>
        </View>
    );
}

const lc = StyleSheet.create({
    wrap: { paddingTop: 4 },
    header: { marginBottom: 24 },
    title: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 2 },
    labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    label: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },
});

/* ── Muscle breakdown bar ───────────────────────────────────── */
function BreakdownBar({ day, count, max }) {
    const pct = max > 0 ? count / max : 0;
    return (
        <View style={bd.row}>
            <Text style={bd.label}>{day.target.split(" ")[0].toUpperCase()}</Text>
            <View style={bd.track}>
                <View style={[bd.fill, { width: `${pct * 100}%`, backgroundColor: COLORS.primary }]} />
            </View>
            <View style={bd.countBox}>
                <Text style={bd.count}>{count}</Text>
            </View>
        </View>
    );
}

const bd = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 16 },
    label: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, width: 80, letterSpacing: 1.5 },
    track: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 2, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 2 },
    countBox: { width: 30, alignItems: "flex-end" },
    count: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.text },
});

/* ── PR card ────────────────────────────────────────────────── */
function PRCard({ pr }) {
    return (
        <View style={pr_s.card}>
            <View style={pr_s.info}>
                <Text style={pr_s.target}>{pr.target.toUpperCase()}</Text>
                <Text style={pr_s.date}>
                    {toDate(pr.completedAt).toLocaleDateString("en-US", { day: "numeric", month: "short" }).toUpperCase()}
                </Text>
            </View>
            <View style={pr_s.right}>
                <Text style={pr_s.duration}>{formatDuration(pr.durationSec)}</Text>
                <Text style={pr_s.label}>BEST TIME</Text>
            </View>
        </View>
    );
}

const pr_s = StyleSheet.create({
    card: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 20, paddingHorizontal: 24,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)",
    },
    info: { flex: 1 },
    target: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },
    date: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: FAMILY.bold, letterSpacing: 1.5 },
    right: { alignItems: "flex-end" },
    duration: { fontSize: 18, fontFamily: FAMILY.display, color: COLORS.primary, letterSpacing: -0.5 },
    label: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: 4 },
});

/* ── History row ────────────────────────────────────────────── */
function HistoryRow({ entry, isLast }) {
    const [expanded, setExpanded] = useState(false);
    const date = toDate(entry.completedAt);
    const dateStr = date.toLocaleDateString("en-US", { day: "numeric", month: "short" }).toUpperCase();
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).toUpperCase();

    const hasExercises = entry.exercises && entry.exercises.length > 0;

    return (
        <TouchableOpacity
            onPress={() => hasExercises && setExpanded(!expanded)}
            activeOpacity={hasExercises ? 0.7 : 1}
        >
            <View style={[hr.row, isLast && !expanded && { borderBottomWidth: 0 }]}>
                <View style={[hr.indicator, expanded && { backgroundColor: COLORS.primary, opacity: 1 }]} />
                <View style={hr.left}>
                    <Text style={hr.target}>{entry.target.toUpperCase()}</Text>
                    <Text style={hr.date}>{dateStr} · {timeStr}</Text>
                </View>
                <View style={hr.right}>
                    <Text style={hr.duration}>{formatDuration(entry.durationSec)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={hr.dayLabel}>
                            {entry.day === 0 ? `CUSTOM · ${entry.exercises?.length || 0} EX` : `DAY ${entry.day}`}
                        </Text>
                        {hasExercises && (
                            <Ionicons
                                name={expanded ? "chevron-up" : "chevron-down"}
                                size={12}
                                color={COLORS.textMuted}
                            />
                        )}
                    </View>
                </View>
            </View>

            {expanded && hasExercises && (
                <View style={hr.detailLines}>
                    {entry.exercises.map((ex, idx) => (
                        <View key={idx} style={hr.exerciseContainer}>
                            <View style={hr.detailRow}>
                                <View style={hr.detailDot} />
                                <Text style={hr.detailText}>
                                    {ex.name.toUpperCase()}{ex.side ? ` (${ex.side})` : ""}
                                </Text>
                                <Text style={hr.detailSets}>{ex.sets} SETS</Text>
                            </View>
                            {ex.loggedSets && ex.loggedSets.some(s => s.completed) ? (
                                <View style={hr.loggedSetsBox}>
                                    {ex.loggedSets.filter(s => s.completed).map((s, sIdx) => (
                                        <View key={sIdx} style={hr.loggedSetRow}>
                                            <Text style={hr.loggedSetLabel}>SET {s.set}</Text>
                                            <View style={hr.loggedSetValBox}>
                                                <Text style={hr.loggedSetVal}>
                                                    {s.weightKg > 0 ? `${s.weightKg} kg` : "Bodyweight"}
                                                    {s.reps > 0 ? ` × ${s.reps} reps` : ""}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    ))}
                    <View style={{ height: 16 }} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const hr = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)",
        gap: 20,
    },
    indicator: { width: 3, height: 32, borderRadius: 1.5, backgroundColor: COLORS.primary, opacity: 0.3 },
    left: { flex: 1 },
    target: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 0.5 },
    date: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: FAMILY.bold, letterSpacing: 1.5 },
    right: { alignItems: "flex-end" },
    duration: { fontSize: 15, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -0.2 },
    dayLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, marginTop: 4, letterSpacing: 1.5 },
    detailLines: {
        paddingLeft: 23,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.03)",
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        gap: 12,
    },
    detailDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.textMuted,
    },
    detailText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        flex: 1,
        letterSpacing: 0.5,
    },
    detailSets: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        opacity: 0.5,
    },
    exerciseContainer: {
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.01)",
    },
    loggedSetsBox: {
        paddingLeft: 15,
        paddingTop: 4,
        paddingBottom: 6,
        gap: 6,
    },
    loggedSetRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    loggedSetLabel: {
        fontSize: 8,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        width: 32,
        letterSpacing: 0.5,
    },
    loggedSetValBox: {
        backgroundColor: "rgba(255,255,255,0.02)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.04)",
    },
    loggedSetVal: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
    },
});

/* ── Main screen ──────────────────────────────────────────── */
export default function HistoryScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
    const [history, setHistory] = useState([]);
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);

    useFocusEffect(useCallback(() => { load(); }, []));
    const load = async () => {
        // 1. Immediate local cache load
        try {
            const cachedHistory = await getWorkoutHistoryLocal();
            const cachedStreak = await getStreakLocal();
            const cachedTotal = await getTotalWorkoutsLocal();
            setHistory(cachedHistory);
            setStreak(cachedStreak);
            setTotal(cachedTotal);
        } catch (e) {
            console.warn("Failed to load cached history in HistoryScreen", e);
        }

        // 2. Background cloud sync
        try {
            const [nextHistory, nextStreak, nextTotal] = await Promise.all([
                getWorkoutHistory(),
                getStreak(),
                getTotalWorkouts(),
            ]);
            setHistory(nextHistory);
            setStreak(nextStreak);
            setTotal(nextTotal);
        } catch (e) {
            console.warn("History background sync failed", e);
        }
    };

    const totalMin = useMemo(() => Math.round(history.reduce((s, h) => s + (h.durationSec || 0), 0) / 60), [history]);
    const weeklyData = useMemo(() => computeWeeklyData(history), [history]);
    const prs = useMemo(() => computePRs(history), [history]);
    const dayCounts = useMemo(() => {
        const counts = {};
        history.forEach((item) => {
            counts[item.day] = (counts[item.day] || 0) + 1;
        });
        return counts;
    }, [history]);
    const maxCount = useMemo(
        () => Math.max(...WORKOUT_PLAN.map((day) => dayCounts[day.day] || 0), 1),
        [dayCounts]
    );
    const groups = useMemo(() => history.reduce((acc, e) => {
        const key = getWeekLabel(toDate(e.completedAt));
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
    }, {}), [history]);

    const exportHistory = async () => {
        if (history.length === 0) {
            showDialog({
                title: "NO DATA",
                message: "Complete some workouts first to export history.",
                confirmText: "CLOSE",
                singleButton: true
            });
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            let csv = "Date,Time,Workout,Duration (min),Exercises\n";
            history.forEach(h => {
                const d = toDate(h.completedAt);
                const date = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
                const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                const dur = Math.round((h.durationSec || 0) / 60);
                const exercises = h.exercises ? h.exercises.map(e => `${e.name} (${e.sets}s)`).join(" | ") : "\u2014";
                csv += `${date},${time},${h.target},${dur},"${exercises}"\n`;
            });

            const summary = `\n\n\ud83d\udcca CONQUER ONE WORKOUT REPORT\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
                `Total Sessions: ${total}\n` +
                `Current Streak: ${streak} days\n` +
                `Total Time: ${totalMin} minutes\n` +
                `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n` + csv;

            await Share.share({
                message: summary,
                title: "CONQUER ONE - Workout History",
            });
        } catch (e) {
            showDialog({
                title: "EXPORT FAILED",
                message: e.message,
                confirmText: "CLOSE",
                singleButton: true
            });
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>HISTORY</Text>
                <TouchableOpacity style={styles.backBtn} onPress={exportHistory} activeOpacity={0.7}>
                    <Ionicons name="share-outline" size={18} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: 60 }}>

                {/* Stats Asymmetric Grid */}
                <View style={styles.statsRow}>
                    <View style={styles.statsLeft}>
                        <View style={styles.statSmall}>
                            <View style={styles.statSmallTop}>
                                <Ionicons name="flame" size={14} color={COLORS.primary} />
                                <Text style={styles.statLabel}>STREAK</Text>
                            </View>
                            <Text style={styles.statValue}>{streak}D</Text>
                            <LinearGradient colors={["rgba(227,30,36,0.1)", "transparent"]} style={styles.statMiniGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                        </View>
                        <View style={styles.statSmall}>
                            <View style={styles.statSmallTop}>
                                <Ionicons name="fitness-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.statLabel}>SESSIONS</Text>
                            </View>
                            <Text style={styles.statValue}>{total}</Text>
                            <LinearGradient colors={["rgba(255,255,255,0.05)", "transparent"]} style={styles.statMiniGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                        </View>
                    </View>
                    <View style={styles.statLarge}>
                        <View style={styles.statLargeBg}>
                            <Ionicons name="analytics" size={120} color={COLORS.text} />
                        </View>
                        <View style={styles.statSmallTop}>
                            <Ionicons name="time" size={16} color={COLORS.primary} />
                            <Text style={styles.statLabel}>TOTAL DURATION</Text>
                        </View>
                        <Text style={[styles.statValue, { fontSize: 34 }]}>{totalMin}m</Text>
                        <LinearGradient colors={["rgba(227,30,36,0.08)", "transparent"]} style={styles.statMiniGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    </View>
                </View>

                {total > 0 && (
                    <>
                        <SectionLabel text="WEEKLY FLOW" />
                        <View style={styles.card}>
                            <LineChart data={weeklyData} />
                        </View>
                    </>
                )}

                {prs.length > 0 && (
                    <>
                        <SectionLabel text="PERSONAL BESTS" />
                        <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
                            {prs.map((pr, i) => (
                                <PRCard key={i} pr={pr} />
                            ))}
                        </View>
                    </>
                )}

                {total > 0 && (
                    <>
                        <SectionLabel text="TARGET FOCUS" />
                        <View style={styles.card}>
                            {WORKOUT_PLAN.map((day) => {
                                const count = dayCounts[day.day] || 0;
                                return (
                                    <View key={day.day}>
                                        <BreakdownBar day={day} count={count} max={maxCount} />
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                <SectionLabel text="WORKOUT LOG" />
                {history.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
                        <Text style={styles.emptySub}>Start your first session to see your progress tracked here.</Text>
                    </View>
                ) : (
                    Object.keys(groups).map((week) => (
                        <View key={week} style={styles.weekContainer}>
                            <Text style={styles.weekLabel}>{week.toUpperCase()}</Text>
                            <View style={styles.weekCard}>
                                {groups[week].map((entry, i) => (
                                    <HistoryRow
                                        key={i}
                                        entry={entry}
                                        isLast={i === groups[week].length - 1}
                                    />
                                ))}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function SectionLabel({ text }) {
    return (
        <Text style={styles.sectionLabel}>{text}</Text>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
    },
    backBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    headerTitle: { fontSize: 26, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -1.2 },

    statsRow: {
        flexDirection: "row", marginHorizontal: 20, marginTop: 8, gap: 16,
    },
    statsLeft: { flex: 1, gap: 16 },
    statSmall: {
        flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 24,
        padding: 20, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden",
    },
    statLarge: {
        flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 24,
        padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
        justifyContent: "space-between", overflow: "hidden",
    },
    statSmallTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    statMiniGrad: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
    statLargeBg: { position: "absolute", bottom: -24, right: -24, opacity: 0.05 },
    statValue: { fontSize: 26, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -1 },
    statLabel: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 2, fontFamily: FAMILY.bold, flex: 1 },

    sectionLabel: {
        fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted,
        letterSpacing: 3, marginHorizontal: 24, marginTop: 48, marginBottom: 20
    },

    card: {
        marginHorizontal: 20, backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 28, borderWidth: 1, borderColor: COLORS.border,
        padding: 24,
    },

    weekContainer: { marginHorizontal: 20, marginBottom: 32 },
    weekLabel: {
        fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.primary,
        letterSpacing: 2.5, marginBottom: 16, marginLeft: 8
    },
    weekCard: {
        backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 28,
        borderWidth: 1, borderColor: COLORS.border,
        paddingHorizontal: 24,
    },

    empty: { alignItems: "center", paddingTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 2, marginBottom: 16 },
    emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, fontFamily: FAMILY.regular, opacity: 0.6 },
});
