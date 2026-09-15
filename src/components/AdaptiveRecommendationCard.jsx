import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import * as Haptics from "expo-haptics";

export default function AdaptiveRecommendationCard({
    recommendation = null,
    onAccept = null,
    onDismiss = null,
    onReview = null,
    onReviewExercises = null,
}) {
    if (!recommendation) return null;

    const {
        id,
        status = "CURRENT_PROGRAM",
        label = "Adaptive Optimization",
        color = "#FF9F0A",
        observation = "",
        recommendation: recText = "",
        actionType = "NONE",
        confidenceScore = 80,
    } = recommendation;

    const isHighPriority = status === "REDUCE_TRAINING_STRESS" || status === "REVIEW_PROGRAM";
    const handleReview = onReview || onReviewExercises;

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.04)", "rgba(255, 255, 255, 0.008)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
                        <Ionicons
                            name={isHighPriority ? "alert-circle" : "analytics-outline"}
                            size={11}
                            color={color}
                            style={{ marginRight: 5 }}
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
                <Text style={styles.recTitle}>RECOMMENDED ADAPTATION</Text>
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
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                        <Text style={styles.acceptBtnText}>ACCEPT ADAPTATION</Text>
                    </TouchableOpacity>
                )}

                {handleReview && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.reviewBtn]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            handleReview(recommendation);
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
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "#131316",
        padding: 16,
        overflow: "hidden",
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.6,
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
        fontFamily: FAMILY.body,
        color: "#E0E0E6",
        lineHeight: 17.5,
        marginBottom: 10,
    },
    recBox: {
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        borderLeftWidth: 3,
        borderRadius: RADIUS.xs,
        padding: 10,
        marginBottom: 12,
    },
    recTitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 3,
    },
    recText: {
        fontSize: 12,
        fontFamily: FAMILY.body,
        color: "#FFFFFF",
        lineHeight: 16.5,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: RADIUS.sm,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    acceptBtn: {
        flex: 1,
    },
    acceptBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    reviewBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingHorizontal: 16,
    },
    reviewBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.chakraBold,
        color: "#D1D1D6",
        letterSpacing: 0.8,
    },
});
