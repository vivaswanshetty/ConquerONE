import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Image, StatusBar, ImageBackground, Modal, TextInput,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, getMuscleColor } from "../utils/theme";
import { saveExerciseConfig, getWorkoutOverrides } from "../utils/workoutConfig";
import { getSuggestedWeight } from "../data/workoutData";

function totalTime(day) {
    let s = 0;
    day.exercises.forEach((ex) => {
        const setDuration = ex.type === 'reps' ? 45 : ex.activeTimeSec;
        s += ex.sets * setDuration + (ex.sets - 1) * ex.restTimeSec;
        if (ex.unilateral) s += ex.sets * setDuration;
    });
    return Math.ceil(s / 60);
}

const estimateCalories = (durationMin) => {
    // MET values: 5.0 for resistance training
    // Formula: 5.0 * 75kg * (mins / 60)
    return Math.round(5.0 * 75 * (durationMin / 60));
};

export default function WorkoutDetailScreen({ navigation, route }) {
    const { day: initialDay } = route.params;
    const insets = useSafeAreaInsets();
    const [expanded, setExpanded] = useState(null);
    const [day, setDay] = useState(initialDay);
    const [editExercise, setEditExercise] = useState(null);

    useFocusEffect(
        useCallback(() => {
            loadOverrides();
        }, [])
    );

    const loadOverrides = async () => {
        const overrides = await getWorkoutOverrides();
        const enhancedExercises = initialDay.exercises.map(ex => {
            const override = overrides[ex.name];
            return override ? { ...ex, ...override } : ex;
        });
        setDay({ ...initialDay, exercises: enhancedExercises });
    };

    const handleSaveEdit = async (config) => {
        if (!editExercise) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await saveExerciseConfig(editExercise.name, config);
        setEditExercise(null);
        loadOverrides();
    };

    const muscleColor = getMuscleColor(day.target);
    const duration = totalTime(day);
    const calories = estimateCalories(duration);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
            <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 30 }}>

                {/* ── 1. Hero Section ── */}
                <View style={styles.hero}>
                    <ImageBackground
                        source={day.headerImage || require("../../assets/workout_detail_bg.png")}
                        style={styles.heroBg}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={["rgba(0,0,0,0.25)", "rgba(10,10,11,0.65)", "rgba(10,10,11,0.98)"]}
                            locations={[0, 0.6, 1]}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Floating Glass Back Button */}
                        <TouchableOpacity
                            style={[styles.backBtn, { top: insets.top + 10 }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.goBack();
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Hero Text & Protocol Badges */}
                        <View style={styles.heroText}>
                            <View style={styles.heroBadgeRow}>
                                <View style={[styles.heroDayBadge, { borderColor: `${muscleColor}4D`, backgroundColor: `${muscleColor}1A` }]}>
                                    <View style={[styles.heroDayDot, { backgroundColor: muscleColor }]} />
                                    <Text style={[styles.heroDayBadgeText, { color: muscleColor }]}>
                                        DAY 0{day.day} PROTOCOL
                                    </Text>
                                </View>
                                <View style={styles.heroSplitBadge}>
                                    <Text style={styles.heroSplitBadgeText}>6-DAY SPLIT</Text>
                                </View>
                            </View>

                            <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit>
                                {day.target.toUpperCase()}
                            </Text>

                            <Text style={styles.heroSub}>
                                Complete session blueprint • {day.exercises.length} structured movements
                            </Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── 2. Protocol Meta Strip ── */}
                <View style={styles.metaStrip}>
                    <MetaItem
                        icon="barbell-outline"
                        val={`${day.exercises.length}`}
                        label="EXERCISES"
                    />
                    <View style={styles.metaDivider} />
                    <MetaItem
                        icon="time-outline"
                        val={`${duration}m`}
                        label="EST. TIME"
                    />
                    <View style={styles.metaDivider} />
                    <MetaItem
                        icon="flame-outline"
                        val={`${calories}`}
                        label="CALORIES"
                    />
                    <View style={styles.metaDivider} />
                    <MetaItem
                        icon="flash"
                        val="ELITE"
                        label="INTENSITY"
                        accentColor={COLORS.primary}
                    />
                </View>

                {/* ── 3. Primary CTA Button ── */}
                <TouchableOpacity
                    style={styles.cta}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.replace("ActiveWorkout", { day });
                    }}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[COLORS.primary, "#8B0000"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Top Gloss Highlight */}
                    <LinearGradient
                        colors={["rgba(255, 255, 255, 0.25)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.ctaGloss}
                        pointerEvents="none"
                    />
                    <Ionicons name="play" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.ctaText}>START WORKOUT</Text>
                </TouchableOpacity>

                {/* ── 4. Exercise Protocol List ── */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionAccentLine} />
                        <Text style={styles.sectionLabel}>EXERCISE BLUEPRINT</Text>
                    </View>
                    <View style={styles.sectionCountBadge}>
                        <Text style={styles.sectionCountText}>{day.exercises.length} MOVEMENTS</Text>
                    </View>
                </View>

                <View style={styles.exList}>
                    {day.exercises.map((ex, i) => (
                        <ExerciseRow
                            key={i}
                            ex={ex}
                            index={i}
                            total={day.exercises.length}
                            expanded={expanded === i}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExpanded(expanded === i ? null : i);
                            }}
                            onEdit={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setEditExercise(ex);
                            }}
                            dayTarget={day.target}
                            muscleColor={muscleColor}
                        />
                    ))}
                </View>
            </ScrollView>

            {/* ── Edit Exercise Target Modal ── */}
            <EditExerciseModal
                visible={!!editExercise}
                ex={editExercise}
                onClose={() => setEditExercise(null)}
                onSave={handleSaveEdit}
                muscleColor={muscleColor}
            />
        </View>
    );
}

