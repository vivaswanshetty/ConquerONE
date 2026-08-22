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
    text: "#FFFFFF",
    textSub: "#8A8A8E",
    textMuted: "#55555A",

    // ── Accent (Restrained Deep Crimson — CTAs & Live State only) ─
    primary: "#E31E24",
    primaryDim: "rgba(227, 30, 36, 0.15)",
    primaryActive: "#91382B",

    // ── Secondary Accent — Neutral Warm Titanium ──────────────
    accent: "#D1D1D1",
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
    glowRed: "rgba(227, 30, 36, 0.45)",
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
    // ── Display Typeface for Screen Titles & Hero Numbers (Bebas Neue) ──
    header: "BebasNeue_400Regular",
    display: "BebasNeue_400Regular",
    urbanist: "BebasNeue_400Regular",
    urbanistBold: "BebasNeue_400Regular",
    urbanistBlack: "BebasNeue_400Regular",

    // ── Modern Technical Grotesk for Body & UI Text (Chakra Petch) ──
    light: "ChakraPetch_300Light",
    regular: "ChakraPetch_400Regular",
    medium: "ChakraPetch_500Medium",
    semibold: "ChakraPetch_600SemiBold",
    bold: "ChakraPetch_700Bold",
    black: "ChakraPetch_700Bold",
    accent: "ChakraPetch_600SemiBold",
    accent2: "LeagueSpartan_700Bold",

    // ── Precision Instrument Monospace for Numbers, Reps, Weights, Timers, Sets, Kcal, Streak ──
    mono: "JetBrainsMono_600SemiBold",
    monoRegular: "JetBrainsMono_400Regular",
    monoBold: "JetBrainsMono_700Bold",

    // ── Fallbacks for secondary screens ──
    mReg: "ChakraPetch_400Regular",
    mSemi: "ChakraPetch_600SemiBold",
    mBold: "ChakraPetch_700Bold",
    mBlack: "ChakraPetch_700Bold",
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
    xs: 6,
    sm: 10,
    md: 14,
    card: 14,
    lg: 18,
    xl: 22,
    xxl: 28,
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

