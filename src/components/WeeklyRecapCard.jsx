import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

export default function WeeklyRecapCard({
    recap,
    onPressDetails,
}) {
    if (!recap) return null;

    const {
        adherence = {},
        volume = {},
        performance = {},
        recovery = {},
        takeaways = [],
        nextWeekFocus = "",
    } = recap;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#16161C", "#111115"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                        <Ionicons name="calendar" size={14} color={COLORS.primary} />
                        <Text style={styles.headerTitle}>7-DAY ATHLETE RECAP</Text>
                    </View>
                    <View style={styles.adherencePill}>
                        <Text style={styles.adherencePillText}>
                            {adherence.sessionsCompleted || 0}/{adherence.plannedDays || 6} SESSIONS ({adherence.adherenceRate || 0}%)
                        </Text>
                    </View>
                </View>

                {/* Metrics 3-Col Row */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>EXT. TONNAGE</Text>
                        <Text style={styles.metricValue}>
                            {volume.externalTonnageKg ? `${Math.round(volume.externalTonnageKg)} kg` : "0 kg"}
                        </Text>
                    </View>
                    <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>HARD SETS</Text>
                        <Text style={styles.metricValue}>{volume.totalWorkingSets || 0}</Text>
                    </View>
                    <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>NEW PRS</Text>
                        <Text style={[styles.metricValue, { color: (performance.newPRCount > 0) ? "#10B981" : "#FFFFFF" }]}>
                            {performance.newPRCount || 0}
                        </Text>
                    </View>
                </View>

                {/* Top Takeaways */}
                {takeaways.length > 0 && (
                    <View style={styles.takeawaysList}>
                        {takeaways.slice(0, 2).map((item, idx) => (
                            <View key={idx} style={styles.takeawayItem}>
                                <Ionicons name="chevron-forward" size={12} color={COLORS.primary} style={{ marginTop: 2 }} />
                                <Text style={styles.takeawayText} numberOfLines={2}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Next Week Focus */}
                {nextWeekFocus ? (
                    <View style={styles.focusBox}>
                        <Ionicons name="flag-outline" size={13} color="#F59E0B" />
                        <Text style={styles.focusText} numberOfLines={2}>
                            <Text style={{ fontFamily: FAMILY.bold, color: "#F59E0B" }}>Focus: </Text>
                            {nextWeekFocus}
                        </Text>
                    </View>
                ) : null}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: SPACING.base,
        marginVertical: 6,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
    },
    cardGradient: {
        padding: 16,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    adherencePill: {
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    adherencePillText: {
        fontSize: 10,
        fontFamily: FAMILY.semibold,
        color: COLORS.textSub,
    },
    metricsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    metricCell: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        padding: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    metricLabel: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    metricValue: {
        fontSize: 14,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
    },
    takeawaysList: {
        gap: 6,
        marginBottom: 10,
    },
    takeawayItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
    },
    takeawayText: {
        flex: 1,
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: "#D1D5DB",
        lineHeight: 16,
    },
    focusBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        padding: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.2)",
    },
    focusText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: FAMILY.regular,
        color: "#E5E7EB",
        lineHeight: 16,
    },
});
