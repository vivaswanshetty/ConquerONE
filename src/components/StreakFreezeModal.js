import React, { useState, useEffect, useRef } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, RADIUS } from "../utils/theme";

const { width } = Dimensions.get("window");

const REASON_PRESETS = [
    {
        id: "rest",
        label: "Rest & Recovery",
        icon: "battery-charging-outline",
        tag: "🔋 Hypertrophy",
        desc: "Tissue repair, nervous system reset & fatigue dissipation.",
    },
    {
        id: "sick",
        label: "Sick / Unwell",
        icon: "medkit-outline",
        tag: "🤒 Immune Health",
        desc: "Prioritizing immune recovery so you can return at full power.",
    },
    {
        id: "injury",
        label: "Injury / Rehab",
        icon: "bandage-outline",
        tag: "🩹 Longevity",
        desc: "Smart athletes rest to protect joints, tendons & muscles.",
    },
    {
        id: "busy",
        label: "Work / Long Hours",
        icon: "briefcase-outline",
        tag: "💼 High Demand",
        desc: "Work deadline or busy hours. Protecting your momentum.",
    },
    {
        id: "travel",
        label: "Travel & Transit",
        icon: "airplane-outline",
        tag: "✈️ Travel",
        desc: "On the move without gym access. Resume tomorrow.",
    },
    {
        id: "personal",
        label: "Personal / Family",
        icon: "heart-outline",
        tag: "🏠 Life First",
        desc: "Life events come first. Your hard-earned streak is safe.",
    },
    {
        id: "other",
        label: "Other Reason",
        icon: "create-outline",
        tag: "✍️ Custom",
        desc: "Specify your custom reason below.",
    },
];

