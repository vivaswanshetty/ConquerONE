/**
 * PrimaryButton — the main call to action.
 * 56px tall, fully rounded, sentence case, gradient fill.
 */
import React from "react";
import { Text, View, Animated, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, RADIUS, GRADIENTS, TRACKING } from "../../utils/theme";
import { usePressScale } from "./motion";

export default function PrimaryButton({
    label,
    icon,
    iconRight,
    onPress,
    colors = GRADIENTS.moveRing,
    textColor = "#FFFFFF",
    height = 56,
    disabled = false,
    hapticStyle = "medium",
    style,
    textStyle,
}) {
    const { scale, onPressIn, onPressOut } = usePressScale(0.97);

    const handlePress = (e) => {
        const map = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };
        Haptics.impactAsync(map[hapticStyle] || map.medium).catch(() => { });
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
                    { height, borderRadius: RADIUS.pill },
                    { transform: [{ scale }] },
                    disabled && styles.disabled,
                ]}
            >
                <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.content}>
                    {!!icon && <Ionicons name={icon} size={19} color={textColor} />}
                    <Text style={[styles.label, { color: textColor }, textStyle]}>
                        {label}
                    </Text>
                    {!!iconRight && (
                        <Ionicons name={iconRight} size={19} color={textColor} />
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrap: {
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.softMove,
        shadowOpacity: 0.3,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
    },
    label: {
        fontSize: 16.5,
        fontFamily: FAMILY.softBold,
        letterSpacing: TRACKING.snug,
    },
    disabled: { opacity: 0.4 },
});
