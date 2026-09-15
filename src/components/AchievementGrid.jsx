import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

export default function AchievementGrid({
    achievements = [],
}) {
    if (!Array.isArray(achievements) || achievements.length === 0) {
        return null;
    }

    return (
        <View style={styles.gridContainer}>
            {achievements.map((ach) => {
                const isUnlocked = ach.isUnlocked;
                const pct = ach.progress?.percentage || 0;

                return (
                    <View
                        key={ach.id}
                        style={[
                            styles.achCard,
                            isUnlocked ? styles.achCardUnlocked : styles.achCardLocked,
                        ]}
                    >
                        <View style={styles.iconBox}>
                            <Ionicons
                                name={ach.icon || "ribbon-outline"}
                                size={18}
                                color={isUnlocked ? "#10B981" : COLORS.textMuted}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                                <Text style={[styles.achTitle, !isUnlocked && { color: "#9CA3AF" }]}>
                                    {ach.title}
                                </Text>
                                {isUnlocked && (
                                    <View style={styles.unlockedBadge}>
                                        <Text style={styles.unlockedText}>UNLOCKED</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.achDesc} numberOfLines={2}>
                                {ach.description}
                            </Text>

                            {/* Progress bar */}
                            {!isUnlocked && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${Math.min(100, pct)}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {ach.progress?.current || 0}/{ach.progress?.target || 1} {ach.progress?.unit || ""} ({pct}%)
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    gridContainer: {
        gap: 10,
        paddingVertical: 4,
    },
    achCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 12,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        gap: 12,
    },
    achCardUnlocked: {
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        borderColor: "rgba(16, 185, 129, 0.2)",
    },
    achCardLocked: {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        alignItems: "center",
        justifyContent: "center",
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 2,
    },
    achTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
    },
    unlockedBadge: {
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    unlockedText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: "#10B981",
        letterSpacing: 0.5,
    },
    achDesc: {
        fontSize: 11.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 16,
    },
    progressContainer: {
        marginTop: 6,
        gap: 3,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#10B981",
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        fontFamily: FAMILY.medium,
        color: COLORS.textMuted,
    },
});