export default function StreakFreezeModal({
    visible,
    onClose,
    onConfirm,
    currentStreak = 0,
}) {
    const [selectedReason, setSelectedReason] = useState(REASON_PRESETS[0].label);
    const [customNote, setCustomNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        if (visible) {
            setSelectedReason(REASON_PRESETS[0].label);
            setCustomNote("");
            setIsSubmitting(false);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 65,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.92);
        }
    }, [visible]);

    const activePreset = REASON_PRESETS.find(p => p.label === selectedReason) || REASON_PRESETS[0];

    const handleSelectPreset = (preset) => {
        Haptics.selectionAsync();
        setSelectedReason(preset.label);
    };

    const handleConfirm = async () => {
        if (isSubmitting) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        const finalReason = selectedReason === "Other Reason" && customNote.trim()
            ? customNote.trim()
            : selectedReason;
        const finalNote = selectedReason === "Other Reason" ? "" : customNote.trim();
        await onConfirm({ reason: finalReason, note: finalNote });
        setIsSubmitting(false);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.overlay}
            >
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={onClose}
                        activeOpacity={1}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.cardContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Glowing ice accent border gradient */}
                    <LinearGradient
                        colors={["rgba(96, 165, 250, 0.25)", "rgba(48, 176, 199, 0.08)", "rgba(255, 255, 255, 0.02)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header icon badge */}
                        <View style={styles.headerIconRow}>
                            <View style={styles.iconCircle}>
                                <LinearGradient
                                    colors={["#30B0C7", "#1E40AF"]}
                                    style={StyleSheet.absoluteFillObject}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <Ionicons name="snow" size={24} color="#FFFFFF" />
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                                <Ionicons name="close" size={20} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Title and streak banner */}
                        <Text style={styles.title}>ACTIVATE STREAK SHIELD</Text>
                        <Text style={styles.subtitle}>
                            Protect your momentum. Your streak remains intact and today is registered as an excused recovery day.
                        </Text>

                        {currentStreak > 0 && (
                            <View style={styles.streakBadgeRow}>
                                <View style={styles.streakBadge}>
                                    <Ionicons name="flame" size={13} color="#F97316" />
                                    <Text style={styles.streakBadgeText}>
                                        {currentStreak}-DAY STREAK WILL BE PRESERVED
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Reason Selector Section */}
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>SELECT REASON</Text>
                            <Text style={styles.sectionSubtitle}>Tap a category</Text>
                        </View>

                        <View style={styles.presetsGrid}>
                            {REASON_PRESETS.map((preset) => {
                                const isSelected = selectedReason === preset.label;
                                return (
                                    <TouchableOpacity
                                        key={preset.id}
                                        style={[
                                            styles.presetChip,
                                            isSelected && styles.presetChipActive,
                                        ]}
                                        onPress={() => handleSelectPreset(preset)}
                                        activeOpacity={0.75}
                                    >
                                        <Ionicons
                                            name={preset.icon}
                                            size={14}
                                            color={isSelected ? "#60A5FA" : COLORS.textMuted}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text
                                            style={[
                                                styles.presetChipText,
                                                isSelected && styles.presetChipTextActive,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {preset.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Active reason explainer card */}
                        <View style={styles.explainerCard}>
                            <View style={styles.explainerTagRow}>
                                <Text style={styles.explainerTag}>{activePreset.tag}</Text>
                            </View>
                            <Text style={styles.explainerText}>{activePreset.desc}</Text>
                        </View>

                        {/* Optional note input */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>
                                {selectedReason === "Other Reason" ? "SPECIFY YOUR REASON" : "ADDITIONAL NOTE (OPTIONAL)"}
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder={
                                    selectedReason === "Other Reason"
                                        ? "e.g., Heavy physical labor today..."
                                        : "e.g., Feeling sore, will double up tomorrow..."
                                }
                                placeholderTextColor={COLORS.textMuted}
                                value={customNote}
                                onChangeText={setCustomNote}
                                maxLength={100}
                                returnKeyType="done"
                            />
                        </View>

                        {/* Action buttons */}
                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                isSubmitting && { opacity: 0.6 }
                            ]}
                            onPress={handleConfirm}
                            disabled={isSubmitting}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#30B0C7", "#2563EB"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <Ionicons name="snow" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.confirmBtnText}>
                                {isSubmitting ? "ACTIVATING SHIELD..." : "PROTECT STREAK TODAY"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.cancelBtnText}>CANCEL & CONTINUE TRAINING</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
    },
    cardContainer: {
        width: Math.min(width - 32, 440),
        maxHeight: "88%",
        backgroundColor: "#0D0E12",
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: "rgba(96, 165, 250, 0.28)",
        overflow: "hidden",
        shadowColor: "#60A5FA",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
    scrollContent: {
        padding: 22,
    },
    headerIconRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontFamily: FAMILY.black,
        fontSize: 18,
        letterSpacing: 0.8,
        color: COLORS.text,
        marginBottom: 6,
    },
    subtitle: {
        fontFamily: FAMILY.regular,
        fontSize: 13,
        lineHeight: 18,
        color: COLORS.textMuted,
        marginBottom: 14,
    },
    streakBadgeRow: {
        marginBottom: 18,
    },
    streakBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: "rgba(249, 115, 22, 0.12)",
        borderColor: "rgba(249, 115, 22, 0.3)",
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.full,
        gap: 6,
    },
    streakBadgeText: {
        fontFamily: FAMILY.bold,
        fontSize: 11,
        letterSpacing: 0.4,
        color: "#F97316",
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    sectionTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 11,
        letterSpacing: 0.8,
        color: COLORS.textMuted,
    },
    sectionSubtitle: {
        fontFamily: FAMILY.regular,
        fontSize: 11,
        color: COLORS.textSub,
    },
    presetsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    presetChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: RADIUS.md,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    presetChipActive: {
        backgroundColor: "rgba(96, 165, 250, 0.16)",
        borderColor: "#60A5FA",
    },
    presetChipText: {
        fontFamily: FAMILY.medium,
        fontSize: 12,
        color: COLORS.textMuted,
    },
    presetChipTextActive: {
        color: "#FFFFFF",
        fontFamily: FAMILY.bold,
    },
    explainerCard: {
        backgroundColor: "rgba(48, 176, 199, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(48, 176, 199, 0.2)",
        borderRadius: RADIUS.md,
        padding: 12,
        marginBottom: 16,
    },
    explainerTagRow: {
        marginBottom: 4,
    },
    explainerTag: {
        fontFamily: FAMILY.bold,
        fontSize: 11,
        color: "#30B0C7",
        letterSpacing: 0.4,
    },
    explainerText: {
        fontFamily: FAMILY.regular,
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
        lineHeight: 16,
    },
    inputSection: {
        marginBottom: 20,
    },
    inputLabel: {
        fontFamily: FAMILY.bold,
        fontSize: 10,
        letterSpacing: 0.6,
        color: COLORS.textMuted,
        marginBottom: 6,
    },
    textInput: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: RADIUS.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: COLORS.text,
        fontFamily: FAMILY.regular,
        fontSize: 13,
    },
    confirmBtn: {
        height: 48,
        borderRadius: RADIUS.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        marginBottom: 10,
    },
    confirmBtnText: {
        fontFamily: FAMILY.bold,
        fontSize: 13,
        letterSpacing: 0.6,
        color: "#FFFFFF",
    },
    cancelBtn: {
        alignItems: "center",
        paddingVertical: 8,
    },
    cancelBtnText: {
        fontFamily: FAMILY.medium,
        fontSize: 11,
        letterSpacing: 0.4,
        color: COLORS.textMuted,
    },
});
