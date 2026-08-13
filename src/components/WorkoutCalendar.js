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
import { COLORS, FAMILY, RADIUS } from "../utils/theme";
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

export default function WorkoutCalendar({ history = [], style }) {
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
                    <Text style={[styles.statVal, { color: COLORS.primary }]}>{monthStats.consistency}%</Text>
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

                    return (
                        <TouchableOpacity
                            key={cell.key}
                            style={[
                                styles.cell,
                                !cell.isCurrentMonth && styles.cellOtherMonth,
                                cell.isToday && styles.cellToday,
                                hasWorkout && styles.cellWorkout,
                                isSelected && styles.cellSelected,
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedDateKey(cell.dateKey);
                            }}
                        >
                            {/* Today ring glow */}
                            {cell.isToday && <View style={styles.todayGlow} />}

                            <Text
                                style={[
                                    styles.cellText,
                                    !cell.isCurrentMonth && styles.cellTextOtherMonth,
                                    cell.isToday && styles.cellTextToday,
                                    hasWorkout && styles.cellTextWorkout,
                                    isSelected && styles.cellTextSelected,
                                ]}
                            >
                                {cell.dateNum}
                            </Text>

                            {/* Workout indicators */}
                            {hasWorkout && (
                                <View style={styles.workoutBadge}>
                                    {dayWorkouts.length > 1 ? (
                                        <Text style={styles.workoutCountText}>{dayWorkouts.length}</Text>
                                    ) : (
                                        <View style={styles.workoutDot} />
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Inspector Card: Selected Day Details */}
            <View style={styles.inspectorCard}>
                <LinearGradient
                    colors={["rgba(255, 255, 255, 0.03)", "rgba(5, 5, 5, 0.95)"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.inspectorHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
                        <Text style={styles.inspectorTitle}>{selectedDateTitle}</Text>
                    </View>
                    <View style={styles.inspectorBadge}>
                        <Text style={styles.inspectorBadgeText}>
                            {selectedDateWorkouts.length > 0
                                ? `${selectedDateWorkouts.length} SESSION${selectedDateWorkouts.length > 1 ? "S" : ""}`
                                : "REST DAY"}
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
                                <View key={idx} style={styles.workoutItem}>
                                    <View style={styles.workoutItemHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.workoutTarget}>{w.target?.toUpperCase() || "WORKOUT"}</Text>
                                            <Text style={styles.workoutSub}>
                                                {timeStr} · {formatDuration(w.durationSec || 0)}
                                            </Text>
                                        </View>
                                        <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
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
                ) : (
                    <View style={styles.emptyRestState}>
                        <Ionicons name="moon-outline" size={20} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyRestText}>REST & RECOVERY</Text>
                        <Text style={styles.emptyRestSub}>No workout logged for this date.</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "rgba(13, 13, 13, 0.75)",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 16,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    titleWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    titleBadge: {
        width: 3.5,
        height: 14,
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
    monthTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.5,
    },
    navRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    todayBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 0.8,
        borderColor: "rgba(227, 30, 36, 0.4)",
    },
    todayBtnText: {
        fontSize: 8,
        fontFamily: FAMILY.mono,
        color: COLORS.primary,
        letterSpacing: 1,
    },
    navBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 0.8,
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        justifyContent: "center",
    },

    // Stats Bar
    statsBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        borderRadius: 14,
        borderWidth: 0.8,
        borderColor: "rgba(255, 255, 255, 0.06)",
        paddingVertical: 10,
        marginBottom: 14,
        overflow: "hidden",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statVal: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: -0.2,
    },
    statLbl: {
        fontSize: 7.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 18,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },

    // Weekdays
    weekdaysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    weekdayLabel: {
        flex: 1,
        textAlign: "center",
        fontSize: 8,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },

    // Grid
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
    },
    cell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        padding: 2,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        marginVertical: 2,
        borderWidth: 0.8,
        borderColor: "transparent",
        backgroundColor: "transparent",
        position: "relative",
    },
    cellOtherMonth: {
        opacity: 0.25,
    },
    cellToday: {
        borderColor: "rgba(255, 255, 255, 0.4)",
    },
    cellWorkout: {
        backgroundColor: "rgba(227, 30, 36, 0.2)",
        borderColor: "rgba(227, 30, 36, 0.5)",
    },
    cellSelected: {
        borderColor: COLORS.text,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    todayGlow: {
        position: "absolute",
        top: 3,
        right: 3,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },

    cellText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
    },
    cellTextOtherMonth: {
        color: COLORS.textMuted,
    },
    cellTextToday: {
        color: COLORS.text,
    },
    cellTextWorkout: {
        color: "#FFFFFF",
    },
    cellTextSelected: {
        color: "#FFFFFF",
    },

    workoutBadge: {
        position: "absolute",
        bottom: 3,
        alignItems: "center",
        justifyContent: "center",
    },
    workoutDot: {
        width: 3.5,
        height: 3.5,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    workoutCountText: {
        fontSize: 7,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
    },

    // Inspector Card
    inspectorCard: {
        marginTop: 14,
        borderRadius: 16,
        borderWidth: 0.8,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 12,
        overflow: "hidden",
    },
    inspectorHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 8,
        borderBottomWidth: 0.8,
        borderBottomColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: 10,
    },
    inspectorTitle: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.2,
    },
    inspectorBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    inspectorBadgeText: {
        fontSize: 7.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
        letterSpacing: 1,
    },

    workoutList: {
        gap: 8,
    },
    workoutItem: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 10,
        padding: 10,
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    workoutItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    workoutTarget: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    workoutSub: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        marginTop: 2,
        letterSpacing: 0.5,
    },

    exerciseChipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 8,
    },
    exerciseChip: {
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: "rgba(227, 30, 36, 0.25)",
        maxWidth: 140,
    },
    exerciseChipMore: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    exerciseChipText: {
        fontSize: 7.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
    },

    emptyRestState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 4,
    },
    emptyRestText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginTop: 2,
    },
    emptyRestSub: {
        fontSize: 8,
        fontFamily: FAMILY.regular,
        color: "rgba(255, 255, 255, 0.25)",
    },
});
