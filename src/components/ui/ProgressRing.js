/**
 * ProgressRing — Apple-Fitness-style gradient ring.
 *
 * Rounded linecaps + a two-stop gradient stroke, animated via
 * strokeDashoffset. Follows the same Svg/Defs/LinearGradient pattern
 * already used by the consistency chart on HomeScreen.
 */
import React, { useEffect, useRef, useMemo } from "react";
import { View, Animated, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop, G } from "react-native-svg";
import { COLORS, GRADIENTS } from "../../utils/theme";
import { EASE_OUT } from "./motion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Each ring needs its own gradient id, or several rings on one screen
// resolve to whichever <Defs> mounted last.
let uid = 0;

export default function ProgressRing({
    size = 200,
    stroke = 12,
    progress = 0,               // 0..1
    colors = GRADIENTS.moveRing,
    track = COLORS.softFill,
    duration = 700,
    animate = true,
    rounded = true,
    children,
    style,
}) {
    const gradientId = useMemo(() => `ring-grad-${++uid}`, []);

    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    const anim = useRef(new Animated.Value(animate ? 0 : clamped)).current;

    useEffect(() => {
        if (!animate) {
            anim.setValue(clamped);
            return;
        }
        const run = Animated.timing(anim, {
            toValue: clamped,
            duration,
            easing: EASE_OUT,
            useNativeDriver: false, // animating an SVG prop
        });
        run.start();
        return () => run.stop();
    }, [clamped, duration, animate, anim]);

    const dashoffset = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
    });

    return (
        <View style={[{ width: size, height: size }, style]}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={colors[0]} />
                        <Stop offset="1" stopColor={colors[colors.length - 1]} />
                    </LinearGradient>
                </Defs>

                {/* Rotate so the sweep starts at 12 o'clock */}
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={track}
                        strokeWidth={stroke}
                        fill="none"
                    />
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={`url(#${gradientId})`}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        strokeLinecap={rounded ? "round" : "butt"}
                        fill="none"
                    />
                </G>
            </Svg>

            {!!children && (
                <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center" },
});
