import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

const { width } = Dimensions.get("window");

export default function DailyDecisionCard({
    command,
    onStartWorkout,
    onOpenWhy,
    onOpenReadiness,
    activeSession = null,
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
    } = command;

    const getDecisionTheme = (dec) => {
        switch (dec) {
            case "READY_TO_PROGRESS":
                return {
                    badgeBg: "rgba(48, 209, 88, 0.14)",
                    badgeBorder: "rgba(48, 209, 88, 0.35)",
                    badgeColor: "#30D158",
                    icon: "flash",
                    ctaBg: ["#30D158", "#249E43"],
                };
            case "TRAIN_WITH_CAUTION":
                return {
                    badgeBg: "rgba(255, 159, 10, 0.14)",
                    badgeBorder: "rgba(255, 159, 10, 0.35)",
                    badgeColor: "#FF9F0A",
                    icon: "warning",
                    ctaBg: ["#FF9F0A", "#D97706"],
                };
            case "DELOAD_REVIEW":
                return {
                    badgeBg: "rgba(139, 92, 246, 0.15)",
                    badgeBorder: "rgba(139, 92, 246, 0.4)",
                    badgeColor: "#A78BFA",
                    icon: "refresh-circle",
                    ctaBg: ["#7C3AED", "#6D28D9"],
                };
            case "MISSED_WORKOUT":
                return {
                    badgeBg: "rgba(255, 69, 58, 0.15)",
                    badgeBorder: "rgba(255, 69, 58, 0.4)",
                    badgeColor: "#FF453A",
                    icon: "calendar",
                    ctaBg: ["#E31E24", "#B91C1C"],
                };
            case "PROGRAM_REVIEW":
                return {
                    badgeBg: "rgba(255, 159, 10, 0.14)",
                    badgeBorder: "rgba(255, 159, 10, 0.35)",
                    badgeColor: "#FF9F0A",
                    icon: "git-branch",
                    ctaBg: ["#FF9F0A", "#D97706"],
                };
            case "RECOVERY_FOCUS":
                return {
                    badgeBg: "rgba(48, 176, 199, 0.15)",
                    badgeBorder: "rgba(48, 176, 199, 0.35)",
                    badgeColor: "#30B0C7",
                    icon: "bed",
                    ctaBg: ["#30B0C7", "#1E8094"],
                };
            case "REST_DAY":
                return {
                    badgeBg: "rgba(255, 255, 255, 0.08)",
                    badgeBorder: "rgba(255, 255, 255, 0.2)",
                    badgeColor: "#D1D5DB",
                    icon: "leaf",
                    ctaBg: ["#374151", "#1F2937"],
                };
            case "INSUFFICIENT_DATA":
                return {
                    badgeBg: "rgba(255, 255, 255, 0.08)",
                    badgeBorder: "rgba(255, 255, 255, 0.2)",
                    badgeColor: "#9CA3AF",
                    icon: "barbell",
                    ctaBg: [COLORS.primary, "#B91C1C"],
                };
            case "TRAIN":
            default:
                return {
                    badgeBg: "rgba(227, 30, 36, 0.14)",
                    badgeBorder: "rgba(227, 30, 36, 0.35)",
                    badgeColor: COLORS.primary,
                    icon: "flame",
                    ctaBg: [COLORS.primary, "#BE123C"],
                };
        }
    };

    const theme = getDecisionTheme(decision);
    const readinessScore = supportingMetrics?.readinessScore;
    const hasReadiness = typeof readinessScore === "number" && !isNaN(readinessScore);

    return (
        <View style={styles.cardContainer}>
            <LinearGradient
                colors={["#161619", "#0F0F12"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Header: Decision Badge & Readiness Pill */}
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
                            <Text style={styles.readinessText}>Readiness: {readinessScore}/100</Text>
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
                            <Text style={styles.readinessTextEmpty}>Log Readiness</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Headline & Subtext */}
                <Text style={styles.headlineText} numberOfLines={1}>{headline}</Text>
                <Text style={styles.subtext}>{subtext}</Text>

                {/* Prime Target Banner (if present) */}
                {primeTarget && (
                    <View style={styles.primeTargetBox}>
                        <View style={styles.primeTargetHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                <Ionicons name="trending-up" size={12} color="#30D158" />
                                <Text style={styles.primeTargetTag}>TODAY'S PRIME TARGET</Text>
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
                        <Ionicons name="information-circle-outline" size={15} color={COLORS.textSub} />
                        <Text style={styles.whyButtonText}>Why?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.ctaButtonWrapper}
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            if (onStartWorkout) onStartWorkout();
                        }}
                    >
                        <LinearGradient
                            colors={theme.ctaBg}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaButtonGradient}
                        >
                            <Text style={styles.ctaButtonText}>
                                {activeSession ? "RESUME SESSION ›" : (
                                    decision === "REST_DAY" || decision === "RECOVERY_FOCUS"
                                        ? "VIEW RECOVERY ›"
                                        : "START SESSION ›"
                                )}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: SPACING.base,
        marginVertical: 8,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
    },
    cardGradient: {
        padding: 16,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    decisionBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 6,
        borderWidth: 1,
    },
    decisionBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.8,
    },
    readinessPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(48, 209, 88, 0.1)",
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.25)",
    },
    readinessText: {
        fontSize: 10.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.3,
    },
    readinessPillEmpty: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 6,
    },
    readinessTextEmpty: {
        fontSize: 10.5,
        fontFamily: FAMILY.medium,
        color: COLORS.textSub,
    },
    headlineText: {
        fontSize: 18,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    subtext: {
        fontSize: 12.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 18,
        marginBottom: 12,
    },
    primeTargetBox: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.md,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: 14,
    },
    primeTargetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    primeTargetTag: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.6,
    },
    primeTargetAction: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: "#D1D5DB",
    },
    primeTargetTitle: {
        fontSize: 14.5,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        marginBottom: 3,
    },
    primeTargetReason: {
        fontSize: 11.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 16,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    whyButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    whyButtonText: {
        fontSize: 12,
        fontFamily: FAMILY.medium,
        color: COLORS.textSub,
    },
    ctaButtonWrapper: {
        flex: 1,
        borderRadius: RADIUS.md,
        overflow: "hidden",
    },
    ctaButtonGradient: {
        paddingVertical: 11,
        alignItems: "center",
        justifyContent: "center",
    },
    ctaButtonText: {
        fontSize: 12,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
});
