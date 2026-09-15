import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";

export default function MilestoneForecastCard({ milestoneData }) {
    if (!milestoneData) return null;

    const {
        exerciseName,
        loadType,
        currentBest,
        milestoneTarget,
        milestoneDelta,
        unit,
        projectedWeeks,
        confidence,
        status,
        rationale,
    } = milestoneData;

    if (status === "HORIZON_UNAVAILABLE" || !milestoneTarget) {
        return (
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.titleWrap}>
                        <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>
                        <Text style={styles.subText}>{loadType?.toUpperCase().replace("_", " ")}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: "rgba(255,255,255,0.04)" }]}>
                        <Text style={[styles.statusText, { color: COLORS.textMuted }]}>FLAT VELOCITY</Text>
                    </View>
                </View>
                <Text style={styles.rationaleText}>{rationale}</Text>
            </View>
        );
    }

    // Progress percentage towards next milestone
    const progressPct = currentBest && milestoneTarget && milestoneTarget > 0
        ? Math.min(100, Math.max(10, Math.round((currentBest / milestoneTarget) * 100)))
        : 50;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleWrap}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>
                    <Text style={styles.subText}>{loadType?.toUpperCase().replace("_", " ")} MILESTONE</Text>
                </View>
                <View style={[styles.horizonBadge, { backgroundColor: "rgba(0, 200, 83, 0.12)", borderColor: "rgba(0, 200, 83, 0.3)" }]}>
                    <Ionicons name="time-outline" size={12} color="#00C853" />
                    <Text style={styles.horizonText}>~{projectedWeeks} WKS</Text>
                </View>
            </View>

            {/* Target Numbers */}
            <View style={styles.numbersRow}>
                <View style={styles.numberBlock}>
                    <Text style={styles.numberLabel}>CURRENT BEST</Text>
                    <Text style={styles.currentVal}>
                        {currentBest} <Text style={styles.unitText}>{unit}</Text>
                    </Text>
                </View>

                <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} style={{ marginTop: 16 }} />

                <View style={[styles.numberBlock, { alignItems: "flex-end" }]}>
                    <Text style={styles.numberLabel}>NEXT TARGET</Text>
                    <Text style={styles.targetVal}>
                        {milestoneTarget} <Text style={styles.unitText}>{unit}</Text>
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>

            {/* Footer Rationale & Confidence */}
            <View style={styles.footerRow}>
                <Text style={styles.rationaleText} numberOfLines={2}>{rationale}</Text>
                <View style={styles.confWrap}>
                    <Text style={[styles.confText, { color: confidence === "HIGH" ? "#00C853" : "#FFB300" }]}>
                        {confidence} CONFIDENCE
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: 16,
        marginBottom: 12,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    titleWrap: {
        flex: 1,
        marginRight: 8,
    },
    exerciseName: {
        fontFamily: FAMILY.bold,
        fontSize: FONTS.md,
        color: COLORS.text,
    },
    subText: {
        fontFamily: FAMILY.monoMedium,
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    horizonBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    horizonText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 10,
        color: "#00C853",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    statusText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 10,
    },
    numbersRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    numberBlock: {
        flex: 1,
    },
    numberLabel: {
        fontFamily: FAMILY.monoMedium,
        fontSize: 10,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    currentVal: {
        fontFamily: FAMILY.bold,
        fontSize: FONTS.lg,
        color: COLORS.text,
    },
    targetVal: {
        fontFamily: FAMILY.bold,
        fontSize: FONTS.lg,
        color: "#00C853",
    },
    unitText: {
        fontFamily: FAMILY.monoMedium,
        fontSize: FONTS.xs,
        color: COLORS.textMuted,
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 10,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#00C853",
        borderRadius: 3,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    rationaleText: {
        fontFamily: FAMILY.regular,
        fontSize: FONTS.xs,
        color: COLORS.textMuted,
        flex: 1,
        marginRight: 8,
    },
    confWrap: {
        alignSelf: "flex-end",
    },
    confText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        letterSpacing: 0.5,
    },
});
