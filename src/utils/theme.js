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
};

export const GRADIENTS = {
    premium: ["#FFFFFF", "#D1D1D1", "#8E8E93"],
    silver: ["#F5F5F7", "#D1D1D1", "#8E8E93"],
    diamond: ["#FFFFFF", "#E5E5E5", "#D1D1D1"],
    dark: ["rgba(255,255,255,0.05)", "transparent"],
    hero: ["rgba(0,0,0,0.2)", "rgba(0,0,0,0.92)"],
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
    // Montserrat for specific screens
    mReg: "Montserrat_400Regular",
    mSemi: "Montserrat_600SemiBold",
    mBold: "Montserrat_700Bold",
    mBlack: "Montserrat_700Bold",
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
    full: 999,
};

export const APP_VERSION = "v2.2.9";
