/**
 * SecondaryButton — quieter action. Tinted fill, no gradient.
 */
import React from "react";
import { Text, View, Animated, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, RADIUS, TRACKING } from "../../utils/theme";
import { withAlpha } from "./Card";
import { usePressScale } from "./motion";

export default function SecondaryButton({
    label,
    icon,
    iconRight,
    onPress,
    color = COLORS.softText,
    height = 52,
    tint,                 // background source; defaults to a soft white fill
    bordered = true,
    disabled = false,
    style,
    textStyle,
}) {
    const { scale, onPressIn, onPressOut } = usePressScale(0.97);

    const handlePress = (e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        onPress?.(e);
    };

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={disabled}
            style={style}
        >
            <Animated.View
                style={[
                    styles.wrap,
                    {
                        height,
                        backgroundColor: tint ? withAlpha(tint, 0.13) : COLORS.softFill,
                        borderColor: bordered
                            ? tint
                                ? withAlpha(tint, 0.24)
                                : COLORS.softBorderHi
                            : "transparent",
                        borderWidth: bordered ? StyleSheet.hairlineWidth * 2 : 0,
                        transform: [{ scale }],
                    },
                    disabled && styles.disabled,
                ]}
            >
                <View style={styles.content}>
                    {!!icon && <Ionicons name={icon} size={17} color={color} />}
                    <Text style={[styles.label, { color }, textStyle]}>{label}</Text>
                    {!!iconRight && (
                        <Ionicons name={iconRight} size={17} color={color} />
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: {
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    label: {
        fontSize: 15,
        fontFamily: FAMILY.softBold,
        letterSpacing: TRACKING.snug,
    },
    disabled: { opacity: 0.4 },
});
