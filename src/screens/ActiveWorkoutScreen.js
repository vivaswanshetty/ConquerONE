import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Image,
    Dimensions, StatusBar, ScrollView, Animated,
    Modal, TextInput, KeyboardAvoidingView, Platform, AppState,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { saveWorkoutComplete, formatDuration, tryUpdatePR, getPRRecords, getWorkoutHistory, saveActiveWorkoutSession, getActiveWorkoutSession, clearActiveWorkoutSession } from "../utils/storage";
import { syncAndroidWidget } from "../utils/widgetSync";
import { scheduleRestNotification, cancelNotification } from "../utils/notifications";
import { getSettings, estimateCalories, displayWeight } from "../utils/settings";
import { getSuggestedWeight } from "../data/workoutData";

import {
    setAudioSettings, announceWorkStart, announceSetDone,
    announceRestOver, announceWorkoutDone,
    announceSide, announceFinalCountdown,
} from "../utils/audio";

const { width } = Dimensions.get("window");
const RING = 210;
const STROKE = 12;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

// MET-based calorie burn (kcal) from elapsed seconds
const liveCalories = (elapsedSec, bodyKg = 75) =>
    Math.round((5.0 * bodyKg * elapsedSec) / 3600);

// Motivational rest cues
const REST_MINDSET = [
    "Recovery is part of the work. 💪",
    "Breathe. Your muscles are rebuilding.",
    "Rest hard. Train harder.",
    "Consistency beats intensity. Stay.",
    "You showed up. That's already a win.",
    "One more set. You've got this.",
    "Champions rest too.",
];

function buildQueue(exercises) {
    const q = [];
    exercises.forEach((ex) => {
        if (ex.unilateral) {
            q.push({ ...ex, side: "LEFT" });
            q.push({ ...ex, side: "RIGHT" });
        } else {
            q.push({ ...ex, side: null });
        }
    });
    return q;
}

function buildPhases(queue, extraRest = 0) {
    const phases = [];
    queue.forEach((ex, exIdx) => {
        const isReps = ex.type === "reps" || (ex.type !== "timer" && ex.name.toLowerCase() !== "plank");
        for (let set = 1; set <= ex.sets; set++) {
            let targetRepRange = ex.repRange || "12-15";
            if (targetRepRange.includes("·")) {
                const parts = targetRepRange.split("·");
                if (parts[set - 1]) {
                    targetRepRange = parts[set - 1];
                }
            }
            phases.push({
                type: "active",
                exercise: ex,
                set,
                exIdx,
                duration: ex.activeTimeSec,
                isReps: isReps,
                repRange: targetRepRange
            });
            if (set < ex.sets) {
                phases.push({ type: "set_rest", exercise: ex, set, exIdx, duration: ex.restTimeSec + extraRest, nextExercise: null });
            }
        }
        if (exIdx < queue.length - 1) {
            phases.push({ type: "ex_rest", exercise: ex, exIdx, duration: ex.restTimeSec + extraRest, nextExercise: queue[exIdx + 1] });
        }
    });
    return phases;
}

