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
                            colors={["rgba(0,0,0,0.3)", "rgba(10,10,11,0.75)", "rgba(10,10,11,0.98)"]}
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
                            <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit>{day.target}</Text>
                            <Text style={styles.heroSub}>Day <Text style={{ fontFamily: FAMILY.mono }}>0{day.day}</Text> · 6-Day Split</Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* ── Stats Strip ── */}
                <View style={styles.metaStrip}>
                    <MetaItem icon="barbell-outline" val={`${day.exercises.length}`} label="Exercises" />
                    <View style={styles.metaDivider} />
                    <MetaItem icon="time-outline" val={`${totalTime(day)}m`} label="Duration" />
                    <View style={styles.metaDivider} />
                    <MetaItem icon="flame-outline" val={`${estimateCalories(totalTime(day))}`} label="Calories" />
                    <View style={styles.metaDivider} />
                    <MetaItem icon="flash" val="Elite" label="Intensity" accent />
                </View>

                {/* ── CTA ── */}
                <TouchableOpacity
                    style={styles.cta}
                    onPress={() => navigation.replace("ActiveWorkout", { day })}
                    activeOpacity={0.85}
                >
                    <Text style={styles.ctaText}>Start Workout</Text>
                    <Ionicons name="play" size={14} color="#EDEAE3" />
                </TouchableOpacity>

                {/* ── Exercise List ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>Exercise List</Text>
                    <Text style={styles.sectionCount}>{day.exercises.length} Total</Text>
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
                            dayTarget={day.target}
                        />
                    ))}
                </View>

                <View style={{ height: 64 }} />
            </ScrollView>

            <EditExerciseModal
                visible={!!editExercise}
                ex={editExercise}
                onClose={() => setEditExercise(null)}
                onSave={handleSaveEdit}
            />
        </View>
    );
}

function EditExerciseModal({ visible, ex, onSave, onClose }) {
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
        const s = parseInt(sets) || ex.sets;
        const r = parseInt(reps) || ex.reps;
        const rt = parseInt(restTimeSec) || ex.restTimeSec;
        onSave({ ...ex, sets: s, reps: r, restTimeSec: rt });
    };

    if (!ex) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={styles.modalContent}>
                    {/* macOS Liquid Glass Gradient */}
                    <LinearGradient
                        colors={['rgba(32, 32, 40, 0.95)', 'rgba(14, 14, 18, 0.98)', 'rgba(8, 8, 10, 0.99)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.2, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Top Gloss Specular Highlight */}
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
                        pointerEvents="none"
                    />

                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>EDIT TARGETS</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={20} color={COLORS.textSub} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.modalExName}>{ex.name}</Text>

                    <View style={styles.inputGrid}>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>SETS</Text>
                            <TextInput
                                style={styles.input}
                                value={sets}
                                onChangeText={setSets}
                                keyboardType="number-pad"
                                selectTextOnFocus
                            />
                        </View>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>REPS / SEC</Text>
                            <TextInput
                                style={styles.input}
                                value={reps}
                                onChangeText={setReps}
                                keyboardType="number-pad"
                                selectTextOnFocus
                            />
                        </View>
                        <View style={styles.inputBox}>
                            <Text style={styles.inputLabel}>REST (S)</Text>
                            <TextInput
                                style={styles.input}
                                value={restTimeSec}
                                onChangeText={setRestTimeSec}
                                keyboardType="number-pad"
                                selectTextOnFocus
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                        <Text style={styles.saveBtnText}>SAVE TARGETS</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function MetaItem({ icon, val, label, accent }) {
    return (
        <View style={styles.metaItem}>
            <Ionicons name={icon} size={14} color={accent ? COLORS.accent : COLORS.textSub} />
            <View style={styles.metaInfo}>
                <Text style={[styles.metaVal, accent && { color: COLORS.text }]} adjustsFontSizeToFit numberOfLines={1}>{val}</Text>
                <Text style={styles.metaLabel} adjustsFontSizeToFit numberOfLines={1}>{label}</Text>
            </View>
        </View>
    );
}

function ExerciseRow({ ex, index, total, expanded, onPress, onEdit, dayTarget }) {
    const isReps = ex.type === "reps" || (ex.type !== "timer" && ex.name.toLowerCase() !== "plank");
    const numLabel = String(index + 1).padStart(2, '0');

    return (
        <View style={styles.exRow}>
            <TouchableOpacity style={styles.exRowHeader} onPress={onPress} activeOpacity={0.7}>
                <Text style={styles.exRowNum}>{numLabel}</Text>
                <View style={styles.exRowInfo}>
                    <Text style={styles.exRowName}>{ex.name}</Text>
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
                <View style={styles.exRowRight}>
                    <View style={styles.chipPill}>
                        <Text style={styles.chipPillText}>{ex.sets} × {isReps ? `${ex.reps || 12}r` : `${ex.activeTimeSec}s`}</Text>
                    </View>
                    <View style={styles.exRowControls}>
                        <TouchableOpacity style={styles.editBtnSmall} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="pencil" size={12} color={COLORS.textSub} />
                        </TouchableOpacity>
                        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSub} />
                    </View>
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.exExpanded}>
                    {ex.image ? (
                        <View style={styles.exImgBox}>
                            <Image source={{ uri: ex.image }} style={styles.exImg} resizeMode="cover" />
                            <LinearGradient colors={["transparent", "rgba(10,10,11,0.9)"]} style={styles.exImgGrad} />
                            <View style={styles.exImgBadge}>
                                <Text style={styles.exImgBadgeText}>{dayTarget}</Text>
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.setsGrid}>
                        {Array.from({ length: ex.sets }).map((_, i) => (
                            <View key={i} style={styles.setCell}>
                                <Text style={styles.setCellLabel}>SET {i + 1}</Text>
                                <Text style={styles.setCellWork}>
                                    {isReps ? `${ex.reps || 12}r` : `${ex.activeTimeSec}s`}
                                </Text>
                                {i < ex.sets - 1 && <Text style={styles.setCellRest}>{ex.restTimeSec}s rest</Text>}
                            </View>
                        ))}
                    </View>

                    {ex.unilateral && (
                        <View style={styles.noteRow}>
                            <Ionicons name="swap-horizontal" size={16} color={COLORS.textSub} />
                            <Text style={styles.noteText}>Bilateral: Timers run independently</Text>
                        </View>
                    )}

                    {getSuggestedWeight(ex.name) ? (
                        <View style={[styles.noteRow, { borderColor: COLORS.border, backgroundColor: COLORS.bg, marginBottom: 20 }]}>
                            <Ionicons name="trending-up-outline" size={16} color={COLORS.textSub} />
                            <Text style={[styles.noteText, { color: COLORS.text }]}>
                                Suggested Weight: <Text style={{ fontFamily: FAMILY.monoBold, color: COLORS.text }}>{getSuggestedWeight(ex.name)}</Text>
                            </Text>
                        </View>
                    ) : null}

                    <Text style={styles.formLabel}>Technique Tips</Text>

                    {ex.tips.map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                            <View style={styles.tipDot} />
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    hero: { height: 400, justifyContent: "flex-end", backgroundColor: COLORS.bgCard },
    heroBg: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
    backBtn: {
        position: "absolute", left: SPACING.base, width: 40, height: 40,
        borderRadius: RADIUS.pill, backgroundColor: COLORS.bgCard,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
    heroText: { paddingHorizontal: 24, paddingBottom: 36 },
    heroBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(237, 234, 227, 0.06)",
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: RADIUS.sm, marginBottom: 12,
        borderWidth: 0.5, borderColor: COLORS.border,
    },
    heroBadgeText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 1.5 },
    heroTitle: { fontSize: 32, fontFamily: FAMILY.bold, color: COLORS.text, lineHeight: 36, letterSpacing: -0.5 },
    heroSub: { fontSize: 13, color: COLORS.textSub, fontFamily: FAMILY.regular, marginTop: 8 },

    metaStrip: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.base, marginTop: -24, paddingVertical: 16, paddingHorizontal: 8,
        borderWidth: 1, borderColor: COLORS.border,
    },
    metaItem: {
        flex: 1, alignItems: "center", justifyContent: "center", gap: 6,
    },
    metaDivider: { width: 1, height: 20, backgroundColor: COLORS.border },
    metaInfo: { alignItems: "center" },
    metaVal: { fontSize: 14, fontFamily: FAMILY.monoBold, color: COLORS.text },
    metaLabel: { fontSize: 10, color: COLORS.textSub, marginTop: 2, fontFamily: FAMILY.regular },

    cta: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: COLORS.primary, marginHorizontal: SPACING.base, marginTop: 20,
        paddingVertical: 16, borderRadius: RADIUS.md,
    },
    ctaText: { fontSize: 13, fontFamily: FAMILY.bold, color: "#FFFFFF", letterSpacing: 0.8 },

    sectionHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
        paddingHorizontal: SPACING.base, marginTop: 36, marginBottom: 14,
    },
    sectionLabel: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },
    sectionCount: { fontSize: 12, color: COLORS.textSub, fontFamily: FAMILY.monoBold },

    exList: {
        marginHorizontal: SPACING.base, gap: 10,
    },
    exRow: {
        paddingHorizontal: 18, paddingVertical: 18,
        backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: COLORS.border,
        overflow: "hidden",
    },
    exRowHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    exRowNum: { width: 24, fontSize: 12, color: COLORS.textSub, fontFamily: FAMILY.monoBold },
    exRowInfo: { flex: 1, minWidth: 0 },
    exRowName: { fontSize: 15, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.2 },
    exRowMeta: { flexDirection: "row", marginTop: 4 },
    exRowMetaText: {
        fontSize: 11,
        color: COLORS.textSub,
        fontFamily: FAMILY.regular,
    },
    exRowDot: { fontSize: 11, color: COLORS.textMuted },
    exRowRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    chipPill: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: RADIUS.pill, backgroundColor: COLORS.bg,
        borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', minWidth: 70,
    },
    chipPillMuted: { backgroundColor: 'transparent', borderColor: 'transparent' },
    chipPillText: { fontSize: 10, color: COLORS.text, fontFamily: FAMILY.monoBold },
    exRowControls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },

    exExpanded: { paddingTop: 18, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 16 },
    exImgBox: { borderRadius: RADIUS.lg, overflow: "hidden", height: 200, marginBottom: 20 },
    exImg: { width: "100%", height: "100%" },
    exImgGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
    exImgBadge: {
        position: "absolute", bottom: 12, left: 12,
        backgroundColor: "rgba(10,10,11,0.85)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
        borderWidth: 0.5, borderColor: COLORS.border,
    },
    exImgBadgeText: { fontSize: 10, color: COLORS.text, fontFamily: FAMILY.medium },

    setsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
    setCell: {
        width: "31%", backgroundColor: COLORS.bg,
        borderRadius: RADIUS.sm, padding: 10, alignItems: "center",
        borderWidth: 1, borderColor: COLORS.border
    },
    setCellLabel: { fontSize: 9, color: COLORS.textSub, marginBottom: 2, fontFamily: FAMILY.mono },
    setCellWork: { fontSize: 15, fontFamily: FAMILY.monoBold, color: COLORS.text },
    setCellRest: { fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontFamily: FAMILY.mono },

    noteRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: COLORS.bg, padding: 12, borderRadius: RADIUS.md,
        marginBottom: 20, borderWidth: 1, borderColor: COLORS.border
    },
    noteText: { fontSize: 12, color: COLORS.textSub, fontFamily: FAMILY.regular },

    formLabel: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, marginBottom: 12 },
    tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
    tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textSub, marginTop: 8 },
    tipText: { fontSize: 13, color: COLORS.textSub, flex: 1, lineHeight: 20, fontFamily: FAMILY.regular },

    // Edit Modal Styles
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "rgba(22, 22, 26, 0.95)", borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 26, paddingBottom: 36,
        borderWidth: 1.2, borderColor: "rgba(255, 255, 255, 0.14)", borderBottomWidth: 0,
        overflow: "hidden",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 1 },
    modalExName: { fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, marginBottom: 26 },
    inputGrid: { flexDirection: "row", gap: 12, marginBottom: 28 },
    inputBox: { flex: 1, gap: 8 },
    inputLabel: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 1 },
    input: {
        backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14,
        color: COLORS.text, fontSize: 16, fontFamily: FAMILY.monoBold, textAlign: "center",
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)",
    },
    saveBtn: {
        backgroundColor: COLORS.primary, height: 50, borderRadius: RADIUS.pill,
        alignItems: "center", justifyContent: "center",
    },
    saveBtnText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#FFFFFF", letterSpacing: 1 },
    editBtnSmall: {
        width: 28, height: 28, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
});
