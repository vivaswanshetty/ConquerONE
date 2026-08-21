/**
 * Reveal — staggered entrance wrapper (fade + rise).
 *
 * Wrap sections and pass an increasing `delay` (or use `index` with
 * the default STAGGER step) so a screen assembles itself instead of
 * appearing all at once.
 */
import React from "react";
import { Animated } from "react-native";
import { useReveal, STAGGER } from "./motion";

export default function Reveal({
    children,
    delay,
    index = 0,
    rise = 12,
    style,
    ...rest
}) {
    const resolved = typeof delay === "number" ? delay : index * STAGGER;
    const anim = useReveal(resolved, rise);

    return (
        <Animated.View style={[anim, style]} {...rest}>
            {children}
        </Animated.View>
    );
}
