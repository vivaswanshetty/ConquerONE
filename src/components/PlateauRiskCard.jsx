import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";

export default function PlateauRiskCard({ riskData }) {
    if (!riskData) return null;

    const {
        exerciseName,
        loadType,
        riskScore,
        riskLevel,
        factors = {},
        recommendation,
        confidence,
    } = riskData;

    const getRiskColor = (lvl) => {
        switch (lvl) {
            case "ELEVATED_RISK":
                return COLORS.primary;
            case "MODERATE":
                return "#FF9500";
            case "LOW":
                return "#00C853";
            default:
                return COLORS.textMuted;
        }
    };

    const riskColor = getRiskColor(riskLevel);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleWrap}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{exerciseName}</Text>
                    <Text style={styles.subText}>{loadType?.toUpperCase().replace("_", " ")} · PLATEAU RISK</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: `${riskColor}15`, borderColor: `${riskColor}40` }]}>
                    <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
                    <Text style={[styles.riskText, { color: riskColor }]}>{riskLevel.replace("_", " ")}</Text>
                </View>
            </View>

            {/* Factor Pills */}
            <View style={styles.factorsRow}>
                <View style={[styles.factorPill, factors.stagnantSessions >= 2 && styles.factorPillActive]}>
                    <Text style={[styles.factorText, factors.stagnantSessions >= 2 && { color: riskColor }]}>
                        {factors.stagnantSessions} STAGNANT SESSIONS
                    </Text>
                </View>
                {factors.velocityDecay && (
                    <View style={[styles.factorPill, styles.factorPillActive]}>
                        <Text style={[styles.factorText, { color: riskColor }]}>VELOCITY DECAY</Text>
                    </View>
                )}
                {factors.setDropOff && (
                    <View style={[styles.factorPill, styles.factorPillActive]}>
                        <Text style={[styles.factorText, { color: riskColor }]}>REP DROP-OFF</Text>
                    </View>
                )}
                {factors.systemicFatigue && (
                    <View style={[styles.factorPill, styles.factorPillActive]}>
                        <Text style={[styles.factorText, { color: riskColor }]}>HIGH ACWR STRESS</Text>
                    </View>
                )}
            </View>

            {/* Recommendation Box */}
            <View style={styles.recBox}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} style={{ marginTop: 2 }} />
                <Text style={styles.recText}>{recommendation}</Text>
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
    riskBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    riskDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    riskText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 10,
        letterSpacing: 0.5,
    },
    factorsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
    },
    factorPill: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: RADIUS.xs,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    factorPillActive: {
        backgroundColor: "rgba(227,30,36,0.08)",
        borderColor: "rgba(227,30,36,0.2)",
    },
    factorText: {
        fontFamily: FAMILY.monoMedium,
        fontSize: 10,
        color: COLORS.textMuted,
    },
    recBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderRadius: RADIUS.sm,
        padding: 10,
    },
    recText: {
        fontFamily: FAMILY.regular,
        fontSize: FONTS.xs,
        color: COLORS.textMuted,
        flex: 1,
        lineHeight: 16,
    },
});
