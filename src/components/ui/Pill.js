/**
 * Pill — rounded, tinted chip. Sentence case, no letterspacing.
 *
 * Replaces the all-caps HUD badges ("SYS ACTIVE", "TODAY'S PROTOCOL",
 * shortcut-bar items, rep/rest chips).
 */
import React from "react";
import { Text, View, Animated, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, RADIUS, TRACKING } from "../../utils/theme";
import { withAlpha } from "./Card";
import { usePressScale } from "./motion";

const SIZES = {
    sm: { height: 26, padH: 10, font: 11.5, icon: 12, gap: 4 },
    md: { height: 32, padH: 13, font: 13, icon: 14, gap: 5 },
    lg: { height: 40, padH: 16, font: 14, icon: 16, gap: 6 },
};

export default function Pill({
    label,
    icon,
    color = COLORS.softTextSub,   // text + icon + tint source
    bg,                            // override the computed tint
    size = "md",
    solid = false,                 // filled with `color`, text goes dark
    bordered = true,
    onPress,
    style,
    textStyle,
}) {
    const s = SIZES[size] || SIZES.md;
    const { scale, onPressIn, onPressOut } = usePressScale(0.94);

    const fg = solid ? COLORS.softBg : color;
    const background = solid ? color : bg || withAlpha(color, 0.13);

    const body = (
        <View
            style={[
                styles.pill,
                {
                    height: s.height,
                    paddingHorizontal: s.padH,
                    gap: s.gap,
                    backgroundColor: background,
                    borderColor: bordered && !solid
                        ? withAlpha(color, 0.22)
                        : "transparent",
                    borderWidth: bordered && !solid ? StyleSheet.hairlineWidth * 2 : 0,
                },
                style,
            ]}
        >
            {!!icon && <Ionicons name={icon} size={s.icon} color={fg} />}
            {!!label && (
                <Text
                    style={[
                        styles.text,
                        { fontSize: s.font, color: fg },
                        textStyle,
                    ]}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            )}
        </View>
    );

    if (!onPress) return body;

    const handlePress = (e) => {
        Haptics.selectionAsync().catch(() => { });
        onPress(e);
    };

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
        >
            <Animated.View style={{ transform: [{ scale }] }}>{body}</Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIUS.pill,
    },
    text: {
        fontFamily: FAMILY.softMed,
        letterSpacing: TRACKING.snug,
    },
});