/* ── Animated Ring Timer ──────────────────────────────────── */
function RingTimer({ progress, isWork, size, stroke, timeLeft, isRunning = false }) {
    const safeProgress = isNaN(progress) ? 0 : progress;
    const safeTimeLeft = isNaN(timeLeft) ? 0 : timeLeft;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const fill = circ * Math.max(0, Math.min(1, safeProgress));
    const isUrgent = safeTimeLeft <= 5 && safeTimeLeft > 0;

    const activeColor = isWork ? (isRunning ? COLORS.primary : COLORS.text) : COLORS.textMuted;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!isRunning) return;
        pulseAnim.setValue(1);
        const duration = isUrgent ? 600 : (isWork ? 2000 : 3000);
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: isUrgent ? 1.18 : 1.10,
                    duration: duration,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1.0,
                    duration: duration,
                    useNativeDriver: true,
                })
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [isWork, isUrgent, isRunning]);

    const scaleOut = pulseAnim;
    const opacityOut = pulseAnim.interpolate({
        inputRange: [1, isUrgent ? 1.18 : 1.10],
        outputRange: [isUrgent ? 0.5 : 0.25, 0.0]
    });

    const scaleIn = pulseAnim.interpolate({
        inputRange: [1, isUrgent ? 1.18 : 1.10],
        outputRange: [1.0, isUrgent ? 1.06 : 1.04]
    });
    const opacityIn = pulseAnim.interpolate({
        inputRange: [1, isUrgent ? 1.18 : 1.10],
        outputRange: [isUrgent ? 0.7 : 0.4, 0.15]
    });

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {/* Concentric Breathing Halo - only while set is actively running */}
            {isRunning && isWork && (
                <>
                    <Animated.View style={{
                        position: "absolute",
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: 2,
                        borderColor: isUrgent ? COLORS.primary : activeColor,
                        opacity: opacityOut,
                        transform: [{ scale: scaleOut }],
                    }} />

                    <Animated.View style={{
                        position: "absolute",
                        width: size - stroke * 2,
                        height: size - stroke * 2,
                        borderRadius: (size - stroke * 2) / 2,
                        borderWidth: 1,
                        borderColor: isUrgent ? COLORS.primary : activeColor,
                        opacity: opacityIn,
                        transform: [{ scale: scaleIn }],
                    }} />

                    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                        <LinearGradient
                            colors={["rgba(122,46,34,0.08)", "transparent"]}
                            style={{ width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4 }}
                        />
                    </View>
                </>
            )}

            <Svg width={size} height={size} style={{ position: "absolute" }}>
                <Circle
                    cx={size / 2} cy={size / 2} r={r}
                    stroke="rgba(255,255,255,0.03)" strokeWidth={stroke} fill="none"
                />
                <Circle
                    cx={size / 2} cy={size / 2} r={r}
                    stroke={activeColor} strokeWidth={stroke} fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${fill} ${circ}`}
                    rotation="-90" origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
        </View>
    );
}

/* ── PR Logging Modal ─────────────────────────────────────── */
function PRModal({ visible, exerciseName, onClose, onSave, weightUnit = "kg", initialWeight = "", initialReps = "" }) {
    const [weight, setWeight] = useState("");
    const [reps, setReps] = useState("");
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        if (visible) {
            setWeight(initialWeight !== undefined && initialWeight !== null ? String(initialWeight) : "");
            setReps(initialReps !== undefined && initialReps !== null ? String(initialReps) : "");
            Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }).start();
        } else {
            scaleAnim.setValue(0.92);
        }
    }, [visible, initialWeight, initialReps]);

    const handleSave = () => {
        const w = parseFloat(weight) || 0;
        const r = parseInt(reps) || 0;
        onSave(w, r);
        setWeight(""); setReps("");
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose}>
                    <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                        <Animated.View style={[pm.sheet, { transform: [{ scale: scaleAnim }] }]}>
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

                            <View style={pm.handle} />
                            <View style={pm.headerRow}>
                                <View style={pm.trophyBadge}>
                                    <Ionicons name="clipboard" size={20} color={COLORS.textSub} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={pm.title}>LOG YOUR SET</Text>
                                    <Text style={pm.subtitle} numberOfLines={1}>{exerciseName.toUpperCase()}</Text>
                                    {initialWeight !== "" && Number(initialWeight) > 0 ? (
                                        <Text style={pm.targetText}>
                                            TARGET OVERLOAD: {initialWeight} {weightUnit.toUpperCase()} × {initialReps} REPS
                                        </Text>
                                    ) : getSuggestedWeight(exerciseName) ? (
                                        <Text style={pm.suggestedText}>
                                            SUGGESTED START: {getSuggestedWeight(exerciseName).toUpperCase()}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>

                            <View style={pm.row}>
                                <View style={pm.inputGroup}>
                                    <Text style={pm.inputLabel}>WEIGHT ({weightUnit.toUpperCase()})</Text>
                                    <View style={pm.inputBox}>
                                        <TextInput
                                            style={pm.input}
                                            value={weight}
                                            onChangeText={setWeight}
                                            keyboardType="decimal-pad"
                                            placeholder="0"
                                            placeholderTextColor={COLORS.textMuted}
                                            returnKeyType="next"
                                        />
                                    </View>
                                </View>
                                <View style={pm.inputGroup}>
                                    <Text style={pm.inputLabel}>REPETITIONS</Text>
                                    <View style={pm.inputBox}>
                                        <TextInput
                                            style={pm.input}
                                            value={reps}
                                            onChangeText={setReps}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor={COLORS.textMuted}
                                            returnKeyType="done"
                                        />
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={[pm.saveBtn, { backgroundColor: COLORS.primary }]} onPress={handleSave} activeOpacity={0.85}>
                                <Text style={pm.saveBtnText}>SAVE PERFORMANCE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={pm.skipBtn} onPress={onClose} activeOpacity={0.7}>
                                <Text style={pm.skipText}>SKIP SET LOGGING</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const pm = StyleSheet.create({
    backdrop: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.85)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "rgba(22, 22, 26, 0.95)",
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        borderWidth: 1.2, borderColor: "rgba(255, 255, 255, 0.14)",
        borderBottomWidth: 0,
        padding: 32, paddingBottom: 48,
        alignItems: "center",
        width: "100%",
        overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.4, shadowRadius: 20,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 32,
    },
    headerRow: {
        flexDirection: "row", alignItems: "center", gap: 16,
        width: "100%", marginBottom: 32,
    },
    trophyBadge: {
        width: 48, height: 48, borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.2, borderColor: "rgba(255,255,255,0.12)",
        alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1.5 },
    subtitle: { fontSize: 18, fontFamily: FAMILY.medium, color: COLORS.textSub, marginTop: 4 },
    targetText: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.primary, marginTop: 6, letterSpacing: 0.5 },
    suggestedText: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.accent, marginTop: 6, letterSpacing: 0.5 },
    row: { flexDirection: "row", gap: 16, width: "100%", marginBottom: 32 },
    inputGroup: { flex: 1 },
    inputLabel: {
        fontSize: 9, fontFamily: FAMILY.medium,
        color: COLORS.textMuted, letterSpacing: 2, marginBottom: 12,
    },
    inputBox: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 18,
        paddingHorizontal: 16, paddingVertical: 12,
        borderWidth: 1.2, borderColor: "rgba(255,255,255,0.08)",
    },
    input: {
        flex: 1, fontSize: 32, fontFamily: FAMILY.monoBold,
        color: COLORS.text, textAlign: "center", padding: 0,
    },
    saveBtn: {
        width: "100%", backgroundColor: COLORS.primary,
        height: 52, borderRadius: RADIUS.pill,
        alignItems: "center", justifyContent: "center", marginBottom: 16,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 15,
        elevation: 5,
    },
    saveBtnText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },
    skipBtn: { paddingVertical: 12 },
    skipText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1 },
});

/* ── PR Toast ─────────────────────────────────────────────── */
function PRToast({ visible, exerciseName, weightKg, reps, weightUnit }) {
    const slideAnim = useRef(new Animated.Value(-90)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: -90, duration: 280, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    return (
        <Animated.View style={[pt.toast, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient
                colors={["rgba(227, 30, 36, 0.25)", "rgba(13, 13, 13, 0.98)"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.5 }}
            />
            <View style={pt.trophyContainer}>
                <Ionicons name="trophy" size={18} color={COLORS.primary} />
            </View>
            <View style={pt.info}>
                <Text style={pt.label}>NEW PERFORMANCE RECORD</Text>
                <Text style={pt.name} numberOfLines={1}>{exerciseName.toUpperCase()}</Text>
            </View>
            <View style={pt.valBox}>
                <Text style={pt.val}>{displayWeight(weightKg, weightUnit)}</Text>
                {reps > 0 && <Text style={pt.subVal}>{reps} REPS</Text>}
            </View>
        </Animated.View>
    );
}

const pt = StyleSheet.create({
    toast: {
        position: "absolute", top: 16, left: 16, right: 16,
        backgroundColor: "#0D0D0D", borderRadius: RADIUS.lg,
        flexDirection: "row", alignItems: "center", gap: 16,
        padding: 16, borderWidth: 1.5, borderColor: "rgba(227, 30, 36, 0.45)",
        elevation: 12, zIndex: 1000, overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    trophyContainer: {
        width: 38, height: 38, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(227, 30, 36, 0.25)",
    },
    info: { flex: 1 },
    label: { fontSize: 8, fontFamily: FAMILY.semibold, color: COLORS.primary, letterSpacing: 1.5 },
    name: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, marginTop: 4 },
    valBox: {
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        justifyContent: "center", alignItems: "center", minWidth: 64
    },
    val: { fontSize: 13, fontFamily: FAMILY.monoBold, color: COLORS.text, textAlign: "center" },
    subVal: { fontSize: 8, fontFamily: FAMILY.mono, color: COLORS.primary, textAlign: "center", marginTop: 2, letterSpacing: 0.5 },
});


/* ── Rest Overlay ─────────────────────────────────────────── */
function RestOverlay({ phase, timeLeft, onSkip, settings, mindsetTip }) {
    const isUrgent = timeLeft <= 5 && timeLeft > 0;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = minutes > 0
        ? `${minutes}:${String(seconds).padStart(2, "0")}`
        : String(timeLeft);

    const isSetRest = phase?.type === "set_rest";

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            contentContainerStyle={ro.scrollContent}
            style={ro.container}
        >
            <View style={ro.mainContent}>
                <View style={ro.topRow}>
                    <View style={ro.badge}>
                        <Text style={ro.badgeText}>
                            {isSetRest ? "RESTING" : "NEXT EXERCISE"}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onSkip} style={ro.skipBtn} activeOpacity={0.7}>
                        <Text style={[ro.skipText, { color: COLORS.primary }]}>SKIP REST</Text>
                        <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <Text style={[ro.timer, isUrgent && { color: COLORS.primary }]}>
                    {timeStr}
                </Text>
                <Text style={ro.timerUnit}>{timeLeft >= 60 ? "MINUTES REMAINING" : "SECONDS REMAINING"}</Text>

                {isSetRest && phase?.exercise && (
                    <View style={ro.nextCard}>
                        <Text style={ro.nextLabel}>CURRENT EXERCISE</Text>
                        <Text style={ro.nextName} numberOfLines={2} adjustsFontSizeToFit>{phase.exercise.name.toUpperCase()}</Text>
                        <View style={ro.setIndicator}>
                            <Text style={ro.setLabel}>SET {String(phase.set).padStart(2, '0')} / {String(phase.exercise.sets).padStart(2, '0')}</Text>
                            <View style={ro.setDots}>
                                {Array.from({ length: phase.exercise.sets }).map((_, i) => (
                                    <View key={i} style={[
                                        ro.dot,
                                        i < phase.set && ro.dotDone,
                                        i === phase.set - 1 && ro.dotActive,
                                    ]} />
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {phase?.nextExercise && (
                    <View style={ro.nextCard}>
                        <Text style={ro.nextLabel}>NEXT UP</Text>
                        <Text style={ro.nextName} numberOfLines={2} adjustsFontSizeToFit>{phase.nextExercise.name.toUpperCase()}</Text>
                        <View style={ro.setIndicator}>
                            <Text style={ro.setLabel}>UPCOMING: SET 01 / {String(phase.nextExercise.sets).padStart(2, '0')}</Text>
                            <View style={ro.setDots}>
                                {Array.from({ length: phase.nextExercise.sets }).map((_, i) => (
                                    <View key={i} style={[
                                        ro.dot,
                                        i === 0 && ro.dotActive,
                                    ]} />
                                ))}
                            </View>
                        </View>
                        {phase.nextExercise.image ? (
                            <View style={ro.nextImgBox}>
                                <Image source={phase.nextExercise.image} style={ro.nextImg} resizeMode="cover" />
                            </View>
                        ) : (
                            <View style={ro.nextTargetBox}>
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.02)", "transparent"]}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Ionicons name="barbell-outline" size={20} color={COLORS.textSub} style={{ marginBottom: 4 }} />
                                <Text style={ro.nextTargetText}>
                                    {(phase.nextExercise.primaryTarget || "TARGET").toUpperCase()} · {(phase.nextExercise.equipment || "EQUIPMENT").toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {settings?.restMindset && mindsetTip ? (
                <View style={ro.tipCard}>
                    <Text style={ro.tipText}>“{mindsetTip.toUpperCase().replace(/ 💪|🔥|✅|⚡️/g, "")}”</Text>
                </View>
            ) : null}
        </ScrollView>
    );
}

const ro = StyleSheet.create({
    container: {
        width: "100%", flex: 1, paddingHorizontal: SPACING.base,
        paddingTop: SPACING.lg,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 16,
    },
    mainContent: { width: "100%", alignItems: "center" },
    topRow: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", width: "100%", marginBottom: 32,
    },
    badge: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm,
        backgroundColor: COLORS.glassBg,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    badgeText: { fontSize: 10, fontFamily: FAMILY.semibold, color: COLORS.textSub, letterSpacing: 2 },
    skipBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
    },
    skipText: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1.5 },
    timer: {
        fontSize: 120, fontFamily: FAMILY.monoBold, color: COLORS.text,
        letterSpacing: -6, lineHeight: 120,
    },
    timerUnit: { fontSize: 10, color: COLORS.textMuted, fontFamily: FAMILY.mono, letterSpacing: 3, marginBottom: 32 },
    nextCard: {
        width: "100%", backgroundColor: COLORS.glassBg,
        borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder,
        padding: 24, alignItems: "center", marginBottom: 24,
    },
    nextLabel: { fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 2.5, marginBottom: 12 },
    nextName: { fontSize: 24, fontFamily: FAMILY.accent2, color: COLORS.text, textAlign: "center", marginBottom: 16, width: "100%" },
    nextImgBox: { width: "100%", height: 140, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.03)" },
    nextImg: { width: "100%", height: "100%", opacity: 0.5 },
    tipCard: {
        width: "100%", minHeight: 54, alignItems: "center", justifyContent: "center",
        paddingHorizontal: 20, paddingVertical: 14, marginTop: 12,
        backgroundColor: "rgba(255,255,255,0.02)", borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.glassBorder,
    },
    tipText: {
        fontSize: 12, lineHeight: 18, fontFamily: FAMILY.regular, color: COLORS.textSub, textAlign: "center", letterSpacing: 0.5,
    },
    nextTargetBox: {
        width: "100%", height: 140, borderRadius: RADIUS.md, overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.02)", alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: COLORS.glassBorder, padding: 16,
    },
    nextTargetText: {
        fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, letterSpacing: 1, textAlign: "center",
    },
    setIndicator: { marginTop: 8, marginBottom: 16, alignItems: "center" },
    setLabel: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub, letterSpacing: 2, marginBottom: 8 },
    setDots: { flexDirection: "row", gap: 6 },
    dot: { width: 20, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.05)" },
    dotActive: { backgroundColor: COLORS.primary, width: 28 },
    dotDone: { backgroundColor: "rgba(255,255,255,0.2)" },
});

/* ── MAIN SCREEN ──────────────────────────────────────────── */
export default function ActiveWorkoutScreen({ navigation, route }) {
    const rawDay = route.params?.day;
    const [activeDay, setActiveDay] = useState(rawDay || null);
    const activeDayRef = useRef(activeDay);
    useEffect(() => { activeDayRef.current = activeDay; }, [activeDay]);

    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
    const [settings, setSettings] = useState({
        soundEnabled: true, vibrationEnabled: true, extraRestSec: 0,
        setLoggingEnabled: true, keepScreenOn: true, weightUnit: "kg",
        showCalories: true, restMindset: true,
    });
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [history, setHistory] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const workoutStartRef = useRef(Date.now());
    const phaseStartTimeRef = useRef(Date.now());
    const restNotifIdRef = useRef(null);
    const appStateRef = useRef(AppState.currentState);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [phases, setPhases] = useState([]);
    const [isHydrated, setIsHydrated] = useState(false);
    const [prModal, setPRModal] = useState({ visible: false, exerciseName: "", exIdx: 0, setNum: 0, initialWeight: "", initialReps: "" });
    const [prToast, setPRToast] = useState({ visible: false, exerciseName: "", weightKg: 0, reps: 0 });
    const [newPRsFound, setNewPRsFound] = useState([]);
    const [loggedExercises, setLoggedExercises] = useState([]);
    const loggedExercisesRef = useRef([]);
    const prRecordsRef = useRef({});

    useEffect(() => {
        loggedExercisesRef.current = loggedExercises;
    }, [loggedExercises]);

    const phasesRef = useRef([]);
    const phaseIdxRef = useRef(0);
    const runningRef = useRef(false);
    const pausedRef = useRef(false);
    const newPRsFoundRef = useRef([]);

    useEffect(() => { phasesRef.current = phases; }, [phases]);
    useEffect(() => { phaseIdxRef.current = phaseIdx; }, [phaseIdx]);
    useEffect(() => { runningRef.current = running; }, [running]);
    useEffect(() => { pausedRef.current = paused; }, [paused]);
    useEffect(() => { newPRsFoundRef.current = newPRsFound; }, [newPRsFound]);
    const [mindsetTip] = useState(() => REST_MINDSET[Math.floor(Math.random() * REST_MINDSET.length)]);
    const [jumpModal, setJumpModal] = useState(false);
    const intervalRef = useRef(null);
    const elapsedRef = useRef(null);
    const phaseTimeRef = useRef(0);
    const hasAnnouncedRef = useRef(false);
    const hasStartedTimerRef = useRef(false);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const toastTimer = useRef(null);
    const setLoggingRef = useRef(true);
    const autoStartRef = useRef(true);   // mirrors settings.autoStartRest
    const settingsRef = useRef(settings);
    const completingRef = useRef(false);
    const isQuittingRef = useRef(false);

    // Intercept back navigation (hardware back, swipe gesture) to prevent data loss
    useEffect(() => {
        const unsubscribe = navigation.addListener("beforeRemove", (e) => {
            if (isQuittingRef.current || completingRef.current || e.data.action.type === "REPLACE") return;

            e.preventDefault();

            showDialog({
                title: "QUIT WORKOUT?",
                message: "Your current progress won't be recorded.",
                confirmText: "QUIT",
                cancelText: "KEEP GOING",
                isDestructive: true,
                onConfirm: async () => {
                    isQuittingRef.current = true;
                    clearInterval(intervalRef.current);
                    clearInterval(elapsedRef.current);
                    await clearActiveWorkoutSession();
                    if (restNotifIdRef.current) await cancelNotification(restNotifIdRef.current);
                    navigation.dispatch(e.data.action);
                }
            });
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        (async () => {
            const s = await getSettings();
            setSettings(s);
            settingsRef.current = s;
            setLoggingRef.current = s.setLoggingEnabled ?? true;
            autoStartRef.current = s.autoStartRest ?? true;
            setAudioSettings(s);

            try {
                const prs = await getPRRecords();
                prRecordsRef.current = prs;
            } catch (e) {
                console.warn("[ActiveWorkout] Failed to load PR records for targets", e);
            }

            try {
                const hist = await getWorkoutHistory();
                setHistory(hist);
            } catch (e) {
                console.warn("[ActiveWorkout] Failed to load workout history", e);
            }

            // Attempt to restore an active saved session if available
            const savedSession = await getActiveWorkoutSession();
            const targetDay = rawDay || savedSession?.day;

            if (!targetDay || !Array.isArray(targetDay.exercises)) {
                console.warn("[ActiveWorkout] Missing or invalid workout day object. Exiting safely.");
                await clearActiveWorkoutSession();
                navigation.navigate("Main");
                return;
            }
            setActiveDay(targetDay);

            const q = buildQueue(targetDay.exercises);
            const p = buildPhases(q, s.extraRestSec || 0);
            setPhases(p);
            let isRestored = false;

            if (savedSession && (savedSession.day?.day === targetDay.day || route.params?.resume)) {
                const now = Date.now();
                const calcElapsed = Math.floor((now - (savedSession.workoutStart || now)) / 1000);

                workoutStartRef.current = savedSession.workoutStart || now;
                phaseStartTimeRef.current = savedSession.phaseStartTime || now;
                setLoggedExercises(savedSession.loggedExercises || []);
                setNewPRsFound(savedSession.newPRsFound || []);
                setPhaseIdx(savedSession.phaseIdx || 0);
                setElapsedSec(calcElapsed > 0 ? calcElapsed : 0);

                const activePh = p[savedSession.phaseIdx || 0];
                const phDuration = activePh?.duration || 45;
                const timeInPhase = Math.floor((now - (savedSession.phaseStartTime || now)) / 1000);
                const remaining = Math.max(0, phDuration - timeInPhase);

                setTimeLeft(remaining);
                phaseTimeRef.current = remaining;

                if (savedSession.running && !savedSession.paused) {
                    setRunning(true);
                    setPaused(false);
                }
                isRestored = true;
            }

            if (!isRestored) {
                const initialLogged = q.map((ex) => ({
                    name: ex.name,
                    side: ex.side,
                    sets: ex.sets,
                    loggedSets: Array.from({ length: ex.sets }, (_, i) => ({
                        set: i + 1,
                        weightKg: 0,
                        reps: 0,
                        completed: false
                    }))
                }));
                setLoggedExercises(initialLogged);
                setTimeLeft(p[0]?.duration ?? 45);
                phaseTimeRef.current = p[0]?.duration ?? 45;
                workoutStartRef.current = Date.now();
                phaseStartTimeRef.current = Date.now();
            }

            if (s.keepScreenOn) {
                try { await activateKeepAwakeAsync(); } catch { }
            }
            setIsHydrated(true);
        })();

        return () => {
            clearInterval(intervalRef.current);
            clearInterval(elapsedRef.current);
            clearTimeout(toastTimer.current);
            if (restNotifIdRef.current) cancelNotification(restNotifIdRef.current);
            try { deactivateKeepAwake(); } catch { }
        };
    }, []);

    // AppState listener for background timer recalculation and rest notifications
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            try {
            const current = appStateRef.current;
            const next = typeof nextAppState === 'object' && nextAppState ? nextAppState.appState : nextAppState;

            if (current && typeof current === 'string' && next && typeof next === 'string') {
                if (current.match(/inactive|background/) && next === "active") {
                    if (restNotifIdRef.current) {
                        cancelNotification(restNotifIdRef.current);
                        restNotifIdRef.current = null;
                    }

                    const now = Date.now();
                    const realElapsed = Math.floor((now - workoutStartRef.current) / 1000);
                    setElapsedSec(realElapsed > 0 ? realElapsed : 0);

                    const currentPhases = phasesRef.current;
                    const currentPhaseIdx = phaseIdxRef.current;
                    const isRunning = runningRef.current;
                    const isPaused = pausedRef.current;

                    if (currentPhases && currentPhases.length > 0) {
                        const curPh = currentPhases[currentPhaseIdx];
                        if (curPh && isRunning && !isPaused) {
                            const elapsedInPhase = Math.floor((now - phaseStartTimeRef.current) / 1000);
                            const remaining = Math.max(0, curPh.duration - elapsedInPhase);
                            setTimeLeft(remaining);
                            phaseTimeRef.current = remaining;

                            if (remaining > 0) {
                                // Timer still has time left — resume the countdown
                                if (!(curPh.type === "active" && curPh.isReps)) {
                                    startInterval(remaining, currentPhases, currentPhaseIdx);
                                }
                                startElapsedTimer();
                            } else {
                                // Timer expired while in background — advance to next phase
                                startElapsedTimer();
                                advancePhase(currentPhases, currentPhaseIdx);
                                const nextIdx = currentPhaseIdx + 1;
                                const nextPh = currentPhases[nextIdx];
                                if (nextPh) {
                                    if (nextPh.type === "active" && nextPh.isReps) {
                                        setTimeLeft(nextPh.duration);
                                    } else {
                                        startInterval(nextPh.duration, currentPhases, nextIdx);
                                    }
                                }
                            }
                        }
                    }
                } else if (next.match(/inactive|background/)) {
                    const currentPhases = phasesRef.current;
                    const currentPhaseIdx = phaseIdxRef.current;
                    const isRunning = runningRef.current;
                    const isPaused = pausedRef.current;

                    if (currentPhases && currentPhases.length > 0) {
                        const curPh = currentPhases[currentPhaseIdx];
                        saveActiveWorkoutSession({
                            day: activeDayRef.current,
                            phaseIdx: currentPhaseIdx,
                            workoutStart: workoutStartRef.current,
                            phaseStartTime: phaseStartTimeRef.current,
                            phaseDuration: curPh?.duration || 45,
                            loggedExercises: loggedExercisesRef.current,
                            newPRsFound: newPRsFoundRef.current,
                            running: isRunning,
                            paused: isPaused,
                        });

                        if (curPh && curPh.type !== "active" && isRunning && !isPaused) {
                            const elapsedInPhase = Math.floor((Date.now() - phaseStartTimeRef.current) / 1000);
                            const rem = Math.max(0, curPh.duration - elapsedInPhase);
                            if (rem > 0) {
                                const nextExName = curPh.nextExercise ? curPh.nextExercise.name : curPh.exercise?.name;
                                scheduleRestNotification(
                                    rem,
                                    "REST OVER — TIME TO LIFT! 🔥",
                                    `Time for set ${curPh.set || 1} of ${nextExName || 'your exercise'}.`
                                ).then(id => {
                                    restNotifIdRef.current = id;
                                }).catch(e => {
                                    console.warn("[ActiveWorkout] Failed to schedule background rest notification:", e);
                                });
                            }
                        }
                    }
                }
            }
            appStateRef.current = next;
            } catch (e) {
                console.warn("[ActiveWorkout] AppState handler error (non-fatal):", e);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Auto-save active workout session state to AsyncStorage on any progression change
    useEffect(() => {
        if (phases.length > 0 && activeDayRef.current) {
            const curPh = phases[phaseIdx];
            saveActiveWorkoutSession({
                day: activeDayRef.current,
                phaseIdx,
                workoutStart: workoutStartRef.current,
                phaseStartTime: phaseStartTimeRef.current,
                phaseDuration: curPh?.duration || 45,
                loggedExercises,
                newPRsFound,
                running,
                paused,
            });
        }
    }, [phaseIdx, loggedExercises, newPRsFound, running, paused, activeDay]);

    const currentPhase = phases[phaseIdx];
    const isWork = currentPhase?.type === "active";
    const isRest = !isWork;
    const phaseDuration = currentPhase?.duration ?? 1;
    const progress = timeLeft / phaseDuration;
    const ex = currentPhase?.exercise;

    const recentLogs = useMemo(() => {
        if (!ex || !history || history.length === 0) return null;
        for (const entry of history) {
            if (!entry.exercises) continue;
            const foundEx = entry.exercises.find(
                e => e.name.toLowerCase() === ex.name.toLowerCase()
            );
            if (foundEx && foundEx.loggedSets && foundEx.loggedSets.some(s => s.completed && (s.weightKg > 0 || s.reps > 0))) {
                const dateObj = new Date(entry.date + "T00:00:00");
                const dateStr = dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" }).toUpperCase();
                return {
                    date: dateStr,
                    loggedSets: foundEx.loggedSets.filter(s => s.completed && (s.weightKg > 0 || s.reps > 0))
                };
            }
        }
        return null;
    }, [ex, history]);

    // Workout progress stats
    const totalActivePhases = phases.filter(p => p.type === "active").length;
    const completedActivePhases = phases.slice(0, phaseIdx).filter(p => p.type === "active").length;
    const pct = Math.round((phaseIdx / Math.max(phases.length, 1)) * 100);
    const calories = settings.showCalories ? liveCalories(elapsedSec) : 0;

    const vibrate = useCallback(async (style) => {
        if (!settingsRef.current.vibrationEnabled || appStateRef.current !== "active") return;
        try { await Haptics.impactAsync(style || Haptics.ImpactFeedbackStyle.Medium); } catch { }
    }, []);

    const hapticNotify = useCallback(async () => {
        if (!settingsRef.current.vibrationEnabled || appStateRef.current !== "active") return;
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
    }, []);

    const showPRToast = useCallback((exerciseName, weightKg, reps) => {
        setPRToast({ visible: true, exerciseName, weightKg, reps });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
            setPRToast(t => ({ ...t, visible: false }));
        }, 3500);
    }, []);

    const fadeTransition = useCallback(() => {
        hasAnnouncedRef.current = false;
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: false }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        ]).start();
    }, []);

    const advancePhase = useCallback((phasesArr, currentIdx) => {
        const next = currentIdx + 1;
        if (next >= phasesArr.length) {
            completeWorkout();
            return;
        }
        fadeTransition();
        const nextPhase = phasesArr[next];
        phaseStartTimeRef.current = Date.now();
        if (nextPhase.type === "active") {
            if (nextPhase.exercise.side) announceSide(nextPhase.exercise.side);
            else announceWorkStart();
        } else {
            announceSetDone();
            const completedPhase = phasesArr[currentIdx];
            if (completedPhase?.type === "active" && setLoggingRef.current) {
                setTimeout(() => {
                    const exLog = loggedExercisesRef.current[completedPhase.exIdx];
                    let initW = "";
                    let initR = "";
                    
                    if (exLog && completedPhase.set > 1) {
                        const prevSet = exLog.loggedSets.find(s => s.set === completedPhase.set - 1);
                        if (prevSet && prevSet.completed) {
                            initW = prevSet.weightKg;
                            initR = prevSet.reps;
                        }
                    } else if (completedPhase.set === 1 && prRecordsRef.current) {
                        const exPR = prRecordsRef.current[completedPhase.exercise.name];
                        if (exPR) {
                            initW = exPR.weightKg;
                            initR = exPR.reps;
                        }
                    }
                    
                    if (!initW && !initR) {
                        const repRange = completedPhase.repRange;
                        if (repRange) {
                            const match = repRange.match(/^(\d+)/);
                            if (match) initR = match[1];
                        }
                    }
                    
                    setPRModal({
                        visible: true,
                        exerciseName: completedPhase.exercise.name,
                        exIdx: completedPhase.exIdx,
                        setNum: completedPhase.set,
                        initialWeight: initW,
                        initialReps: initR
                    });
                }, 600);
            }
        }
        setPhaseIdx(next);
        setTimeLeft(nextPhase.duration);
        phaseTimeRef.current = nextPhase.duration;
        if (nextPhase.type !== "active" && autoStartRef.current) {
            setRunning(true);
            setPaused(false);
        }
    }, []);

    const startElapsedTimer = useCallback(() => {
        clearInterval(elapsedRef.current);
        elapsedRef.current = setInterval(() => {
            const realElapsed = Math.floor((Date.now() - workoutStartRef.current) / 1000);
            setElapsedSec(realElapsed > 0 ? realElapsed : 0);
        }, 1000);
    }, []);

    const startInterval = useCallback((initTime, phasesArr, curIdx) => {
        clearInterval(intervalRef.current);
        // Guard: never start a countdown with zero or negative time
        if (!initTime || initTime <= 0) return;
        const duration = phasesArr[curIdx]?.duration || initTime;
        phaseStartTimeRef.current = Date.now() - (duration - initTime) * 1000;
        let t = initTime;
        intervalRef.current = setInterval(() => {
            t -= 1;
            if (t < 0) t = 0;
            setTimeLeft(t);
            if (t <= 3 && t > 0 && !hasAnnouncedRef.current) {
                announceFinalCountdown(t);
                vibrate(Haptics.ImpactFeedbackStyle.Heavy);
            }
            const ph = phasesArr[curIdx];
            if (ph?.type !== "active") {
                if (t === 30 || t === 15 || t === 10) vibrate(Haptics.ImpactFeedbackStyle.Light);
                if (t === 5) vibrate(Haptics.ImpactFeedbackStyle.Heavy);
            }

            if (t <= 0) {
                clearInterval(intervalRef.current);
                hapticNotify();
                setTimeout(() => vibrate(Haptics.ImpactFeedbackStyle.Heavy), 150);
                setTimeout(() => vibrate(Haptics.ImpactFeedbackStyle.Heavy), 300);
                hasAnnouncedRef.current = true;
                advancePhase(phasesArr, curIdx);
                const nextPh = phasesArr[curIdx + 1];
                if (nextPh) {
                    if (nextPh.type === "active" && nextPh.isReps) {
                        setRunning(true);
                        setPaused(false);
                        setTimeLeft(nextPh.duration);
                    } else {
                        startInterval(nextPh.duration, phasesArr, curIdx + 1);
                    }
                }
            }
        }, 1000);
    }, [advancePhase, vibrate, hapticNotify]);

    // Resume/start timer intervals once session rehydration is fully completed on mount
    useEffect(() => {
        if (isHydrated && !hasStartedTimerRef.current) {
            if (running && !paused && appStateRef.current === "active") {
                const currentPhase = phases[phaseIdx];
                if (currentPhase && !(currentPhase.type === "active" && currentPhase.isReps)) {
                    startInterval(timeLeft, phases, phaseIdx);
                }
                startElapsedTimer();
                hasStartedTimerRef.current = true;
            }
        }
    }, [isHydrated, running, paused, phases, phaseIdx, timeLeft, startInterval, startElapsedTimer]);

    const handlePlayPause = () => {
        if (!running) {
            setRunning(true); setPaused(false);
            if (currentPhase?.type === "active") announceWorkStart();

            if (!(currentPhase?.type === "active" && currentPhase?.isReps)) {
                startInterval(timeLeft, phases, phaseIdx);
            }
            startElapsedTimer();
        } else if (!paused) {
            setPaused(true);
            clearInterval(intervalRef.current);
            clearInterval(elapsedRef.current);
        } else {
            setPaused(false);
            if (!(currentPhase?.type === "active" && currentPhase?.isReps)) {
                startInterval(timeLeft, phases, phaseIdx);
            }
            startElapsedTimer();
        }
    };

    const handleSkip = () => {
        clearInterval(intervalRef.current);
        vibrate(Haptics.ImpactFeedbackStyle.Light);
        advancePhase(phases, phaseIdx);
        if (running && !paused && phaseIdx + 1 < phases.length) {
            startInterval(phases[phaseIdx + 1].duration, phases, phaseIdx + 1);
        }
    };

    const handlePrev = () => {
        if (phaseIdx <= 0) return;
        clearInterval(intervalRef.current);
        const prev = phaseIdx - 1;
        fadeTransition();
        setPhaseIdx(prev);
        setTimeLeft(phases[prev].duration);
        phaseTimeRef.current = phases[prev].duration;
        phaseStartTimeRef.current = Date.now();
        if (running && !paused) startInterval(phases[prev].duration, phases, prev);
    };

    const handleQuit = () => {
        showDialog({
            title: "QUIT WORKOUT?",
            message: "Your current progress won't be recorded.",
            confirmText: "QUIT",
            cancelText: "KEEP GOING",
            isDestructive: true,
            onConfirm: async () => {
                isQuittingRef.current = true;
                clearInterval(intervalRef.current);
                clearInterval(elapsedRef.current);
                await clearActiveWorkoutSession();
                if (restNotifIdRef.current) await cancelNotification(restNotifIdRef.current);
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate("Main");
                }
            }
        });
    };

    const completeWorkout = async () => {
        if (completingRef.current) return;
        completingRef.current = true;
        clearInterval(intervalRef.current);
        clearInterval(elapsedRef.current);
        await clearActiveWorkoutSession();
        if (restNotifIdRef.current) await cancelNotification(restNotifIdRef.current);
        announceWorkoutDone();
        const dur = Math.max(1, Math.floor((Date.now() - workoutStartRef.current) / 1000));
        try {
            const currDay = activeDayRef.current || {};
            const result = await saveWorkoutComplete(currDay.day || 1, currDay.target || "Workout", dur, loggedExercisesRef.current);
            syncAndroidWidget().catch(() => {});
            navigation.replace("WorkoutComplete", {
                day: { ...currDay, exercises: loggedExercisesRef.current },
                durationSec: dur,
                streak: result?.streak || 0, total: result?.total || 0,
                newPRs: newPRsFound,
                caloriesBurned: liveCalories(dur),
                showCalories: settings.showCalories,
                xpGained: result?.xpGained || 0,
                totalXP: result?.totalXP || 0,
            });
        } catch (_) {
            completingRef.current = false;
            showDialog({
                title: "SAVE FAILED",
                message: "We couldn't finish saving this workout. Please try again.",
                confirmText: "CLOSE",
                singleButton: true
            });
        }
    };

    const jumpToExercise = (idx) => {
        clearInterval(intervalRef.current);
        fadeTransition();
        setPhaseIdx(idx);
        setTimeLeft(phases[idx].duration);
        phaseTimeRef.current = phases[idx].duration;
        setJumpModal(false);
        if (running && !paused) {
            if (!(phases[idx].type === "active" && phases[idx].isReps)) {
                startInterval(phases[idx].duration, phases, idx);
            }
        }
    };

    const handlePRSave = async (weightKg, reps) => {
        const { exerciseName, exIdx, setNum } = prModal;
        setPRModal(prev => ({ ...prev, visible: false }));
        if (!exerciseName) return;

        setLoggedExercises(prev => {
            const next = [...prev];
            if (next[exIdx]) {
                const updatedSets = next[exIdx].loggedSets.map(s => {
                    if (s.set === setNum) {
                        return { ...s, weightKg, reps, completed: true };
                    }
                    return s;
                });
                next[exIdx] = { ...next[exIdx], loggedSets: updatedSets };
            }
            return next;
        });

        if (weightKg > 0 || reps > 0) {
            const result = await tryUpdatePR(exerciseName, weightKg, reps);
            if (result.isNewPR) {
                hapticNotify();
                setNewPRsFound(prev => [...prev, { name: exerciseName, weightKg, reps }]);
                showPRToast(exerciseName, weightKg, reps);
                if (prRecordsRef.current) {
                    prRecordsRef.current[exerciseName] = { weightKg, reps };
                }
            }
        }
    };

    const handlePRSkip = () => {
        const { exIdx, setNum } = prModal;
        setPRModal(prev => ({ ...prev, visible: false }));

        setLoggedExercises(prev => {
            const next = [...prev];
            if (next[exIdx]) {
                const updatedSets = next[exIdx].loggedSets.map(s => {
                    if (s.set === setNum) {
                        return { ...s, weightKg: 0, reps: 0, completed: true };
                    }
                    return s;
                });
                next[exIdx] = { ...next[exIdx], loggedSets: updatedSets };
            }
            return next;
        });
    };

    if (!currentPhase || phases.length === 0) {
        return (
            <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: COLORS.textSub }}>Loading…</Text>
            </View>
        );
    }

    const activeSetPhases = phases.filter(p => p.type === "active" && p.exIdx === currentPhase.exIdx);
    const currentSetPos = currentPhase.type === "active" ? currentPhase.set - 1 : -1;

    const formatTime = (s) => {
        if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        return String(s);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* PR Toast */}
            <PRToast
                visible={prToast.visible}
                exerciseName={prToast.exerciseName}
                weightKg={prToast.weightKg}
                reps={prToast.reps}
                weightUnit={settings.weightUnit}
            />

            {/* PR Log Modal */}
            <PRModal
                visible={prModal.visible}
                exerciseName={prModal.exerciseName}
                onClose={handlePRSkip}
                onSave={handlePRSave}
                weightUnit={settings.weightUnit}
                initialWeight={prModal.initialWeight}
                initialReps={prModal.initialReps}
            />

            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.quitBtn} onPress={handleQuit} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.topCenter}>
                    <Text style={styles.topTitle}>{activeDay?.target || "Workout"}</Text>
                    <Text style={styles.topSub}>{pct}% Complete</Text>
                </View>
                {/* Calorie counter */}
                {settings.showCalories ? (
                    <View style={styles.calBadge}>
                        <Text style={styles.calValue}>{calories}</Text>
                        <Text style={styles.calUnit}>kcal</Text>
                    </View>
                ) : (
                    <View style={{ width: 52 }} />
                )}
                <TouchableOpacity
                    style={[styles.jumpBtn, { marginLeft: 12 }]}
                    onPress={() => setJumpModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="list" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Segmented progress bar */}
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {
                    width: `${pct}%`,
                    backgroundColor: isWork ? COLORS.primary : COLORS.text,
                }]} />
            </View>

            {/* REST phase */}
            {isRest ? (
                <Animated.View style={[styles.restContainer, { opacity: fadeAnim }]}>
                    <View style={styles.restContent}>
                        <RestOverlay
                            phase={currentPhase}
                            timeLeft={timeLeft}
                            onSkip={handleSkip}
                            settings={settings}
                            mindsetTip={mindsetTip}
                        />
                    </View>
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={[styles.ctrlSec, phaseIdx === 0 && styles.ctrlSecDisabled]}
                            onPress={handlePrev} disabled={phaseIdx === 0} activeOpacity={0.7}>
                            <Ionicons name="play-skip-back" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ctrlMain} onPress={handlePlayPause} activeOpacity={0.85}>
                            <View style={[styles.ctrlMainInner, { backgroundColor: COLORS.primary }]}>
                                <Ionicons
                                    name={!running ? "play" : paused ? "play" : "pause"}
                                    size={28} color="#EDEAE3"
                                />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ctrlSec} onPress={handleSkip} activeOpacity={0.7}>
                            <Ionicons name="play-skip-forward" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            ) : (
                /* WORK phase */
                <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={styles.scroll}>
                    <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>

                        {/* Phase tag */}
                        <View style={styles.phaseTag}>
                            <View style={styles.phaseTagDot} />
                            <Text style={styles.phaseTagText}>WORKING SET</Text>
                        </View>

                        {/* Exercise name */}
                        <Text style={styles.exName}>{ex.name}</Text>
                        {ex.side && <Text style={styles.sideLabel}>{ex.side} Side</Text>}

                        {/* Set indicator */}
                        {currentPhase.type === "active" && (
                            <View style={styles.setIndicator}>
                                <Text style={styles.setLabel}>Set {String(currentPhase.set).padStart(2, '0')} of {String(ex.sets).padStart(2, '0')}</Text>
                                <View style={styles.setDots}>
                                    {activeSetPhases.map((_, i) => (
                                        <View key={i} style={[
                                            styles.dot,
                                            i < currentSetPos && styles.dotDone,
                                            i === currentSetPos && styles.dotActive,
                                        ]} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Ring Timer / Rep Indicator */}
                        <View style={styles.timerWrap}>
                            <RingTimer
                                progress={currentPhase.isReps ? (running && !paused ? 1 : 0) : progress}
                                isWork={isWork} size={RING} stroke={STROKE}
                                timeLeft={timeLeft}
                                isRunning={running && !paused}
                            />
                            <View style={styles.timerInner}>
                                {currentPhase.isReps ? (
                                    <>
                                        <Text style={[styles.timerNum, { color: COLORS.text }]}>{currentPhase.repRange}</Text>
                                        <Text style={styles.timerUnit}>TARGET REPS</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={[styles.timerNum, { color: timeLeft <= 5 ? COLORS.primary : COLORS.text }]}>
                                            {formatTime(timeLeft)}
                                        </Text>
                                        <Text style={styles.timerUnit}>SECONDS</Text>
                                    </>
                                )}
                            </View>
                        </View>

                        {/* Reference Image during work */}
                        {ex.image ? (
                            <View style={styles.workImgBox}>
                                <Image source={ex.image} style={styles.workImg} resizeMode="contain" />
                            </View>
                        ) : (
                            <View style={styles.workInfoPanel}>
                                <Text style={styles.infoPanelTitle}>{ex.primaryTarget || "Target Muscle"}</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ width: "100%" }}
                                    contentContainerStyle={styles.infoPanelBadgeRow}
                                >
                                    <View style={styles.infoPanelBadge}>
                                        <Ionicons name="barbell-outline" size={12} color={COLORS.textSub} />
                                        <Text style={styles.infoPanelBadgeText}>{ex.equipment || "Equipment"}</Text>
                                    </View>
                                    {ex.tag && (
                                        <View style={[styles.infoPanelBadge, { borderColor: COLORS.border, backgroundColor: "transparent" }]}>
                                            <Ionicons name="bookmark-outline" size={12} color={COLORS.textSub} />
                                            <Text style={[styles.infoPanelBadgeText, { color: COLORS.textSub }]}>{ex.tag}</Text>
                                        </View>
                                    )}
                                    {getSuggestedWeight(ex.name) ? (
                                        <View style={[styles.infoPanelBadge, { borderColor: COLORS.border, backgroundColor: COLORS.bg }]}>
                                            <Ionicons name="trending-up-outline" size={12} color={COLORS.textSub} />
                                            <Text style={[styles.infoPanelBadgeText, { color: COLORS.text }]}>Suggested: {getSuggestedWeight(ex.name)}</Text>
                                        </View>
                                    ) : null}
                                </ScrollView>
                            </View>
                        )}

                        {/* Controls */}
                        <View style={styles.controls}>
                            <TouchableOpacity
                                style={[styles.ctrlSec, phaseIdx === 0 && styles.ctrlSecDisabled]}
                                onPress={handlePrev} disabled={phaseIdx === 0} activeOpacity={0.7}>
                                <Ionicons name="play-skip-back" size={20} color={COLORS.text} />
                            </TouchableOpacity>

                            {currentPhase.isReps && running && !paused ? (
                                <TouchableOpacity style={styles.ctrlMainWide} onPress={handleSkip} activeOpacity={0.85}>
                                    <View style={styles.ctrlMainWideInner}>
                                        <Text style={styles.ctrlMainWideText}>Set Complete</Text>
                                        <Ionicons name="checkmark-circle" size={18} color="#EDEAE3" />
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.ctrlMain} onPress={handlePlayPause} activeOpacity={0.85}>
                                    <View style={[styles.ctrlMainInner, { backgroundColor: COLORS.primary }]}>
                                        <Ionicons
                                            name={!running ? "play" : paused ? "play" : "pause"}
                                            size={28} color="#EDEAE3"
                                        />
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.ctrlSec} onPress={handleSkip} activeOpacity={0.7}>
                                <Ionicons name="play-skip-forward" size={20} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Recent Workout Logs */}
                        {recentLogs ? (
                            <View style={styles.recentLogsCard}>
                                <View style={styles.recentLogsHeader}>
                                    <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                                    <Text style={styles.recentLogsLabel}>Recent Logs ({recentLogs.date})</Text>
                                </View>
                                <View style={styles.recentLogsSets}>
                                    {recentLogs.loggedSets.map((s, i) => (
                                        <View key={i} style={styles.recentSetRow}>
                                            <View style={styles.recentSetBadge}>
                                                <Text style={styles.recentSetBadgeText}>S{s.set}</Text>
                                            </View>
                                            <Text style={styles.recentSetText}>
                                                {s.weightKg > 0 ? displayWeight(s.weightKg, settings.weightUnit) : "—"} × {s.reps} reps
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {/* Log PR button */}
                        {settings.setLoggingEnabled && (
                            <TouchableOpacity
                                style={styles.logPRBtn}
                                onPress={() => setPRModal({ visible: true, exerciseName: ex.name })}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="clipboard-outline" size={16} color={COLORS.text} />
                                <Text style={styles.logPRText}>Log Performance</Text>
                            </TouchableOpacity>
                        )}

                        {/* Form Protocol */}
                        {isWork && ex.tips?.length > 0 && (
                            <View style={styles.formCard}>
                                <View style={styles.formLabelRow}>
                                    <Ionicons name="shield-checkmark" size={14} color={COLORS.textSub} />
                                    <Text style={styles.formLabel}>Technique Tips</Text>
                                </View>
                                {ex.tips.map((tip, i) => (
                                    <View key={i} style={styles.tipRow}>
                                        <View style={styles.tipDot} />
                                        <Text style={styles.tipText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                    </Animated.View>
                </ScrollView>
            )}

            {/* Jump Modal */}
            <Modal visible={jumpModal} transparent animationType="fade" onRequestClose={() => setJumpModal(false)}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setJumpModal(false)}>
                    <View style={styles.jumpModal}>
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
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
                            pointerEvents="none"
                        />

                        <View style={styles.jumpHeader}>
                            <Text style={styles.jumpTitle}>WORKOUT NAVIGATOR</Text>
                            <TouchableOpacity onPress={() => setJumpModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={22} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {(activeDay?.exercises || []).map((ex, i) => {
                                const isCurrent = currentPhase.exIdx === i;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.jumpItem, isCurrent && styles.jumpItemActive]}
                                        onPress={() => {
                                            const firstPhase = phases.findIndex(p => p.exIdx === i);
                                            if (firstPhase !== -1) jumpToExercise(firstPhase);
                                        }}
                                    >
                                        <View style={styles.jumpIndex}>
                                            <Text style={styles.jumpIndexText}>{i + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.jumpName, isCurrent && { color: COLORS.primary }]}>{ex.name.toUpperCase()}</Text>
                                            <Text style={styles.jumpMeta}>{ex.sets} SETS · {ex.type === 'reps' ? ex.repRange + ' REPS' : ex.activeTimeSec + ' SEC'}</Text>
                                        </View>
                                        {isCurrent && <Ionicons name="play" size={16} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

/* ── Styles ───────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingBottom: 100 },

    topBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 12,
    },
    topCenter: { alignItems: "center", flex: 1 },
    topTitle: { fontSize: 15, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.2 },
    topSub: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub, marginTop: 2 },
    quitBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: COLORS.border,
    },
    calBadge: {
        backgroundColor: COLORS.bgCard,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm,
        alignItems: "center", flexDirection: "row", gap: 4,
        borderWidth: 1, borderColor: COLORS.border,
    },
    calValue: { fontSize: 12, color: COLORS.text, fontFamily: FAMILY.monoBold },
    calUnit: { fontSize: 10, color: COLORS.textSub, fontFamily: FAMILY.regular },

    progressTrack: { height: 3, backgroundColor: "rgba(237, 234, 227, 0.08)", width: "100%" },
    progressFill: { height: "100%", backgroundColor: COLORS.text },

    restContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: "space-between", paddingBottom: 28 },
    restContent: { flex: 1, width: "100%" },

    phaseTag: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: COLORS.primary, backgroundColor: "rgba(122, 46, 34, 0.12)",
        marginTop: 32,
    },
    phaseTagDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
    phaseTagText: { fontSize: 9, fontFamily: FAMILY.semibold, letterSpacing: 1.5, color: COLORS.text },

    exName: {
        fontSize: 30, fontFamily: FAMILY.accent2, color: COLORS.text,
        textAlign: "center", marginTop: 16, paddingHorizontal: 32,
        lineHeight: 34, letterSpacing: -0.5, width: "100%"
    },
    sideLabel: {
        fontSize: 12, fontFamily: FAMILY.semibold, color: COLORS.primary,
        marginTop: 8,
    },

    setIndicator: { marginTop: 32, alignItems: "center" },
    setLabel: { fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.textSub, marginBottom: 12 },
    setDots: { flexDirection: "row", gap: 6 },
    dot: { width: 22, height: 3, borderRadius: 1.5, backgroundColor: "rgba(237, 234, 227, 0.1)" },
    dotActive: { backgroundColor: COLORS.primary, width: 28 },
    dotDone: { backgroundColor: "rgba(237, 234, 227, 0.3)" },

    timerWrap: {
        marginTop: 48, width: RING, height: RING,
        alignItems: "center", justifyContent: "center",
    },
    timerInner: { position: "absolute", alignItems: "center" },
    timerNum: { fontSize: 60, fontFamily: FAMILY.monoBold, letterSpacing: -1 },
    timerUnit: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textSub, letterSpacing: 2, marginTop: -2 },

    controls: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 28, marginTop: 16, paddingBottom: 8,
    },
    ctrlMain: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: "center", justifyContent: "center",
    },
    ctrlMainInner: {
        width: 68, height: 68, borderRadius: 34,
        alignItems: "center", justifyContent: "center",
    },
    ctrlMainWide: {
        flex: 1, height: 64, marginHorizontal: 16,
    },
    ctrlMainWideInner: {
        flex: 1, borderRadius: RADIUS.md, flexDirection: "row",
        alignItems: "center", justifyContent: "center", gap: 10,
        backgroundColor: COLORS.primary,
    },
    ctrlMainWideText: {
        fontSize: 14, fontFamily: FAMILY.semibold, color: COLORS.text, letterSpacing: 0.5,
    },
    ctrlSec: {
        width: 44, height: 44, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center",
    },
    ctrlSecDisabled: { opacity: 0.2 },

    logPRBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingVertical: 12, paddingHorizontal: 20, borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: COLORS.border,
        marginTop: 36,
    },
    logPRText: { fontSize: 12, color: COLORS.text, fontFamily: FAMILY.semibold },

    formCard: {
        backgroundColor: COLORS.bgCard, marginTop: 32, marginHorizontal: 20,
        marginBottom: 20, borderRadius: RADIUS.md, padding: 20,
        borderWidth: 1, borderColor: COLORS.border,
        width: width - 40,
    },
    formLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    formLabel: { fontSize: 12, fontFamily: FAMILY.semibold, color: COLORS.text },
    tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textSub, marginTop: 8 },
    tipText: { fontSize: 13, color: COLORS.textSub, flex: 1, lineHeight: 20, fontFamily: FAMILY.regular },
    workImgBox: {
        width: width - 64, height: 180, borderRadius: RADIUS.lg,
        backgroundColor: COLORS.bgCard,
        marginTop: 28, overflow: "hidden",
        borderWidth: 1, borderColor: COLORS.border,
    },
    workImg: { width: "100%", height: "100%" },
    workInfoPanel: {
        width: width - 64, height: 160, borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgCard,
        marginTop: 28, overflow: "hidden",
        borderWidth: 1, borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center", padding: 18,
    },
    infoPanelLabel: {
        fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 6,
    },
    infoPanelTitle: {
        fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, textAlign: "center", marginBottom: 14, letterSpacing: -0.3, lineHeight: 22,
    },
    infoPanelBadgeRow: {
        flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center",
        flexGrow: 1, paddingHorizontal: 12,
    },
    infoPanelBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    infoPanelBadgeText: {
        fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textSub,
    },
    jumpBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: COLORS.border,
    },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
    jumpModal: {
        width: "100%", maxWidth: 380, maxHeight: "70%", backgroundColor: "rgba(22, 22, 26, 0.95)",
        borderRadius: 28, padding: 24, borderWidth: 1.2, borderColor: "rgba(255, 255, 255, 0.16)",
        overflow: "hidden",
    },
    jumpHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    jumpTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1 },
    jumpItem: {
        flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)", gap: 14, borderRadius: 14,
    },
    jumpItemActive: { backgroundColor: "rgba(227, 30, 36, 0.12)", borderRadius: 14 },
    jumpIndex: { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    jumpIndexText: { fontSize: 11, fontFamily: FAMILY.monoBold, color: COLORS.textSub },
    jumpName: { fontSize: 14, fontFamily: FAMILY.semibold, color: COLORS.text },
    jumpMeta: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 2 },
    recentLogsCard: {
        backgroundColor: COLORS.bgCard, marginTop: 28, marginHorizontal: 20,
        borderRadius: RADIUS.md, padding: 20,
        borderWidth: 1, borderColor: COLORS.border,
        width: width - 40,
    },
    recentLogsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    recentLogsLabel: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub },
    recentLogsSets: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    recentSetRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    },
    recentSetBadge: {
        backgroundColor: "rgba(237, 234, 227, 0.06)", paddingHorizontal: 5, paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    recentSetBadgeText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text },
    recentSetText: { fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.text },
});
