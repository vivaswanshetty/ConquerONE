import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import * as Haptics from "expo-haptics";

export default function ProgramStatusCard({
    summary = null,
    activeProgram = null,
    onPressVersion = null,
    onPressReview = null,
}) {
    if (!summary) return null;

    const progName = activeProgram?.name || summary.programName || "Vivaswan Elite";
    const progVersion = activeProgram?.version || summary.programVersion || "1.0.0";
    const isDeload = activeProgram?.isTemporaryDeload || false;

    const adherence = summary.adherencePercentage ?? 100;
    const setRatio = summary.setCompletionRatio ?? 100;
    const freq = summary.weeklyTrainingFrequency ?? 0;
    const progRatio = summary.progressionRatio ?? 100;

    let adherenceColor = "#30D158";
    if (adherence < 60) adherenceColor = "#FF453A";
    else if (adherence < 80) adherenceColor = "#FF9F0A";

    const completedSess = summary.completedSessions28d || 0;
    const plannedSess = summary.totalPlannedSessions28d || 24;
    const workingSets = summary.completedWorkingSets || 0;
    const progressingMvmts = summary.progressingMovementsCount || 0;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleBox}>
                    <View style={styles.labelRow}>
                        <Ionicons
                            name={isDeload ? "refresh-circle" : "shield-checkmark"}
                            size={12}
                            color={isDeload ? "#FF9F0A" : COLORS.primary}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.programLabel, isDeload && { color: "#FF9F0A" }]}>
                            {isDeload ? "ACTIVE DELOAD PROTOCOL" : "ACTIVE PROGRAM"}
                        </Text>
                    </View>
                    <Text style={styles.programTitle} numberOfLines={1}>{progName}</Text>
                </View>

                {onPressVersion && (
                    <TouchableOpacity
                        style={[styles.versionBadge, isDeload && styles.versionBadgeDeload]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onPressVersion();
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.versionText, isDeload && { color: "#FF9F0A" }]}>v{progVersion}</Text>
                        <Ionicons name="chevron-forward" size={10} color={isDeload ? "#FF9F0A" : COLORS.primary} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Metrics Matrix */}
            <View style={styles.metricsGrid}>
                {/* 1. Adherence */}
                <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>28D ADH</Text>
                    <Text style={[styles.metricValue, { color: adherenceColor }]} numberOfLines={1}>
                        {adherence}%
                    </Text>
                    <Text style={styles.metricSub} numberOfLines={1}>{completedSess}/{plannedSess} sess</Text>
                </View>

                <View style={styles.divider} />

                {/* 2. Set Completion */}
                <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>SETS COMPL</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>{setRatio}%</Text>
                    <Text style={styles.metricSub} numberOfLines={1}>{workingSets} sets</Text>
                </View>

                <View style={styles.divider} />

                {/* 3. Progression Rate */}
                <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>PROGRESS</Text>
                    <Text style={[styles.metricValue, { color: "#30D158" }]} numberOfLines={1}>{progRatio}%</Text>
                    <Text style={styles.metricSub} numberOfLines={1}>{progressingMvmts} mvmts</Text>
                </View>

                <View style={styles.divider} />

                {/* 4. Frequency */}
                <View style={styles.metricCell}>
                    <Text style={styles.metricLabel} numberOfLines={1}>FREQUENCY</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>{freq}</Text>
                    <Text style={styles.metricSub} numberOfLines={1}>sess / wk</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#141416",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 14,
        marginBottom: SPACING.md,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    titleBox: {
        flex: 1,
        marginRight: 10,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
    },
    programLabel: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 1,
    },
    programTitle: {
        fontSize: 16,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.4,
    },
    versionBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(227, 30, 36, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
    },
    versionBadgeDeload: {
        backgroundColor: "rgba(255, 159, 10, 0.1)",
        borderColor: "rgba(255, 159, 10, 0.3)",
    },
    versionText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.3,
    },
    metricsGrid: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.sm,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    metricCell: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 2,
    },
    divider: {
        width: 1,
        height: 26,
        backgroundColor: "rgba(255, 255, 255, 0.07)",
    },
    metricLabel: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
        marginBottom: 3,
        textAlign: "center",
    },
    metricValue: {
        fontSize: 16,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        marginBottom: 2,
        textAlign: "center",
        fontVariant: ["tabular-nums"],
    },
    metricSub: {
        fontSize: 8.5,
        fontFamily: FAMILY.mono,
        color: "rgba(255, 255, 255, 0.45)",
        textAlign: "center",
    },
});
