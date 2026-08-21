/**
 * Card — the base soft premium surface.
 *
 * Replaces the hand-rolled `glassBg` + `glassBorder` + LinearGradient
 * combination that every screen used to redeclare.
 */
import React from "react";
import { View, Animated, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { COLORS, RADIUS, SPACING, GRADIENTS } from "../../utils/theme";
import { usePressScale } from "./motion";

export default function Card({
    children,
    style,
    onPress,
    tint,               // accent colour for a subtle wash + border lift
    radius = RADIUS.card,
    padding = SPACING.cardPad,
    sheen = true,       // top highlight that fakes a light source
    raised = false,     // use the higher surface tone
    haptic = true,
    ...rest
}) {
    const { scale, onPressIn, onPressOut } = usePressScale(0.985);

    const surface = [
        styles.base,
        {
            borderRadius: radius,
            padding,
            backgroundColor: raised ? COLORS.softCardHi : COLORS.softCard,
        },
        tint && { borderColor: withAlpha(tint, 0.18) },
        style,
    ];

    const inner = (
        <>
            {sheen && (
                <LinearGradient
                    colors={GRADIENTS.soft}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
                    pointerEvents="none"
                />
            )}
            {tint && (
                <LinearGradient
                    colors={[withAlpha(tint, 0.13), "transparent"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
                    pointerEvents="none"
                />
            )}
            {children}
        </>
    );

    if (!onPress) {
        return (
            <View style={surface} {...rest}>
                {inner}
            </View>
        );
    }

    const handlePress = (e) => {
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        }
        onPress(e);
    };

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            {...rest}
        >
            <Animated.View style={[surface, { transform: [{ scale }] }]}>
                {inner}
            </Animated.View>
        </Pressable>
    );
}

/** Turn a #RRGGBB hex into rgba(). Non-hex input is returned untouched. */
export function withAlpha(color, alpha) {
    if (typeof color !== "string" || color[0] !== "#" || color.length !== 7) {
        return color;
    }
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
    base: {
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: COLORS.softBorder,
        overflow: "hidden",
    },
});
