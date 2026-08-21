/**
 * Motion presets for the soft premium UI.
 *
 * Uses the React Native `Animated` API to match the rest of the
 * codebase (react-native-reanimated is installed but unused, and
 * adopting it here would require Babel plugin changes).
 */
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/** Springs — low tension / high friction reads as "calm", not "bouncy". */
export const SPRING = {
    press: { friction: 8, tension: 320, useNativeDriver: true },
    settle: { friction: 9, tension: 120, useNativeDriver: true },
    soft: { friction: 11, tension: 90, useNativeDriver: true },
};

/** Timings — the standard iOS-ish ease curve. */
export const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

export const TIMING = {
    fast: { duration: 180, easing: EASE, useNativeDriver: true },
    base: { duration: 320, easing: EASE_OUT, useNativeDriver: true },
    slow: { duration: 520, easing: EASE_OUT, useNativeDriver: true },
};

/** Stagger step between sequential reveals. */
export const STAGGER = 55;

/**
 * Entrance animation: fade in + rise. Returns style values to spread
 * onto an Animated.View.
 *
 * @param {number} delay  ms to wait before starting
 * @param {number} rise   px to translate up from
 */
export function useReveal(delay = 0, rise = 12) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.timing(progress, {
            toValue: 1,
            delay,
            ...TIMING.base,
        });
        anim.start();
        return () => anim.stop();
    }, [delay, progress]);

    return {
        opacity: progress,
        transform: [
            {
                translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [rise, 0],
                }),
            },
        ],
    };
}

/**
 * Press feedback: scales down while held. Returns the animated scale
 * plus handlers to spread onto a Pressable/TouchableWithoutFeedback.
 */
export function usePressScale(to = 0.97) {
    const scale = useRef(new Animated.Value(1)).current;

    const onPressIn = () => {
        Animated.spring(scale, { toValue: to, ...SPRING.press }).start();
    };
    const onPressOut = () => {
        Animated.spring(scale, { toValue: 1, ...SPRING.press }).start();
    };

    return { scale, onPressIn, onPressOut };
}

/** Slow breathing loop, e.g. for halos behind a hero element. */
export function useBreathe(duration = 2600) {
    const value = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(value, {
                    toValue: 1,
                    duration,
                    easing: EASE,
                    useNativeDriver: true,
                }),
                Animated.timing(value, {
                    toValue: 0,
                    duration,
                    easing: EASE,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [duration, value]);

    return value;
}
