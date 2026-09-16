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
    const readinessScore = supportingMetrics?.readinessScore;
    const hasReadiness = typeof readinessScore === "number" && !isNaN(readinessScore);

    const getDecisionTheme = (dec) => {
        switch (dec) {
            case "READY_TO_PROGRESS":
                return {
                    badgeColor: "#30D158",
                    icon: "flash",
                    ctaGradient: ["#E31E24", "#B81419"],
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
            case "TRAIN_WITH_CAUTION":
                return {
                    badgeColor: "#FF9F0A",
                    icon: "warning",
                    ctaGradient: ["#F59E0B", "#D97706"],
                    ctaBg: "#D97706",
                    ctaText: "#FFFFFF",
                };
            case "DELOAD_REVIEW":
                return {
                    badgeColor: "#A78BFA",
                    icon: "refresh-circle",
                    ctaGradient: ["#8B5CF6", "#6D28D9"],
                    ctaBg: "#7C3AED",
                    ctaText: "#FFFFFF",
                };
            case "MISSED_WORKOUT":
                return {
                    badgeColor: "#FF453A",
                    icon: "calendar",
                    ctaGradient: ["#E31E24", "#B81419"],
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
            case "PROGRAM_REVIEW":
                return {
                    badgeColor: "#FF9F0A",
                    icon: "git-branch",
                    ctaGradient: ["#F59E0B", "#D97706"],
                    ctaBg: "#D97706",
                    ctaText: "#FFFFFF",
                };
            case "RECOVERY_FOCUS":
                return {
                    badgeColor: "#30B0C7",
                    icon: "bed",
                    ctaGradient: ["#2563EB", "#1D4ED8"],
                    ctaBg: "#2563EB",
                    ctaText: "#FFFFFF",
                };
            case "REST_DAY":
                return {
                    badgeColor: "#9CA3AF",
                    icon: "leaf",
                    ctaGradient: ["#3F3F46", "#27272A"],
                    ctaBg: "#27272A",
                    ctaText: "#E4E4E7",
                };
            case "INSUFFICIENT_DATA":
                return {
                    badgeColor: "#9CA3AF",
                    icon: "barbell",
                    ctaGradient: ["#E31E24", "#B81419"],
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
            case "TRAIN":
            default:
                return {
                    badgeColor: COLORS.primary,
                    icon: "flame",
                    ctaGradient: ["#E31E24", "#B81419"],
                    ctaBg: COLORS.primary,
                    ctaText: "#FFFFFF",
                };
        }
    };

    const theme = getDecisionTheme(decision);
    const badgeText = decision.replace(/_/g, " ");

    const getPrimaryActionText = () => {
        if (activeSession) return "RESUME SESSION";
        if (isDoneToday) return "HIT AGAIN";
        if (decision === "REST_DAY" || decision === "RECOVERY_FOCUS") return "VIEW RECOVERY";
        return "START SESSION";
    };

    return (
        <View style={styles.cardContainer}>
            {/* Deep Carbon Surface & Subtle Top Accent Ambient Glow */}
            <LinearGradient
                colors={["#161619", "#111114"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
                colors={[`${theme.badgeColor}14`, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 0.6 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.05)", "rgba(255, 255, 255, 0.005)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />

            <View style={styles.cardContent}>
                {/* ── Top Row: Precision Status Chip & Telemetry Pill ── */}
                <View style={styles.topRow}>
                    <View style={[styles.decisionChip, { backgroundColor: `${theme.badgeColor}15`, borderColor: `${theme.badgeColor}40` }]}>
                        <View style={[styles.ledDot, { backgroundColor: theme.badgeColor }]} />
                        <Text style={[styles.decisionChipText, { color: theme.badgeColor }]}>
                            {badgeText}
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
                            <Ionicons name="pulse" size={11} color="#30D158" style={{ marginRight: 5 }} />
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
                            <Ionicons name="add-circle-outline" size={11} color={COLORS.textSub} style={{ marginRight: 5 }} />
                            <Text style={styles.readinessTextEmpty}>LOG READINESS</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Headline & Subtext ── */}
                <Text style={styles.headlineText} numberOfLines={1}>
                    {headline.toUpperCase()}
                </Text>
                <Text style={styles.subtext} numberOfLines={2}>
                    {subtext}
                </Text>

                {/* ── Prime Target Inset (Carbon HUD Display) ── */}
                {primeTarget && (
                    <View style={styles.primeTargetBox}>
                        <View style={[styles.primeAccentStripe, { backgroundColor: theme.badgeColor }]} />
                        <View style={styles.primeTargetHeader}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                <Ionicons name="trending-up" size={12} color="#30D158" />
                                <Text style={styles.primeTargetTag}>PRIME PROGRESSION TARGET</Text>
                            </View>
                            {primeTarget.actionLabel && (
                                <View style={styles.primeTargetActionPill}>
                                    <Text style={styles.primeTargetAction}>{primeTarget.actionLabel}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.primeTargetTitle}>{primeTarget.exerciseName}</Text>
                        <Text style={styles.primeTargetReason} numberOfLines={2}>{primeTarget.reason}</Text>
                    </View>
                )}

                {/* ── Action Buttons (Distinct Athletic Style) ── */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.detailsBtn}
                        activeOpacity={0.75}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (onOpenWhy) onOpenWhy();
                        }}
                    >
                        <Ionicons name="information-circle-outline" size={15} color="#A1A1AA" style={{ marginRight: 6 }} />
                        <Text style={styles.detailsBtnText}>DETAILS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.primaryBtnTouchable}
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            if (onStartWorkout) onStartWorkout();
                        }}
                    >
                        <LinearGradient
                            colors={theme.ctaGradient || [theme.ctaBg, theme.ctaBg]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryBtnGradient}
                        >
                            <Ionicons name={theme.icon || "flash"} size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.primaryBtnText}>{getPrimaryActionText()}</Text>
                            <Ionicons name="chevron-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "#131316",
        overflow: "hidden",
        alignSelf: "stretch",
    },
    cardContent: {
        paddingVertical: 18,
        paddingHorizontal: 18,
        justifyContent: "space-between",
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    decisionChip: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 9,
        height: 26,
        borderRadius: 6,
        borderWidth: 1,
        gap: 6,
    },
    ledDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    decisionChipText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.8,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    readinessPill: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(48, 209, 88, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.28)",
        paddingHorizontal: 9,
        height: 26,
        borderRadius: 6,
    },
    readinessText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    readinessPillEmpty: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingHorizontal: 9,
        height: 26,
        borderRadius: 6,
    },
    readinessTextEmpty: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    headlineText: {
        fontSize: 20,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.7,
        lineHeight: 25,
        marginBottom: 3,
        includeFontPadding: false,
    },
    subtext: {
        fontSize: 12,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
        lineHeight: 16.5,
        includeFontPadding: false,
    },
    primeTargetBox: {
        backgroundColor: "rgba(255, 255, 255, 0.028)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.07)",
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        paddingLeft: 16,
        marginTop: 12,
        marginBottom: 14,
        overflow: "hidden",
        position: "relative",
    },
    primeAccentStripe: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3.5,
    },
    primeTargetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    primeTargetTag: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.7,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    primeTargetActionPill: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        paddingHorizontal: 8,
        height: 20,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        justifyContent: "center",
        alignItems: "center",
    },
    primeTargetAction: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: "#D4D4D8",
        letterSpacing: 0.2,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    primeTargetTitle: {
        fontSize: 14.5,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        marginTop: 2,
        marginBottom: 2,
        includeFontPadding: false,
    },
    primeTargetReason: {
        fontSize: 11.5,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
        lineHeight: 16,
        includeFontPadding: false,
    },
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 2,
    },
    detailsBtn: {
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.045)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.10)",
    },
    detailsBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: "#E4E4E7",
        letterSpacing: 0.8,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    primaryBtnTouchable: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        overflow: "hidden",
    },
    primaryBtnGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    primaryBtnText: {
        fontSize: 12.5,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
});
