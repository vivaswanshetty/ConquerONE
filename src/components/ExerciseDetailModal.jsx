import React, { useMemo } from "react";
import {
    View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView,
    Dimensions, StatusBar, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { getExerciseMetadata, getExerciseLoadCategory, getExerciseMuscleGroup } from "../data/workoutData";
import { getExerciseHistory, getExerciseProgressionData, calculateEstimated1RM } from "../utils/analytics";

const { width, height } = Dimensions.get("window");
const MODAL_W = width;
const CHART_W = width - 72;
const CHART_H = 130;

function formatLoadBadge(set) {
    if (set.skipped) return "Skipped";
    if (set.loadType === "timed") return `${set.durationSec || set.reps || 0}s`;
    if (set.loadType === "bodyweight") return `BW × ${set.reps || 0}`;
    if (set.loadType === "weighted_bodyweight") return `BW +${set.weightKg}kg × ${set.reps || 0}`;
    if (set.loadType === "assisted_bodyweight") return `Assisted -${set.weightKg}kg × ${set.reps || 0}`;
    return `${set.weightKg > 0 ? set.weightKg + "kg" : "BW"} × ${set.reps || 0}`;
}

export default function ExerciseDetailModal({
    visible,
    exerciseName,
    onClose,
    history = [],
    userBodyweight = null,
    weightUnit = "kg",
}) {
    if (!visible || !exerciseName) return null;

    const exMeta = useMemo(() => getExerciseMetadata(exerciseName) || {
        name: exerciseName,
        category: getExerciseLoadCategory(exerciseName),
        muscleGroup: getExerciseMuscleGroup(exerciseName),
        equipment: "Gym",
    }, [exerciseName]);

    const sessions = useMemo(() => {
        return getExerciseHistory(exerciseName, history, userBodyweight);
    }, [exerciseName, history, userBodyweight]);

    const progressionData = useMemo(() => {
        return getExerciseProgressionData(exerciseName, history, userBodyweight);
    }, [exerciseName, history, userBodyweight]);

    // Reverse for display (newest first)
    const displaySessions = useMemo(() => {
        return [...sessions].reverse();
    }, [sessions]);

    // All-time best & Latest session
    const latestSession = displaySessions[0] || null;
    const bestSession = useMemo(() => {
        if (sessions.length === 0) return null;
        let peak = sessions[0];
        sessions.forEach(s => {
            if (s.maxWeight > peak.maxWeight || (s.maxWeight === peak.maxWeight && s.maxReps > peak.maxReps)) {
                peak = s;
            }
        });
        return peak;
    }, [sessions]);

    // Best 1RM
    const bestEstimated1RM = useMemo(() => {
        let max1RM = null;
        sessions.forEach(s => {
            if (s.bestEstimated1RM !== null && (max1RM === null || s.bestEstimated1RM > max1RM)) {
                max1RM = s.bestEstimated1RM;
            }
        });
        return max1RM;
    }, [sessions]);

    // Single concise insight
    const singleInsight = useMemo(() => {
        if (sessions.length < 2) {
            return "Complete at least 2 sessions of this movement to unlock statistical delta tracking.";
        }
        const prev = sessions[sessions.length - 2];
        const curr = sessions[sessions.length - 1];

        if (exMeta.category === "bodyweight") {
            if (curr.maxWeight > 0 && prev.maxWeight > 0) {
                const diff = (curr.maxWeight - prev.maxWeight).toFixed(1).replace(/\.0$/, "");
                const sign = curr.maxWeight >= prev.maxWeight ? "+" : "";
                return `Added load shifted by ${sign}${diff} kg (${prev.maxWeight}kg → ${curr.maxWeight}kg) across recent sessions.`;
            }
            const diffR = curr.maxReps - prev.maxReps;
            const signR = diffR >= 0 ? "+" : "";
            return `Max reps changed by ${signR}${diffR} (${prev.maxReps} → ${curr.maxReps} reps) since your previous session.`;
        }

        if (curr.maxWeight !== prev.maxWeight) {
            const diff = (curr.maxWeight - prev.maxWeight).toFixed(1).replace(/\.0$/, "");
            const sign = curr.maxWeight >= prev.maxWeight ? "+" : "";
            return `Peak working weight shifted by ${sign}${diff} kg (${prev.maxWeight}kg → ${curr.maxWeight}kg) between last 2 sessions.`;
        }

        const diffR = curr.maxReps - prev.maxReps;
        const signR = diffR >= 0 ? "+" : "";
        return `Working volume changed by ${signR}${diffR} reps at ${curr.maxWeight} kg since your last log.`;
    }, [sessions, exMeta]);

    const categoryLabel = (exMeta.category || "free_weight").toUpperCase().replace("_", " ");

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <View style={styles.sheetContainer}>
                    <LinearGradient
                        colors={["#161618", "#0E0E10"]}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />

                    {/* Drag bar */}
                    <View style={styles.dragHandle} />

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.badgeRow}>
                                <View style={styles.catBadge}>
                                    <Text style={styles.catBadgeText}>{categoryLabel}</Text>
                                </View>
                                <View style={styles.muscleBadge}>
                                    <Text style={styles.muscleBadgeText}>{exMeta.muscleGroup?.toUpperCase()}</Text>
                                </View>
                                {exMeta.equipment ? (
                                    <Text style={styles.equipText}>· {exMeta.equipment}</Text>
                                ) : null}
                            </View>
                            <Text style={styles.title} numberOfLines={2}>{exerciseName.toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
                            <Ionicons name="close" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* ── 1. Performance Overview Grid ── */}
                        <View style={styles.metricsGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>LATEST PERFORMANCE</Text>
                                <Text style={styles.metricValue}>
                                    {latestSession ? (
                                        latestSession.maxWeight > 0
                                            ? `${latestSession.maxWeight} kg × ${latestSession.maxReps}`
                                            : `${latestSession.maxReps} reps`
                                    ) : "—"}
                                </Text>
                                <Text style={styles.metricSub}>
                                    {latestSession ? latestSession.date : "No logs"}
                                </Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>ALL-TIME BEST</Text>
                                <Text style={styles.metricValue}>
                                    {bestSession ? (
                                        bestSession.maxWeight > 0
                                            ? `${bestSession.maxWeight} kg × ${bestSession.maxReps}`
                                            : `${bestSession.maxReps} reps`
                                    ) : "—"}
                                </Text>
                                <Text style={styles.metricSub}>
                                    {bestSession ? bestSession.date : "No PR"}
                                </Text>
                            </View>
                        </View>

                        {/* Estimated 1RM Card (Free-Weight / Machine only) */}
                        {(exMeta.category === "free_weight" || exMeta.category === "machine") && bestEstimated1RM !== null && (
                            <View style={styles.e1rmBanner}>
                                <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.e1rmTitle}>
                                        ESTIMATED 1RM: <Text style={{ fontFamily: FAMILY.monoBold, color: COLORS.text }}>{bestEstimated1RM} {weightUnit}</Text>
                                    </Text>
                                    <Text style={styles.e1rmSub}>Calculated via Epley formula from valid 1–12 rep completed sets.</Text>
                                </View>
                            </View>
                        )}

                        {/* ── 2. Data-Driven Insight ── */}
                        <View style={styles.insightBox}>
                            <Ionicons name="analytics-outline" size={15} color={COLORS.textSub} />
                            <Text style={styles.insightText}>{singleInsight}</Text>
                        </View>

                        {/* ── 3. Progression Chart ── */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>PROGRESSION TIMELINE ({sessions.length} SESSIONS)</Text>
                        </View>

                        {progressionData.length >= 2 ? (
                            <View style={styles.chartCard}>
                                <Svg width={CHART_W} height={CHART_H}>
                                    <Defs>
                                        <SvgGradient id="exProgGrad" x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.25" />
                                            <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0.0" />
                                        </SvgGradient>
                                    </Defs>
                                    {(() => {
                                        const values = progressionData.map(d => d.value);
                                        const maxVal = Math.max(...values);
                                        const minVal = Math.min(...values);
                                        const range = maxVal - minVal || 1;

                                        const pts = progressionData.map((d, i) => ({
                                            x: (i / (progressionData.length - 1)) * (CHART_W - 20) + 10,
                                            y: CHART_H - ((d.value - minVal) / range) * (CHART_H * 0.65) - 20,
                                            ...d,
                                        }));

                                        const polyPoints = pts.map(p => `${p.x},${p.y}`).join(" ");
                                        const areaPath =
                                            `M${pts[0].x},${CHART_H} ` +
                                            pts.map(p => `L${p.x},${p.y}`).join(" ") +
                                            ` L${pts[pts.length - 1].x},${CHART_H} Z`;

                                        return (
                                            <>
                                                <Path d={areaPath} fill="url(#exProgGrad)" />
                                                <Polyline
                                                    points={polyPoints}
                                                    fill="none"
                                                    stroke={COLORS.primary}
                                                    strokeWidth={2.5}
                                                    strokeLinejoin="round"
                                                    strokeLinecap="round"
                                                />
                                                {pts.map((p, i) => (
                                                    <Circle
                                                        key={i}
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r={i === pts.length - 1 ? 5 : 3.5}
                                                        fill={COLORS.primary}
                                                    />
                                                ))}
                                            </>
                                        );
                                    })()}
                                </Svg>
                                <View style={styles.chartFooterRow}>
                                    <Text style={styles.chartFooterDate}>{progressionData[0]?.date}</Text>
                                    <Text style={styles.chartFooterLabel}>
                                        PEAK: {Math.max(...progressionData.map(d => d.value))} {progressionData[0]?.metricLabel}
                                    </Text>
                                    <Text style={styles.chartFooterDate}>{progressionData[progressionData.length - 1]?.date}</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyChartCard}>
                                <Text style={styles.emptyChartText}>
                                    {sessions.length === 1 ? "1 session recorded. Complete additional sessions to render progression curves." : "No workout sessions recorded yet."}
                                </Text>
                            </View>
                        )}

                        {/* ── 4. Chronological Session Logs ── */}
                        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                            <Text style={styles.sectionLabel}>SESSION LOGS</Text>
                        </View>

                        {displaySessions.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptySub}>No workout logs for this exercise yet.</Text>
                            </View>
                        ) : (
                            displaySessions.map((session, sIdx) => (
                                <View key={`${session.date}_${sIdx}`} style={styles.sessionCard}>
                                    <View style={styles.sessionHeaderRow}>
                                        <View>
                                            <Text style={styles.sessionDate}>{session.date}</Text>
                                            <Text style={styles.sessionTarget}>{session.target}</Text>
                                        </View>
                                        <View style={styles.sessionSetsCountBadge}>
                                            <Text style={styles.sessionSetsCountText}>
                                                {session.completedSetsCount} SETS COMPLETED
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Individual Set Rows */}
                                    <View style={styles.setsList}>
                                        {session.sets.map((set, setIdx) => (
                                            <View key={setIdx} style={styles.setRow}>
                                                <Text style={styles.setIndex}>SET {set.set || setIdx + 1}</Text>
                                                <View style={styles.setBadge}>
                                                    <Text style={[styles.setBadgeText, set.skipped && { color: COLORS.textMuted }]}>
                                                        {formatLoadBadge(set)}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
    sheetContainer: {
        width: MODAL_W, maxHeight: height * 0.88,
        backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: COLORS.borderLight, overflow: "hidden",
    },
    dragHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignSelf: "center", marginTop: 10, marginBottom: 12,
    },
    headerRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
        paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    catBadge: {
        backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: RADIUS.xs, borderWidth: 1, borderColor: COLORS.border,
    },
    catBadgeText: { fontSize: 8, fontFamily: FAMILY.monoBold, color: COLORS.textSub, letterSpacing: 0.5 },
    muscleBadge: {
        backgroundColor: "rgba(227,30,36,0.12)", paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: RADIUS.xs,
    },
    muscleBadgeText: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 0.5 },
    equipText: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textMuted },
    title: { fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5, marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center", justifyContent: "center", marginLeft: 12,
    },

    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

    metricsGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
    metricCard: {
        flex: 1, backgroundColor: COLORS.bgCard, padding: 12, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
    },
    metricLabel: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted, letterSpacing: 0.5 },
    metricValue: { fontSize: 15, fontFamily: FAMILY.monoBold, color: COLORS.text, marginVertical: 4 },
    metricSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub },

    e1rmBanner: {
        flexDirection: "row", alignItems: "center", backgroundColor: "rgba(227,30,36,0.08)",
        padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: "rgba(227,30,36,0.25)",
        marginBottom: 10,
    },
    e1rmTitle: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 0.5 },
    e1rmSub: { fontSize: 9, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },

    insightBox: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "rgba(255,255,255,0.03)", padding: 12, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
    },
    insightText: { flex: 1, fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 16 },

    sectionHeader: { marginBottom: 8 },
    sectionLabel: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.0 },

    chartCard: {
        backgroundColor: COLORS.bgCard, padding: 14, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border, alignItems: "center",
    },
    chartFooterRow: {
        flexDirection: "row", justifyContent: "space-between", width: "100%",
        marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    chartFooterDate: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    chartFooterLabel: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.primary },

    emptyChartCard: {
        backgroundColor: COLORS.bgCard, padding: 16, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border, alignItems: "center",
    },
    emptyChartText: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textMuted, textAlign: "center" },

    sessionCard: {
        backgroundColor: COLORS.bgCard, padding: 12, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
    },
    sessionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    sessionDate: { fontSize: 11, fontFamily: FAMILY.monoBold, color: COLORS.text },
    sessionTarget: { fontSize: 9, fontFamily: FAMILY.regular, color: COLORS.textMuted },
    sessionSetsCountBadge: {
        backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: RADIUS.xs,
    },
    sessionSetsCountText: { fontSize: 8, fontFamily: FAMILY.mono, color: COLORS.textSub },

    setsList: { gap: 4 },
    setRow: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)", paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: RADIUS.xs,
    },
    setIndex: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    setBadge: {},
    setBadgeText: { fontSize: 11, fontFamily: FAMILY.monoBold, color: COLORS.text },

    emptyCard: { padding: 20, alignItems: "center" },
    emptySub: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textMuted },
});
