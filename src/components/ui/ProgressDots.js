/**
 * ProgressDots — the ●●●●●●●○○○ indicator.
 *
 * Dots fill in with a short stagger so progress reads as motion
 * rather than a static bar.
 */
import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { COLORS } from "../../utils/theme";
import { SPRING } from "./motion";

function Dot({ filled, size, color, emptyColor, delay, animate }) {
    const grow = useRef(new Animated.Value(animate && filled ? 0 : 1)).current;

    useEffect(() => {
        if (!animate) {
            grow.setValue(1);
            return;
        }
        const anim = Animated.spring(grow, {
            toValue: 1,
            delay: filled ? delay : 0,
            ...SPRING.settle,
        });
        anim.start();
        return () => anim.stop();
    }, [filled, delay, animate, grow]);

    return (
        <Animated.View
            style={[
                styles.dot,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: filled ? color : emptyColor,
                    transform: [{ scale: filled ? grow : 1 }],
                },
            ]}
        />
    );
}

export default function ProgressDots({
    total = 10,
    filled = 0,
    size = 7,
    gap = 6,
    color = COLORS.softMove,
    emptyColor = COLORS.softFill,
    animate = true,
    style,
}) {
    const count = Math.max(0, Math.round(total));
    const on = Math.max(0, Math.min(count, Math.round(filled)));

    return (
        <View style={[styles.row, { gap }, style]}>
            {Array.from({ length: count }, (_, i) => (
                <Dot
                    key={i}
                    filled={i < on}
                    size={size}
                    color={color}
                    emptyColor={emptyColor}
                    delay={i * 40}
                    animate={animate}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center" },
    dot: {},
});
