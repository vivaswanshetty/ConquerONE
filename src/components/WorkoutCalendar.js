import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, RADIUS, getMuscleColor } from "../utils/theme";
import { formatDuration } from "../utils/storage";

const { width } = Dimensions.get("window");

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/**
 * Helper to safely convert completedAt into Date instance.
 */
function toDate(completedAt) {
    if (!completedAt) return new Date();
    if (typeof completedAt === "object" && completedAt.seconds) {
        return new Date(completedAt.seconds * 1000);
    }
    if (completedAt instanceof Date) return completedAt;
    const parsed = new Date(completedAt);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format Date to YYYY-MM-DD
 */
function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function WorkoutCalendar({ history = [], style, onLogWorkoutForDate = null }) {
    const today = useMemo(() => new Date(), []);
    const todayKey = useMemo(() => formatDateKey(today), [today]);

    // Currently viewed month/year
    const [viewDate, setViewDate] = useState(
        () => new Date(today.getFullYear(), today.getMonth(), 1)
    );
    // Selected day in key format YYYY-MM-DD
    const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // Map history entries by date string YYYY-MM-DD
    const historyByDate = useMemo(() => {
        const map = {};
        (history || []).forEach((item) => {
            const d = toDate(item.completedAt);
            const key = formatDateKey(d);
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return map;
    }, [history]);

    // Month navigation helpers
    const prevMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewDate(new Date(year, month + 1, 1));
    };

    const jumpToToday = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const now = new Date();
        setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDateKey(todayKey);
    };

    // Calculate grid cells for current viewed month
    const calendarCells = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Monday-based start index (0=Mon, 1=Tue, ..., 6=Sun)
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

        const cells = [];

        // 1. Previous month trailing days
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const dateObj = new Date(year, month - 1, dayNum);
            const key = formatDateKey(dateObj);
            cells.push({
                key: `prev-${dayNum}`,
                dateNum: dayNum,
                dateKey: key,
                isCurrentMonth: false,
                isFuture: dateObj > today,
            });
        }

        // 2. Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = formatDateKey(dateObj);
            cells.push({
                key: `curr-${d}`,
                dateNum: d,
                dateKey: key,
                isCurrentMonth: true,
                isToday: key === todayKey,
                isFuture: dateObj > today,
            });
        }

        // 3. Next month leading days to complete grid rows
        const totalCells = cells.length;
        const remainder = totalCells % 7;
        if (remainder > 0) {
            const nextDaysNeeded = 7 - remainder;
            for (let n = 1; n <= nextDaysNeeded; n++) {
                const dateObj = new Date(year, month + 1, n);
                const key = formatDateKey(dateObj);
                cells.push({
                    key: `next-${n}`,
                    dateNum: n,
                    dateKey: key,
                    isCurrentMonth: false,
                    isFuture: dateObj > today,
                });
            }
        }

        return cells;
    }, [year, month, today, todayKey]);

    // Monthly summary stats
    const monthStats = useMemo(() => {
        let totalSessions = 0;
        let totalSec = 0;
        const activeDays = new Set();

        (history || []).forEach((item) => {
            const d = toDate(item.completedAt);
            if (d.getFullYear() === year && d.getMonth() === month) {
                totalSessions += 1;
                totalSec += item.durationSec || 0;
                activeDays.add(formatDateKey(d));
            }
        });

        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const daysPassed = isCurrentMonth
            ? today.getDate()
            : new Date(year, month + 1, 0).getDate();

        const activeDaysCount = activeDays.size;
        const consistencyPct = daysPassed > 0 ? Math.round((activeDaysCount / daysPassed) * 100) : 0;
        const totalHours = (totalSec / 3600).toFixed(1);

        return {
            sessions: totalSessions,
            hours: totalHours,
            consistency: consistencyPct,
            activeDays: activeDaysCount,
        };
    }, [history, year, month, today]);

    // Workouts for currently selected date
    const selectedDateWorkouts = useMemo(() => {
        return historyByDate[selectedDateKey] || [];
    }, [historyByDate, selectedDateKey]);

    // Analysis of currently selected date
    const selectedDateInfo = useMemo(() => {
        const [y, m, d] = selectedDateKey.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        dateObj.setHours(0, 0, 0, 0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const isToday = dateObj.getTime() === now.getTime();
        const isFuture = dateObj.getTime() > now.getTime();
        const isPast = dateObj.getTime() < now.getTime();
        const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday, ... 6 is Saturday

        const isSunday = dayOfWeek === 0;

        const SCHEDULED_PLAN = {
            1: { target: "Chest + Triceps", color: getMuscleColor("PUSH") },
            2: { target: "Back + Biceps + Forearms", color: getMuscleColor("PULL") },
            3: { target: "Shoulders + Abs", color: getMuscleColor("ARMS/SHOULDERS") },
            4: { target: "Legs", color: getMuscleColor("LEGS") },
            5: { target: "Chest + Back (Heavy)", color: getMuscleColor("PUSH") },
            6: { target: "Arms + Forearms + Abs", color: getMuscleColor("ARMS/SHOULDERS") },
            0: { target: "Rest & Recovery", color: getMuscleColor("RECOVERY") },
        };

        const plan = SCHEDULED_PLAN[dayOfWeek] || { target: "Workout", color: COLORS.textMuted };

        return {
            dateObj,
            isToday,
            isFuture,
            isPast,
            isSunday,
            dayOfWeek,
            plan,
        };
    }, [selectedDateKey]);

    // Selected date label formatting
    const selectedDateTitle = useMemo(() => {
        const [y, m, d] = selectedDateKey.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        }).toUpperCase();
    }, [selectedDateKey]);

    const isCurrentMonthView = today.getFullYear() === year && today.getMonth() === month;
    const monthTitle = viewDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    }).toUpperCase();

    return (
        <View style={[styles.container, style]}>
            {/* Header: Month & Navigation */}
            <View style={styles.header}>
                <View style={styles.titleWrap}>
                    <View style={styles.titleBadge} />
                    <Text style={styles.monthTitle}>{monthTitle}</Text>
                </View>
                <View style={styles.navRow}>
                    {!isCurrentMonthView && (
                        <TouchableOpacity
                            style={styles.todayBtn}
                            onPress={jumpToToday}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.todayBtnText}>TODAY</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.7}>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Monthly Stats Bar */}
            <View style={styles.statsBar}>
                <LinearGradient
                    colors={["rgba(255, 255, 255, 0.04)", "rgba(5, 5, 5, 0.8)"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{monthStats.sessions}</Text>
                    <Text style={styles.statLbl}>SESSIONS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{monthStats.hours}<Text style={{ fontSize: 9 }}>h</Text></Text>
                    <Text style={styles.statLbl}>ACTIVE TIME</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: COLORS.text }]}>{monthStats.consistency}%</Text>
                    <Text style={styles.statLbl}>CONSISTENCY</Text>
                </View>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((day) => (
                    <Text key={day} style={styles.weekdayLabel}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.gridContainer}>
                {calendarCells.map((cell) => {
                    const dayWorkouts = historyByDate[cell.dateKey] || [];
                    const hasWorkout = dayWorkouts.length > 0;
                    const isSelected = cell.dateKey === selectedDateKey;

                    const [y, m, d] = cell.dateKey.split("-").map(Number);
                    const cellDate = new Date(y, m - 1, d);
                    const isSunday = cellDate.getDay() === 0;
                    const isPastMissed = !cell.isFuture && !cell.isToday && !isSunday && !hasWorkout;

                    return (
                        <View key={cell.key} style={styles.cellWrapper}>
                            <TouchableOpacity
                                style={[
                                    styles.cell,
                                    !cell.isCurrentMonth && styles.cellOtherMonth,
                                    cell.isToday && styles.cellToday,
                                    hasWorkout && styles.cellWorkout,
                                    isSelected && styles.cellSelected,
                                    isPastMissed && styles.cellMissed,
                                ]}
                                activeOpacity={0.75}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedDateKey(cell.dateKey);
                                }}
                            >
                                {/* Today indicator pip */}
                                {cell.isToday && !isSelected && <View style={styles.todayGlow} />}

                                <Text
                                    style={[
                                        styles.cellText,
                                        !cell.isCurrentMonth && styles.cellTextOtherMonth,
                                        cell.isToday && styles.cellTextToday,
                                        hasWorkout && styles.cellTextWorkout,
                                        isSelected && styles.cellTextSelected,
                                        isPastMissed && styles.cellTextMissed,
                                    ]}
                                >
                                    {cell.dateNum}
                                </Text>

                                {/* Workout indicators */}
                                {hasWorkout ? (
                                    <View style={styles.workoutBadge}>
                                        {dayWorkouts.length > 1 ? (
                                            <View style={styles.multiWorkoutDotsRow}>
                                                {dayWorkouts.slice(0, 3).map((w, wIdx) => (
                                                    <View
                                                        key={wIdx}
                                                        style={[
                                                            styles.workoutDot,
                                                            { backgroundColor: getMuscleColor(w.target) }
                                                        ]}
                                                    />
                                                ))}
                                            </View>
                                        ) : (
                                            <View
                                                style={[
                                                    styles.workoutDot,
                                                    { backgroundColor: getMuscleColor(dayWorkouts[0]?.target) }
                                                ]}
                                            />
                                        )}
                                    </View>
                                ) : isSunday && !cell.isFuture ? (
                                    <View style={styles.restDotWrap}>
                                        <Ionicons name="moon-outline" size={7} color="#30D158" />
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>

            {/* Muscle Group & Indicator Legend */}
            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#E31E24" }]} />
                    <Text style={styles.legendText}>PUSH</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
                    <Text style={styles.legendText}>PULL</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#30B0C7" }]} />
                    <Text style={styles.legendText}>ARMS/ABS</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#D1D1D1" }]} />
                    <Text style={styles.legendText}>LEGS</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#30D158" }]} />
                    <Text style={styles.legendText}>REST</Text>
                </View>
            </View>

            {/* Inspector Card: Selected Day Details */}
            <View style={styles.inspectorCard}>
                <LinearGradient
                    colors={["rgba(255, 255, 255, 0.03)", "rgba(5, 5, 5, 0.95)"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.inspectorHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="calendar-outline" size={13} color={COLORS.textSub} />
                        <Text style={styles.inspectorTitle}>{selectedDateTitle}</Text>
                    </View>
                    <View
                        style={[
                            styles.inspectorBadge,
                            selectedDateWorkouts.length > 0 && {
                                backgroundColor: "rgba(237, 234, 227, 0.08)",
                                borderColor: COLORS.border,
                            },
                            selectedDateWorkouts.length === 0 && selectedDateInfo.isToday && {
                                backgroundColor: "rgba(237, 234, 227, 0.08)",
                                borderColor: COLORS.border,
                            },
                            selectedDateWorkouts.length === 0 && selectedDateInfo.isPast && !selectedDateInfo.isSunday && {
                                backgroundColor: "rgba(255, 69, 58, 0.12)",
                                borderColor: "rgba(255, 69, 58, 0.35)",
                            },
                            selectedDateWorkouts.length === 0 && selectedDateInfo.isSunday && {
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderColor: "rgba(255, 255, 255, 0.1)",
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.inspectorBadgeText,
                                selectedDateWorkouts.length > 0 && { color: COLORS.text },
                                selectedDateWorkouts.length === 0 && selectedDateInfo.isToday && { color: COLORS.text },
                                selectedDateWorkouts.length === 0 && selectedDateInfo.isPast && !selectedDateInfo.isSunday && { color: "#FF453A" },
                                selectedDateWorkouts.length === 0 && selectedDateInfo.isSunday && { color: "#8E8E93" },
                            ]}
                        >
                            {selectedDateWorkouts.length > 0
                                ? `${selectedDateWorkouts.length} SESSION${selectedDateWorkouts.length > 1 ? "S" : ""}`
                                : selectedDateInfo.isSunday
                                ? "REST DAY"
                                : selectedDateInfo.isToday
                                ? "TODAY'S TARGET"
                                : selectedDateInfo.isFuture
                                ? "UPCOMING"
                                : "MISSED SESSION"}
                        </Text>
                    </View>
                </View>

                {selectedDateWorkouts.length > 0 ? (
                    <View style={styles.workoutList}>
                        {selectedDateWorkouts.map((w, idx) => {
                            const timeStr = toDate(w.completedAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                            });
                            return (
                                <View key={idx} style={[styles.workoutItem, { borderColor: `${getMuscleColor(w.target)}33` }]}>
                                    <View style={[styles.workoutLeftSpine, { backgroundColor: getMuscleColor(w.target) }]} />
                                    <View style={styles.workoutItemHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.workoutTarget}>{w.target?.toUpperCase() || "WORKOUT"}</Text>
                                            <Text style={styles.workoutSub}>
                                                {timeStr} · {formatDuration(w.durationSec || 0)}
                                            </Text>
                                        </View>
                                        <Ionicons name="checkmark-circle" size={18} color={getMuscleColor(w.target)} />
                                    </View>

                                    {/* Exercises Preview */}
                                    {w.exercises && w.exercises.length > 0 && (
                                        <View style={styles.exerciseChipsRow}>
                                            {w.exercises.slice(0, 4).map((ex, exIdx) => (
                                                 <View key={exIdx} style={styles.exerciseChip}>
                                                     <Text style={styles.exerciseChipText} numberOfLines={1}>
                                                         {ex.name} ({ex.sets}s)
                                                     </Text>
                                                 </View>
                                             ))}
                                             {w.exercises.length > 4 && (
                                                 <View style={styles.exerciseChipMore}>
                                                     <Text style={styles.exerciseChipText}>
                                                         +{w.exercises.length - 4} MORE
                                                     </Text>
                                                 </View>
                                             )}
                                         </View>
                                     )}
                                 </View>
                            );
                        })}
                    </View>
                ) : selectedDateInfo.isSunday ? (
                    <View style={styles.emptyRestState}>
                        <Ionicons name="moon-outline" size={20} color="#8E8E93" />
                        <Text style={[styles.emptyRestText, { color: "#8E8E93" }]}>SCHEDULED REST DAY</Text>
                        <Text style={styles.emptyRestSub}>Planned recovery day. Protein synthesis & muscle repair.</Text>
                        {onLogWorkoutForDate && !selectedDateInfo.isFuture && (
                            <TouchableOpacity
                                style={[styles.calendarLogBtn, { backgroundColor: "rgba(255, 255, 255, 0.06)", borderColor: "rgba(255, 255, 255, 0.12)" }]}
                                onPress={() => onLogWorkoutForDate(selectedDateKey)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle-outline" size={14} color={COLORS.textSub} style={{ marginRight: 6 }} />
                                <Text style={[styles.calendarLogBtnText, { color: COLORS.textSub }]}>LOG EXTRA WORKOUT</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : selectedDateInfo.isToday ? (
                    <View style={styles.emptyRestState}>
                        <Ionicons name="barbell-outline" size={20} color={COLORS.textSub} />
                        <Text style={[styles.emptyRestText, { color: COLORS.text }]}>
                            {selectedDateInfo.plan.target.toUpperCase()}
                        </Text>
                        <Text style={styles.emptyRestSub}>
                            Pending workout for today. Complete your session to build your streak!
                        </Text>
                        {onLogWorkoutForDate && (
                            <TouchableOpacity
                                style={styles.calendarLogBtn}
                                onPress={() => onLogWorkoutForDate(selectedDateKey)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle" size={14} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.calendarLogBtnText}>MANUALLY LOG TODAY'S SESSION</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : selectedDateInfo.isFuture ? (
                    <View style={styles.emptyRestState}>
                        <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.4)" />
                        <Text style={[styles.emptyRestText, { color: COLORS.textSub }]}>
                            {selectedDateInfo.plan.target.toUpperCase()}
                        </Text>
                        <Text style={styles.emptyRestSub}>
                            Upcoming scheduled session on your 6-day split.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.emptyRestState}>
                        <Ionicons name="close-circle-outline" size={20} color="#FF453A" />
                        <Text style={[styles.emptyRestText, { color: "#FF453A" }]}>NO WORKOUT LOGGED</Text>
                        <Text style={styles.emptyRestSub}>
                            Was scheduled for {selectedDateInfo.plan.target}. No session was recorded.
                        </Text>
                        {onLogWorkoutForDate && (
                            <TouchableOpacity
                                style={styles.calendarLogBtn}
                                onPress={() => onLogWorkoutForDate(selectedDateKey)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle" size={14} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.calendarLogBtnText}>LOG WORKOUT FOR THIS DAY</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    titleWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    titleBadge: {
        width: 3,
        height: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
    monthTitle: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    navRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    todayBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    todayBtnText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    navBtn: {
        width: 30,
        height: 30,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
    },

    // Stats Bar
    statsBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: COLORS.bg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 12,
        marginBottom: 16,
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statVal: {
        fontSize: 16,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
    },
    statLbl: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
        marginTop: 3,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
    },

    // Weekdays
    weekdaysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    weekdayLabel: {
        flex: 1,
        textAlign: "center",
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },

    // Grid
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        marginHorizontal: -2,
        marginBottom: 8,
    },
    cellWrapper: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        padding: 3,
        alignItems: "center",
        justifyContent: "center",
    },
    cell: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "transparent",
        backgroundColor: "transparent",
        position: "relative",
    },
    cellOtherMonth: {
        opacity: 0.18,
    },
    cellToday: {
        borderColor: "#FF9500",
        borderWidth: 1.5,
        backgroundColor: "rgba(255, 149, 0, 0.08)",
    },
    cellWorkout: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderColor: "rgba(255, 255, 255, 0.18)",
    },
    cellSelected: {
        borderColor: COLORS.primary,
        borderWidth: 1.5,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
    },
    cellMissed: {
        backgroundColor: "transparent",
    },
    todayGlow: {
        position: "absolute",
        top: 3,
        right: 3,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#FF9500",
    },

    cellText: {
        fontSize: 11.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
    cellTextOtherMonth: {
        color: COLORS.textMuted,
    },
    cellTextToday: {
        color: "#FF9500",
        fontFamily: FAMILY.monoBold,
    },
    cellTextWorkout: {
        color: "#FFFFFF",
        fontFamily: FAMILY.monoBold,
    },
    cellTextSelected: {
        color: "#FFFFFF",
        fontFamily: FAMILY.monoBold,
    },
    cellTextMissed: {
        color: COLORS.textMuted,
    },

    workoutBadge: {
        position: "absolute",
        bottom: 3,
        alignItems: "center",
        justifyContent: "center",
    },
    multiWorkoutDotsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    workoutDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    workoutCountText: {
        fontSize: 7,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    restDotWrap: {
        position: "absolute",
        bottom: 2,
        alignItems: "center",
        justifyContent: "center",
    },

    // Legend Bar
    legendContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        marginTop: 4,
        marginBottom: 4,
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
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
    },

    // Inspector Card
    inspectorCard: {
        marginTop: 16,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
        padding: 16,
        overflow: "hidden",
    },
    inspectorHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginBottom: 12,
    },
    inspectorTitle: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    inspectorBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inspectorBadgeText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
    },

    workoutList: {
        gap: 10,
    },
    workoutItem: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        padding: 14,
        paddingLeft: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: "relative",
        overflow: "hidden",
    },
    workoutLeftSpine: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    workoutItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    workoutTarget: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    workoutSub: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
        marginTop: 3,
    },

    exerciseChipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 10,
    },
    exerciseChip: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxWidth: 160,
    },
    exerciseChipMore: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    exerciseChipText: {
        fontSize: 9,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
    },

    emptyRestState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 6,
    },
    emptyRestText: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    emptyRestSub: {
        fontSize: 9.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        textAlign: "center",
    },
    calendarLogBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: RADIUS.pill,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    calendarLogBtnText: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 0.8,
    },
});
