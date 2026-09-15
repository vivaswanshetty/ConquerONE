import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

export default function AthleteTimelineList({
    events = [],
}) {
    if (!Array.isArray(events) || events.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={24} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No historical athlete events recorded yet.</Text>
            </View>
        );
    }

    const getEventIcon = (type) => {
        switch (type) {
            case "NEW_PR":
                return { name: "trophy", color: "#10B981" };
            case "PROGRAM_ADAPTED":
                return { name: "git-branch", color: "#F59E0B" };
            case "DELOAD_STARTED":
            case "DELOAD_COMPLETED":
                return { name: "refresh-circle", color: "#8B5CF6" };
            case "CONSISTENCY_STREAK":
                return { name: "flame", color: COLORS.primary };
            case "WORKOUT_COMPLETED":
            default:
                return { name: "checkmark-circle", color: COLORS.primary };
        }
    };

    return (
        <View style={styles.container}>
            {events.slice(0, 15).map((item, idx) => {
                const icon = getEventIcon(item.type);
                const dateLabel = new Date(item.timestamp).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                });

                return (
                    <View key={item.id || idx} style={styles.timelineItem}>
                        <View style={styles.iconCol}>
                            <View style={[styles.iconCircle, { borderColor: icon.color }]}>
                                <Ionicons name={icon.name} size={13} color={icon.color} />
                            </View>
                            {idx < events.length - 1 && <View style={styles.connectorLine} />}
                        </View>
                        <View style={styles.contentCol}>
                            <View style={styles.titleRow}>
                                <Text style={styles.itemTitle}>{item.title}</Text>
                                <Text style={styles.itemDate}>{dateLabel}</Text>
                            </View>
                            <Text style={styles.itemDesc}>{item.description}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    emptyContainer: {
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    emptyText: {
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        textAlign: "center",
    },
    timelineItem: {
        flexDirection: "row",
        marginBottom: 14,
    },
    iconCol: {
        alignItems: "center",
        width: 32,
        marginRight: 10,
    },
    iconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#16161C",
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    connectorLine: {
        width: 1.5,
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        marginVertical: 4,
    },
    contentCol: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.sm,
        padding: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 3,
    },
    itemTitle: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
    },
    itemDate: {
        fontSize: 10.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
    },
    itemDesc: {
        fontSize: 11.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 16,
    },
});
