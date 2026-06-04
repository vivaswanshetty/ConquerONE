import React, { useState, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Image, StatusBar, ImageBackground, Modal, TextInput,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
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
    // Simplified formula: 5.0 * 75kg * (mins / 60)
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
        await saveExerciseConfig(editExercise.name, config);
        setEditExercise(null);
        loadOverrides();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
            <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never">

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <ImageBackground
                        source={day.headerImage || require("../../assets/workout_detail_bg.png")}
                        style={styles.heroBg}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.92)"]}
                            style={StyleSheet.absoluteFill}
                        />

                        <TouchableOpacity
                            style={[styles.backBtn, { top: insets.top + 12 }]}
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.heroText}>
                            <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>{day.dayName.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit>{day.target.toUpperCase()}</Text>
                            <Text style={styles.heroSub}>EXERCISE PLAN · DAY 0{day.day}</Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── Stats Strip ── */}
                <View style={styles.metaStrip}>
                    <MetaItem icon="barbell-outline" val={`${day.exercises.length}`} label="EXERCISES" />
                    <View style={styles.metaDivider} />
                    <MetaItem icon="time-outline" val={`${totalTime(day)}M`} label="DURATION" />
                    <View style={styles.metaDivider} />
                    <MetaItem icon="flame-outline" val={`${estimateCalories(totalTime(day))}`} label="KCAL EST." accent />
                    <View style={styles.metaDivider} />
                    <MetaItem icon="flash" val="ELITE" label="PROTOCOL" accent />
                </View>

                {/* ── CTA ── */}
                <TouchableOpacity
                    style={[styles.cta, { backgroundColor: COLORS.primary }]}
                    onPress={() => navigation.navigate("ActiveWorkout", { day })}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.ctaText, { color: "#fff" }]}>START WORKOUT</Text>
                    <Ionicons name="play" size={14} color="#fff" />
                </TouchableOpacity>

                {/* ── Exercise List ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>EXERCISE LIST</Text>
                    <Text style={styles.sectionCount}>{day.exercises.length} TOTAL</Text>
                </View>

                <View style={styles.exList}>
                    {day.exercises.map((ex, i) => (
                        <ExerciseRow
                            key={i}
                            ex={ex}
                            index={i}
                            total={day.exercises.length}
                            expanded={expanded === i}
                            onPress={() => setExpanded(expanded === i ? null : i)}
                            onEdit={() => setEditExercise(ex)}
                        />
                    ))}
                </View>

                <View style={{ height: 64 }} />
            </ScrollView>

            <EditModal
                visible={!!editExercise}
                exercise={editExercise}
                onClose={() => setEditExercise(null)}
                onSave={handleSaveEdit}
                insets={insets}
            />
        </View>
    );
}

function EditModal({ visible, exercise, onClose, onSave, insets }) {
    const [sets, setSets] = useState("");
    const [work, setWork] = useState("");
    const [rest, setRest] = useState("");

    React.useEffect(() => {
        if (exercise) {
            setSets(exercise.sets.toString());
            setWork(exercise.activeTimeSec.toString());
            setRest(exercise.restTimeSec.toString());
        }
    }, [exercise]);

    const isReps = exercise?.type === "reps" || (exercise?.type !== "timer" && exercise?.name.toLowerCase() !== "plank");

    const handleSave = () => {
        onSave({
            sets: parseInt(sets) || exercise.sets,
            activeTimeSec: parseInt(work) || exercise.activeTimeSec,
            restTimeSec: parseInt(rest) || exercise.restTimeSec,
        });
    };

    if (!exercise) return null;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContent}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>CUSTOMIZE PROTOCOL</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalExName}>{exercise.name.toUpperCase()}</Text>

                    <View style={styles.inputGrid}>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>SETS</Text>
                            <TextInput
                                style={styles.input}
                                value={sets}
                                onChangeText={setSets}
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>{isReps ? "REPS" : "WORK (S)"}</Text>
                            <TextInput
                                style={styles.input}
                                value={work}
                                onChangeText={setWork}
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>REST (S)</Text>
                            <TextInput
                                style={styles.input}
                                value={rest}
                                onChangeText={setRest}
                                keyboardType="numeric"
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                        <Text style={styles.saveBtnText}>APPLY CHANGES</Text>
                    </TouchableOpacity>
                    <View style={{ height: insets.bottom }} />
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}
function MetaItem({ icon, val, label, accent }) {
    return (
        <View style={styles.metaItem}>
            <Ionicons name={icon} size={14} color={accent ? COLORS.primary : COLORS.textMuted} />
            <View style={styles.metaInfo}>
                <Text style={[styles.metaVal, accent && { color: COLORS.primary }]} adjustsFontSizeToFit numberOfLines={1}>{val}</Text>
                <Text style={styles.metaLabel} adjustsFontSizeToFit numberOfLines={1}>{label}</Text>
            </View>
        </View>
    );
}

function ExerciseRow({ ex, index, total, expanded, onPress, onEdit }) {
    const isReps = ex.type === "reps" || (ex.type !== "timer" && ex.name.toLowerCase() !== "plank");
    const numLabel = String(index + 1).padStart(2, '0');

    return (
        <TouchableOpacity
            style={styles.exRow}
            onPress={onPress}
            activeOpacity={0.75}
        >
            {/* ── Collapsed Row ── */}
            <View style={styles.exRowHeader}>
                {/* Left: number */}
                <Text style={[styles.exRowNum, { color: COLORS.primary }]}>{numLabel}</Text>

                {/* Centre: name + meta */}
                <View style={styles.exRowInfo}>
                    <Text style={styles.exRowName} numberOfLines={2}>{ex.name}</Text>
                    <View style={styles.exRowMeta}>
                        <Text style={styles.exRowMetaText}>
                            {ex.primaryTarget.toUpperCase()}
                            <Text style={styles.exRowDot}>  /  </Text>
                            {ex.equipment.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Right: chips + controls */}
                <View style={styles.exRowRight}>
                    {/* Rep / Work chip */}
                    <View style={styles.chipPill}>
                        <Text style={styles.chipPillText}>
                            {isReps ? `${ex.repRange || '12-15'} REPS` : `${ex.activeTimeSec}S WORK`}
                        </Text>
                    </View>
                    {/* Rest chip */}
                    <View style={[styles.chipPill, styles.chipPillMuted]}>
                        <Text style={[styles.chipPillText, { color: COLORS.textMuted }]}>{ex.restTimeSec}S REST</Text>
                    </View>
                    {/* Controls row */}
                    <View style={styles.exRowControls}>
                        <TouchableOpacity
                            style={styles.editBtnSmall}
                            onPress={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                        >
                            <Ionicons name="options-outline" size={12} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Ionicons
                            name={expanded ? "chevron-up" : "chevron-down"}
                            size={14}
                            color={COLORS.textMuted}
                        />
                    </View>
                </View>
            </View>

            {/* ── Expanded ── */}
            {expanded && (
                <View style={styles.exExpanded}>
                    {ex.image && (
                        <View style={styles.exImgBox}>
                            <Image source={ex.image} style={styles.exImg} resizeMode="cover" />
                            <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.exImgGrad} />
                            <View style={styles.exImgBadge}>
                                <Text style={styles.exImgBadgeText}>{ex.equipment.toUpperCase()}</Text>
                            </View>
                        </View>
                    )}

                    {/* Sets grid */}
                    <View style={styles.setsGrid}>
                        {Array.from({ length: ex.sets }).map((_, i) => (
                            <View key={i} style={styles.setCell}>
                                <Text style={styles.setCellLabel}>SET {String(i + 1).padStart(2, '0')}</Text>
                                <Text style={styles.setCellWork}>
                                    {isReps ? (ex.repRange || '12-15') : (ex.activeTimeSec + 's')}
                                </Text>
                                {i < ex.sets - 1 && <Text style={styles.setCellRest}>REST {ex.restTimeSec}S</Text>}
                            </View>
                        ))}
                    </View>

                    {ex.unilateral && (
                        <View style={styles.noteRow}>
                            <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                            <Text style={styles.noteText}>BILATERAL: TIMERS RUN INDEPENDENTLY</Text>
                        </View>
                    )}

                    {getSuggestedWeight(ex.name) ? (
                        <View style={[styles.noteRow, { borderColor: "rgba(227, 30, 36, 0.25)", backgroundColor: "rgba(227, 30, 36, 0.03)", marginBottom: 24 }]}>
                            <Ionicons name="trending-up-outline" size={16} color={COLORS.primary} />
                            <Text style={[styles.noteText, { color: COLORS.text }]}>
                                SUGGESTED WEIGHT: <Text style={{ fontFamily: FAMILY.bold, color: COLORS.primary }}>{getSuggestedWeight(ex.name)}</Text>
                            </Text>
                        </View>
                    ) : null}

                    <Text style={styles.formLabel}>TECHNIQUE TIPS</Text>

                    {ex.tips.map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                            <View style={styles.tipDot} />
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    hero: { height: 420, justifyContent: "flex-end", backgroundColor: COLORS.bgCard },
    heroBg: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
    heroIconWrap: {
        position: "absolute",
        top: -40, right: -40,
    },
    backBtn: {
        position: "absolute", left: SPACING.base, width: 44, height: 44,
        borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    heroText: { paddingHorizontal: 32, paddingBottom: 40 },
    heroBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 4, marginBottom: 16,
        borderWidth: 0.5, borderColor: "rgba(255,255,255,0.2)"
    },
    heroBadgeText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },
    heroTitle: { fontSize: 42, fontFamily: FAMILY.display, color: COLORS.text, lineHeight: 46, letterSpacing: -1 },
    heroSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: FAMILY.bold, marginTop: 12, letterSpacing: 1.5, opacity: 0.6 },

    metaStrip: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 24,
        marginHorizontal: 12, marginTop: -32, paddingVertical: 20, paddingHorizontal: 8,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20,
    },
    metaItem: {
        flex: 1, alignItems: "center", justifyContent: "center", gap: 8,
    },
    metaDivider: { width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.08)" },
    metaInfo: { alignItems: "center" },
    metaVal: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.2 },
    metaLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: FAMILY.bold, letterSpacing: 1.5 },

    cta: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
        backgroundColor: COLORS.text, marginHorizontal: SPACING.base, marginTop: 24,
        paddingVertical: 20, borderRadius: 16,
    },
    ctaText: { fontSize: 14, fontFamily: FAMILY.bold, color: "#000", letterSpacing: 2 },

    sectionHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
        paddingHorizontal: SPACING.base, marginTop: 48, marginBottom: 20,
    },
    sectionLabel: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3 },
    sectionCount: { fontSize: 11, color: COLORS.textMuted, fontFamily: FAMILY.medium },

    exList: {
        marginHorizontal: SPACING.base, gap: 12,
    },
    exRow: {
        paddingHorizontal: 20, paddingVertical: 22,
        backgroundColor: COLORS.bgCard, borderRadius: 24,
        borderWidth: 1, borderColor: COLORS.border,
    },
    exRowHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
    exRowNum: { width: 28, fontSize: 11, color: COLORS.accent, fontFamily: FAMILY.bold, letterSpacing: 1 },
    exRowInfo: { flex: 1, minWidth: 0 },
    exRowName: { fontSize: 16, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: 0.3, flexWrap: 'wrap' },
    exRowMeta: { flexDirection: "row", marginTop: 6 },
    exRowMetaText: {
        fontSize: 9,
        color: COLORS.textMuted,
        fontFamily: FAMILY.bold,
        letterSpacing: 1.5,
        lineHeight: 14,
    },
    exRowDot: { fontSize: 9, color: COLORS.borderLight, opacity: 0.5 },
    // New right-side layout
    exRowRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
    chipPill: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', minWidth: 80,
    },
    chipPillMuted: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.05)' },
    chipPillText: { fontSize: 10, color: COLORS.textSub, fontFamily: FAMILY.bold, letterSpacing: 0.5 },
    exRowControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },

    exExpanded: { paddingTop: 24, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", marginTop: 20 },
    exImgBox: { borderRadius: 16, overflow: "hidden", height: 220, marginBottom: 24 },
    exImg: { width: "100%", height: "100%" },
    exImgGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
    exImgBadge: {
        position: "absolute", bottom: 16, left: 16,
        backgroundColor: "rgba(0,0,0,0.8)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4,
    },
    exImgBadgeText: { fontSize: 9, color: "#fff", fontFamily: FAMILY.bold, letterSpacing: 1 },

    setsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
    setCell: {
        width: "31%", backgroundColor: COLORS.bgSurface,
        borderRadius: 12, padding: 12, alignItems: "center",
        borderWidth: 1, borderColor: COLORS.border
    },
    setCellLabel: { fontSize: 8, color: COLORS.textMuted, marginBottom: 4, fontFamily: FAMILY.bold, letterSpacing: 1 },
    setCellWork: { fontSize: 18, fontFamily: FAMILY.display, color: COLORS.text },
    setCellRest: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: FAMILY.bold },

    noteRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 12,
        marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
    },
    noteText: { fontSize: 11, color: COLORS.textSub, fontFamily: FAMILY.medium, letterSpacing: 0.5 },

    formLabel: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2.5, marginBottom: 16 },
    tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    tipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.primary, marginTop: 10 },
    tipText: { fontSize: 14, color: COLORS.textSub, flex: 1, lineHeight: 22, fontFamily: FAMILY.regular },

    // Edit Modal Styles
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: COLORS.bgCard, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 32, paddingTop: 32, paddingBottom: 12,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderBottomWidth: 0,
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
    modalTitle: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3 },
    modalExName: { fontSize: 24, fontFamily: FAMILY.display, color: COLORS.text, marginBottom: 40 },
    inputGrid: { flexDirection: "row", gap: 16, marginBottom: 40 },
    inputBox: { flex: 1, gap: 12 },
    inputLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },
    input: {
        backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16,
        color: COLORS.text, fontSize: 18, fontFamily: FAMILY.display, textAlign: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    saveBtn: {
        backgroundColor: COLORS.primary, paddingVertical: 20, borderRadius: 16,
        alignItems: "center",
    },
    saveBtnText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },
    editBtnSmall: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(227,30,36,0.1)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(227,30,36,0.2)",
    },
});
