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
        paddingVertical: 6,
    },
    emptyContainer: {
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    emptyText: {
        fontSize: 11.5,
        fontFamily: FAMILY.body,
        color: COLORS.textMuted,
        textAlign: "center",
    },
    timelineItem: {
        flexDirection: "row",
        marginBottom: 10,
    },
    iconCol: {
        alignItems: "center",
        width: 28,
        marginRight: 8,
    },
    iconCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#141416",
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    connectorLine: {
        width: 1,
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        marginVertical: 3,
    },
    contentCol: {
        flex: 1,
        backgroundColor: "#141416",
        borderRadius: RADIUS.sm,
        padding: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
    },
    itemTitle: {
        fontSize: 12,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },
    itemDate: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    itemDesc: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
        lineHeight: 15,
    },
});
