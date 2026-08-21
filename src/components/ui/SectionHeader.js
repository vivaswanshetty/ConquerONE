/**
 * SectionHeader — sentence-case section title.
 *
 * Replaces the 10px all-caps `letterSpacing: 4` micro-labels
 * ("WEEKLY PLAN", "WORKOUT LIBRARY", "MOMENTS").
 */
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, SPACING, TRACKING } from "../../utils/theme";

export default function SectionHeader({
    title,
    subtitle,
    actionLabel,
    onAction,
    style,
}) {
    const handleAction = () => {
        Haptics.selectionAsync().catch(() => { });
        onAction?.();
    };

    return (
        <View style={[styles.row, style]}>
            <View style={styles.textCol}>
                <Text style={styles.title}>{title}</Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            {!!onAction && (
                <Pressable
                    onPress={handleAction}
                    hitSlop={10}
                    style={styles.action}
                >
                    {!!actionLabel && (
                        <Text style={styles.actionText}>{actionLabel}</Text>
                    )}
                    <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={COLORS.softTextSub}
                    />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingHorizontal: SPACING.base,
        marginBottom: SPACING.md,
    },
    textCol: { flex: 1 },
    title: {
        fontSize: 21,
        fontFamily: FAMILY.softBold,
        color: COLORS.softText,
        letterSpacing: TRACKING.tight,
    },
    subtitle: {
        fontSize: 13.5,
        fontFamily: FAMILY.soft,
        color: COLORS.softTextSub,
        letterSpacing: TRACKING.snug,
        marginTop: 3,
    },
    action: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingLeft: SPACING.sm,
        paddingBottom: 2,
    },
    actionText: {
        fontSize: 14,
        fontFamily: FAMILY.softMed,
        color: COLORS.softTextSub,
        letterSpacing: TRACKING.snug,
    },
});
