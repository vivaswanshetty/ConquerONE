import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

export default function DailyDecisionCard({
    command,
    onStartWorkout,
    onOpenWhy,
    onOpenReadiness,
    activeSession = null,
    isCompletedToday = false,
}) {
    if (!command) return null;

    const {
        decision = "TRAIN",
        headline = "EXECUTE SESSION",
        subtext = "Nominal training day.",
        action = "START_WORKOUT",
        supportingMetrics = {},
        primeTarget = null,
        recommendedWorkout = null,
        isCompletedToday: commandCompleted = false,
    } = command;

    const isDoneToday = isCompletedToday || commandCompleted;

    const getDecisionTheme = (dec) => {
        switch (dec) {
            case "READY_TO_PROGRESS":
                return {
                    badgeBg: "rgba(48, 209, 88, 0.12)",
                    badgeBorder: "rgba(48, 209, 88, 0.3)",
                    badgeColor: "#30D158",
                    icon: "flash",
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
            case "TRAIN_WITH_CAUTION":
                return {
                    badgeBg: "rgba(255, 159, 10, 0.12)",
                    badgeBorder: "rgba(255, 159, 10, 0.3)",
                    badgeColor: "#FF9F0A",
                    icon: "warning",
                    ctaBg: "#D97706",
                    ctaText: "#FFFFFF",
                };
            case "DELOAD_REVIEW":
                return {
                    badgeBg: "rgba(139, 92, 246, 0.12)",
                    badgeBorder: "rgba(139, 92, 246, 0.3)",
                    badgeColor: "#A78BFA",
                    icon: "refresh-circle",
                    ctaBg: "#7C3AED",
                    ctaText: "#FFFFFF",
                };
            case "MISSED_WORKOUT":
                return {
                    badgeBg: "rgba(255, 69, 58, 0.12)",
                    badgeBorder: "rgba(255, 69, 58, 0.3)",
                    badgeColor: "#FF453A",
                    icon: "calendar",
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
            case "PROGRAM_REVIEW":
                return {
                    badgeBg: "rgba(255, 159, 10, 0.12)",
                    badgeBorder: "rgba(255, 159, 10, 0.3)",
                    badgeColor: "#FF9F0A",
                    icon: "git-branch",
                    ctaBg: "#D97706",
                    ctaText: "#FFFFFF",
                };
            case "RECOVERY_FOCUS":
                return {
                    badgeBg: "rgba(48, 176, 199, 0.12)",
                    badgeBorder: "rgba(48, 176, 199, 0.3)",
                    badgeColor: "#30B0C7",
                    icon: "bed",
                    ctaBg: "#2563EB",
                    ctaText: "#FFFFFF",
                };
            case "REST_DAY":
                return {
                    badgeBg: "rgba(255, 255, 255, 0.06)",
                    badgeBorder: "rgba(255, 255, 255, 0.15)",
                    badgeColor: "#9CA3AF",
                    icon: "leaf",
                    ctaBg: "#27272A",
                    ctaText: "#E4E4E7",
                };
            case "INSUFFICIENT_DATA":
                return {
                    badgeBg: "rgba(255, 255, 255, 0.06)",
                    badgeBorder: "rgba(255, 255, 255, 0.15)",
                    badgeColor: "#9CA3AF",
                    icon: "barbell",
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
            case "TRAIN":
            default:
                return {
                    badgeBg: "rgba(227, 30, 36, 0.12)",
                    badgeBorder: "rgba(227, 30, 36, 0.3)",
                    badgeColor: COLORS.primary,
                    icon: "flame",
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
        }
    };

    const theme = getDecisionTheme(decision);
    const readinessScore = supportingMetrics?.readinessScore;
    const hasReadiness = typeof readinessScore === "number" && !isNaN(readinessScore);

    return (
        <View style={styles.cardContainer}>
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.04)", "rgba(255, 255, 255, 0.008)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {/* Header: Decision Badge & Readiness Telemetry */}
            <View style={styles.topRow}>
                <View style={[styles.decisionBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                    <Ionicons name={theme.icon} size={11} color={theme.badgeColor} style={{ marginRight: 5 }} />
                    <Text style={[styles.decisionBadgeText, { color: theme.badgeColor }]}>
                        {decision.replace(/_/g, " ")}
                    </Text>
                </View>

                {hasReadiness ? (
                    <TouchableOpacity
                        style={styles.readinessPill}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (onOpenReadiness) onOpenReadiness();
                        }}
                    >
                        <Ionicons name="pulse" size={11} color="#30D158" />
                        <Text style={styles.readinessText}>READINESS {readinessScore}%</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.readinessPillEmpty}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (onOpenReadiness) onOpenReadiness();
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={11} color={COLORS.textSub} />
                        <Text style={styles.readinessTextEmpty}>LOG READINESS</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Headline & Subtext */}
            <Text style={styles.headlineText} numberOfLines={1}>{headline}</Text>
            <Text style={styles.subtext}>{subtext}</Text>

            {/* Prime Target Banner */}
            {primeTarget && (
                <View style={styles.primeTargetBox}>
                    <View style={styles.primeTargetHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="trending-up" size={12} color="#30D158" />
                            <Text style={styles.primeTargetTag}>PRIME PROGRESSION TARGET</Text>
                        </View>
                        {primeTarget.actionLabel && (
                            <Text style={styles.primeTargetAction}>{primeTarget.actionLabel}</Text>
                        )}
                    </View>
                    <Text style={styles.primeTargetTitle}>{primeTarget.exerciseName}</Text>
                    <Text style={styles.primeTargetReason}>{primeTarget.reason}</Text>
                </View>
            )}

            {/* Workout Context & Primary CTA */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.whyButton}
                    activeOpacity={0.75}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (onOpenWhy) onOpenWhy();
                    }}
                >
                    <Ionicons name="information-circle-outline" size={14} color={COLORS.textSub} />
                    <Text style={styles.whyButtonText}>DETAILS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: theme.ctaBg }]}
                    activeOpacity={0.85}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (onStartWorkout) onStartWorkout();
                    }}
                >
                    <Text style={[styles.ctaButtonText, { color: theme.ctaText }]}>
                        {activeSession ? "RESUME SESSION ›" : (
                            isDoneToday
                                ? "HIT AGAIN ›"
                                : (decision === "REST_DAY" || decision === "RECOVERY_FOCUS"
                                    ? "VIEW RECOVERY ›"
                                    : "START SESSION ›")
                        )}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "#131316",
        padding: 16,
        overflow: "hidden",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    decisionBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    decisionBadgeText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.8,
    },
    readinessPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(48, 209, 88, 0.08)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.22)",
    },
    readinessText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.3,
    },
    readinessPillEmpty: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    readinessTextEmpty: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.3,
    },
    headlineText: {
        fontSize: 17,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    subtext: {
        fontSize: 12,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
        lineHeight: 16.5,
        marginBottom: 10,
    },
    primeTargetBox: {
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        borderRadius: RADIUS.sm,
        padding: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: 12,
    },
    primeTargetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 3,
    },
    primeTargetTag: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.6,
    },
    primeTargetAction: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: "#D1D5DB",
    },
    primeTargetTitle: {
        fontSize: 14,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        marginBottom: 2,
    },
    primeTargetReason: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
        lineHeight: 15,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    whyButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    whyButtonText: {
        fontSize: 10.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.6,
    },
    ctaButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: RADIUS.sm,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaButtonText: {
        fontSize: 12,
        fontFamily: FAMILY.chakraBold,
        letterSpacing: 0.8,
    },
});