function MetaItem({ icon, val, label, accentColor }) {
    return (
        <View style={styles.metaItem}>
            <View style={[styles.metaIconBox, accentColor && { backgroundColor: "rgba(227, 30, 36, 0.12)", borderColor: "rgba(227, 30, 36, 0.3)" }]}>
                <Ionicons name={icon} size={15} color={accentColor || COLORS.textSub} />
            </View>
            <Text style={[styles.metaVal, accentColor && { color: accentColor }]} adjustsFontSizeToFit numberOfLines={1}>
                {val}
            </Text>
            <Text style={styles.metaLabel} adjustsFontSizeToFit numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

function ExerciseRow({ ex, index, total, expanded, onPress, onEdit, dayTarget, muscleColor }) {
    const isReps = ex.type === "reps" || (ex.type !== "timer" && ex.name.toLowerCase() !== "plank");
    const numLabel = String(index + 1).padStart(2, '0');
    const suggestedWeight = getSuggestedWeight(ex.name);

    return (
        <View style={[styles.exRow, expanded && styles.exRowExpanded]}>
            <TouchableOpacity style={styles.exRowHeader} onPress={onPress} activeOpacity={0.75}>
                {/* Index circle */}
                <View style={[styles.exIndexBadge, { borderColor: expanded ? muscleColor : "rgba(255, 255, 255, 0.12)", backgroundColor: expanded ? `${muscleColor}1A` : "rgba(255, 255, 255, 0.03)" }]}>
                    <Text style={[styles.exRowNum, expanded && { color: muscleColor }]}>{numLabel}</Text>
                </View>

                {/* Exercise Info */}
                <View style={styles.exRowInfo}>
                    <Text style={styles.exRowName} numberOfLines={1}>{ex.name}</Text>
                    <View style={styles.exRowMeta}>
                        <Text style={styles.exRowMetaText}>{ex.sets} sets</Text>
                        <Text style={styles.exRowDot}> · </Text>
                        <Text style={styles.exRowMetaText}>
                            {isReps ? `${ex.reps || 12} reps` : `${ex.activeTimeSec}s`}
                        </Text>
                        <Text style={styles.exRowDot}> · </Text>
                        <Text style={styles.exRowMetaText}>{ex.restTimeSec}s rest</Text>
                    </View>
                </View>

                {/* Right Summary Pill & Actions */}
                <View style={styles.exRowRight}>
                    <View style={[styles.chipPill, expanded && { borderColor: `${muscleColor}4D`, backgroundColor: `${muscleColor}14` }]}>
                        <Text style={[styles.chipPillText, expanded && { color: "#FFFFFF" }]}>
                            {ex.sets} × {isReps ? `${ex.reps || 12} reps` : `${ex.activeTimeSec}s`}
                        </Text>
                    </View>
                    <View style={styles.exRowControls}>
                        <TouchableOpacity style={styles.editBtnSmall} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="options-outline" size={13} color={COLORS.textSub} />
                        </TouchableOpacity>
                        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSub} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* ── Expanded Content Details ── */}
            {expanded && (
                <View style={styles.exExpanded}>
                    {ex.image ? (
                        <View style={styles.exImgBox}>
                            <Image source={{ uri: ex.image }} style={styles.exImg} resizeMode="cover" />
                            <LinearGradient colors={["transparent", "rgba(10,10,11,0.92)"]} style={styles.exImgGrad} />
                            <View style={styles.exImgBadge}>
                                <Text style={styles.exImgBadgeText}>{dayTarget}</Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Sets Breakdown Grid */}
                    <Text style={styles.expandedSectionSubtitle}>TARGET SETS & WORKLOAD</Text>
                    <View style={styles.setsGrid}>
                        {Array.from({ length: ex.sets }).map((_, i) => (
                            <View key={i} style={styles.setCell}>
                                <Text style={styles.setCellLabel}>SET {i + 1}</Text>
                                <Text style={styles.setCellWork}>
                                    {isReps ? `${ex.reps || 12} reps` : `${ex.activeTimeSec}s`}
                                </Text>
                                <View style={styles.setCellRestRow}>
                                    <Ionicons name="timer-outline" size={10} color={COLORS.textMuted} />
                                    <Text style={styles.setCellRest}>{ex.restTimeSec}s rest</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Bilateral Callout */}
                    {ex.unilateral && (
                        <View style={styles.bilateralNote}>
                            <Ionicons name="swap-horizontal" size={15} color={COLORS.primary} />
                            <Text style={styles.bilateralNoteText}>
                                Bilateral Movement: Left and right sides execute independently.
                            </Text>
                        </View>
                    )}

                    {/* Suggested Weight Callout */}
                    {suggestedWeight ? (
                        <View style={styles.suggestedWeightBanner}>
                            <View style={styles.suggestedWeightLeft}>
                                <Ionicons name="trending-up" size={15} color={COLORS.primary} />
                                <Text style={styles.suggestedWeightLabel}>Suggested Starting Load:</Text>
                            </View>
                            <View style={styles.suggestedWeightBadge}>
                                <Text style={styles.suggestedWeightValue}>{suggestedWeight}</Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Technique Tips */}
                    {ex.tips && ex.tips.length > 0 && (
                        <View style={styles.tipsContainer}>
                            <View style={styles.tipsHeaderRow}>
                                <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.formLabel}>TECHNIQUE & EXECUTION TIPS</Text>
                            </View>

                            {ex.tips.map((tip, i) => (
                                <View key={i} style={styles.tipRow}>
                                    <View style={styles.tipDot} />
                                    <Text style={styles.tipText}>{tip}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Quick Customize Action Footer */}
                    <TouchableOpacity style={styles.customizeCardBtn} onPress={onEdit} activeOpacity={0.75}>
                        <Ionicons name="options-outline" size={14} color={COLORS.textSub} style={{ marginRight: 6 }} />
                        <Text style={styles.customizeCardBtnText}>Customize Sets, Reps & Rest</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function EditExerciseModal({ visible, ex, onSave, onClose, muscleColor }) {
    const [sets, setSets] = useState("");
    const [reps, setReps] = useState("");
    const [restTimeSec, setRestTimeSec] = useState("");

    useEffect(() => {
        if (ex) {
            setSets(String(ex.sets));
            setReps(String(ex.reps || ex.activeTimeSec));
            setRestTimeSec(String(ex.restTimeSec));
        }
    }, [ex]);

    const handleSave = () => {
        const s = parseInt(sets, 10) || ex.sets;
        const r = parseInt(reps, 10) || ex.reps;
        const rt = parseInt(restTimeSec, 10) || ex.restTimeSec;
        onSave({ ...ex, sets: s, reps: r, restTimeSec: rt });
    };

    const adjustVal = (setter, curr, delta, min = 1) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const val = parseInt(curr, 10) || min;
        setter(String(Math.max(min, val + delta)));
    };

    if (!ex) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={styles.modalContent}>
                    <LinearGradient
                        colors={['rgba(28, 28, 36, 0.98)', 'rgba(14, 14, 18, 0.99)', 'rgba(8, 8, 10, 1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.2, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Top Gloss Highlight */}
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.15)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
                        pointerEvents="none"
                    />

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={[styles.modalHeaderIcon, { backgroundColor: "rgba(227, 30, 36, 0.15)", borderColor: "rgba(227, 30, 36, 0.35)" }]}>
                                <Ionicons name="options" size={15} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>CUSTOMIZE TARGETS</Text>
                                <Text style={styles.modalSubtitle}>ADJUST SET & REP PROTOCOL</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalExName} numberOfLines={2}>{ex.name}</Text>

                    {/* Stepper Inputs Grid */}
                    <View style={styles.inputGrid}>
                        {/* Sets Stepper */}
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>SETS</Text>
                            <View style={styles.stepperContainer}>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustVal(setSets, sets, -1, 1)}>
                                    <Ionicons name="remove" size={14} color="#FFF" />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.input}
                                    value={sets}
                                    onChangeText={setSets}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                />
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustVal(setSets, sets, 1, 1)}>
                                    <Ionicons name="add" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Reps Stepper */}
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>REPS</Text>
                            <View style={styles.stepperContainer}>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustVal(setReps, reps, -1, 1)}>
                                    <Ionicons name="remove" size={14} color="#FFF" />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.input}
                                    value={reps}
                                    onChangeText={setReps}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                />
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustVal(setReps, reps, 1, 1)}>
                                    <Ionicons name="add" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Rest Secs Stepper */}
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>REST (S)</Text>
                            <View style={styles.stepperContainer}>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustVal(setRestTimeSec, restTimeSec, -15, 15)}>
                                    <Ionicons name="remove" size={14} color="#FFF" />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.input}
                                    value={restTimeSec}
                                    onChangeText={setRestTimeSec}
                                    keyboardType="number-pad"
                                    selectTextOnFocus
                                />
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustVal(setRestTimeSec, restTimeSec, 15, 15)}>
                                    <Ionicons name="add" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[COLORS.primary, "#8B0000"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>APPLY TARGETS</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // Hero Section
    hero: {
        height: 380,
        justifyContent: "flex-end",
        backgroundColor: COLORS.bgCard,
    },
    heroBg: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "flex-end",
    },
    backBtn: {
        position: "absolute",
        left: SPACING.base,
        width: 38,
        height: 38,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(22, 22, 28, 0.75)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        zIndex: 10,
    },
    heroText: {
        paddingHorizontal: 22,
        paddingBottom: 32,
    },
    heroBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
    },
    heroDayBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
    },
    heroDayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    heroDayBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 1,
    },
    heroSplitBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.10)",
    },
    heroSplitBadgeText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
    },
    heroTitle: {
        fontSize: 30,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        lineHeight: 35,
        letterSpacing: -0.5,
    },
    heroSub: {
        fontSize: 12.5,
        color: COLORS.textSub,
        fontFamily: FAMILY.regular,
        marginTop: 6,
    },

    // Meta Strip
    metaStrip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(24, 24, 30, 0.95)",
        borderRadius: 20,
        marginHorizontal: SPACING.base,
        marginTop: -22,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.12)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    metaItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
    },
    metaIconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    metaDivider: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    metaVal: {
        fontSize: 13.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    metaLabel: {
        fontSize: 8.5,
        color: COLORS.textMuted,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.5,
    },

    // CTA
    cta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: SPACING.base,
        marginTop: 18,
        height: 52,
        borderRadius: RADIUS.pill,
        overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
    },
    ctaGloss: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 24,
    },
    ctaText: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },

    // Section Header
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: SPACING.base,
        marginTop: 28,
        marginBottom: 14,
    },
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionAccentLine: {
        width: 3,
        height: 14,
        borderRadius: 1.5,
        backgroundColor: COLORS.primary,
    },
    sectionLabel: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.2,
    },
    sectionCountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    sectionCountText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
    },

    // Exercise List
    exList: {
        marginHorizontal: SPACING.base,
        gap: 10,
    },
    exRow: {
        padding: 16,
        backgroundColor: "rgba(22, 22, 28, 0.8)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
    },
    exRowExpanded: {
        borderColor: "rgba(255, 255, 255, 0.16)",
        backgroundColor: "rgba(26, 26, 34, 0.95)",
    },
    exRowHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    exIndexBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    exRowNum: {
        fontSize: 11.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    exRowInfo: {
        flex: 1,
        minWidth: 0,
    },
    exRowName: {
        fontSize: 14.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: -0.2,
    },
    exRowMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 3,
    },
    exRowMetaText: {
        fontSize: 10.5,
        color: COLORS.textSub,
        fontFamily: FAMILY.regular,
    },
    exRowDot: {
        fontSize: 10.5,
        color: COLORS.textMuted,
    },
    exRowRight: {
        alignItems: 'flex-end',
        gap: 4,
        flexShrink: 0,
    },
    chipPill: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignItems: 'center',
    },
    chipPillText: {
        fontSize: 10,
        color: "#EDEAE3",
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.2,
    },
    exRowControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    editBtnSmall: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },

    // Expanded Section
    exExpanded: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.07)",
        marginTop: 14,
    },
    expandedSectionSubtitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 10,
    },
    exImgBox: {
        borderRadius: 14,
        overflow: "hidden",
        height: 180,
        marginBottom: 16,
        backgroundColor: "#0F0F14",
    },
    exImg: {
        width: "100%",
        height: "100%",
    },
    exImgGrad: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
    },
    exImgBadge: {
        position: "absolute",
        bottom: 10,
        left: 10,
        backgroundColor: "rgba(10,10,11,0.85)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.15)",
    },
    exImgBadgeText: {
        fontSize: 9.5,
        color: "#FFF",
        fontFamily: FAMILY.bold,
    },

    setsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    setCell: {
        width: "31%",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    setCellLabel: {
        fontSize: 8,
        color: COLORS.textMuted,
        marginBottom: 3,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.5,
    },
    setCellWork: {
        fontSize: 13,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    setCellRestRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 4,
    },
    setCellRest: {
        fontSize: 8.5,
        color: COLORS.textSub,
        fontFamily: FAMILY.mono,
    },

    bilateralNote: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        padding: 10,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.25)",
    },
    bilateralNoteText: {
        fontSize: 11,
        color: "#EDEAE3",
        fontFamily: FAMILY.regular,
        flex: 1,
    },

    suggestedWeightBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    suggestedWeightLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    suggestedWeightLabel: {
        fontSize: 11,
        color: COLORS.textSub,
        fontFamily: FAMILY.regular,
    },
    suggestedWeightBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
    },
    suggestedWeightValue: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },

    tipsContainer: {
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    tipsHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    formLabel: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1,
    },
    tipRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 8,
    },
    tipDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        marginTop: 6,
    },
    tipText: {
        fontSize: 11.5,
        color: "#C5C2BB",
        flex: 1,
        lineHeight: 17,
        fontFamily: FAMILY.regular,
    },

    customizeCardBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 9,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        marginTop: 4,
    },
    customizeCardBtnText: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 0.5,
    },

    // Edit Target Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#16161D",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 20,
        paddingBottom: 36,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderBottomWidth: 0,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 12,
    },
    modalHeaderIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    modalTitle: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    modalSubtitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginTop: 1,
    },
    modalCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalExName: {
        fontSize: 16,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        marginBottom: 20,
    },
    inputGrid: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 24,
    },
    inputBox: {
        flex: 1,
        gap: 6,
    },
    inputLabel: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        textAlign: "center",
    },
    stepperContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        overflow: "hidden",
    },
    stepperBtn: {
        width: 28,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    input: {
        flex: 1,
        height: 44,
        color: "#FFFFFF",
        fontSize: 14,
        fontFamily: FAMILY.monoBold,
        textAlign: "center",
    },
    saveBtn: {
        height: 48,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        overflow: "hidden",
    },
    saveBtnText: {
        fontSize: 12,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
});
