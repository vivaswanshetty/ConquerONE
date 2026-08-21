/**
 * AnimatedNumber — counts up to `value` on mount / on change.
 *
 * Uses Animated.Value + a listener writing to state, because the
 * target is text content rather than a style property.
 */
import React, { useEffect, useRef, useState } from "react";
import { Text, Animated } from "react-native";
import { EASE_OUT } from "./motion";

export default function AnimatedNumber({
    value = 0,
    duration = 900,
    delay = 0,
    format,             // (n) => string
    style,
    ...rest
}) {
    const target = Number.isFinite(value) ? value : 0;
    const anim = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        const id = anim.addListener(({ value: v }) => {
            setDisplay(Math.round(v));
        });

        anim.setValue(0);
        const run = Animated.timing(anim, {
            toValue: target,
            duration,
            delay,
            easing: EASE_OUT,
            useNativeDriver: false, // driving JS state, not a style
        });
        run.start();

        return () => {
            run.stop();
            anim.removeListener(id);
        };
    }, [target, duration, delay, anim]);

    return (
        <Text style={style} {...rest}>
            {format ? format(display) : display}
        </Text>
    );
}
