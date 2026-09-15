import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";

export default function MuscleResponseMatrix({ responseData = [] }) {
    if (!Array.isArray(responseData) || responseData.length === 0) return null;

    const getResponseBadge = (category) => {
        switch (category) {
            case "HIGH_RESPONDER":
                return { color: "#00E676", label: "HIGH RESPONDER", icon: "flash" };
            case "EFFICIENT_PROGRESSION":
                return { color: "#00C853", label: "EFFICIENT", icon: "trending-up" };
            case "FATIGUE_ACCUMULATING":
                return { color: COLORS.primary, label: "FATIGUE ACCUMULATING", icon: "alert-circle" };
            case "LOW_VOLUME_MAINTENANCE":
                return { color: "#FFB300", label: "MAINTENANCE", icon: "remove" };
            default:
                return { color: COLORS.textMuted, label: "INSUFFICIENT DATA", icon: "help-circle-outline" };
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {responseData.map((item) => {
                    const badge = getResponseBadge(item.responseCategory);
                    return (
                        <View key={item.muscleGroup} style={styles.gridItem}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.muscleName}>{item.muscleGroup}</Text>
                                <Ionicons name={badge.icon} size={12} color={badge.color} />
                            </View>

                            <View style={styles.metricsRow}>
                                <Text style={styles.volumeText}>{item.volumeSets28d} sets/28d</Text>
                                <Text style={[styles.slopeText, { color: item.averageSlope >= 0 ? "#00C853" : COLORS.primary }]}>
                                    {item.averageSlope >= 0 ? "+" : ""}{item.averageSlope.toFixed(2)}/wk
                                </Text>
                            </View>

                            <View style={[styles.statusPill, { backgroundColor: `${badge.color}15`, borderColor: `${badge.color}30` }]}>
                                <Text style={[styles.statusText, { color: badge.color }]}>
                                    {badge.label}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    gridItem: {
        width: "48.5%",
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: 12,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    muscleName: {
        fontFamily: FAMILY.bold,
        fontSize: FONTS.sm,
        color: COLORS.text,
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    volumeText: {
        fontFamily: FAMILY.monoRegular,
        fontSize: 10,
        color: COLORS.textMuted,
    },
    slopeText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 10,
    },
    statusPill: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        alignItems: "center",
    },
    statusText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        letterSpacing: 0.3,
    },
});
