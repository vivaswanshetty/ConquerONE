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
                return "#FF9F0A";
            case "LOW":
                return "#30D158";
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
        includeFontPadding: false,
    },
    subText: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textMuted,
        marginTop: 2,
        includeFontPadding: false,
    },
    riskBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    riskDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    riskText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        letterSpacing: 0.5,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    factorsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 5,
        marginBottom: 10,
    },
    factorPill: {
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        borderRadius: RADIUS.xs,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        alignItems: "center",
        justifyContent: "center",
    },
    factorPillActive: {
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        borderColor: "rgba(227, 30, 36, 0.2)",
    },
    factorText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 8.5,
        color: COLORS.textMuted,
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    recBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        borderRadius: RADIUS.xs,
        padding: 9,
    },
    recText: {
        fontFamily: FAMILY.body,
        fontSize: 11,
        color: COLORS.textSub,
        flex: 1,
        lineHeight: 15.5,
        includeFontPadding: false,
    },
});
