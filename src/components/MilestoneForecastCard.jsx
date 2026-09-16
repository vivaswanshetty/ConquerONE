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
                <View style={[styles.horizonBadge, { backgroundColor: "rgba(48, 209, 88, 0.12)", borderColor: "rgba(48, 209, 88, 0.3)" }]}>
                    <Ionicons name="time-outline" size={12} color="#30D158" />
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
                    <Text style={[styles.confText, { color: confidence === "HIGH" ? "#30D158" : "#FF9F0A" }]}>
                        {confidence} CONFIDENCE
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#050507",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.11)",
        padding: 14,
        marginBottom: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    titleWrap: {
        flex: 1,
        marginRight: 8,
    },
    exerciseName: {
        fontFamily: FAMILY.chakraBold,
        fontSize: 14,
        color: "#FFFFFF",
    },
    subText: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    horizonBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    horizonText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        color: "#30D158",
    },
    statusBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
    },
    statusText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
    },
    numbersRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    numberBlock: {
        flex: 1,
    },
    numberLabel: {
        fontFamily: FAMILY.monoBold,
        fontSize: 8,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    currentVal: {
        fontFamily: FAMILY.monoBold,
        fontSize: 15,
        color: "#FFFFFF",
        fontVariant: ["tabular-nums"],
    },
    targetVal: {
        fontFamily: FAMILY.monoBold,
        fontSize: 15,
        color: "#30D158",
        fontVariant: ["tabular-nums"],
    },
    unitText: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textMuted,
    },
    progressBarTrack: {
        height: 4,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#30D158",
        borderRadius: 2,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    rationaleText: {
        fontFamily: FAMILY.body,
        fontSize: 11,
        color: COLORS.textSub,
        flex: 1,
        marginRight: 8,
        lineHeight: 15,
    },
    confWrap: {
        alignSelf: "flex-end",
    },
    confText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 8.5,
        letterSpacing: 0.4,
    },
});
