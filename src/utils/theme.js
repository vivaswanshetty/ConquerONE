/**
 * DESIGN SYSTEM — Restrained · Editorial Athletic
 * Inspired by Whoop & Nike Training Club
 * Philosophy: Precision instruments, warm carbon matte, hairline structure, and single deep crimson CTA.
 */

export const COLORS = {
    // ── Surfaces (Warm Matte Carbon Stack) ────────────────────
    bg: "#0A0A0B",
    bgRaised: "#111113",
    bgCard: "#151516",
    bgSurface: "#1E1E20",
    bgMuted: "#26262A",

    // ── Structural lines (1px Hairline, No Glow) ──────────────
    border: "#1E1E20",
    borderMid: "#28282C",
    borderLight: "#35353A",

    // ── Text hierarchy ────────────────────────────────────────
    text: "#EDEAE3",
    textSub: "#8A8A8E",
    textMuted: "#55555A",

    // ── Accent (Restrained Deep Crimson — CTAs & Live State only) ─
    primary: "#7A2E22",
    primaryDim: "rgba(122, 46, 34, 0.18)",
    primaryActive: "#91382B",

    // ── Secondary Accent — Neutral Warm Titanium ──────────────
    accent: "#EDEAE3",
    accentDim: "rgba(237, 234, 227, 0.08)",
    accentBorder: "rgba(237, 234, 227, 0.15)",

    // ── Semantic ──────────────────────────────────────────────
    success: "#30D158",
    successDim: "rgba(48, 209, 88, 0.14)",
    warning: "#FF9F0A",
    warningDim: "rgba(255, 159, 10, 0.14)",
    error: "#7A2E22",
    errorDim: "rgba(122, 46, 34, 0.18)",

    // ── Timer phase colours ──────────────────────────────────
    timerWork: "#EDEAE3",
    timerWorkDim: "rgba(237, 234, 227, 0.08)",
    timerRest: "#26262A",
    timerRestDim: "rgba(38, 38, 42, 0.50)",

    // ── Clean Flat Surfaces (No resting blur/glow) ─────────────
    glassBg: "#151516",
    glassBorder: "#1E1E20",
    glowRed: "transparent",
    liveGlow: "rgba(122, 46, 34, 0.35)",
};

export const GRADIENTS = {
    premium: ["#EDEAE3", "#C5C2BB", "#8A8A8E"],
    silver: ["#EDEAE3", "#D1CEC7", "#8A8A8E"],
    diamond: ["#EDEAE3", "#E0DDD6", "#C5C2BB"],
    dark: ["rgba(255,255,255,0.03)", "transparent"],
    hero: ["rgba(10,10,11,0.2)", "rgba(10,10,11,0.95)"],
    subtleCard: ["#171719", "#151516"],
};

export const FONTS = {
    size: {
        micro: 10,
        xs: 11,
        sm: 13,
        base: 15,
        md: 17,
        lg: 20,
        xl: 24,
        xxl: 28,
        xxxl: 36,
        display: 48,
        hero: 64,
    },
    weight: {
        light: "300",
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
    },
};

import { Platform } from "react-native";

export const FAMILY = {
    // Condensed display typeface for screen titles & large numbers only
    display: "Archivo_700Bold",
    header: "Archivo_900Black",
    archivoBold: "Archivo_700Bold",
    archivoBlack: "Archivo_900Black",

    // Clean Grotesk for body & UI text (Inter)
    light: "Inter_400Regular",
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    black: "Inter_700Bold",
    accent: "Inter_600SemiBold",

    // Precision Instrument Monospace for numbers, reps, weights, timers, sets
    mono: "JetBrainsMono_600SemiBold",
    monoRegular: "JetBrainsMono_400Regular",
    monoBold: "JetBrainsMono_700Bold",

    // Fallbacks for secondary screens
    mReg: "Inter_400Regular",
    mSemi: "Inter_600SemiBold",
    mBold: "Inter_700Bold",
    mBlack: "Inter_700Bold",
};

export const SPACING = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    base: 20,
    lg: 24,
    xl: 32,
    xxl: 40,
    xxxl: 64,
    section: 80,
};

export const RADIUS = {
    xs: 4,
    sm: 6,
    md: 8,
    card: 8,
    lg: 8,
    xl: 10,
    xxl: 12,
    full: 999,
    pill: 999,
};

export const TRACKING = {
    eyebrow: 1.5,
    snug: -0.3,
    normal: 0,
    display: -1.2,
};

export const APP_VERSION = "v2.2.9";

