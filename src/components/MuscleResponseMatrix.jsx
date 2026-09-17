import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";

const { width } = Dimensions.get("window");
// Container has marginHorizontal: 16 (32px total horizontal margin), gap between columns is 8px
const ITEM_WIDTH = Math.floor((width - 32 - 8) / 2);

export default function MuscleResponseMatrix({ responseData = [] }) {
    if (!Array.isArray(responseData) || responseData.length === 0) return null;

    const getResponseBadge = (category) => {
        switch (category) {
            case "HIGH_RESPONDER":
                return { color: "#30D158", label: "HIGH RESPONDER", icon: "flash" };
            case "EFFICIENT_PROGRESSION":
                return { color: "#30D158", label: "EFFICIENT", icon: "trending-up" };
            case "FATIGUE_ACCUMULATING":
                return { color: COLORS.primary, label: "FATIGUE ACCUMULATING", icon: "alert-circle" };
            case "LOW_VOLUME_MAINTENANCE":
                return { color: "#FF9F0A", label: "MAINTENANCE", icon: "remove" };
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
                                <Text style={styles.muscleName} numberOfLines={1}>{item.muscleGroup}</Text>
                                <Ionicons name={badge.icon} size={12} color={badge.color} />
                            </View>

                            <View style={styles.metricsRow}>
                                <Text style={styles.volumeText}>{item.volumeSets28d} sets/28d</Text>
                                <Text style={[styles.slopeText, { color: item.averageSlope >= 0 ? "#30D158" : COLORS.primary }]}>
                                    {item.averageSlope >= 0 ? "+" : ""}{item.averageSlope.toFixed(2)}/wk
                                </Text>
                            </View>

                            <View style={[styles.statusPill, { backgroundColor: `${badge.color}15`, borderColor: `${badge.color}30` }]}>
                                <Text style={[styles.statusText, { color: badge.color }]} numberOfLines={1}>
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
        marginBottom: 14,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    gridItem: {
        width: ITEM_WIDTH,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.11)",
        padding: 10,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    muscleName: {
        fontFamily: FAMILY.chakraBold,
        fontSize: 12,
        color: "#FFFFFF",
        letterSpacing: 0.3,
        includeFontPadding: false,
        flex: 1,
        marginRight: 4,
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    volumeText: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textMuted,
        includeFontPadding: false,
    },
    slopeText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9.5,
        fontVariant: ["tabular-nums"],
        includeFontPadding: false,
    },
    statusPill: {
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 8.5,
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
});
