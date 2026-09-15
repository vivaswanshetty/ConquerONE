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
        gap: 8,
        paddingVertical: 4,
    },
    achCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        gap: 10,
    },
    achCardUnlocked: {
        backgroundColor: "#141416",
        borderColor: "rgba(48, 209, 88, 0.25)",
    },
    achCardLocked: {
        backgroundColor: "#141416",
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    iconBox: {
        width: 30,
        height: 30,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
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
        fontSize: 12.5,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
    unlockedBadge: {
        backgroundColor: "rgba(48, 209, 88, 0.12)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.25)",
    },
    unlockedText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.5,
    },
    achDesc: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: COLORS.textSub,
        lineHeight: 15,
    },
    progressContainer: {
        marginTop: 5,
        gap: 2,
    },
    progressBarBg: {
        height: 3,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 1.5,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#30D158",
        borderRadius: 1.5,
    },
    progressText: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
});

