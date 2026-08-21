/**
 * DESIGN SYSTEM — Mature · Minimal · Monochromatic
 * Philosophy: Black + White + ONE carefully used accent.
 * Every color decision must earn its place.
 */

export const COLORS = {
    // ── Surfaces (true OLED black stack) ──────────────────────
    bg: "#000000",
    bgRaised: "#050505",
    bgCard: "#0D0D0D",
    bgSurface: "#141414",
    bgMuted: "#1F1F1F",

    // ── Structural lines ──────────────────────────────────────
    border: "#161616",
    borderMid: "#222222",
    borderLight: "#2D2D2D",

    // ── Text hierarchy ────────────────────────────────────────
    text: "#FFFFFF",
    textSub: "#8E8E93",
    textMuted: "#48484A",

    // ── Primary Action — Crimson Red (High Intensity) ─────────
    primary: "#E31E24",
    primaryDim: "rgba(227, 30, 36, 0.15)",

    // ── Secondary Accent — Titanium / Silver (Modern & Neutral) ──
    accent: "#D1D1D1",
    accentDim: "rgba(209, 209, 214, 0.12)",
    accentBorder: "rgba(255, 255, 255, 0.15)",

    // ── Semantic ──────────────────────────────────────────────
    success: "#FFFFFF",
    successDim: "rgba(255,255,255,0.08)",
    warning: "#8E8E93",
    warningDim: "rgba(142,142,147,0.12)",

    // ── Timer phase colours ──────────────────────────────────
    timerWork: "#FFFFFF",
    timerWorkDim: "rgba(255,255,255,0.10)",
    timerRest: "#2C2C2E",
    timerRestDim: "rgba(44,44,46,0.50)",

    // ── Glassmorphic & Neon glows ──────────────────────────────
    glassBg: "rgba(13, 13, 13, 0.75)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
    glowRed: "rgba(227, 30, 36, 0.45)",

    /* ══════════════════════════════════════════════════════════
     * SOFT PREMIUM SET — additive. Used by src/components/ui/*
     * and the core flow (Home · WorkoutDetail · ActiveWorkout ·
     * WorkoutComplete). Every key above keeps its original value
     * so the remaining screens render exactly as before.
     * ══════════════════════════════════════════════════════════ */

    // ── Soft surfaces (lifted off pure black — this is what
    //    makes cards read as elevated and the layout feel airy) ──
    softBg: "#08080A",
    softSunken: "#0F0F12",
    softCard: "#131316",
    softCardHi: "#1A1A1E",
    softCardTop: "#202026",

    // ── Hairline structure ────────────────────────────────────
    softBorder: "rgba(255,255,255,0.07)",
    softBorderHi: "rgba(255,255,255,0.11)",

    // ── Text hierarchy (warmer + lighter than the tactical set) ──
    softText: "#F5F5F7",
    softTextSub: "#A1A1AA",
    softTextMuted: "#6B6B73",

    // ── Rich muted accents (iOS system colours) ───────────────
    softMove: "#FF453A",
    softEnergy: "#FF9F0A",
    softFocus: "#30D158",
    softCool: "#0A84FF",
    softSky: "#64D2FF",
    softViolet: "#BF5AF2",
    softGold: "#FFD60A",

    softMoveDim: "rgba(255,69,58,0.14)",
    softEnergyDim: "rgba(255,159,10,0.14)",
    softFocusDim: "rgba(48,209,88,0.14)",
    softCoolDim: "rgba(10,132,255,0.14)",
    softSkyDim: "rgba(100,210,255,0.14)",
    softVioletDim: "rgba(191,90,242,0.14)",
    softGoldDim: "rgba(255,214,10,0.14)",

    // ── Soft fills & glows ────────────────────────────────────
    softFill: "rgba(255,255,255,0.055)",
    softFillHi: "rgba(255,255,255,0.09)",
    softScrim: "rgba(8,8,10,0.82)",
    softGlow: "rgba(255,69,58,0.28)",
};

export const GRADIENTS = {
    premium: ["#FFFFFF", "#D1D1D1", "#8E8E93"],
    silver: ["#F5F5F7", "#D1D1D1", "#8E8E93"],
    diamond: ["#FFFFFF", "#E5E5E5", "#D1D1D1"],
    dark: ["rgba(255,255,255,0.05)", "transparent"],
    hero: ["rgba(0,0,0,0.2)", "rgba(0,0,0,0.92)"],

    // ── Soft premium set ──────────────────────────────────────
    soft: ["rgba(255,255,255,0.055)", "rgba(255,255,255,0.012)"],
    softHero: ["rgba(8,8,10,0.12)", "rgba(8,8,10,0.70)", "rgba(8,8,10,0.97)"],
    softSheet: ["#1A1A1E", "#131316"],
    moveRing: ["#FF453A", "#FF9F0A"],
    focusRing: ["#30D158", "#64D2FF"],
    coolRing: ["#0A84FF", "#BF5AF2"],
    ambient: ["rgba(191,90,242,0.10)", "rgba(255,69,58,0.04)", "transparent"],
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
    display: "Arimo_700Bold",
    light: Platform.OS === "ios" ? "System" : "Outfit_300Light",
    regular: "Arimo_400Regular",
    medium: Platform.OS === "ios" ? "System" : "Outfit_500Medium",
    semibold: Platform.OS === "ios" ? "System" : "Outfit_600SemiBold",
    bold: "Arimo_700Bold",
    black: "Arimo_700Bold",
    accent: Platform.OS === "ios" ? "System" : "Syne_700Bold",
    header: "Urbanist_900Black",
    mono: Platform.OS === "ios" ? "Courier" : "monospace",
    // Montserrat for specific screens
    mReg: "Montserrat_400Regular",
    mSemi: "Montserrat_600SemiBold",
    mBold: "Montserrat_700Bold",
    mBlack: "Montserrat_700Bold",

    // ── Soft premium stack (Manrope) ──────────────────────────
    // Loaded in CRITICAL_FONTS so Home renders correctly on the
    // very first frame — see the font strategy note in App.js.
    soft: "Manrope_400Regular",
    softMed: "Manrope_500Medium",
    softBold: "Manrope_700Bold",
    softBlack: "Manrope_800ExtraBold",
};

/**
 * Letter spacing. Soft premium type uses NEGATIVE tracking on large
 * sizes and near-zero on body — the inverse of the tactical set's
 * +1.5–4 on 10px all-caps micro-labels.
 */
export const TRACKING = {
    hero: -1.6,
    display: -1,
    tight: -0.5,
    snug: -0.2,
    normal: 0,
    wide: 0.3,
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

    // ── Soft premium spacing ──────────────────────────────────
    gap: 14,
    cardPad: 22,
    airy: 28,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
    full: 999,

    // ── Soft premium radii ────────────────────────────────────
    soft: 20,
    tile: 24,
    card: 28,
    sheet: 34,
    pill: 999,
};

export const APP_VERSION = "v2.2.9";
