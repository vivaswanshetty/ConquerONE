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
        const val = parseInt(text, 10) || 1;
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            next[exIdx].logs[setIdx].reps = val;
            return next;
        });
    };

    const addSetToExercise = (exIdx) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            const currentLogs = next[exIdx].logs || [];
            const lastLog = currentLogs[currentLogs.length - 1] || { weight: 40, reps: 10 };
            currentLogs.push({
                set: currentLogs.length + 1,
                weight: lastLog.weight,
                reps: lastLog.reps,
                completed: true,
            });
            next[exIdx].sets = currentLogs.length;
            next[exIdx].logs = currentLogs;
            return next;
        });
    };

    const removeSetFromExercise = (exIdx, setIdx) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExercises((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            if (next[exIdx].logs.length <= 1) return prev;
            next[exIdx].logs.splice(setIdx, 1);
            // Re-index set numbers
            next[exIdx].logs.forEach((l, idx) => {
                l.set = idx + 1;
            });
            next[exIdx].sets = next[exIdx].logs.length;
            return next;
        });
    };

    const removeExercise = (exIdx) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setExercises((prev) => {
            const next = [...prev];
            next.splice(exIdx, 1);
            return next;
        });
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
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons name="calendar" size={12} color={selectedDate !== todayStr && selectedDate !== yesterdayStr && selectedDate !== twoDaysAgoStr ? "#FFF" : COLORS.textMuted} style={{ marginRight: 4 }} />
                                    <Text style={[
                                        styles.dateChipText,
                                        selectedDate !== todayStr &&
                                        selectedDate !== yesterdayStr &&
                                        selectedDate !== twoDaysAgoStr &&
                                        styles.dateChipTextActive,
                                    ]}>
                                        CUSTOM...
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

                {/* ── Custom Date Selector Modal ── */}
                {showDatePicker && (
                    <Modal visible={showDatePicker} transparent animationType="fade">
                        <View style={styles.pickerOverlay}>
                            <View style={styles.pickerCard}>
                                <Text style={styles.pickerTitle}>SELECT WORKOUT DATE</Text>
                                <Text style={styles.pickerSubtitle}>Choose any past date in YYYY-MM-DD</Text>

                                <TextInput
                                    style={styles.pickerInput}
                                    value={selectedDate}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={COLORS.textMuted}
                                    onChangeText={setSelectedDate}
                                />

                                <View style={styles.pickerActions}>
                                    <TouchableOpacity
                                        style={styles.pickerCancelBtn}
                                        onPress={() => setShowDatePicker(false)}
                                    >
                                        <Text style={styles.pickerCancelText}>CANCEL</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.pickerConfirmBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setShowDatePicker(false);
                                        }}
                                    >
                                        <Text style={styles.pickerConfirmText}>SET DATE</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}

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
                                        {savedResult.streak} <Text style={styles.successStatUnit}>DAYS</Text>
                                    </Text>
                                </View>
                                <View style={[styles.successStatBox, styles.successStatDivider]}>
                                    <Text style={styles.successStatLabel}>TOTAL SESSIONS</Text>
                                    <Text style={styles.successStatVal}>{savedResult.total}</Text>
                                </View>
                                <View style={styles.successStatBox}>
                                    <Text style={styles.successStatLabel}>XP GAINED</Text>
                                    <Text style={[styles.successStatVal, { color: "#FFD700" }]}>+{savedResult.xpGained}</Text>
                                </View>
                            </View>

                            {/* PRs Broken Badges */}
                            {savedResult.prsBroken && savedResult.prsBroken.length > 0 && (
                                <View style={styles.prBadgeBox}>
                                    <Ionicons name="flash" size={14} color="#FFD700" style={{ marginRight: 6 }} />
                                    <Text style={styles.prBadgeText}>
                                        NEW PR ACHIEVED ON {savedResult.prsBroken[0].exerciseName.toUpperCase()} ({savedResult.prsBroken[0].weight} KG)!
                                    </Text>
                                </View>
                            )}

                            {/* Share Action Button */}
                            <TouchableOpacity
                                style={styles.shareCardBtn}
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
                                <Ionicons name="share-social" size={16} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.shareCardBtnText}>
                                    {isSharing ? "GENERATING CARD..." : "SHARE WORKOUT CARD"}
                                </Text>
                            </TouchableOpacity>

                            {/* Done Button */}
                            <TouchableOpacity
                                style={styles.successDoneBtn}
                                onPress={() => {
                                    setSavedResult(null);
                                    onClose();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.successDoneText}>DONE & VIEW IN HISTORY</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Purpose-Built Branded Social Share Card (Off-Screen Captured ViewShot) ── */}
                {savedResult && (
                    <View style={styles.offscreenWrap} pointerEvents="none">
                        <ViewShot ref={shareShotRef} options={{ format: "png", quality: 1 }}>
                            <View style={styles.shareCard} collapsable={false}>
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

                                {/* Card Header */}
                                <View style={styles.shareCardHeader}>
                                    <View style={styles.shareCardBadge}>
                                        <View style={[styles.shareBadgeDot, { backgroundColor: getMuscleColor(savedResult?.target) }]} />
                                        <Text style={[styles.shareCardBadgeText, { color: getMuscleColor(savedResult?.target) }]}>
                                            SESSION COMPLETE
                                        </Text>
                                    </View>
                                    <Text style={styles.shareCardDate}>
                                        {getDisplayDateString(savedResult?.date)}
                                    </Text>
                                </View>

                                {/* Workout Name */}
                                <View style={styles.shareCardTitleWrap}>
                                    <Text style={styles.shareCardWorkoutLabel}>LOGGED TARGET</Text>
                                    <Text style={styles.shareCardWorkoutName} numberOfLines={2}>
                                        {savedResult?.target || "Workout"}
                                    </Text>
                                </View>

                                {/* Stats Grid */}
                                <View style={styles.shareCardStatsGrid}>
                                    <View style={styles.shareCardStatBox}>
                                        <Text style={styles.shareCardStatLabel}>DURATION</Text>
                                        <Text style={styles.shareCardStatValue}>{formatDuration((savedResult?.durationMin || 60) * 60)}</Text>
                                    </View>
                                    <View style={[styles.shareCardStatBox, styles.shareCardStatDivider]}>
                                        <Text style={styles.shareCardStatLabel}>STREAK</Text>
                                        <Text style={[styles.shareCardStatValue, { color: COLORS.primary }]}>
                                            {savedResult?.streak} <Text style={styles.shareCardStatUnit}>DAYS</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.shareCardStatBox}>
                                        <Text style={styles.shareCardStatLabel}>ENERGY</Text>
                                        <Text style={styles.shareCardStatValue}>
                                            {Math.round((savedResult?.durationMin || 60) * 60 * 0.11)}
                                            <Text style={styles.shareCardStatUnit}> KCAL</Text>
                                        </Text>
                                    </View>
                                </View>

                                {/* Exercise Summary Rows */}
                                {exercises && exercises.length > 0 && (
                                    <View style={styles.shareCardPRWrap}>
                                        <View style={styles.shareCardPRHeader}>
                                            <Ionicons name="barbell-outline" size={13} color={COLORS.textSub} />
                                            <Text style={styles.shareCardPRTitle}>WORKOUT BREAKDOWN</Text>
                                        </View>
                                        {exercises.slice(0, 3).map((ex, i) => (
                                            <View key={i} style={styles.shareCardPRRow}>
                                                <Text style={styles.shareCardPRName} numberOfLines={1}>{ex.name}</Text>
                                                <Text style={styles.shareCardPRVal}>
                                                    {ex.sets || (ex.logs ? ex.logs.length : 3)} sets
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
                                        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                                            <Text style={styles.shareCardBrandText}>CONQUER </Text>
                                            <Text style={[styles.shareCardBrandText, { color: COLORS.primary }]}>ONE</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.shareCardTagline}>ELITE TRAINING SYSTEM</Text>
                                </View>
                            </View>
                        </ViewShot>
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
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.10)",
        flexDirection: "row",
        alignItems: "center",
    },
    dateChipActive: {
        backgroundColor: "rgba(227, 30, 36, 0.22)",
        borderColor: COLORS.primary,
    },
    dateChipText: {
        fontSize: 10.5,
        fontFamily: FAMILY.semibold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    dateChipTextActive: {
        color: "#FFFFFF",
        fontFamily: FAMILY.bold,
    },
    splitsScroll: {
        flexDirection: "row",
        marginBottom: 8,
    },
    splitPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginRight: 8,
    },
    splitDayDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    splitDayLabel: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    splitTargetLabel: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
    },
    customTargetInputBox: {
        marginTop: 6,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingHorizontal: 12,
    },
    customTargetInput: {
        height: 40,
        color: "#FFF",
        fontFamily: FAMILY.semibold,
        fontSize: 13,
    },
    volumeStatText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    exerciseCard: {
        backgroundColor: "rgba(0, 0, 0, 0.35)",
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
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    exerciseIndexText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
    },
    exerciseNameText: {
        fontSize: 13,
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
        borderBottomColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: 6,
    },
    setTableColHeader: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    setRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    setIndexBox: {
        width: 45,
        alignItems: "center",
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
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginHorizontal: 4,
        height: 32,
    },
    stepperBtn: {
        width: 28,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    stepperBtnText: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
    },
    stepperInput: {
        flex: 1,
        textAlign: "center",
        color: "#FFF",
        fontFamily: FAMILY.monoBold,
        fontSize: 12,
        padding: 0,
    },
    deleteSetBtn: {
        width: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    addSetBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        marginTop: 4,
        borderRadius: 8,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    addSetText: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
        letterSpacing: 0.8,
    },
    addExerciseCardBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
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
    durationChipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    durationChip: {
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
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
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
    pickerSubtitle: {
        fontSize: 10,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        marginBottom: 14,
    },
    pickerInput: {
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        padding: 12,
        color: "#FFF",
        fontFamily: FAMILY.monoBold,
        fontSize: 14,
        marginBottom: 16,
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
    successOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    successCard: {
        width: "100%",
        maxWidth: 360,
        backgroundColor: "#14141A",
        borderRadius: 24,
        borderWidth: 1.2,
        borderColor: "rgba(255,255,255,0.18)",
        padding: 24,
        alignItems: "center",
    },
    successIconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: "rgba(255, 215, 0, 0.12)",
        borderWidth: 1.5,
        borderColor: "rgba(255, 215, 0, 0.4)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    successTitle: {
        fontSize: 20,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
        marginBottom: 4,
    },
    successSubtitle: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.8,
        marginBottom: 18,
    },
    successGrid: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingVertical: 12,
        marginBottom: 16,
        width: "100%",
    },
    successStatBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    successStatDivider: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    successStatLabel: {
        fontSize: 7.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 4,
    },
    successStatVal: {
        fontSize: 16,
        fontFamily: FAMILY.monoBold,
        color: "#FFF",
    },
    successStatUnit: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    prBadgeBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 215, 0, 0.12)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 215, 0, 0.3)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
        width: "100%",
    },
    prBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: "#FFD700",
        flex: 1,
        letterSpacing: 0.5,
    },
    shareCardBtn: {
        width: "100%",
        height: 48,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        overflow: "hidden",
        marginBottom: 10,
    },
    shareCardBtnText: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 1,
    },
    successDoneBtn: {
        width: "100%",
        height: 44,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    successDoneText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1,
    },
    offscreenWrap: {
        position: "absolute",
        left: -9999,
        top: -9999,
        opacity: 0,
    },
    shareCard: {
        width: 360,
        backgroundColor: "#0A0A0C",
        borderRadius: 22,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.16)",
        overflow: "hidden",
    },
    shareCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    shareCardBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    shareBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    shareCardBadgeText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        letterSpacing: 0.8,
    },
    shareCardDate: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    shareCardTitleWrap: {
        marginBottom: 18,
    },
    shareCardWorkoutLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    shareCardWorkoutName: {
        fontSize: 22,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 0.5,
    },
    shareCardStatsGrid: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        paddingVertical: 12,
        marginBottom: 16,
    },
    shareCardStatBox: {
        flex: 1,
        alignItems: "center",
    },
    shareCardStatDivider: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    shareCardStatLabel: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 4,
    },
    shareCardStatValue: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: "#FFF",
    },
    shareCardStatUnit: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    shareCardPRWrap: {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
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
        fontSize: 10.5,
        fontFamily: FAMILY.semibold,
        color: COLORS.textSub,
        flex: 1,
    },
    shareCardPRVal: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
    },
    shareCardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
    },
    shareCardFooterLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    shareCardBarbell: {
        width: 14,
        height: 14,
        tintColor: COLORS.primary,
    },
    shareCardBrandText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: "#FFF",
        letterSpacing: 1,
    },
    shareCardTagline: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
});
