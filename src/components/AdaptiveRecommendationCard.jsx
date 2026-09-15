import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import * as Haptics from "expo-haptics";

export default function AdaptiveRecommendationCard({
    recommendation = null,
    onAccept = null,
    onDismiss = null,
    onReview = null,
}) {
    if (!recommendation) return null;

    const {
        id,
        status = "CURRENT_PROGRAM",
        label = "Adaptive Optimization",
        color = COLORS.primary,
        observation = "",
        recommendation: recText = "",
        actionType = "NONE",
        confidenceScore = 90,
    } = recommendation;

    const isHighPriority = status === "REDUCE_TRAINING_STRESS" || status === "REVIEW_PROGRAM";

    return (
        <View style={[styles.card, { borderColor: `${color}4D` }]}>
            <LinearGradient
                colors={[`${color}12`, "rgba(18, 18, 20, 0.98)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: `${color}26`, borderColor: `${color}4D` }]}>
                        <Ionicons
                            name={isHighPriority ? "alert-circle" : "sparkles"}
                            size={12}
                            color={color}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.badgeText, { color }]}>{label.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.confidenceText}>{confidenceScore}% CONFIDENCE</Text>
                </View>

                {onDismiss && (
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onDismiss(id || "rec_default");
                        }}
                        style={styles.closeBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Observation */}
            {!!observation && (
                <Text style={styles.observationText}>
                    {observation}
                </Text>
            )}

            {/* Recommendation Box */}
            <View style={[styles.recBox, { borderLeftColor: color }]}>
                <Text style={styles.recTitle}>ADAPTIVE RECOMMENDATION</Text>
                <Text style={styles.recText}>{recText}</Text>
            </View>

            {/* Actions (Athlete Control) */}
            <View style={styles.actionsRow}>
                {onAccept && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: color }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onAccept(recommendation);
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.acceptBtnText}>ACCEPT ADAPTATION</Text>
                    </TouchableOpacity>
                )}

                {onReview && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.reviewBtn]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onReview(recommendation);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.reviewBtnText}>REVIEW</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "rgba(18, 18, 20, 0.95)",
        borderRadius: RADIUS.lg,
        borderWidth: 1.2,
        padding: SPACING.base,
        marginBottom: SPACING.md,
        overflow: "hidden",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: SPACING.sm,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.5,
    },
    confidenceText: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    closeBtn: {
        padding: 4,
    },
    observationText: {
        fontSize: 12.5,
        fontFamily: FAMILY.sans,
        color: "rgba(255, 255, 255, 0.85)",
        lineHeight: 18,
        marginBottom: SPACING.sm,
    },
    recBox: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderLeftWidth: 3,
        borderRadius: 6,
        padding: 10,
        marginBottom: SPACING.base,
    },
    recTitle: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 3,
    },
    recText: {
        fontSize: 12,
        fontFamily: FAMILY.mono,
        color: "#FFFFFF",
        lineHeight: 17,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionBtn: {
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    acceptBtn: {
        flex: 1,
    },
    acceptBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    reviewBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingHorizontal: 16,
    },
    reviewBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSecondary,
    },
});
