import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, FAMILY, SPACING, GRADIENTS } from "../utils/theme";

/**
 * ExerciseTargetCard
 * Compact visual representation of the calculated progression target for an exercise.
 * Displays Last Session baseline, Target session goals, and status badges.
 */
export default function ExerciseTargetCard({ targetInfo, compact = false }) {
    if (!targetInfo) return null;

    const {
        action,
        recommendation,
        badgeText,
        statusBadge,
        badgeColor: rawBadgeColor,
        reason,
        targetWeight,
        targetWeightKg,
        targetReps,
        targetRepRange,
        targetTimeSec,
        targetDurationSec,
        lastWeightKg,
        lastReps,
        lastTimeSec,
        lastPerformance,
        isBodyweight,
        isAssisted,
        isTimed,
        isStalled,
        targetSetSummary,
        lastSetSummary,
    } = targetInfo;

    const badgeColor = rawBadgeColor || (recommendation === "INCREASE_LOAD" ? "#30D158" : "#30B0C7");
    const displayBadge = statusBadge || badgeText || "TARGET";

    // Formatting helpers
    const formatLast = () => {
        if (lastSetSummary) return lastSetSummary;
        if (lastPerformance) {
            if (lastPerformance.summary) return lastPerformance.summary;
            if (lastPerformance.maxWeight > 0) {
                return `${lastPerformance.maxWeight} kg × ${lastPerformance.maxReps} reps`;
            }
            if (lastPerformance.maxReps > 0) {
                return `${lastPerformance.maxReps} reps`;
            }
            if (lastPerformance.durationSec > 0) {
                return `${lastPerformance.durationSec}s hold`;
            }
        }
        if (isTimed || targetDurationSec) {
            return lastTimeSec ? `${lastTimeSec}s hold` : "No prior data";
        }
        if (isBodyweight) {
            return lastReps ? `${lastReps} reps (BW)` : "No prior data";
        }
        if (isAssisted) {
            return (lastReps && lastWeightKg !== undefined)
                ? `${lastReps} reps (-${lastWeightKg}kg)`
                : "No prior data";
        }
        if (lastWeightKg !== undefined && lastReps) {
            return `${lastReps} reps @ ${lastWeightKg}kg`;
        }
        return "No prior data";
    };

    const formatTarget = () => {
        if (targetSetSummary) return targetSetSummary;
        if (isTimed || targetDurationSec) {
            return (targetDurationSec || targetTimeSec) ? `${targetDurationSec || targetTimeSec}s hold` : "—";
        }
        const effectiveWeight = targetWeight !== undefined ? targetWeight : targetWeightKg;
        const effectiveReps = targetRepRange || targetReps;

        if (isAssisted) {
            return (effectiveReps && effectiveWeight !== undefined)
                ? `${effectiveReps} reps (-${effectiveWeight}kg)`
                : "—";
        }
        if (effectiveWeight !== undefined && effectiveWeight !== null && effectiveWeight > 0) {
            return `${effectiveWeight} kg × ${effectiveReps || "reps"}`;
        }
        if (effectiveReps) {
            return `${effectiveReps} reps`;
        }
        return "—";
    };

    const getActionIcon = () => {
        if (isStalled) return "warning-outline";
        if (action === "INCREASE_WEIGHT" || action === "INCREASE_REPS" || action === "INCREASE_TIME" || action === "REDUCE_ASSISTANCE" || recommendation === "INCREASE_LOAD" || recommendation === "INCREASE_REPS") {
            return "trending-up-outline";
        }
        if (action === "DELOAD" || recommendation === "DELOAD_CONSOLIDATE") return "refresh-outline";
        if (action === "INITIAL" || recommendation === "BASELINE_SESSION") return "flag-outline";
        return "barbell-outline";
    };

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <LinearGradient
                colors={GRADIENTS.subtleCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {/* Header / Badge Row */}
            <View style={styles.headerRow}>
                <View style={styles.actionHeader}>
                    <Ionicons
                        name={getActionIcon()}
                        size={14}
                        color={badgeColor}
                        style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.badgeText, { color: badgeColor }]}>
                        {displayBadge}
                    </Text>
                </View>
                {isStalled && (
                    <View style={styles.stalledPill}>
                        <Text style={styles.stalledPillText}>STALLED</Text>
                    </View>
                )}
            </View>

            {/* Target vs Baseline Comparison */}
            <View style={styles.comparisonGrid}>
                <View style={styles.metricColumn}>
                    <Text style={styles.columnLabel}>LAST SESSION</Text>
                    <Text style={styles.columnValue}>{formatLast()}</Text>
                </View>
                <View style={styles.arrowColumn}>
                    <Ionicons name="arrow-forward" size={14} color="#4A4A50" />
                </View>
                <View style={styles.metricColumn}>
                    <Text style={[styles.columnLabel, { color: badgeColor }]}>TARGET</Text>
                    <Text style={[styles.columnValue, styles.targetValue]}>{formatTarget()}</Text>
                </View>
            </View>

            {/* Recommendation Reasoning Note */}
            {reason && !compact && (
                <View style={styles.reasonBox}>
                    <Ionicons name="information-circle-outline" size={12} color="#8E8E93" style={{ marginRight: 4, marginTop: 1 }} />
                    <Text style={styles.reasonText} numberOfLines={2}>
                        {reason}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.11)",
        padding: SPACING.sm + 2,
        marginTop: SPACING.xs,
        marginBottom: SPACING.xs,
        overflow: "hidden",
    },
    containerCompact: {
        padding: SPACING.xs + 2,
        marginVertical: 2,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    actionHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    badgeText: {
        fontFamily: FAMILY.chakraBold,
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    stalledPill: {
        backgroundColor: "rgba(255, 159, 10, 0.12)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "rgba(255, 159, 10, 0.3)",
    },
    stalledPillText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        color: "#FF9F0A",
        letterSpacing: 0.5,
    },
    comparisonGrid: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#0A0A0D",
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    metricColumn: {
        flex: 1,
    },
    arrowColumn: {
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    columnLabel: {
        fontFamily: FAMILY.chakra,
        fontSize: 9,
        color: "#8E8E93",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    columnValue: {
        fontFamily: FAMILY.monoMedium,
        fontSize: 12,
        color: "#D1D1D6",
    },
    targetValue: {
        color: "#FFFFFF",
        fontFamily: FAMILY.monoBold,
    },
    reasonBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginTop: 6,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: "#1A1A1D",
    },
    reasonText: {
        flex: 1,
        fontFamily: FAMILY.body,
        fontSize: 11,
        color: "#8E8E93",
        lineHeight: 14,
    },
});
