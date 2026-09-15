import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";
import { getDecisionExplanation } from "../utils/analytics";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function WhyRecommendationModal({
    visible,
    onClose,
    command,
}) {
    if (!command) return null;

    const explanation = getDecisionExplanation(command);
    const {
        decision = "TRAIN",
        priority = 6,
        reasons = [],
        supportingMetrics = {},
        sourceAnalytics = [],
        recommendedAction = "START_WORKOUT",
        confidence = "HIGH",
    } = explanation;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="sparkles-sharp" size={16} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>DECISION INTEL</Text>
                                <Text style={styles.modalSub}>Deterministic Explainability Engine</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <Ionicons name="close" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                        {/* Decision Status Pill */}
                        <View style={styles.decisionBanner}>
                            <Text style={styles.decisionTag}>RESOLVED ATHLETE STATE</Text>
                            <Text style={styles.decisionValue}>{decision.replace(/_/g, " ")}</Text>
                            <View style={styles.confidenceRow}>
                                <Text style={styles.confidenceLabel}>Confidence: </Text>
                                <Text style={[styles.confidenceValue, { color: confidence === "HIGH" ? "#10B981" : "#F59E0B" }]}>
                                    {confidence}
                                </Text>
                            </View>
                        </View>

                        {/* Underlying Deterministic Reasons */}
                        <Text style={styles.sectionHeader}>WHY THIS RECOMMENDATION?</Text>
                        <View style={styles.reasonsList}>
                            {reasons.map((reason, idx) => (
                                <View key={idx} style={styles.reasonItem}>
                                    <Ionicons name="checkmark-circle" size={15} color={COLORS.primary} style={{ marginTop: 2 }} />
                                    <Text style={styles.reasonText}>{reason}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Telemetry Metrics Grid */}
                        <Text style={styles.sectionHeader}>SUPPORTING TELEMETRY</Text>
                        <View style={styles.telemetryGrid}>
                            <View style={styles.telemetryCell}>
                                <Text style={styles.telemetryLabel}>READINESS</Text>
                                <Text style={styles.telemetryValue}>
                                    {supportingMetrics.readinessScore !== null ? `${supportingMetrics.readinessScore}/100` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.telemetryCell}>
                                <Text style={styles.telemetryLabel}>ACWR</Text>
                                <Text style={styles.telemetryValue}>
                                    {typeof supportingMetrics.acwr === "number" ? supportingMetrics.acwr.toFixed(2) : "0.00"}
                                </Text>
                            </View>
                            <View style={styles.telemetryCell}>
                                <Text style={styles.telemetryLabel}>ACUTE LOAD</Text>
                                <Text style={styles.telemetryValue}>
                                    {Math.round(supportingMetrics.acuteLoad || 0)} kg
                                </Text>
                            </View>
                            <View style={styles.telemetryCell}>
                                <Text style={styles.telemetryLabel}>FATIGUE</Text>
                                <Text style={[styles.telemetryValue, { color: supportingMetrics.fatigueStatus === "EXHAUSTION" ? "#EF4444" : "#10B981" }]}>
                                    {supportingMetrics.fatigueStatus || "OPTIMAL"}
                                </Text>
                            </View>
                        </View>

                        {/* Prescribed Tactical Action */}
                        <Text style={styles.sectionHeader}>PRESCRIBED TACTICAL ACTION</Text>
                        <View style={styles.actionBox}>
                            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                            <Text style={styles.actionText}>{command.subtext || "Execute scheduled training session."}</Text>
                        </View>
                    </ScrollView>

                    {/* Bottom Done Button */}
                    <TouchableOpacity
                        style={styles.doneBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onClose();
                        }}
                    >
                        <Text style={styles.doneBtnText}>UNDERSTOOD</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "center",
        alignItems: "center",
        padding: SPACING.base,
    },
    modalCard: {
        width: "100%",
        maxHeight: SCREEN_HEIGHT * 0.82,
        backgroundColor: "#161619",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        padding: 18,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    iconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalTitle: {
        fontSize: 13.5,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    modalSub: {
        fontSize: 10.5,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
    },
    closeBtn: {
        padding: 4,
    },
    scrollBody: {
        marginVertical: 2,
    },
    decisionBanner: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        padding: 12,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: 14,
    },
    decisionTag: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    decisionValue: {
        fontSize: 16,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    confidenceRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    confidenceLabel: {
        fontSize: 10.5,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
    },
    confidenceValue: {
        fontSize: 10.5,
        fontFamily: FAMILY.monoBold,
    },
    sectionHeader: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginTop: 8,
        marginBottom: 6,
    },
    reasonsList: {
        gap: 6,
        marginBottom: 12,
    },
    reasonItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        padding: 9,
        borderRadius: RADIUS.xs,
    },
    reasonText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: FAMILY.body,
        color: "#E5E7EB",
        lineHeight: 16,
    },
    telemetryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
    },
    telemetryCell: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        padding: 9,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
    },
    telemetryLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    telemetryValue: {
        fontSize: 13,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        fontVariant: ["tabular-nums"],
    },
    actionBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(48, 209, 88, 0.08)",
        padding: 10,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.2)",
        marginBottom: 8,
    },
    actionText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: FAMILY.body,
        color: "#E5E7EB",
        lineHeight: 16,
    },
    doneBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 11,
        borderRadius: RADIUS.sm,
        alignItems: "center",
        marginTop: 10,
    },
    doneBtnText: {
        fontSize: 12,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
});
