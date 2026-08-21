/**
 * StatTile — a labelled metric on a soft card.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FAMILY, RADIUS, SPACING, TRACKING } from "../../utils/theme";
import Card, { withAlpha } from "./Card";
import AnimatedNumber from "./AnimatedNumber";

export default function StatTile({
    label,
    value,              // number → counts up; string → rendered as-is
    unit,
    icon,
    color = COLORS.softText,
    onPress,
    countUp = true,
    delay = 0,
    align = "flex-start",
    style,
    valueStyle,
}) {
    const isNumeric = typeof value === "number" && Number.isFinite(value);

    return (
        <Card
            onPress={onPress}
            radius={RADIUS.tile}
            padding={SPACING.md + 2}
            style={[styles.tile, { alignItems: align }, style]}
        >
            {!!icon && (
                <View
                    style={[
                        styles.iconWrap,
                        { backgroundColor: withAlpha(color, 0.14) },
                    ]}
                >
                    <Ionicons name={icon} size={15} color={color} />
                </View>
            )}

            <View style={[styles.valueRow, { justifyContent: align }]}>
                {isNumeric && countUp ? (
                    <AnimatedNumber
                        value={value}
                        delay={delay}
                        style={[styles.value, { color }, valueStyle]}
                    />
                ) : (
                    <Text
                        style={[styles.value, { color }, valueStyle]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {value}
                    </Text>
                )}
                {!!unit && <Text style={styles.unit}>{unit}</Text>}
            </View>

            <Text style={styles.label} numberOfLines={1}>
                {label}
            </Text>
        </Card>
    );
}

const styles = StyleSheet.create({
    tile: { justifyContent: "center" },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: SPACING.sm,
    },
    valueRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 4,
    },
    value: {
        fontSize: 28,
        fontFamily: FAMILY.softBlack,
        letterSpacing: TRACKING.display,
    },
    unit: {
        fontSize: 13,
        fontFamily: FAMILY.softMed,
        color: COLORS.softTextSub,
        letterSpacing: TRACKING.snug,
        marginBottom: 3,
    },
    label: {
        fontSize: 13,
        fontFamily: FAMILY.soft,
        color: COLORS.softTextSub,
        letterSpacing: TRACKING.snug,
        marginTop: 4,
    },
});
