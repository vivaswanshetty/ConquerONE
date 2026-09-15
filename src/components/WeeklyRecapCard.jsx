import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

export default function WeeklyRecapCard({
    recap,
}) {
    if (!recap) return null;

    const {
        adherence = {},
        volume = {},
        performance = {},
        takeaways = [],
        nextWeekFocus = "",
    } = recap;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#161619", "#111114"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                        <Ionicons name="calendar" size={13} color={COLORS.primary} />
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
                        <Text style={[styles.metricValue, { color: (performance.newPRCount > 0) ? "#30D158" : "#FFFFFF" }]}>
                            {performance.newPRCount || 0}
                        </Text>
                    </View>
                </View>

                {/* Top Takeaways */}
                {takeaways.length > 0 && (
                    <View style={styles.takeawaysList}>
                        {takeaways.slice(0, 2).map((item, idx) => (
                            <View key={idx} style={styles.takeawayItem}>
                                <Ionicons name="chevron-forward" size={12} color={COLORS.primary} style={{ marginTop: 3 }} />
                                <Text style={styles.takeawayText} numberOfLines={2}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Next Week Focus */}
                {nextWeekFocus ? (
                    <View style={styles.focusBox}>
                        <Ionicons name="flag-outline" size={13} color="#FF9F0A" />
                        <Text style={styles.focusText} numberOfLines={2}>
                            <Text style={{ fontFamily: FAMILY.chakraBold, color: "#FF9F0A" }}>Focus: </Text>
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
        fontSize: 12,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    adherencePill: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    adherencePillText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.4,
    },
    metricsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    metricCell: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.025)",
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        alignItems: "center",
    },
    metricLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
        marginBottom: 4,
        textAlign: "center",
    },
    metricValue: {
        fontSize: 15.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        fontVariant: ["tabular-nums"],
        textAlign: "center",
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
        color: "#D1D1D6",
        lineHeight: 17,
    },
    focusBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255, 159, 10, 0.08)",
        padding: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 159, 10, 0.22)",
    },
    focusText: {
        flex: 1,
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: "#E0E0E6",
        lineHeight: 17,
    },
});
