import React, { useState, useCallback, useMemo, useRef } from "react";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Share, Animated, Modal, Image,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
import Svg, { Polyline, Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, getMuscleColor } from "../utils/theme";
import { getWorkoutHistory, getStreak, getTotalWorkouts, formatDuration, getStreakLocal, getTotalWorkoutsLocal, getWorkoutHistoryLocal } from "../utils/storage";
import { WORKOUT_PLAN } from "../data/workoutData";
import * as Haptics from "expo-haptics";
import WorkoutCalendar from "../components/WorkoutCalendar";
import SkeletonBlock from "../components/SkeletonBlock";

const { width } = Dimensions.get("window");
const CARD_PADDING = 20;
const CHART_W = width - CARD_PADDING * 2 - 36;
const CHART_H = 100;

/* ── helpers ─────────────────────────────────────────────── */

/**
 * Safely convert a completedAt value to a JS Date.
 * Handles: Firestore Timestamp (has .seconds), ISO string, Date object.
 */
function toDate(completedAt) {
    if (!completedAt) return new Date(0);
    if (typeof completedAt === 'object' && completedAt.seconds) {
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
    return Object.values(map).sort((a, b) => b.durationSec - a.durationSec).slice(0, 4);
}

function computeHallOfFame(history) {
    if (!history || history.length === 0) {
        return {
            maxCalories: null,
            heaviestLift: null,
            longestSession: null,
        };
    }

    let maxCal = { calories: 0, target: "—", date: null };
    let maxLift = { weightKg: 0, reps: 0, exerciseName: "—", target: "—", date: null };
    let maxDuration = { durationSec: 0, target: "—", date: null };

    history.forEach((h) => {
        const d = toDate(h.completedAt);
        const cals = h.caloriesBurned || Math.round((h.durationSec || 0) * 0.11);
        if (cals > maxCal.calories) {
            maxCal = { calories: cals, target: h.target, date: d };
        }

        if ((h.durationSec || 0) > maxDuration.durationSec) {
            maxDuration = { durationSec: h.durationSec, target: h.target, date: d };
        }

        if (h.exercises && Array.isArray(h.exercises)) {
            h.exercises.forEach((ex) => {
                if (ex.loggedSets && Array.isArray(ex.loggedSets)) {
                    ex.loggedSets.forEach((s) => {
                        if (s.completed && Number(s.weightKg) > maxLift.weightKg) {
                            maxLift = {
                                weightKg: Number(s.weightKg),
                                reps: Number(s.reps) || 1,
                                exerciseName: ex.name,
                                target: h.target,
                                date: d,
                            };
                        }
                    });
                } else if (Number(ex.weightKg) > maxLift.weightKg) {
                    maxLift = {
                        weightKg: Number(ex.weightKg),
                        reps: Number(ex.reps) || 1,
                        exerciseName: ex.name,
                        target: h.target,
                        date: d,
                    };
                }
            });
        }
    });

    return {
        maxCalories: maxCal.calories > 0 ? maxCal : null,
        heaviestLift: maxLift.weightKg > 0 ? maxLift : null,
        longestSession: maxDuration.durationSec > 0 ? maxDuration : null,
    };
}

/* ── Export Generators ─────────────────────────────────────── */

function generateStructuredCSV(history, streak, total, totalHours) {
    const headers = [
        "Workout ID",
        "Date",
        "Time",
        "Day Code",
        "Target Muscle Group",
        "Duration (Seconds)",
        "Duration (Formatted)",
        "Calories (kcal)",
        "Exercise Count",
        "Detailed Log (Sets x Reps @ Weight)"
    ];

    const escapeCsv = (str) => {
        if (!str) return '""';
        const escaped = String(str).replace(/"/g, '""');
        return `"${escaped}"`;
    };

    const rows = history.map((h, idx) => {
        const d = toDate(h.completedAt);
        const dateStr = d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
        const dayCode = h.day === 0 ? "Custom" : `Day 0${h.day}`;
        const target = h.target || "Workout";
        const durSec = h.durationSec || 0;
        const durFormatted = formatDuration(durSec);
        const cals = h.caloriesBurned || Math.round(durSec * 0.11);
        const exCount = h.exercises ? h.exercises.length : 0;

        let exBreakdown = "—";
        if (h.exercises && h.exercises.length > 0) {
            exBreakdown = h.exercises.map(ex => {
                let sLog = "";
                if (ex.loggedSets && ex.loggedSets.length > 0) {
                    const setsStr = ex.loggedSets
                        .filter(s => s.completed)
                        .map(s => `${s.weightKg > 0 ? s.weightKg + "kg" : "BW"} × ${s.reps || 0}r`)
                        .join(", ");
                    sLog = setsStr ? ` [${setsStr}]` : "";
                }
                return `${ex.name} (${ex.sets}s)${sLog}`;
            }).join(" | ");
        }

        return [
            escapeCsv(h.id || `session_${idx + 1}`),
            escapeCsv(dateStr),
            escapeCsv(timeStr),
            escapeCsv(dayCode),
            escapeCsv(target),
            durSec,
            escapeCsv(durFormatted),
            cals,
            exCount,
            escapeCsv(exBreakdown)
        ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
}

function generateStructuredJSON(history, streak, total, totalHours) {
    return {
        conquerOneExport: {
            app: "ConquerONE",
            version: "1.0",
            exportedAt: new Date().toISOString(),
            athleteStats: {
                totalSessionsLogged: total,
                currentStreakDays: streak,
                cumulativeVolumeHours: totalHours
            },
            workouts: history.map((h, i) => ({
                id: h.id || `session_${i + 1}`,
                completedAt: toDate(h.completedAt).toISOString(),
                day: h.day,
                target: h.target,
                durationSec: h.durationSec,
                durationFormatted: formatDuration(h.durationSec),
                caloriesBurned: h.caloriesBurned || Math.round((h.durationSec || 0) * 0.11),
                exercises: (h.exercises || []).map(ex => ({
                    name: ex.name,
                    sets: ex.sets,
                    loggedSets: ex.loggedSets || [],
                    suggestedWeightKg: ex.weightKg || null
                }))
            }))
        }
    };
}

function generateStructuredText(history, streak, total, totalHours) {
    let text = `========================================\n` +
        `   CONQUER ONE — ATHLETE PERFORMANCE LOG\n` +
        `========================================\n` +
        `Generated: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}\n` +
        `Total Sessions Logged: ${total}\n` +
        `Active Streak: ${streak} Days\n` +
        `Cumulative Training Volume: ${totalHours} Hours\n` +
        `========================================\n\n`;

    history.forEach((h, i) => {
        const d = toDate(h.completedAt);
        const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const cals = h.caloriesBurned || Math.round((h.durationSec || 0) * 0.11);

        text += `#${history.length - i} · ${h.target.toUpperCase()}\n`;
        text += `Date: ${dateStr} at ${timeStr}\n`;
        text += `Duration: ${formatDuration(h.durationSec)} | Calories: ${cals} kcal\n`;
        if (h.exercises && h.exercises.length > 0) {
            text += `Exercises (${h.exercises.length}):\n`;
            h.exercises.forEach(ex => {
                let setDetails = "";
                if (ex.loggedSets && ex.loggedSets.some(s => s.completed)) {
                    setDetails = " -> " + ex.loggedSets
                        .filter(s => s.completed)
                        .map(s => `${s.weightKg > 0 ? s.weightKg + "kg" : "BW"} × ${s.reps}r`)
                        .join(", ");
                }
                text += `  • ${ex.name} (${ex.sets} sets)${setDetails}\n`;
            });
        }
        text += `----------------------------------------\n\n`;
    });

    return text;
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
    const lastPt = pts[pts.length - 1];

    return (
        <View style={lc.wrap}>
            <View style={lc.header}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="stats-chart" size={13} color={COLORS.primary} />
                    <Text style={lc.title}>WEEKLY ACTIVITY</Text>
                </View>
                <View style={lc.badge}>
                    <Text style={lc.badgeText}>8-WK FLOW</Text>
                </View>
            </View>
            <Svg width={CHART_W} height={CHART_H + 20}>
                <Defs>
                    <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={COLORS.primary} stopOpacity="0.38" />
                        <Stop offset="0.65" stopColor={COLORS.primary} stopOpacity="0.08" />
                        <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0.0" />
                    </SvgGradient>
                    <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="rgba(227, 30, 36, 0.7)" />
                        <Stop offset="1" stopColor={COLORS.primary} />
                    </SvgGradient>
                </Defs>
                <Path d={areaPath} fill="url(#areaGrad)" />
                <Polyline
                    points={polyPoints}
                    fill="none"
                    stroke="url(#lineGrad)"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {/* Data Points */}
                {pts.map((p, i) => {
                    const isLast = i === pts.length - 1;
                    if (isLast) return null;
                    return (
                        <Circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={p.count > 0 ? 3 : 2}
                            fill={p.count > 0 ? COLORS.primary : "rgba(255,255,255,0.2)"}
                        />
                    );
                })}
                {/* Active "NOW" Point with Outer Glow Ring */}
                <Circle cx={lastPt.x} cy={lastPt.y} r={6.5} fill="rgba(227, 30, 36, 0.3)" />
                <Circle cx={lastPt.x} cy={lastPt.y} r={3.5} fill={COLORS.primary} />
                <Circle cx={lastPt.x} cy={lastPt.y} r={1.5} fill="#FFFFFF" />
            </Svg>
            <View style={lc.labels}>
                {pts.map((p, i) => (
                    (i === 0 || i === pts.length - 1 || i % 2 === 0) && (
                        <Text
                            key={i}
                            style={[
                                lc.label,
                                i === pts.length - 1 && { color: COLORS.primary, fontFamily: FAMILY.monoBold }
                            ]}
                        >
                            {p.label}
                        </Text>
                    )
                ))}
            </View>
        </View>
    );
}

const lc = StyleSheet.create({
    wrap: { paddingTop: 4 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    title: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 2 },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 0.5,
        borderColor: "rgba(227, 30, 36, 0.35)",
    },
    badgeText: { fontSize: 8, fontFamily: FAMILY.monoBold, color: COLORS.primary, letterSpacing: 0.5 },
    labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    label: { fontSize: 8, fontFamily: FAMILY.mono, color: COLORS.textMuted, letterSpacing: 1.5 },
});

/* ── Muscle breakdown bar ───────────────────────────────────── */
function BreakdownBar({ day, count, max }) {
    const pct = max > 0 ? count / max : 0;
    const color = getMuscleColor(day.target);
    return (
        <View style={bb.row}>
            <View style={bb.labelWrap}>
                <View style={[bb.dot, { backgroundColor: color }]} />
                <Text style={bb.label} numberOfLines={1}>{day.target.split(" ")[0].toUpperCase()}</Text>
            </View>
            <View style={bb.track}>
                <View style={[bb.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
            </View>
            <View style={bb.countBox}>
                <Text style={[bb.count, count > 0 && { color }]}>{count}</Text>
            </View>
        </View>
    );
}

const bb = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    labelWrap: { flexDirection: "row", alignItems: "center", gap: 6, width: 88 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
    label: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, flex: 1 },
    track: { flex: 1, height: 4, backgroundColor: COLORS.bg, borderRadius: 2, overflow: "hidden", borderWidth: 0.5, borderColor: COLORS.border },
    fill: { height: "100%", borderRadius: 2 },
    countBox: { width: 28, alignItems: "flex-end" },
    count: { fontSize: 11, fontFamily: FAMILY.monoBold, color: COLORS.textMuted },
});

/* ── PR card ────────────────────────────────────────────────── */
function PRCard({ pr }) {
    const muscleColor = getMuscleColor(pr.target);
    return (
        <View style={pr_s.card}>
            <View style={pr_s.trophyWrap}>
                <Ionicons name="trophy" size={14} color="#FFD700" />
            </View>
            <View style={pr_s.info}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[pr_s.muscleDot, { backgroundColor: muscleColor }]} />
                    <Text style={pr_s.target}>{pr.target}</Text>
                </View>
                <Text style={pr_s.date}>
                    {toDate(pr.completedAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </Text>
            </View>
            <View style={pr_s.right}>
                <Text style={pr_s.duration}>{formatDuration(pr.durationSec)}</Text>
                <View style={pr_s.bestBadge}>
                    <Text style={pr_s.bestBadgeText}>RECORD</Text>
                </View>
            </View>
        </View>
    );
}

const pr_s = StyleSheet.create({
    card: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 14, paddingHorizontal: 18,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        gap: 12,
    },
    trophyWrap: {
        width: 32, height: 32, borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 215, 0, 0.10)",
        borderWidth: 1, borderColor: "rgba(255, 215, 0, 0.25)",
        alignItems: "center", justifyContent: "center",
    },
    info: { flex: 1 },
    muscleDot: { width: 6, height: 6, borderRadius: 3 },
    target: { fontSize: 13, fontFamily: FAMILY.semibold, color: COLORS.text },
    date: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FAMILY.mono },
    right: { alignItems: "flex-end" },
    duration: { fontSize: 14, fontFamily: FAMILY.monoBold, color: "#FFD700" },
    bestBadge: {
        marginTop: 3,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 215, 0, 0.10)",
        borderWidth: 0.5,
        borderColor: "rgba(255, 215, 0, 0.3)",
    },
    bestBadgeText: { fontSize: 8, fontFamily: FAMILY.bold, color: "#FFD700", letterSpacing: 0.8 },
});

/* ── History row ────────────────────────────────────────────── */
function HistoryRow({ entry, isLast, onShare }) {
    const [expanded, setExpanded] = useState(false);
    const date = toDate(entry.completedAt);
    const dateStr = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

    const hasExercises = entry.exercises && entry.exercises.length > 0;
    const isCustom = entry.day === 0;
    const itemColor = isCustom ? "#AF52DE" : getMuscleColor(entry.target);
    const cals = entry.caloriesBurned || Math.round((entry.durationSec || 0) * 0.11);

    return (
        <View style={[hr.wrapper, isLast && { borderBottomWidth: 0 }]}>
            <TouchableOpacity
                onPress={() => hasExercises && setExpanded(!expanded)}
                activeOpacity={hasExercises ? 0.7 : 1}
                style={hr.row}
            >
                <View style={[hr.indicator, { backgroundColor: itemColor }]} />
                <View style={hr.left}>
                    <Text style={hr.target}>{entry.target}</Text>
                    <Text style={hr.date}>{dateStr} · {timeStr} · {cals} kcal</Text>
                </View>
                <View style={hr.right}>
                    <Text style={hr.duration}>{formatDuration(entry.durationSec)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={[hr.dayBadge, { backgroundColor: `${itemColor}18`, borderColor: `${itemColor}38` }]}>
                            <Text style={[hr.dayLabel, { color: itemColor }]}>
                                {isCustom ? `Custom · ${entry.exercises?.length || 0} ex` : `Day 0${entry.day}`}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={hr.shareIconBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                onShare && onShare(entry);
                            }}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="share-outline" size={14} color={COLORS.textSub} />
                        </TouchableOpacity>
                        {hasExercises && (
                            <Ionicons
                                name={expanded ? "chevron-up" : "chevron-down"}
                                size={12}
                                color={COLORS.textSub}
                            />
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {expanded && hasExercises && (
                <View style={hr.detailLines}>
                    {entry.exercises.map((ex, idx) => (
                        <View key={idx} style={hr.exerciseContainer}>
                            <View style={hr.detailRow}>
                                <View style={[hr.detailDot, { backgroundColor: itemColor }]} />
                                <Text style={hr.detailText}>
                                    {ex.name}{ex.side ? ` (${ex.side})` : ""}
                                </Text>
                                <Text style={hr.detailSets}>{ex.sets} sets</Text>
                            </View>
                            {ex.loggedSets && ex.loggedSets.some(s => s.completed) ? (
                                <View style={hr.loggedSetsBox}>
                                    {ex.loggedSets.filter(s => s.completed).map((s, sIdx) => (
                                        <View key={sIdx} style={hr.loggedSetRow}>
                                            <Text style={hr.loggedSetLabel}>Set {s.set}</Text>
                                            <View style={hr.loggedSetValBox}>
                                                <Ionicons name="checkmark" size={10} color={COLORS.primary} style={{ marginRight: 2 }} />
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
                    <View style={{ height: 8 }} />
                </View>
            )}
        </View>
    );
}

const hr = StyleSheet.create({
    wrapper: {
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    row: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 14,
        gap: 12,
    },
    indicator: { width: 3, height: 28, borderRadius: 1.5 },
    left: { flex: 1 },
    target: { fontSize: 14, fontFamily: FAMILY.semibold, color: COLORS.text },
    date: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FAMILY.mono },
    right: { alignItems: "flex-end" },
    duration: { fontSize: 14, fontFamily: FAMILY.monoBold, color: COLORS.text },
    dayBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: RADIUS.pill,
        borderWidth: 0.5,
        marginTop: 2,
    },
    dayLabel: { fontSize: 9, fontFamily: FAMILY.monoBold },
    shareIconBtn: {
        padding: 4,
        marginTop: 2,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    detailLines: {
        paddingLeft: 18,
        paddingBottom: 6,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.04)",
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        gap: 8,
    },
    detailDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    detailText: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        flex: 1,
    },
    detailSets: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    exerciseContainer: {
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.03)",
    },
    loggedSetsBox: {
        paddingLeft: 12,
        paddingTop: 4,
        paddingBottom: 4,
        gap: 4,
    },
    loggedSetRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    loggedSetLabel: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        width: 32,
    },
    loggedSetValBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    loggedSetVal: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
});

/* ── Gallery Card Item ──────────────────────────────────────── */
function GalleryCardItem({ workout, streak, onShare, isSharing }) {
    const d = toDate(workout.completedAt);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
    const muscleColor = getMuscleColor(workout.target);
    const cals = workout.caloriesBurned || Math.round((workout.durationSec || 0) * 0.11);
    const exercisesCount = workout.exercises?.length || 0;

    return (
        <View style={gc.card}>
            <LinearGradient
                colors={["#16161A", "#0C0C0E", "#060608"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.3, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.08)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60 }}
            />

            <View style={gc.topHeader}>
                <View style={gc.badge}>
                    <View style={[gc.badgeDot, { backgroundColor: muscleColor }]} />
                    <Text style={[gc.badgeText, { color: muscleColor }]}>{workout.target.split(" ")[0].toUpperCase()}</Text>
                </View>
                <Text style={gc.date}>{dateStr}</Text>
            </View>

            <Text style={gc.title} numberOfLines={2}>{workout.target}</Text>

            <View style={gc.statsRow}>
                <View style={gc.statBox}>
                    <Text style={gc.statLabel}>DURATION</Text>
                    <Text style={gc.statValue}>{formatDuration(workout.durationSec)}</Text>
                </View>
                <View style={[gc.statBox, gc.statDivider]}>
                    <Text style={gc.statLabel}>ENERGY</Text>
                    <Text style={gc.statValue}>{cals} <Text style={gc.statUnit}>KCAL</Text></Text>
                </View>
                <View style={gc.statBox}>
                    <Text style={gc.statLabel}>EXERCISES</Text>
                    <Text style={gc.statValue}>{exercisesCount} <Text style={gc.statUnit}>EX</Text></Text>
                </View>
            </View>

            <View style={gc.footer}>
                <View style={gc.brandLeft}>
                    <Image
                        source={require("../../assets/logo_barbell.png")}
                        style={gc.brandBarbell}
                        resizeMode="contain"
                    />
                    <View style={gc.brandTextGroup}>
                        <Image
                            source={require("../../assets/logo_text.png")}
                            style={gc.brandLogoText}
                            resizeMode="contain"
                        />
                        <Text style={gc.brandSub}>TRAINING PROTOCOL</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={gc.shareBtn}
                    onPress={() => onShare(workout)}
                    activeOpacity={0.8}
                    disabled={isSharing}
                >
                    <Ionicons name="share-outline" size={14} color="#FFFFFF" />
                    <Text style={gc.shareBtnText}>SHARE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const gc = StyleSheet.create({
    card: {
        backgroundColor: COLORS.bgCard,
        borderRadius: 20,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.12)",
        padding: 18,
        marginBottom: 16,
        overflow: "hidden",
    },
    topHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 8.5, fontFamily: FAMILY.bold, letterSpacing: 0.8 },
    date: { fontSize: 9.5, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    title: { fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.3, marginBottom: 16 },
    statsRow: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        paddingVertical: 12,
        marginBottom: 16,
    },
    statBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255, 255, 255, 0.06)" },
    statLabel: { fontSize: 7.5, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 2 },
    statValue: { fontSize: 13.5, fontFamily: FAMILY.monoBold, color: COLORS.text },
    statUnit: { fontSize: 8.5, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
    },
    brandLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
    brandBarbell: {
        width: 26,
        height: 18,
    },
    brandTextGroup: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
    },
    brandLogoText: {
        width: 88,
        height: 8.5,
    },
    brandSub: {
        fontSize: 6,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
    },
    shareBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.primary,
    },
    shareBtnText: { fontSize: 10, fontFamily: FAMILY.bold, color: "#FFFFFF", letterSpacing: 1 },
});

/* ── Main screen ──────────────────────────────────────────── */
export default function HistoryScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
    const [history, setHistory] = useState([]);
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [activeTab, setActiveTab] = useState("analytics"); // "analytics" | "logs" | "cards"
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [sharingCard, setSharingCard] = useState(false);
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [exportingType, setExportingType] = useState(null);
    const shareShotRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isInitialMountRef = useRef(true);

    const finishLoading = () => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            setLoading(false);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    };

    useFocusEffect(useCallback(() => { load(); }, []));
    const load = async () => {
        try {
            const cachedHistory = await getWorkoutHistoryLocal();
            const cachedStreak = await getStreakLocal();
            const cachedTotal = await getTotalWorkoutsLocal();
            setHistory(cachedHistory);
            setStreak(cachedStreak);
            setTotal(cachedTotal);
            finishLoading();
        } catch (e) {
            console.warn("Failed to load cached history in HistoryScreen", e);
            finishLoading();
        }

        try {
            const [nextHistory, nextStreak, nextTotal] = await Promise.all([
                getWorkoutHistory(),
                getStreak(),
                getTotalWorkouts(),
            ]);
            setHistory(nextHistory);
            setStreak(nextStreak);
            setTotal(nextTotal);
            finishLoading();
        } catch (e) {
            console.warn("History background sync failed", e);
            finishLoading();
        }
    };

    const totalHours = useMemo(() => {
        const sec = history.reduce((s, h) => s + (h.durationSec || 0), 0);
        const hrs = sec / 3600;
        return hrs >= 100 ? Math.round(hrs).toString() : hrs.toFixed(1);
    }, [history]);

    const weeklyData = useMemo(() => computeWeeklyData(history), [history]);
    const prs = useMemo(() => computePRs(history), [history]);
    const hallOfFame = useMemo(() => computeHallOfFame(history), [history]);

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

    const handleShareWorkout = async (workout) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedWorkout(workout);
            setSharingCard(true);

            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                setSharingCard(false);
                showDialog({
                    title: "SHARING UNAVAILABLE",
                    message: "Sharing is not supported on this device.",
                    confirmText: "CLOSE",
                    singleButton: true,
                });
                return;
            }

            setTimeout(async () => {
                try {
                    if (shareShotRef.current && shareShotRef.current.capture) {
                        const uri = await shareShotRef.current.capture();
                        setSharingCard(false);
                        await Sharing.shareAsync(uri, {
                            mimeType: "image/png",
                            dialogTitle: `CONQUER ONE - ${workout.target || "Workout Card"}`,
                            UTI: "public.png",
                        });
                    } else {
                        setSharingCard(false);
                    }
                } catch (err) {
                    setSharingCard(false);
                    console.warn("Capture failed:", err);
                    showDialog({
                        title: "SHARE ERROR",
                        message: "Unable to generate workout card image.",
                        confirmText: "CLOSE",
                        singleButton: true,
                    });
                }
            }, 150);
        } catch (e) {
            setSharingCard(false);
            console.warn("handleShareWorkout error:", e);
        }
    };

    /* ── Export Actions ── */
    const handleExportCSV = async () => {
        if (history.length === 0) {
            showDialog({
                title: "NO DATA",
                message: "Complete workouts to generate export data.",
                confirmText: "CLOSE",
                singleButton: true,
            });
            return;
        }

        try {
            setExportingType("csv");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const csvContent = generateStructuredCSV(history, streak, total, totalHours);
            const filename = `ConquerONE_Workouts_${new Date().toISOString().split("T")[0]}.csv`;
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            const fileUri = `${baseDir}${filename}`;

            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            setExportModalVisible(false);
            setExportingType(null);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: "text/csv",
                    dialogTitle: "Export Workout Logs (CSV)",
                    UTI: "public.comma-separated-values-text",
                });
            } else {
                await Share.share({ message: csvContent, title: "ConquerONE CSV Logs" });
            }
        } catch (e) {
            setExportingType(null);
            console.warn("CSV export failed", e);
            showDialog({
                title: "EXPORT FAILED",
                message: "Unable to export CSV file.",
                confirmText: "CLOSE",
                singleButton: true,
            });
        }
    };

    const handleExportJSON = async () => {
        if (history.length === 0) {
            showDialog({
                title: "NO DATA",
                message: "Complete workouts to generate export data.",
                confirmText: "CLOSE",
                singleButton: true,
            });
            return;
        }

        try {
            setExportingType("json");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const jsonObject = generateStructuredJSON(history, streak, total, totalHours);
            const jsonString = JSON.stringify(jsonObject, null, 2);
            const filename = `ConquerONE_Backup_${new Date().toISOString().split("T")[0]}.json`;
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            const fileUri = `${baseDir}${filename}`;

            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            setExportModalVisible(false);
            setExportingType(null);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: "application/json",
                    dialogTitle: "Export Full Data Backup (JSON)",
                    UTI: "public.json",
                });
            } else {
                await Share.share({ message: jsonString, title: "ConquerONE Backup JSON" });
            }
        } catch (e) {
            setExportingType(null);
            console.warn("JSON export failed", e);
            showDialog({
                title: "EXPORT FAILED",
                message: "Unable to export JSON backup.",
                confirmText: "CLOSE",
                singleButton: true,
            });
        }
    };

    const handleExportText = async () => {
        if (history.length === 0) {
            showDialog({
                title: "NO DATA",
                message: "Complete workouts to generate export data.",
                confirmText: "CLOSE",
                singleButton: true,
            });
            return;
        }

        try {
            setExportingType("text");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const textReport = generateStructuredText(history, streak, total, totalHours);
            setExportModalVisible(false);
            setExportingType(null);

            await Share.share({
                message: textReport,
                title: "CONQUER ONE — Athlete Performance Log",
            });
        } catch (e) {
            setExportingType(null);
            console.warn("Text export failed", e);
            showDialog({
                title: "EXPORT FAILED",
                message: "Unable to share performance log.",
                confirmText: "CLOSE",
                singleButton: true,
            });
        }
    };

    const activeShareTarget = selectedWorkout || history[0] || {
        target: "Training Session",
        durationSec: 3600,
        caloriesBurned: 350,
        completedAt: new Date().toISOString(),
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>HISTORY</Text>
                <View style={styles.backBtnPlaceholder} />
            </View>

            {/* ── Segmented Tabs ── */}
            <View style={styles.tabBarContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === "analytics" && styles.tabItemActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab("analytics");
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={activeTab === "analytics" ? "stats-chart" : "stats-chart-outline"}
                            size={13}
                            color={activeTab === "analytics" ? COLORS.primary : COLORS.textMuted}
                        />
                        <Text style={[styles.tabLabel, activeTab === "analytics" && styles.tabLabelActive]}>
                            ANALYTICS
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === "logs" && styles.tabItemActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab("logs");
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={activeTab === "logs" ? "reader" : "reader-outline"}
                            size={13}
                            color={activeTab === "logs" ? COLORS.primary : COLORS.textMuted}
                        />
                        <Text style={[styles.tabLabel, activeTab === "logs" && styles.tabLabelActive]}>
                            LOGS
                        </Text>
                        {history.length > 0 && (
                            <View style={[styles.tabBadge, activeTab === "logs" && styles.tabBadgeActive]}>
                                <Text style={[styles.tabBadgeText, activeTab === "logs" && styles.tabBadgeTextActive]}>
                                    {history.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === "cards" && styles.tabItemActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab("cards");
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={activeTab === "cards" ? "images" : "images-outline"}
                            size={13}
                            color={activeTab === "cards" ? COLORS.primary : COLORS.textMuted}
                        />
                        <Text style={[styles.tabLabel, activeTab === "cards" && styles.tabLabelActive]}>
                            CARDS
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}>
                {loading ? (
                    <View style={{ width: "100%" }}>
                        {/* Skeleton */}
                        <View style={styles.statsRow}>
                            <View style={styles.statsLeft}>
                                <SkeletonBlock width="100%" height={74} borderRadius={RADIUS.md} index={0} />
                                <SkeletonBlock width="100%" height={74} borderRadius={RADIUS.md} index={1} />
                            </View>
                            <SkeletonBlock width="auto" height={160} borderRadius={RADIUS.lg} index={2} style={{ flex: 1 }} />
                        </View>
                        <SectionLabel text="MONTHLY PROGRESS CALENDAR" />
                        <SkeletonBlock width="auto" height={140} borderRadius={RADIUS.lg} index={3} style={{ marginHorizontal: 20 }} />
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>

                        {/* ══════════════════════════════════════════════
                            TAB 1: ANALYTICS & STATS
                           ══════════════════════════════════════════════ */}
                        {activeTab === "analytics" && (
                            <View>
                                {/* Stats Asymmetric Grid */}
                                <View style={styles.statsRow}>
                                    <View style={styles.statsLeft}>
                                        {/* Streak Card */}
                                        <View style={[styles.statSmall, { borderColor: "rgba(255, 149, 0, 0.25)" }]}>
                                            <LinearGradient
                                                colors={["rgba(255, 149, 0, 0.08)", "transparent"]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFillObject}
                                                pointerEvents="none"
                                            />
                                            <View style={styles.statSmallTop}>
                                                <Ionicons name="flame" size={14} color="#FF9500" />
                                                <Text style={styles.statLabel}>STREAK</Text>
                                            </View>
                                            <Text style={[styles.statValue, { color: "#FF9500" }]}>{streak}D</Text>
                                        </View>

                                        {/* Sessions Card */}
                                        <View style={styles.statSmall}>
                                            <LinearGradient
                                                colors={["rgba(255, 255, 255, 0.03)", "transparent"]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFillObject}
                                                pointerEvents="none"
                                            />
                                            <View style={styles.statSmallTop}>
                                                <Ionicons name="fitness-outline" size={14} color={COLORS.textSub} />
                                                <Text style={styles.statLabel}>SESSIONS</Text>
                                            </View>
                                            <Text style={styles.statValue}>{total}</Text>
                                        </View>
                                    </View>

                                    {/* Total Duration Card (Main Card) */}
                                    <View style={styles.statLarge}>
                                        <LinearGradient
                                            colors={["rgba(227, 30, 36, 0.08)", "rgba(255, 255, 255, 0.02)"]}
                                            start={{ x: 1, y: 1 }}
                                            end={{ x: 0, y: 0 }}
                                            style={StyleSheet.absoluteFillObject}
                                            pointerEvents="none"
                                        />
                                        {/* Red decorative background watermark */}
                                        <View style={{ position: "absolute", right: -20, bottom: -20, opacity: 0.16 }} pointerEvents="none">
                                            <Ionicons name="time-outline" size={120} color={COLORS.primary} />
                                        </View>

                                        <View style={styles.statSmallTop}>
                                            <Ionicons name="time-outline" size={16} color={COLORS.textSub} />
                                            <Text style={styles.statLabel}>TOTAL DURATION</Text>
                                        </View>
                                        <View>
                                            <Text style={[styles.statValue, { fontSize: 34, lineHeight: 38 }]}>
                                                {totalHours}<Text style={{ fontSize: 18, color: COLORS.textSub }}>h</Text>
                                            </Text>
                                            <Text style={styles.statSubLabel}>cumulative volume</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* ── Hall of Fame & Highlights Grid ── */}
                                <SectionLabel text="HALL OF FAME & RECORDS" />
                                <View style={styles.hofGrid}>
                                    {/* Max Calories Card */}
                                    <View style={styles.hofCard}>
                                        <LinearGradient
                                            colors={["rgba(227, 30, 36, 0.08)", "transparent"]}
                                            style={StyleSheet.absoluteFillObject}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.hofTop}>
                                            <View style={[styles.hofIconBox, { backgroundColor: "rgba(227, 30, 36, 0.12)", borderColor: "rgba(227, 30, 36, 0.3)" }]}>
                                                <Ionicons name="flame" size={14} color={COLORS.primary} />
                                            </View>
                                            <Text style={styles.hofTag}>MAX CALORIES</Text>
                                        </View>
                                        <Text style={[styles.hofValue, { color: COLORS.primary }]}>
                                            {hallOfFame.maxCalories ? `${hallOfFame.maxCalories.calories}` : "—"}
                                            <Text style={styles.hofUnit}>{hallOfFame.maxCalories ? " KCAL" : ""}</Text>
                                        </Text>
                                        <Text style={styles.hofSub} numberOfLines={1}>
                                            {hallOfFame.maxCalories ? `${hallOfFame.maxCalories.target} · ${hallOfFame.maxCalories.date ? hallOfFame.maxCalories.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}` : "No workout logged"}
                                        </Text>
                                    </View>

                                    {/* Heaviest Lift Card */}
                                    <View style={styles.hofCard}>
                                        <LinearGradient
                                            colors={["rgba(255, 215, 0, 0.08)", "transparent"]}
                                            style={StyleSheet.absoluteFillObject}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.hofTop}>
                                            <View style={[styles.hofIconBox, { backgroundColor: "rgba(255, 215, 0, 0.12)", borderColor: "rgba(255, 215, 0, 0.3)" }]}>
                                                <Ionicons name="barbell" size={14} color="#FFD700" />
                                            </View>
                                            <Text style={styles.hofTag}>HEAVIEST LIFT</Text>
                                        </View>
                                        <Text style={[styles.hofValue, { color: "#FFD700" }]}>
                                            {hallOfFame.heaviestLift ? `${hallOfFame.heaviestLift.weightKg}` : "—"}
                                            <Text style={styles.hofUnit}>{hallOfFame.heaviestLift ? " KG" : ""}</Text>
                                        </Text>
                                        <Text style={styles.hofSub} numberOfLines={1}>
                                            {hallOfFame.heaviestLift ? `${hallOfFame.heaviestLift.exerciseName} · ${hallOfFame.heaviestLift.reps}r` : "No heavy lift logged"}
                                        </Text>
                                    </View>

                                    {/* Longest Session Card */}
                                    <View style={styles.hofCard}>
                                        <LinearGradient
                                            colors={["rgba(48, 176, 199, 0.08)", "transparent"]}
                                            style={StyleSheet.absoluteFillObject}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.hofTop}>
                                            <View style={[styles.hofIconBox, { backgroundColor: "rgba(48, 176, 199, 0.12)", borderColor: "rgba(48, 176, 199, 0.3)" }]}>
                                                <Ionicons name="timer" size={14} color="#30B0C7" />
                                            </View>
                                            <Text style={styles.hofTag}>LONGEST SESSION</Text>
                                        </View>
                                        <Text style={[styles.hofValue, { color: "#30B0C7" }]}>
                                            {hallOfFame.longestSession ? formatDuration(hallOfFame.longestSession.durationSec) : "—"}
                                        </Text>
                                        <Text style={styles.hofSub} numberOfLines={1}>
                                            {hallOfFame.longestSession ? `${hallOfFame.longestSession.target} · ${hallOfFame.longestSession.date ? hallOfFame.longestSession.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}` : "No session logged"}
                                        </Text>
                                    </View>

                                    {/* All-Time PRs Card */}
                                    <View style={styles.hofCard}>
                                        <LinearGradient
                                            colors={["rgba(255, 149, 0, 0.08)", "transparent"]}
                                            style={StyleSheet.absoluteFillObject}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.hofTop}>
                                            <View style={[styles.hofIconBox, { backgroundColor: "rgba(255, 149, 0, 0.12)", borderColor: "rgba(255, 149, 0, 0.3)" }]}>
                                                <Ionicons name="trophy" size={14} color="#FF9500" />
                                            </View>
                                            <Text style={styles.hofTag}>BEST TARGETS</Text>
                                        </View>
                                        <Text style={[styles.hofValue, { color: "#FF9500" }]}>
                                            {prs.length}
                                            <Text style={styles.hofUnit}> PRs</Text>
                                        </Text>
                                        <Text style={styles.hofSub} numberOfLines={1}>
                                            {prs.length > 0 ? "Benchmark records active" : "Log workouts to set PRs"}
                                        </Text>
                                    </View>
                                </View>

                                {/* ── Weekly Flow Graph ── */}
                                {total > 0 && (
                                    <>
                                        <SectionLabel text="WEEKLY FLOW" />
                                        <View style={styles.card}>
                                            <LineChart data={weeklyData} />
                                        </View>
                                    </>
                                )}

                                {/* ── Target Focus ── */}
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

                                {/* ── Personal Bests List ── */}
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

                                {/* ── Monthly Progress Calendar ── */}
                                <SectionLabel text="MONTHLY PROGRESS CALENDAR" />
                                <WorkoutCalendar history={history} style={{ marginHorizontal: 20 }} />
                            </View>
                        )}

                        {/* ══════════════════════════════════════════════
                            TAB 2: WORKOUT LOGS
                           ══════════════════════════════════════════════ */}
                        {activeTab === "logs" && (
                            <View>
                                <View style={styles.logsHeaderRow}>
                                    <SectionLabel text={`LOGGED SESSIONS (${history.length})`} />
                                    {history.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.exportPillBtn}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setExportModalVisible(true);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="download-outline" size={13} color={COLORS.primary} />
                                            <Text style={styles.exportPillText}>EXPORT LOGS</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {history.length === 0 ? (
                                    <View style={styles.empty}>
                                        <View style={styles.emptyIconBox}>
                                            <Ionicons name="barbell-outline" size={32} color={COLORS.textMuted} />
                                        </View>
                                        <Text style={styles.emptyTitle}>NO SESSIONS LOGGED YET</Text>
                                        <Text style={styles.emptySub}>Your completed workouts will be recorded here with full set breakdown and timestamps.</Text>
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
                                                        onShare={handleShareWorkout}
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}

                        {/* ══════════════════════════════════════════════
                            TAB 3: SHAREABLE CARDS GALLERY
                           ══════════════════════════════════════════════ */}
                        {activeTab === "cards" && (
                            <View style={{ paddingHorizontal: 20 }}>
                                <SectionLabel text="SHAREABLE SESSION CARDS" />
                                <Text style={styles.cardsHelpText}>
                                    Tap "SHARE" on any completed session below to generate a branded social card ready for Instagram, WhatsApp, or Twitter.
                                </Text>

                                {history.length === 0 ? (
                                    <View style={styles.empty}>
                                        <View style={styles.emptyIconBox}>
                                            <Ionicons name="images-outline" size={32} color={COLORS.textMuted} />
                                        </View>
                                        <Text style={styles.emptyTitle}>NO CARDS TO SHARE</Text>
                                        <Text style={styles.emptySub}>Complete your first workout to generate instant shareable athlete cards.</Text>
                                    </View>
                                ) : (
                                    history.map((workout, idx) => (
                                        <GalleryCardItem
                                            key={idx}
                                            workout={workout}
                                            streak={streak}
                                            onShare={handleShareWorkout}
                                            isSharing={sharingCard}
                                        />
                                    ))
                                )}
                            </View>
                        )}

                    </Animated.View>
                )}
            </ScrollView>

            {/* ── Structured Data Export Modal ── */}
            <Modal
                visible={exportModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setExportModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.exportModalContent}>
                        {/* Header */}
                        <View style={styles.exportModalHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={styles.exportHeaderIconBox}>
                                    <Ionicons name="cloud-download-outline" size={16} color={COLORS.primary} />
                                </View>
                                <Text style={styles.exportModalTitle}>EXPORT TRAINING LOGS</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.exportModalCloseBtn}
                                onPress={() => setExportModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="close" size={18} color={COLORS.textSub} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.exportModalSub}>
                            Export your entire workout history in structured formats for spreadsheets, backup, or personal records.
                        </Text>

                        {/* Export Options */}
                        <View style={styles.exportOptionsList}>
                            {/* Option 1: CSV Spreadsheet */}
                            <TouchableOpacity
                                style={styles.exportOptionCard}
                                onPress={handleExportCSV}
                                activeOpacity={0.8}
                                disabled={exportingType !== null}
                            >
                                <LinearGradient
                                    colors={["rgba(48, 209, 88, 0.08)", "transparent"]}
                                    style={StyleSheet.absoluteFillObject}
                                    pointerEvents="none"
                                />
                                <View style={[styles.exportOptionIconBox, { backgroundColor: "rgba(48, 209, 88, 0.12)", borderColor: "rgba(48, 209, 88, 0.3)" }]}>
                                    <Ionicons name="grid-outline" size={18} color="#30D158" />
                                </View>
                                <View style={styles.exportOptionInfo}>
                                    <Text style={styles.exportOptionTitle}>Spreadsheet (.CSV)</Text>
                                    <Text style={styles.exportOptionDesc}>
                                        Tabular log formatted for Excel, Google Sheets, or Notion with all sets, reps, and weights.
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>

                            {/* Option 2: JSON Backup */}
                            <TouchableOpacity
                                style={styles.exportOptionCard}
                                onPress={handleExportJSON}
                                activeOpacity={0.8}
                                disabled={exportingType !== null}
                            >
                                <LinearGradient
                                    colors={["rgba(255, 149, 0, 0.08)", "transparent"]}
                                    style={StyleSheet.absoluteFillObject}
                                    pointerEvents="none"
                                />
                                <View style={[styles.exportOptionIconBox, { backgroundColor: "rgba(255, 149, 0, 0.12)", borderColor: "rgba(255, 149, 0, 0.3)" }]}>
                                    <Ionicons name="code-slash" size={18} color="#FF9500" />
                                </View>
                                <View style={styles.exportOptionInfo}>
                                    <Text style={styles.exportOptionTitle}>Full JSON Backup (.JSON)</Text>
                                    <Text style={styles.exportOptionDesc}>
                                        Complete raw data payload including all exercise metadata, timestamps, and streaks.
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>

                            {/* Option 3: Formatted Summary Report */}
                            <TouchableOpacity
                                style={styles.exportOptionCard}
                                onPress={handleExportText}
                                activeOpacity={0.8}
                                disabled={exportingType !== null}
                            >
                                <LinearGradient
                                    colors={["rgba(48, 176, 199, 0.08)", "transparent"]}
                                    style={StyleSheet.absoluteFillObject}
                                    pointerEvents="none"
                                />
                                <View style={[styles.exportOptionIconBox, { backgroundColor: "rgba(48, 176, 199, 0.12)", borderColor: "rgba(48, 176, 199, 0.3)" }]}>
                                    <Ionicons name="document-text-outline" size={18} color="#30B0C7" />
                                </View>
                                <View style={styles.exportOptionInfo}>
                                    <Text style={styles.exportOptionTitle}>Athlete Summary Report (.TXT)</Text>
                                    <Text style={styles.exportOptionDesc}>
                                        Clean formatted performance log ready for pasting into notes, journals, or chat.
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Footer stats tag */}
                        <View style={styles.exportModalFooter}>
                            <Text style={styles.exportModalFooterText}>
                                {total} Sessions Logged · {totalHours} Hours Volume · {streak}d Streak
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Purpose-Built Branded Social Share Card (Off-Screen Captured ViewShot) ── */}
            <View style={styles.offscreenWrap} pointerEvents="none">
                <ViewShot ref={shareShotRef} options={{ format: "png", quality: 1 }}>
                    <View style={styles.shareCard} collapsable={false}>
                        {/* Background Gradient & Ambient Sheen */}
                        <LinearGradient
                            colors={["#141418", "#0A0A0C", "#040406"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.3, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <LinearGradient
                            colors={["rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.02)", "transparent"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100 }}
                        />

                        {/* Top Card Header */}
                        <View style={styles.shareCardHeader}>
                            <View style={styles.shareCardBadge}>
                                <View style={[styles.shareBadgeDot, { backgroundColor: getMuscleColor(activeShareTarget?.target) }]} />
                                <Text style={[styles.shareCardBadgeText, { color: getMuscleColor(activeShareTarget?.target) }]}>
                                    SESSION COMPLETE
                                </Text>
                            </View>
                            <Text style={styles.shareCardDate}>
                                {toDate(activeShareTarget?.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                            </Text>
                        </View>

                        {/* Workout Name */}
                        <View style={styles.shareCardTitleWrap}>
                            <Text style={styles.shareCardWorkoutLabel}>LOGGED TARGET</Text>
                            <Text style={styles.shareCardWorkoutName} numberOfLines={2}>
                                {activeShareTarget?.target || "Workout"}
                            </Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.shareCardStatsGrid}>
                            <View style={styles.shareCardStatBox}>
                                <Text style={styles.shareCardStatLabel}>DURATION</Text>
                                <Text style={styles.shareCardStatValue}>{formatDuration(activeShareTarget?.durationSec || 0)}</Text>
                            </View>
                            <View style={[styles.shareCardStatBox, styles.shareCardStatDivider]}>
                                <Text style={styles.shareCardStatLabel}>STREAK</Text>
                                <Text style={[styles.shareCardStatValue, { color: COLORS.primary }]}>
                                    {streak} <Text style={styles.shareCardStatUnit}>DAYS</Text>
                                </Text>
                            </View>
                            <View style={styles.shareCardStatBox}>
                                <Text style={styles.shareCardStatLabel}>ENERGY</Text>
                                <Text style={styles.shareCardStatValue}>
                                    {activeShareTarget?.caloriesBurned || Math.round((activeShareTarget?.durationSec || 0) * 0.11)}
                                    <Text style={styles.shareCardStatUnit}> KCAL</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Exercise Summary Rows */}
                        {activeShareTarget?.exercises && activeShareTarget.exercises.length > 0 && (
                            <View style={styles.shareCardPRWrap}>
                                <View style={styles.shareCardPRHeader}>
                                    <Ionicons name="barbell-outline" size={13} color={COLORS.textSub} />
                                    <Text style={styles.shareCardPRTitle}>WORKOUT BREAKDOWN</Text>
                                </View>
                                {activeShareTarget.exercises.slice(0, 3).map((ex, i) => (
                                    <View key={i} style={styles.shareCardPRRow}>
                                        <Text style={styles.shareCardPRName} numberOfLines={1}>{ex.name}</Text>
                                        <Text style={styles.shareCardPRVal}>
                                            {ex.sets} sets {ex.weightKg > 0 ? `· ${ex.weightKg}kg` : ""}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Card Footer Brandmark */}
                        <View style={styles.shareCardFooter}>
                            <View style={styles.shareCardFooterLeft}>
                                <Image
                                    source={require("../../assets/logo_barbell.png")}
                                    style={styles.shareCardBarbell}
                                    resizeMode="contain"
                                />
                                <View style={styles.shareCardBrandTextGroup}>
                                    <Image
                                        source={require("../../assets/logo_text.png")}
                                        style={styles.shareCardLogoText}
                                        resizeMode="contain"
                                    />
                                    <Text style={styles.shareCardTagline}>ELITE PERFORMANCE PROTOCOL</Text>
                                </View>
                            </View>
                            <View style={[styles.shareCardAccentPill, { backgroundColor: `${getMuscleColor(activeShareTarget?.target)}20`, borderColor: `${getMuscleColor(activeShareTarget?.target)}4D` }]}>
                                <Text style={[styles.shareCardTargetTag, { color: getMuscleColor(activeShareTarget?.target) }]}>
                                    {activeShareTarget?.day || "WORKOUT"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ViewShot>
            </View>
        </View>
    );
}

function SectionLabel({ text }) {
    return (
        <View style={styles.sectionLabelRow}>
            <View style={styles.sectionAccentLine} />
            <Text style={styles.sectionLabel}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 14, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.bgCard,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
    backBtnPlaceholder: {
        width: 36, height: 36,
    },
    headerTitle: { fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },

    /* Segmented Tab Bar */
    tabBarContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderRadius: RADIUS.pill,
        padding: 3,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    tabItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        borderRadius: RADIUS.pill,
        gap: 6,
    },
    tabItemActive: {
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.16)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    tabLabel: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    tabLabelActive: {
        color: COLORS.text,
    },
    tabBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    tabBadgeActive: {
        backgroundColor: "rgba(227, 30, 36, 0.15)",
    },
    tabBadgeText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
    },
    tabBadgeTextActive: {
        color: COLORS.primary,
    },

    /* Stats Grid */
    statsRow: {
        flexDirection: "row", marginHorizontal: 20, marginTop: 4, gap: 12,
    },
    statsLeft: { flex: 1, gap: 12 },
    statSmall: {
        flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
        padding: 16, borderWidth: 1, borderColor: COLORS.border,
        position: "relative", overflow: "hidden", justifyContent: "center",
    },
    statLarge: {
        flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
        padding: 18, borderWidth: 1, borderColor: COLORS.border,
        justifyContent: "space-between", position: "relative", overflow: "hidden",
    },
    statSmallTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    statValue: { fontSize: 24, fontFamily: FAMILY.monoBold, color: COLORS.text, letterSpacing: -0.5 },
    statLabel: { fontSize: 9.5, color: COLORS.textSub, fontFamily: FAMILY.semibold, letterSpacing: 1, flex: 1 },
    statSubLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: FAMILY.regular, marginTop: 2 },

    /* Hall of Fame Highlights */
    hofGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 20,
        gap: 12,
    },
    hofCard: {
        width: (width - 40 - 12) / 2,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
        position: "relative",
    },
    hofTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    hofIconBox: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    hofTag: {
        fontSize: 8,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    hofValue: {
        fontSize: 19,
        fontFamily: FAMILY.monoBold,
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    hofUnit: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    hofSub: {
        fontSize: 9.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        marginTop: 2,
    },

    sectionLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 24,
        marginBottom: 12,
        marginHorizontal: 20,
        gap: 8,
    },
    sectionAccentLine: {
        width: 3,
        height: 12,
        borderRadius: 1.5,
        backgroundColor: COLORS.primary,
    },
    sectionLabel: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1.2,
    },

    logsHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingRight: 20,
    },
    exportPillBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.10)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.25)",
        marginTop: 12,
    },
    exportPillText: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
        letterSpacing: 0.8,
    },

    card: {
        marginHorizontal: 20, backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
        padding: 18,
    },

    weekContainer: { marginHorizontal: 20, marginBottom: 20 },
    weekLabel: {
        fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.textSub,
        marginBottom: 8, marginLeft: 4
    },
    weekCard: {
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.border,
        paddingHorizontal: 16,
    },

    cardsHelpText: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        lineHeight: 16,
        marginBottom: 16,
    },

    empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
    emptyIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    emptyTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub, marginBottom: 6, letterSpacing: 0.5 },
    emptySub: { fontSize: 11.5, color: COLORS.textMuted, textAlign: "center", lineHeight: 17, fontFamily: FAMILY.regular },

    /* Export Modal */
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        justifyContent: "flex-end",
    },
    exportModalContent: {
        backgroundColor: "#141416",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        padding: 24,
        paddingBottom: 36,
    },
    exportModalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    exportHeaderIconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
        alignItems: "center",
        justifyContent: "center",
    },
    exportModalTitle: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    exportModalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    exportModalSub: {
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        lineHeight: 18,
        marginBottom: 20,
    },
    exportOptionsList: {
        gap: 12,
        marginBottom: 16,
    },
    exportOptionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.bgCard,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        gap: 14,
        overflow: "hidden",
        position: "relative",
    },
    exportOptionIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    exportOptionInfo: {
        flex: 1,
    },
    exportOptionTitle: {
        fontSize: 13.5,
        fontFamily: FAMILY.semibold,
        color: COLORS.text,
        marginBottom: 3,
    },
    exportOptionDesc: {
        fontSize: 10.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 15,
    },
    exportModalFooter: {
        alignItems: "center",
        paddingTop: 10,
    },
    exportModalFooterText: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },

    /* Purpose-Built Social Share Card Template */
    offscreenWrap: {
        position: "absolute",
        left: -3500,
        top: 0,
        opacity: 0,
    },
    shareCard: {
        width: 360,
        minHeight: 460,
        backgroundColor: COLORS.bg,
        borderRadius: 24,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        padding: 24,
        justifyContent: "space-between",
        overflow: "hidden",
    },
    shareCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    shareCardBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    shareBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    shareCardBadgeText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        letterSpacing: 1,
    },
    shareCardDate: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    shareCardTitleWrap: {
        marginBottom: 22,
    },
    shareCardWorkoutLabel: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    shareCardWorkoutName: {
        fontSize: 24,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    shareCardStatsGrid: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingVertical: 16,
        marginBottom: 16,
    },
    shareCardStatBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    shareCardStatDivider: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    shareCardStatLabel: {
        fontSize: 8,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 4,
    },
    shareCardStatValue: {
        fontSize: 18,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
        letterSpacing: -0.2,
    },
    shareCardStatUnit: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    shareCardPRWrap: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 12,
        marginBottom: 16,
    },
    shareCardPRHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    shareCardPRTitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1,
    },
    shareCardPRRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 3,
    },
    shareCardPRName: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
        color: COLORS.text,
        flex: 1,
    },
    shareCardPRVal: {
        fontSize: 10.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    shareCardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
    },
    shareCardFooterLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    shareCardBarbell: {
        width: 32,
        height: 22,
    },
    shareCardBrandTextGroup: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2.5,
    },
    shareCardLogoText: {
        width: 108,
        height: 10,
    },
    shareCardTagline: {
        fontSize: 7,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
    },
    shareCardAccentPill: {
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
    },
    shareCardTargetTag: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.8,
    },
});
