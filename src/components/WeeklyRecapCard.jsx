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
                colors={["rgba(255, 255, 255, 0.04)", "rgba(255, 255, 255, 0.008)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="calendar-outline" size={12} color={COLORS.primary} />
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
                            <Ionicons name="chevron-forward" size={11} color={COLORS.primary} style={{ marginTop: 3 }} />
                            <Text style={styles.takeawayText} numberOfLines={2}>{item}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Next Week Focus */}
            {nextWeekFocus ? (
                <View style={styles.focusBox}>
                    <Ionicons name="flag-outline" size={12} color="#FF9F0A" />
                    <Text style={styles.focusText} numberOfLines={2}>
                        <Text style={{ fontFamily: FAMILY.monoBold, color: "#FF9F0A" }}>FOCUS: </Text>
                        {nextWeekFocus}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "#131316",
        padding: 16,
        overflow: "hidden",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 11,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    adherencePill: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        paddingHorizontal: 7,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    adherencePillText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
        letterSpacing: 0.3,
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    metricsRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 10,
    },
    metricCell: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
        alignItems: "center",
    },
    metricLabel: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
        textAlign: "center",
    },
    metricValue: {
        fontSize: 14.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        fontVariant: ["tabular-nums"],
        textAlign: "center",
    },
    takeawaysList: {
        gap: 5,
        marginBottom: 8,
    },
    takeawayItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 5,
    },
    takeawayText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: FAMILY.body,
        color: "#D1D1D6",
        lineHeight: 16,
    },
    focusBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255, 159, 10, 0.06)",
        padding: 9,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(255, 159, 10, 0.18)",
    },
    focusText: {
        flex: 1,
        fontSize: 11.5,
        fontFamily: FAMILY.body,
        color: "#E0E0E6",
        lineHeight: 15.5,
    },
});
