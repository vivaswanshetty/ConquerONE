import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../utils/theme";

/**
 * Reusable SkeletonBlock component.
 * Features a View with COLORS.bgCard background, configurable RADIUS,
 * and a shimmer effect via Animated looping between 0.4 and 0.8 opacity on a 1200ms cycle,
 * staggered slightly per block.
 */
export default function SkeletonBlock({
    width,
    height,
    borderRadius = RADIUS.md,
    delay = 0,
    index = 0,
    style,
    children,
}) {
    const opacity = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const staggerDelay = delay || (index ? index * 140 : 0);
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.8,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.4,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        );

        const timer = setTimeout(() => {
            animation.start();
        }, staggerDelay);

        return () => {
            clearTimeout(timer);
            animation.stop();
        };
    }, [delay, index]);

    return (
        <Animated.View
            style={[
                styles.block,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    block: {
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
    },
});
