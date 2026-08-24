import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Animated,
    Dimensions,
    Platform,
    Alert,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Line, G, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { COLORS, FAMILY, RADIUS, SPACING, getMuscleColor } from "../utils/theme";
import { WORKOUT_PLAN } from "../data/workoutData";
import { saveManualWorkout } from "../utils/storage";
import { syncAndroidWidget } from "../utils/widgetSync";

const { width, height } = Dimensions.get("window");

function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getDisplayDateString(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).toUpperCase();
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
        return `${hrs}h ${remMins}m`;
    }
    return `${mins}m`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. BEAUTIFUL CUSTOM CALENDAR PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════════
function CalendarPickerModal({
    visible,
    selectedDate,
    onSelectDate,
    onClose,
}) {
    const today = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => formatDateStr(new Date()), []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return formatDateStr(d);
    }, []);
    const twoDaysAgoStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return formatDateStr(d);
    }, []);

    // Active viewed month & year
    const [viewDate, setViewDate] = useState(() => {
        if (selectedDate) {
            const [y, m, d] = selectedDate.split("-").map(Number);
            return new Date(y, m - 1, 1);
        }
        return new Date();
    });

    const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate || yesterdayStr);

    useEffect(() => {
        if (visible) {
            const initial = selectedDate || yesterdayStr;
            setTempSelectedDate(initial);
            if (initial) {
                const [y, m, d] = initial.split("-").map(Number);
                setViewDate(new Date(y, m - 1, 1));
            }
        }
    }, [visible, selectedDate, yesterdayStr]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

    const prevMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setViewDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = new Date(year, month + 1, 1);
        // Do not navigate past current month in the future
        if (next.getFullYear() > today.getFullYear() || (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())) {
            return;
        }
        setViewDate(next);
    };

    const canGoNext = !(year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth()));
    const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

    // Calendar grid cells calculation (Monday start)
    const calendarCells = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Monday=0

        const cells = [];

        // Previous month trailing days
        for (let i = startDayIndex - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            const dateObj = new Date(year, month - 1, dayNum);
            cells.push({
                key: `prev-${dayNum}`,
                dayNum,
                dateStr: formatDateStr(dateObj),
                isCurrentMonth: false,
                isFuture: true,
            });
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = formatDateStr(dateObj);
            const isFuture = dateStr > todayStr;
            cells.push({
                key: `curr-${d}`,
                dayNum: d,
                dateStr,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                isFuture,
            });
        }

        // Fill remaining row to complete 7-col grid
        const remaining = (7 - (cells.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const dateObj = new Date(year, month + 1, i);
            cells.push({
                key: `next-${i}`,
                dayNum: i,
                dateStr: formatDateStr(dateObj),
                isCurrentMonth: false,
                isFuture: true,
            });
        }

        return cells;
    }, [year, month, todayStr]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.pickerOverlay}>
                <View style={styles.calendarModalCard}>
                    <LinearGradient
                        colors={["#1A1A24", "#101015", "#0B0B0E"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Header */}
                    <View style={styles.calModalHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={styles.calModalHeaderIcon}>
                                <Ionicons name="calendar" size={16} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.calModalTitle}>SELECT WORKOUT DATE</Text>
                                <Text style={styles.calModalSubtitle}>
                                    {getDisplayDateString(tempSelectedDate)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.calModalCloseBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Month Navigator */}
                    <View style={styles.calMonthNav}>
                        <TouchableOpacity style={styles.calNavArrow} onPress={prevMonth} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={{ alignItems: "center" }}>
                            <Text style={styles.calMonthTitle}>{monthName}</Text>
                            <Text style={styles.calMonthSubtitle}>TRAINING ARCHIVE</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.calNavArrow, !canGoNext && { opacity: 0.25 }]}
                            onPress={nextMonth}
                            disabled={!canGoNext}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-forward" size={18} color={canGoNext ? COLORS.text : COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday headers */}
                    <View style={styles.calWeekdaysRow}>
                        {daysOfWeek.map((dayLabel, idx) => (
                            <Text key={idx} style={styles.calWeekdayText}>{dayLabel}</Text>
                        ))}
                    </View>

                    {/* Calendar grid */}
                    <View style={styles.calGrid}>
                        {calendarCells.map((cell) => {
                            if (!cell.isCurrentMonth) {
                                return (
                                    <View key={cell.key} style={styles.calCellDisabled}>
                                        <Text style={styles.calCellTextDisabled}>{cell.dayNum}</Text>
                                    </View>
                                );
                            }

                            const isSelected = cell.dateStr === tempSelectedDate;
                            const isFuture = cell.isFuture;

                            return (
                                <TouchableOpacity
                                    key={cell.key}
                                    style={[
                                        styles.calCell,
                                        cell.isToday && styles.calCellToday,
                                        isSelected && styles.calCellSelected,
                                        isFuture && styles.calCellFuture,
                                    ]}
                                    disabled={isFuture}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setTempSelectedDate(cell.dateStr);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.calCellText,
                                        cell.isToday && styles.calCellTextToday,
                                        isSelected && styles.calCellTextSelected,
                                        isFuture && styles.calCellTextFuture,
                                    ]}>
                                        {cell.dayNum}
                                    </Text>
                                    {cell.isToday && !isSelected && <View style={styles.calTodayDot} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Quick presets row */}
                    <View style={styles.calPresetsRow}>
                        <TouchableOpacity
                            style={[styles.calPresetChip, tempSelectedDate === todayStr && styles.calPresetChipActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTempSelectedDate(todayStr);
                                const [y, m] = todayStr.split("-").map(Number);
                                setViewDate(new Date(y, m - 1, 1));
                            }}
                        >
                            <Text style={[styles.calPresetText, tempSelectedDate === todayStr && styles.calPresetTextActive]}>
                                TODAY
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.calPresetChip, tempSelectedDate === yesterdayStr && styles.calPresetChipActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTempSelectedDate(yesterdayStr);
                                const [y, m] = yesterdayStr.split("-").map(Number);
                                setViewDate(new Date(y, m - 1, 1));
                            }}
                        >
                            <Text style={[styles.calPresetText, tempSelectedDate === yesterdayStr && styles.calPresetTextActive]}>
                                YESTERDAY
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.calPresetChip, tempSelectedDate === twoDaysAgoStr && styles.calPresetChipActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setTempSelectedDate(twoDaysAgoStr);
                                const [y, m] = twoDaysAgoStr.split("-").map(Number);
                                setViewDate(new Date(y, m - 1, 1));
                            }}
                        >
                            <Text style={[styles.calPresetText, tempSelectedDate === twoDaysAgoStr && styles.calPresetTextActive]}>
                                2 DAYS AGO
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.calActionsRow}>
                        <TouchableOpacity style={styles.calCancelBtn} onPress={onClose} activeOpacity={0.7}>
                            <Text style={styles.calCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.calConfirmBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onSelectDate(tempSelectedDate);
                                onClose();
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#8B0000"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name="checkmark" size={16} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.calConfirmText}>CONFIRM DATE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. BEAUTIFUL CUSTOM CLOCK & TIME PICKER MODAL
// ═══════════════════════════════════════════════════════════════════════════
function ClockTimePickerModal({
    visible,
    durationMin,
    onSelectDuration,
    onClose,
}) {
    const [hours, setHours] = useState(Math.floor(durationMin / 60));
    const [minutes, setMinutes] = useState(durationMin % 60);

    useEffect(() => {
        if (visible) {
            setHours(Math.floor(durationMin / 60));
            setMinutes(durationMin % 60);
        }
    }, [visible, durationMin]);

    const totalMins = hours * 60 + minutes;
    const estimatedCals = Math.round((totalMins * 60) * 0.11);

    const adjustHours = (delta) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setHours((prev) => Math.max(0, Math.min(6, prev + delta)));
    };

    const adjustMinutes = (delta) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMinutes((prev) => {
            let next = prev + delta;
            if (next < 0) {
                if (hours > 0) {
                    setHours((h) => h - 1);
                    return 60 + next;
                }
                return 0;
            }
            if (next >= 60) {
                setHours((h) => Math.min(6, h + 1));
                return next - 60;
            }
            return next;
        });
    };

    const setExactPreset = (totalM) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setHours(Math.floor(totalM / 60));
        setMinutes(totalM % 60);
    };

    // Calculate SVG Analog Clock Hands
    const minuteAngle = (minutes / 60) * 360;
    const hourAngle = ((hours % 12) / 12 + minutes / 720) * 360;

    const clockRadius = 64;
    const center = 72;

    const getHandCoords = (deg, length) => {
        const rad = (deg - 90) * (Math.PI / 180);
        return {
            x: center + length * Math.cos(rad),
            y: center + length * Math.sin(rad),
        };
    };

    const hourHand = getHandCoords(hourAngle, 34);
    const minuteHand = getHandCoords(minuteAngle, 48);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.pickerOverlay}>
                <View style={styles.clockModalCard}>
                    <LinearGradient
                        colors={["#1A1A24", "#101015", "#0B0B0E"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Header */}
                    <View style={styles.calModalHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[styles.calModalHeaderIcon, { backgroundColor: "rgba(227, 30, 36, 0.15)", borderColor: "rgba(227, 30, 36, 0.4)" }]}>
                                <Ionicons name="time" size={16} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.calModalTitle}>SET WORKOUT DURATION</Text>
                                <Text style={styles.calModalSubtitle}>CUSTOM CLOCK & TIMER PROTOCOL</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.calModalCloseBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Digital + Analog Clock Center Lockup */}
                    <View style={styles.clockCenterLockup}>
                        {/* Analog Clock Face (SVG) */}
                        <View style={styles.clockFaceWrap}>
                            <Svg width={144} height={144} viewBox="0 0 144 144">
                                <Defs>
                                    <SvgGradient id="clockDialGrad" x1="0" y1="0" x2="1" y2="1">
                                        <Stop offset="0" stopColor="#252532" stopOpacity="0.9" />
                                        <Stop offset="1" stopColor="#0E0E14" stopOpacity="0.98" />
                                    </SvgGradient>
                                    <SvgGradient id="crimsonHandGrad" x1="0" y1="0" x2="1" y2="1">
                                        <Stop offset="0" stopColor="#FF4D4D" />
                                        <Stop offset="1" stopColor="#E31E24" />
                                    </SvgGradient>
                                </Defs>

                                {/* Outer bezel */}
                                <Circle cx={center} cy={center} r={clockRadius} fill="url(#clockDialGrad)" stroke="rgba(255, 255, 255, 0.14)" strokeWidth="1.8" />

                                {/* Progress Arc / Glow Ring */}
                                <Circle
                                    cx={center}
                                    cy={center}
                                    r={clockRadius - 5}
                                    fill="none"
                                    stroke="rgba(227, 30, 36, 0.28)"
                                    strokeWidth="2.5"
                                />

                                {/* 12 Hour Ticks */}
                                {Array.from({ length: 12 }, (_, i) => {
                                    const ang = (i * 30 - 90) * (Math.PI / 180);
                                    const isCardinal = i % 3 === 0;
                                    const r1 = clockRadius - (isCardinal ? 11 : 7);
                                    const r2 = clockRadius - 3;
                                    const x1 = center + r1 * Math.cos(ang);
                                    const y1 = center + r1 * Math.sin(ang);
                                    const x2 = center + r2 * Math.cos(ang);
                                    const y2 = center + r2 * Math.sin(ang);
                                    return (
                                        <Line
                                            key={i}
                                            x1={x1}
                                            y1={y1}
                                            x2={x2}
                                            y2={y2}
                                            stroke={isCardinal ? "#FFFFFF" : "rgba(255, 255, 255, 0.35)"}
                                            strokeWidth={isCardinal ? "2" : "1"}
                                        />
                                    );
                                })}

                                {/* Hour Hand */}
                                <Line
                                    x1={center}
                                    y1={center}
                                    x2={hourHand.x}
                                    y2={hourHand.y}
                                    stroke="#FFFFFF"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                />

                                {/* Minute Hand */}
                                <Line
                                    x1={center}
                                    y1={center}
                                    x2={minuteHand.x}
                                    y2={minuteHand.y}
                                    stroke="url(#crimsonHandGrad)"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                />

                                {/* Center Pivot Cap */}
                                <Circle cx={center} cy={center} r={4.5} fill="#E31E24" />
                                <Circle cx={center} cy={center} r={2} fill="#FFFFFF" />
                            </Svg>
                        </View>

                        {/* Digital Dual Display */}
                        <View style={styles.digitalReadoutColumn}>
                            <View style={styles.digitalTimeBoxesRow}>
                                <View style={styles.digitalTimeBox}>
                                    <Text style={styles.digitalTimeNum}>{String(hours).padStart(2, "0")}</Text>
                                    <Text style={styles.digitalTimeLabel}>HOURS</Text>
                                </View>
                                <Text style={styles.digitalColon}>:</Text>
                                <View style={styles.digitalTimeBox}>
                                    <Text style={[styles.digitalTimeNum, { color: COLORS.primary }]}>
                                        {String(minutes).padStart(2, "0")}
                                    </Text>
                                    <Text style={[styles.digitalTimeLabel, { color: COLORS.primary }]}>MINUTES</Text>
                                </View>
                            </View>

                            <View style={styles.digitalMetaRow}>
                                <View style={styles.digitalMetaPill}>
                                    <Text style={styles.digitalTotalMinutes}>
                                        {totalMins > 0 ? `${totalMins} MIN TOTAL` : "0 MIN"}
                                    </Text>
                                </View>
                                <Text style={styles.digitalCalories}>🔥 ~{estimatedCals} KCAL</Text>
                            </View>
                        </View>
                    </View>

                    {/* Dual Hour & Minute Stepper Adjusters */}
                    <View style={styles.stepperSectionRow}>
                        {/* Hours Stepper */}
                        <View style={styles.stepperCard}>
                            <Text style={styles.stepperCardTitle}>HOURS</Text>
                            <View style={styles.stepperControlsRow}>
                                <TouchableOpacity style={styles.stepperCircleBtn} onPress={() => adjustHours(-1)} activeOpacity={0.7}>
                                    <Ionicons name="remove" size={16} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={styles.stepperValText}>{hours}h</Text>
                                <TouchableOpacity style={styles.stepperCircleBtn} onPress={() => adjustHours(1)} activeOpacity={0.7}>
                                    <Ionicons name="add" size={16} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Minutes Stepper */}
                        <View style={styles.stepperCard}>
                            <Text style={styles.stepperCardTitle}>MINUTES</Text>
                            <View style={styles.stepperControlsRow}>
                                <TouchableOpacity style={styles.stepperCircleBtn} onPress={() => adjustMinutes(-5)} activeOpacity={0.7}>
                                    <Text style={styles.stepperQuickDeltaText}>-5</Text>
                                </TouchableOpacity>
                                <Text style={[styles.stepperValText, { color: COLORS.primary }]}>{minutes}m</Text>
                                <TouchableOpacity style={styles.stepperCircleBtn} onPress={() => adjustMinutes(5)} activeOpacity={0.7}>
                                    <Text style={styles.stepperQuickDeltaText}>+5</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Quick Presets Grid */}
                    <Text style={styles.clockPresetsTitle}>QUICK PRESETS</Text>
                    <View style={styles.clockPresetsGrid}>
                        {[20, 30, 45, 60, 75, 90, 105, 120].map((pm) => {
                            const isSelected = totalMins === pm;
                            const h = Math.floor(pm / 60);
                            const m = pm % 60;
                            const label = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h} HR`) : `${m} MIN`;
                            return (
                                <TouchableOpacity
                                    key={pm}
                                    style={[styles.clockPresetPill, isSelected && styles.clockPresetPillActive]}
                                    onPress={() => setExactPreset(pm)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.clockPresetPillText, isSelected && styles.clockPresetPillTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Actions */}
                    <View style={styles.calActionsRow}>
                        <TouchableOpacity style={styles.calCancelBtn} onPress={onClose} activeOpacity={0.7}>
                            <Text style={styles.calCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.calConfirmBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onSelectDuration(Math.max(5, totalMins));
                                onClose();
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#8B0000"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name="checkmark" size={16} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.calConfirmText}>SET DURATION</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MANUAL WORKOUT MODAL
// ═══════════════════════════════════════════════════════════════════════════
export default function ManualWorkoutModal({
    visible,
    onClose,
    initialDate = null,
    onSaved = null,
}) {
    const todayStr = useMemo(() => formatDateStr(new Date()), []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return formatDateStr(d);
    }, []);
    const twoDaysAgoStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return formatDateStr(d);
    }, []);

    const [selectedDate, setSelectedDate] = useState(initialDate || yesterdayStr);
    const [selectedDayNum, setSelectedDayNum] = useState(1);
    const [targetName, setTargetName] = useState("Chest + Triceps");
    const [isCustomTarget, setIsCustomTarget] = useState(false);
    const [customTargetInput, setCustomTargetInput] = useState("");
    const [durationMin, setDurationMin] = useState(60);
    const [notes, setNotes] = useState("");
    const [exercises, setExercises] = useState([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [savedResult, setSavedResult] = useState(null); // When saved, shows success overlay
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
    const [newExerciseInput, setNewExerciseInput] = useState("");

    const shareShotRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Load initial split exercises whenever day selection changes
    const loadSplitExercises = (dayNum) => {
        const plan = WORKOUT_PLAN[dayNum - 1];
        if (!plan) return;

        const defaultExercises = (plan.exercises || []).map((ex) => {
            const setNum = ex.sets || 3;
            const logs = Array.from({ length: setNum }, (_, idx) => ({
                set: idx + 1,
                weight: 40,
                reps: 10,
                completed: true,
            }));
            return {
                name: ex.name,
                sets: setNum,
                logs,
            };
        });

        setExercises(defaultExercises);
    };

    // Initialize or reset state when modal opens
    useEffect(() => {
        if (visible) {
            const targetDate = initialDate || yesterdayStr;
            setSelectedDate(targetDate);

            // Determine day of week for that date
            const [y, m, d] = targetDate.split("-").map(Number);
            const dateObj = new Date(y, m - 1, d);
            const dayOfWeek = dateObj.getDay(); // 0 is Sun, 1 is Mon...
            const initialDay = dayOfWeek === 0 ? 1 : dayOfWeek; // Default to Mon if Sun

            setSelectedDayNum(initialDay);
            const plan = WORKOUT_PLAN[initialDay - 1];
            setTargetName(plan ? plan.target : "Chest + Triceps");
            setIsCustomTarget(false);
            setCustomTargetInput("");
            setDurationMin(60);
            setNotes("");
            setSavedResult(null);

            loadSplitExercises(initialDay);

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible, initialDate]);

    // Handle Split Selection
    const handleSelectSplit = (dayNum) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDayNum(dayNum);
        setIsCustomTarget(false);
        const plan = WORKOUT_PLAN[dayNum - 1];
        if (plan) {
            setTargetName(plan.target);
            loadSplitExercises(dayNum);
        }
    };

    const handleSelectCustom = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsCustomTarget(true);
        setSelectedDayNum(0);
        setTargetName(customTargetInput || "Custom Workout");
    };

    // Exercise log handlers
    const updateSetWeight = (exIdx, setIdx, delta) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const curr = next[exIdx].logs[setIdx].weight || 0;
            const newWeight = Math.max(0, curr + delta);
            next[exIdx].logs[setIdx].weight = parseFloat(newWeight.toFixed(1));
            return next;
        });
    };

    const setSetWeightDirect = (exIdx, setIdx, text) => {
        const val = parseFloat(text) || 0;
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next[exIdx].logs[setIdx].weight = val;
            return next;
        });
    };

    const updateSetReps = (exIdx, setIdx, delta) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const curr = next[exIdx].logs[setIdx].reps || 0;
            const newReps = Math.max(1, curr + delta);
            next[exIdx].logs[setIdx].reps = newReps;
            return next;
        });
    };

    const setSetRepsDirect = (exIdx, setIdx, text) => {
        const val = parseInt(text, 10) || 0;
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next[exIdx].logs[setIdx].reps = val;
            return next;
        });
    };

    const addSetToExercise = (exIdx) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const currentLogs = next[exIdx].logs || [];
            const lastLog = currentLogs[currentLogs.length - 1] || { weight: 40, reps: 10 };
            const newSetNum = currentLogs.length + 1;
            next[exIdx].logs.push({
                set: newSetNum,
                weight: lastLog.weight,
                reps: lastLog.reps,
                completed: true,
            });
            next[exIdx].sets = newSetNum;
            return next;
        });
    };

    const removeSetFromExercise = (exIdx, setIdx) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next[exIdx].logs.splice(setIdx, 1);
            // Re-index sets
            next[exIdx].logs = next[exIdx].logs.map((l, i) => ({
                ...l,
                set: i + 1,
            }));
            next[exIdx].sets = next[exIdx].logs.length;
            return next;
        });
    };

    const removeExercise = (exIdx) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setExercises((prev) => prev.filter((_, idx) => idx !== exIdx));
    };

    const handleAddNewExercise = () => {
        if (!newExerciseInput.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setExercises((prev) => [
            ...prev,
            {
                name: newExerciseInput.trim(),
                sets: 3,
                logs: [
                    { set: 1, weight: 30, reps: 10, completed: true },
                    { set: 2, weight: 30, reps: 10, completed: true },
                    { set: 3, weight: 30, reps: 10, completed: true },
                ],
            },
        ]);
        setNewExerciseInput("");
        setShowAddExerciseModal(false);
    };

    // Calculate total stats
    const totalVolume = useMemo(() => {
        let vol = 0;
        exercises.forEach((ex) => {
            (ex.logs || []).forEach((l) => {
                vol += (parseFloat(l.weight) || 0) * (parseInt(l.reps, 10) || 0);
            });
        });
        return Math.round(vol);
    }, [exercises]);

    const estimatedCalories = useMemo(() => {
        return Math.round((durationMin * 60) * 0.11);
    }, [durationMin]);

    // Save Workout handler
    const handleSaveWorkout = async () => {
        if (exercises.length === 0) {
            Alert.alert("No Exercises", "Please add at least one exercise to log this workout.");
            return;
        }

        try {
            setIsSaving(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const finalTarget = isCustomTarget ? (customTargetInput.trim() || "Custom Workout") : targetName;
            const durationSec = durationMin * 60;

            const res = await saveManualWorkout({
                date: selectedDate,
                day: selectedDayNum || 1,
                target: finalTarget,
                durationSec,
                exercises,
                notes,
                caloriesBurned: estimatedCalories,
            });

            // Trigger widget sync in background
            syncAndroidWidget().catch(() => {});

            setIsSaving(false);
            setSavedResult({
                ...res,
                target: finalTarget,
                date: selectedDate,
                durationMin,
                totalVolume,
            });

            if (onSaved) {
                onSaved(res);
            }
        } catch (e) {
            setIsSaving(false);
            console.error("Manual workout save error:", e);
            Alert.alert("Save Failed", "Could not save manual workout. Please try again.");
        }
    };

    // Share Card handler
    const handleShareCard = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsSharing(true);

            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                setIsSharing(false);
                Alert.alert("Sharing Unavailable", "Sharing is not supported on this device.");
                return;
            }

            setTimeout(async () => {
                try {
                    if (shareShotRef.current && shareShotRef.current.capture) {
                        const uri = await shareShotRef.current.capture();
                        setIsSharing(false);
                        await Sharing.shareAsync(uri, {
                            mimeType: "image/png",
                            dialogTitle: `CONQUER ONE - ${savedResult?.target || "Workout Card"}`,
                            UTI: "public.png",
                        });
                    } else {
                        setIsSharing(false);
                    }
                } catch (err) {
                    setIsSharing(false);
                    console.warn("Capture failed:", err);
                    Alert.alert("Share Error", "Unable to generate workout card image.");
                }
            }, 180);
        } catch (e) {
            setIsSharing(false);
            console.warn("handleShareCard error:", e);
        }
    };

    const muscleColor = getMuscleColor(isCustomTarget ? customTargetInput : targetName);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={["#16161D", "#0C0C0F", "#060608"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Top Drag Handle */}
                    <View style={styles.dragHandle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={[styles.headerIconBox, { borderColor: `${muscleColor}4D`, backgroundColor: `${muscleColor}1A` }]}>
                                <Ionicons name="barbell" size={18} color={muscleColor} />
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>MANUAL WORKOUT LOG</Text>
                                <Text style={styles.headerSubtitle}>BACKFILL UNRECORDED SESSION</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollBody}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ── 1. Date Selector ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleGroup}>
                                    <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                                    <Text style={styles.sectionTitle}>WORKOUT DATE</Text>
                                </View>
                                <Text style={styles.selectedDateBadgeText}>{getDisplayDateString(selectedDate)}</Text>
                            </View>

                            <View style={styles.dateChipsRow}>
                                <TouchableOpacity
                                    style={[styles.dateChip, selectedDate === todayStr && styles.dateChipActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedDate(todayStr);
                                    }}
                                >
                                    <Text style={[styles.dateChipText, selectedDate === todayStr && styles.dateChipTextActive]}>
                                        TODAY
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.dateChip, selectedDate === yesterdayStr && styles.dateChipActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedDate(yesterdayStr);
                                    }}
                                >
                                    <Text style={[styles.dateChipText, selectedDate === yesterdayStr && styles.dateChipTextActive]}>
                                        YESTERDAY
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.dateChip, selectedDate === twoDaysAgoStr && styles.dateChipActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedDate(twoDaysAgoStr);
                                    }}
                                >
                                    <Text style={[styles.dateChipText, selectedDate === twoDaysAgoStr && styles.dateChipTextActive]}>
                                        2 DAYS AGO
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.dateChip,
                                        selectedDate !== todayStr &&
                                        selectedDate !== yesterdayStr &&
                                        selectedDate !== twoDaysAgoStr &&
                                        styles.dateChipActive,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Ionicons name="calendar" size={12} color={selectedDate !== todayStr && selectedDate !== yesterdayStr && selectedDate !== twoDaysAgoStr ? "#FFF" : COLORS.textMuted} style={{ marginRight: 4 }} />
                                    <Text style={[
                                        styles.dateChipText,
                                        selectedDate !== todayStr &&
                                        selectedDate !== yesterdayStr &&
                                        selectedDate !== twoDaysAgoStr &&
                                        styles.dateChipTextActive,
                                    ]}>
                                        {selectedDate !== todayStr && selectedDate !== yesterdayStr && selectedDate !== twoDaysAgoStr ? selectedDate : "CUSTOM..."}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ── 2. Split Routine Selector ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleGroup}>
                                    <Ionicons name="layers-outline" size={15} color={COLORS.primary} />
                                    <Text style={styles.sectionTitle}>SELECT ROUTINE / SPLIT</Text>
                                </View>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.splitsScroll}>
                                {WORKOUT_PLAN.map((plan) => {
                                    const isSelected = !isCustomTarget && selectedDayNum === plan.day;
                                    const pColor = plan.color || COLORS.primary;
                                    return (
                                        <TouchableOpacity
                                            key={plan.day}
                                            style={[
                                                styles.splitPill,
                                                isSelected && { borderColor: pColor, backgroundColor: `${pColor}1A` },
                                            ]}
                                            onPress={() => handleSelectSplit(plan.day)}
                                            activeOpacity={0.75}
                                        >
                                            <View style={[styles.splitDayDot, { backgroundColor: pColor }]} />
                                            <View>
                                                <Text style={styles.splitDayLabel}>DAY 0{plan.day}</Text>
                                                <Text style={[styles.splitTargetLabel, isSelected && { color: "#FFF" }]}>
                                                    {plan.target}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <TouchableOpacity
                                    style={[
                                        styles.splitPill,
                                        isCustomTarget && { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}1A` },
                                    ]}
                                    onPress={handleSelectCustom}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.splitDayDot, { backgroundColor: "#FFF" }]} />
                                    <View>
                                        <Text style={styles.splitDayLabel}>CUSTOM</Text>
                                        <Text style={[styles.splitTargetLabel, isCustomTarget && { color: "#FFF" }]}>
                                            Custom Name
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </ScrollView>

                            {isCustomTarget && (
                                <View style={styles.customTargetInputBox}>
                                    <TextInput
                                        style={styles.customTargetInput}
                                        placeholder="e.g. Full Body Blast, Core Circuit"
                                        placeholderTextColor={COLORS.textMuted}
                                        value={customTargetInput}
                                        onChangeText={(t) => {
                                            setCustomTargetInput(t);
                                            setTargetName(t);
                                        }}
                                    />
                                </View>
                            )}
                        </View>

                        {/* ── 3. Exercises & Sets Editor ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleGroup}>
                                    <Ionicons name="list-outline" size={15} color={COLORS.primary} />
                                    <Text style={styles.sectionTitle}>EXERCISES & SET DETAILS</Text>
                                </View>
                                <Text style={styles.volumeStatText}>TOTAL VOL: {totalVolume.toLocaleString()} KG</Text>
                            </View>

                            {exercises.map((ex, exIdx) => (
                                <View key={exIdx} style={styles.exerciseCard}>
                                    {/* Exercise Title Row */}
                                    <View style={styles.exerciseHeader}>
                                        <View style={styles.exerciseTitleBox}>
                                            <View style={[styles.exerciseIndexBadge, { backgroundColor: `${muscleColor}26`, borderColor: `${muscleColor}4D` }]}>
                                                <Text style={[styles.exerciseIndexText, { color: muscleColor }]}>{exIdx + 1}</Text>
                                            </View>
                                            <Text style={styles.exerciseNameText}>{ex.name}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeExerciseBtn}
                                            onPress={() => removeExercise(exIdx)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="rgba(255, 69, 58, 0.7)" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Sets Table Header */}
                                    <View style={styles.setTableHeader}>
                                        <Text style={[styles.setTableColHeader, { width: 45 }]}>SET</Text>
                                        <Text style={[styles.setTableColHeader, { flex: 1, textAlign: "center" }]}>WEIGHT (KG)</Text>
                                        <Text style={[styles.setTableColHeader, { flex: 1, textAlign: "center" }]}>REPS</Text>
                                        <View style={{ width: 28 }} />
                                    </View>

                                    {/* Sets Rows */}
                                    {(ex.logs || []).map((setLog, setIdx) => (
                                        <View key={setIdx} style={styles.setRow}>
                                            <View style={styles.setIndexBox}>
                                                <Text style={styles.setIndexNumber}>{setLog.set}</Text>
                                            </View>

                                            {/* Weight Stepper */}
                                            <View style={styles.stepperContainer}>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateSetWeight(exIdx, setIdx, -2.5)}
                                                >
                                                    <Text style={styles.stepperBtnText}>-</Text>
                                                </TouchableOpacity>
                                                <TextInput
                                                    style={styles.stepperInput}
                                                    keyboardType="numeric"
                                                    value={String(setLog.weight)}
                                                    onChangeText={(t) => setSetWeightDirect(exIdx, setIdx, t)}
                                                />
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateSetWeight(exIdx, setIdx, 2.5)}
                                                >
                                                    <Text style={styles.stepperBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {/* Reps Stepper */}
                                            <View style={styles.stepperContainer}>
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateSetReps(exIdx, setIdx, -1)}
                                                >
                                                    <Text style={styles.stepperBtnText}>-</Text>
                                                </TouchableOpacity>
                                                <TextInput
                                                    style={styles.stepperInput}
                                                    keyboardType="numeric"
                                                    value={String(setLog.reps)}
                                                    onChangeText={(t) => setSetRepsDirect(exIdx, setIdx, t)}
                                                />
                                                <TouchableOpacity
                                                    style={styles.stepperBtn}
                                                    onPress={() => updateSetReps(exIdx, setIdx, 1)}
                                                >
                                                    <Text style={styles.stepperBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {/* Delete Set */}
                                            <TouchableOpacity
                                                style={styles.deleteSetBtn}
                                                onPress={() => removeSetFromExercise(exIdx, setIdx)}
                                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                            >
                                                <Ionicons name="close" size={14} color="rgba(255,255,255,0.4)" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}

                                    {/* Add Set Button */}
                                    <TouchableOpacity
                                        style={styles.addSetBtn}
                                        onPress={() => addSetToExercise(exIdx)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                                        <Text style={styles.addSetText}>ADD SET</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Add Exercise Button */}
                            <TouchableOpacity
                                style={styles.addExerciseCardBtn}
                                onPress={() => setShowAddExerciseModal(true)}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={COLORS.text} style={{ marginRight: 6 }} />
                                <Text style={styles.addExerciseCardText}>ADD ANOTHER EXERCISE</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── 4. Session Metrics & Notes ── */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleGroup}>
                                    <Ionicons name="timer-outline" size={15} color={COLORS.primary} />
                                    <Text style={styles.sectionTitle}>DURATION & STATS</Text>
                                </View>
                                <Text style={styles.volumeStatText}>🔥 ~{estimatedCalories} KCAL</Text>
                            </View>

                            {/* Interactive Duration Banner / Clock Button */}
                            <TouchableOpacity
                                style={styles.durationClockBanner}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowTimePicker(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={["rgba(227, 30, 36, 0.14)", "rgba(255, 255, 255, 0.02)"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.durationClockBannerLeft}>
                                    <View style={styles.durationClockIconWrap}>
                                        <Ionicons name="time" size={18} color={COLORS.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.durationClockTimeDisplay}>
                                            {formatDuration(durationMin * 60).toUpperCase()}
                                            <Text style={styles.durationClockTotalSub}> ({durationMin} MIN)</Text>
                                        </Text>
                                        <Text style={styles.durationClockSubtitle}>Tap to customize exact hours & minutes</Text>
                                    </View>
                                </View>
                                <View style={styles.durationClockAdjustPill}>
                                    <Ionicons name="options-outline" size={13} color="#FFF" style={{ marginRight: 3 }} />
                                    <Text style={styles.durationClockAdjustText}>CUSTOM</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Quick Preset Chips Row */}
                            <View style={styles.durationChipsRow}>
                                {[30, 45, 60, 75, 90, 120].map((mins) => (
                                    <TouchableOpacity
                                        key={mins}
                                        style={[styles.durationChip, durationMin === mins && styles.durationChipActive]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setDurationMin(mins);
                                        }}
                                    >
                                        <Text style={[styles.durationChipText, durationMin === mins && styles.durationChipTextActive]}>
                                            {mins} MIN
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[
                                        styles.durationChip,
                                        ![30, 45, 60, 75, 90, 120].includes(durationMin) && styles.durationChipActive,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setShowTimePicker(true);
                                    }}
                                >
                                    <Ionicons name="time-outline" size={12} color={![30, 45, 60, 75, 90, 120].includes(durationMin) ? "#FFF" : COLORS.textMuted} style={{ marginRight: 4 }} />
                                    <Text style={[
                                        styles.durationChipText,
                                        ![30, 45, 60, 75, 90, 120].includes(durationMin) && styles.durationChipTextActive,
                                    ]}>
                                        {![30, 45, 60, 75, 90, 120].includes(durationMin) ? `${durationMin} MIN` : "CUSTOM..."}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Session Notes */}
                            <View style={styles.notesInputContainer}>
                                <Text style={styles.notesLabel}>SESSION NOTES (OPTIONAL)</Text>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder="e.g. Great energy, trained at hotel gym without phone..."
                                    placeholderTextColor={COLORS.textMuted}
                                    multiline
                                    numberOfLines={2}
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>
                        </View>

                        {/* ── Bottom Submit Button ── */}
                        <TouchableOpacity
                            style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
                            onPress={handleSaveWorkout}
                            disabled={isSaving}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#8B0000"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.submitBtnText}>
                                {isSaving ? "SAVING WORKOUT..." : "SAVE WORKOUT TO HISTORY"}
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>

                {/* ── 1. Beautiful Custom Calendar Modal ── */}
                <CalendarPickerModal
                    visible={showDatePicker}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => setSelectedDate(d)}
                    onClose={() => setShowDatePicker(false)}
                />

                {/* ── 2. Beautiful Custom Clock / Time Picker Modal ── */}
                <ClockTimePickerModal
                    visible={showTimePicker}
                    durationMin={durationMin}
                    onSelectDuration={(mins) => setDurationMin(mins)}
                    onClose={() => setShowTimePicker(false)}
                />

                {/* ── Add Exercise Custom Modal ── */}
                {showAddExerciseModal && (
                    <Modal visible={showAddExerciseModal} transparent animationType="fade">
                        <View style={styles.pickerOverlay}>
                            <View style={styles.pickerCard}>
                                <Text style={styles.pickerTitle}>ADD NEW EXERCISE</Text>
                                <TextInput
                                    style={styles.pickerInput}
                                    placeholder="e.g. Standing Overhead Press"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={newExerciseInput}
                                    onChangeText={setNewExerciseInput}
                                    autoFocus
                                />
                                <View style={styles.pickerActions}>
                                    <TouchableOpacity
                                        style={styles.pickerCancelBtn}
                                        onPress={() => setShowAddExerciseModal(false)}
                                    >
                                        <Text style={styles.pickerCancelText}>CANCEL</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.pickerConfirmBtn}
                                        onPress={handleAddNewExercise}
                                    >
                                        <Text style={styles.pickerConfirmText}>ADD</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}

                {/* ── Success & Celebratory Overlay ── */}
                {savedResult && (
                    <View style={styles.successOverlay}>
                        <LinearGradient
                            colors={["rgba(10,10,14,0.96)", "rgba(5,5,8,0.98)"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.successCard}>
                            <View style={styles.successIconCircle}>
                                <Ionicons name="trophy" size={36} color="#FFD700" />
                            </View>
                            <Text style={styles.successTitle}>WORKOUT LOGGED!</Text>
                            <Text style={styles.successSubtitle}>
                                {savedResult.target.toUpperCase()} • {getDisplayDateString(savedResult.date)}
                            </Text>

                            {/* Highlights Grid */}
                            <View style={styles.successGrid}>
                                <View style={styles.successStatBox}>
                                    <Text style={styles.successStatLabel}>STREAK</Text>
                                    <Text style={[styles.successStatVal, { color: COLORS.primary }]}>
                                        {savedResult.streak}D
                                    </Text>
                                </View>
                                <View style={styles.successStatBox}>
                                    <Text style={styles.successStatLabel}>TOTAL SESSIONS</Text>
                                    <Text style={styles.successStatVal}>{savedResult.totalWorkouts}</Text>
                                </View>
                                <View style={styles.successStatBox}>
                                    <Text style={styles.successStatLabel}>XP GAINED</Text>
                                    <Text style={[styles.successStatVal, { color: "#32D74B" }]}>
                                        +{savedResult.xpEarned || 50}
                                    </Text>
                                </View>
                                <View style={styles.successStatBox}>
                                    <Text style={styles.successStatLabel}>VOLUME</Text>
                                    <Text style={styles.successStatVal}>
                                        {savedResult.totalVolume ? `${savedResult.totalVolume.toLocaleString()}kg` : "—"}
                                    </Text>
                                </View>
                            </View>

                            {/* PRs Broken Badge */}
                            {(savedResult.newPRs || []).length > 0 && (
                                <View style={styles.prsBrokenBadge}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={styles.prsBrokenText}>
                                        {savedResult.newPRs.length} NEW PERSONAL RECORD{savedResult.newPRs.length > 1 ? "S" : ""} ACHIEVED!
                                    </Text>
                                </View>
                            )}

                            {/* Actions */}
                            <View style={styles.successActionsCol}>
                                <TouchableOpacity
                                    style={styles.shareCardActionBtn}
                                    onPress={handleShareCard}
                                    disabled={isSharing}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[COLORS.primary, "#8B0000"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Ionicons name="share-social" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.shareCardActionText}>
                                        {isSharing ? "GENERATING CARD..." : "SHARE WORKOUT CARD"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.doneActionBtn}
                                    onPress={() => {
                                        setSavedResult(null);
                                        onClose();
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.doneActionText}>DONE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Offscreen ViewShot for High-Res Workout Card */}
                        <View style={{ position: "absolute", left: -9999, top: -9999 }} pointerEvents="none">
                            <ViewShot
                                ref={shareShotRef}
                                options={{ format: "png", quality: 1.0, result: "tmpfile" }}
                            >
                                <View style={styles.shareCardContainer}>
                                    <LinearGradient
                                        colors={["#16161D", "#0C0C0F", "#050507"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0.3, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />

                                    {/* Card Header */}
                                    <View style={styles.shareCardHeader}>
                                        <View>
                                            <Text style={styles.shareCardAppName}>CONQUER ONE</Text>
                                            <Text style={styles.shareCardTargetTitle}>
                                                {(savedResult.target || "TRAINING SESSION").toUpperCase()}
                                            </Text>
                                            <Text style={styles.shareCardDateText}>
                                                {getDisplayDateString(savedResult.date)}
                                            </Text>
                                        </View>
                                        <View style={styles.shareCardHeaderBadge}>
                                            <Ionicons name="flame" size={16} color={COLORS.primary} />
                                            <Text style={styles.shareCardStreakText}>{savedResult.streak}D</Text>
                                        </View>
                                    </View>

                                    {/* Stats 3-Col Bar */}
                                    <View style={styles.shareCardStatsBar}>
                                        <View style={styles.shareCardStatCol}>
                                            <Text style={styles.shareCardStatLabel}>DURATION</Text>
                                            <Text style={styles.shareCardStatValue}>
                                                {formatDuration((savedResult.durationMin || 60) * 60)}
                                            </Text>
                                        </View>
                                        <View style={styles.shareCardStatCol}>
                                            <Text style={styles.shareCardStatLabel}>VOLUME</Text>
                                            <Text style={styles.shareCardStatValue}>
                                                {savedResult.totalVolume ? `${savedResult.totalVolume.toLocaleString()}kg` : "—"}
                                            </Text>
                                        </View>
                                        <View style={styles.shareCardStatCol}>
                                            <Text style={styles.shareCardStatLabel}>BURN</Text>
                                            <Text style={styles.shareCardStatValue}>
                                                ~{Math.round((savedResult.durationMin || 60) * 60 * 0.11)} kcal
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Exercises List */}
                                    <View style={styles.shareCardExercisesList}>
                                        {exercises.slice(0, 5).map((ex, idx) => (
                                            <View key={idx} style={styles.shareCardExRow}>
                                                <Text style={styles.shareCardExName} numberOfLines={1}>
                                                    {ex.name}
                                                </Text>
                                                <Text style={styles.shareCardExSets}>
                                                    {ex.sets} sets · {ex.logs?.[0]?.weight || 0}kg
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

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
                                        <View style={styles.shareCardManualPill}>
                                            <Text style={styles.shareCardManualPillText}>VERIFIED SESSION</Text>
                                        </View>
                                    </View>
                                </View>
                            </ViewShot>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        width: "100%",
        height: height * 0.92,
        backgroundColor: "#0A0A0C",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.14)",
        overflow: "hidden",
    },
    dragHandle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 6,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
    },
    headerIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.2,
    },
    headerSubtitle: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    sectionCard: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 14,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    sectionTitleGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    sectionTitle: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1.2,
    },
    selectedDateBadgeText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    dateChipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    dateChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.10)",
    },
    dateChipActive: {
        backgroundColor: "rgba(227, 30, 36, 0.20)",
        borderColor: COLORS.primary,
    },
    dateChipText: {
        fontSize: 10,
        fontFamily: FAMILY.semibold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    dateChipTextActive: {
        color: "#FFF",
        fontFamily: FAMILY.bold,
    },
    splitsScroll: {
        marginHorizontal: -4,
    },
    splitPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginRight: 8,
    },
    splitDayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    splitDayLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    splitTargetLabel: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
    },
    customTargetInputBox: {
        marginTop: 10,
    },
    customTargetInput: {
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: "#FFF",
        fontFamily: FAMILY.semibold,
        fontSize: 12,
    },
    volumeStatText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    exerciseCard: {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        padding: 12,
        marginBottom: 10,
    },
    exerciseHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    exerciseTitleBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    exerciseIndexBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    exerciseIndexText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
    },
    exerciseNameText: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        flex: 1,
    },
    removeExerciseBtn: {
        padding: 4,
    },
    setTableHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 8,
    },
    setTableColHeader: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    setRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    setIndexBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        alignItems: "center",
        justifyContent: "center",
    },
    setIndexNumber: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    stepperContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
    },
    stepperBtn: {
        width: 28,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    stepperBtnText: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: "#FFF",
    },
    stepperInput: {
        flex: 1,
        textAlign: "center",
        color: "#FFF",
        fontFamily: FAMILY.monoBold,
        fontSize: 12,
        paddingVertical: 4,
    },
    deleteSetBtn: {
        width: 24,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    addSetBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.25)",
        marginTop: 4,
    },
    addSetText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
        letterSpacing: 0.8,
    },
    addExerciseCardBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        marginTop: 6,
    },
    addExerciseCardText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.8,
    },

    // ── Duration Clock Banner ──
    durationClockBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.28)",
        marginBottom: 12,
        overflow: "hidden",
    },
    durationClockBannerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
    },
    durationClockIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(227, 30, 36, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.35)",
        alignItems: "center",
        justifyContent: "center",
    },
    durationClockTimeDisplay: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 0.5,
    },
    durationClockTotalSub: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
    },
    durationClockSubtitle: {
        fontSize: 9,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    durationClockAdjustPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    durationClockAdjustText: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 0.8,
    },

    durationChipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    durationChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    durationChipActive: {
        backgroundColor: "rgba(227, 30, 36, 0.20)",
        borderColor: COLORS.primary,
    },
    durationChipText: {
        fontSize: 10,
        fontFamily: FAMILY.semibold,
        color: COLORS.textMuted,
    },
    durationChipTextActive: {
        color: "#FFF",
        fontFamily: FAMILY.bold,
    },
    notesInputContainer: {
        marginTop: 4,
    },
    notesLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    notesInput: {
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 10,
        color: "#FFF",
        fontFamily: FAMILY.regular,
        fontSize: 12,
        minHeight: 50,
        textAlignVertical: "top",
    },
    submitBtn: {
        width: "100%",
        height: 52,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        overflow: "hidden",
        marginTop: 6,
    },
    submitBtnText: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },

    // ── Generic Overlays ──
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
    },
    pickerCard: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#16161D",
        borderRadius: 20,
        borderWidth: 1.2,
        borderColor: "rgba(255,255,255,0.16)",
        padding: 20,
    },
    pickerTitle: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 1,
        marginBottom: 4,
    },
    pickerInput: {
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        padding: 12,
        color: "#FFF",
        fontFamily: FAMILY.bold,
        fontSize: 13,
        marginBottom: 16,
        marginTop: 10,
    },
    pickerActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    pickerCancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    pickerCancelText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
    },
    pickerConfirmBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.pill,
    },
    pickerConfirmText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: "#FFF",
    },

    // ── Calendar Modal Card Styles ──
    calendarModalCard: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#121218",
        borderRadius: 24,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        padding: 18,
        overflow: "hidden",
    },
    calModalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 12,
    },
    calModalHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(227, 30, 36, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.35)",
        alignItems: "center",
        justifyContent: "center",
    },
    calModalTitle: {
        fontSize: 12,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 1,
    },
    calModalSubtitle: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
        marginTop: 1,
    },
    calModalCloseBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    calMonthNav: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 6,
        marginBottom: 12,
    },
    calNavArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.10)",
        alignItems: "center",
        justifyContent: "center",
    },
    calMonthTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    calMonthSubtitle: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        textAlign: "center",
        marginTop: 1,
    },
    calWeekdaysRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 6,
        paddingHorizontal: 2,
    },
    calWeekdayText: {
        width: 38,
        textAlign: "center",
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
    },
    calGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        gap: 4,
        marginBottom: 14,
    },
    calCell: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    calCellDisabled: {
        width: 38,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.15,
    },
    calCellTextDisabled: {
        fontSize: 11,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    calCellToday: {
        borderColor: "rgba(227, 30, 36, 0.5)",
        backgroundColor: "rgba(227, 30, 36, 0.08)",
    },
    calCellSelected: {
        backgroundColor: COLORS.primary,
        borderColor: "#FF4D4D",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
    },
    calCellFuture: {
        opacity: 0.25,
        backgroundColor: "transparent",
    },
    calCellText: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: "#EDEAE3",
    },
    calCellTextToday: {
        color: "#FFF",
        fontFamily: FAMILY.monoBold,
    },
    calCellTextSelected: {
        color: "#FFFFFF",
        fontFamily: FAMILY.monoBold,
        fontSize: 13,
    },
    calCellTextFuture: {
        color: COLORS.textMuted,
    },
    calTodayDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    calPresetsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: 12,
    },
    calPresetChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    calPresetChipActive: {
        backgroundColor: "rgba(227, 30, 36, 0.2)",
        borderColor: COLORS.primary,
    },
    calPresetText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    calPresetTextActive: {
        color: "#FFF",
    },
    calActionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    calCancelBtn: {
        flex: 1,
        height: 42,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    calCancelText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    calConfirmBtn: {
        flex: 1.5,
        height: 42,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        overflow: "hidden",
    },
    calConfirmText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 1,
    },

    // ── Clock Modal Card Styles ──
    clockModalCard: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#121218",
        borderRadius: 24,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        padding: 18,
        overflow: "hidden",
    },
    clockCenterLockup: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingVertical: 6,
        marginBottom: 14,
    },
    clockFaceWrap: {
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    digitalReadoutColumn: {
        alignItems: "center",
        justifyContent: "center",
    },
    digitalTimeBoxesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    digitalTimeBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.14)",
        minWidth: 54,
    },
    digitalTimeNum: {
        fontSize: 22,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    digitalTimeLabel: {
        fontSize: 7.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginTop: 2,
    },
    digitalColon: {
        fontSize: 22,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
    },
    digitalMetaRow: {
        alignItems: "center",
        gap: 3,
    },
    digitalMetaPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
    },
    digitalTotalMinutes: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    digitalCalories: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    stepperSectionRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 14,
    },
    stepperCard: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 10,
        alignItems: "center",
    },
    stepperCardTitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 8,
    },
    stepperControlsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 4,
    },
    stepperCircleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.14)",
        alignItems: "center",
        justifyContent: "center",
    },
    stepperQuickDeltaText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: "#FFF",
    },
    stepperValText: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: "#FFF",
    },
    clockPresetsTitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 8,
    },
    clockPresetsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 16,
    },
    clockPresetPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    clockPresetPillActive: {
        backgroundColor: "rgba(227, 30, 36, 0.2)",
        borderColor: COLORS.primary,
    },
    clockPresetPillText: {
        fontSize: 9.5,
        fontFamily: FAMILY.semibold,
        color: COLORS.textMuted,
    },
    clockPresetPillTextActive: {
        color: "#FFF",
        fontFamily: FAMILY.bold,
    },

    // ── Success & Celebratory Overlay ──
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 999,
    },
    successCard: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#16161D",
        borderRadius: 24,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        padding: 24,
        alignItems: "center",
    },
    successIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(255, 215, 0, 0.12)",
        borderWidth: 1.5,
        borderColor: "rgba(255, 215, 0, 0.35)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    successTitle: {
        fontSize: 18,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },
    successSubtitle: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.8,
        marginTop: 2,
        marginBottom: 16,
    },
    successGrid: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 14,
    },
    successStatBox: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 10,
        alignItems: "center",
    },
    successStatLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 3,
    },
    successStatVal: {
        fontSize: 16,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
    },
    prsBrokenBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 215, 0, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(255, 215, 0, 0.3)",
        marginBottom: 16,
    },
    prsBrokenText: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: "#FFD700",
        letterSpacing: 0.5,
    },
    successActionsCol: {
        width: "100%",
        gap: 10,
    },
    shareCardActionBtn: {
        width: "100%",
        height: 48,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        overflow: "hidden",
    },
    shareCardActionText: {
        fontSize: 12,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    doneActionBtn: {
        width: "100%",
        height: 42,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    doneActionText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1,
    },

    // ── Share Card ViewShot Layout ──
    shareCardContainer: {
        width: 360,
        backgroundColor: "#0F0F14",
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.18)",
        padding: 20,
        overflow: "hidden",
    },
    shareCardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 12,
    },
    shareCardAppName: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    shareCardTargetTitle: {
        fontSize: 17,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    shareCardDateText: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
        marginTop: 2,
    },
    shareCardHeaderBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.35)",
    },
    shareCardStreakText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: "#FFF",
    },
    shareCardStatsBar: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    shareCardStatCol: {
        flex: 1,
        alignItems: "center",
    },
    shareCardStatLabel: {
        fontSize: 7.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    shareCardStatValue: {
        fontSize: 12,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
    },
    shareCardExercisesList: {
        gap: 6,
        marginBottom: 14,
    },
    shareCardExRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
    },
    shareCardExName: {
        fontSize: 10.5,
        fontFamily: FAMILY.semibold,
        color: "#EDEAE3",
        flex: 1,
    },
    shareCardExSets: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
    },
    shareCardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.08)",
    },
    shareCardFooterLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    shareCardBarbell: {
        width: 18,
        height: 18,
    },
    shareCardBrandTextGroup: {
        justifyContent: "center",
    },
    shareCardLogoText: {
        width: 60,
        height: 10,
    },
    shareCardTagline: {
        fontSize: 6,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    shareCardManualPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    shareCardManualPillText: {
        fontSize: 7.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
    },
});
