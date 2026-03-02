/**
 * DayIcon — Premium SVG decorative icons for each workout group.
 * Used as ghost overlays in hero card backgrounds.
 *
 * Each icon is drawn on a 100×100 viewBox using clean geometric lines
 * that echo sports/fitness iconography without being clipart.
 */

import React from "react";
import Svg, {
    Circle, Ellipse, Line, Path, Rect, G, Polyline, Polygon,
} from "react-native-svg";

const DEFAULTS = { size: 120, opacity: 0.18, color: "#ffffff" };

/* ─────────────────────────────────────────────────────────────
   CHEST — stylised chest press / pectoral arch
──────────────────────────────────────────────────────────────*/
function ChestIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            {/* Ribcage arch */}
            <Path
                d="M20 70 Q20 30 50 25 Q80 30 80 70"
                stroke={color} strokeWidth={4} fill="none"
                strokeLinecap="round"
            />
            {/* Sternum centre line */}
            <Line x1="50" y1="25" x2="50" y2="72" stroke={color} strokeWidth={3} strokeLinecap="round" />
            {/* Left pec lower curve */}
            <Path
                d="M20 70 Q28 82 50 72"
                stroke={color} strokeWidth={4} fill="none"
                strokeLinecap="round"
            />
            {/* Right pec lower curve */}
            <Path
                d="M80 70 Q72 82 50 72"
                stroke={color} strokeWidth={4} fill="none"
                strokeLinecap="round"
            />
            {/* Collar bones */}
            <Line x1="20" y1="38" x2="50" y2="32" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Line x1="80" y1="38" x2="50" y2="32" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            {/* Shoulder circles */}
            <Circle cx="16" cy="38" r="4" stroke={color} strokeWidth={2.5} fill="none" />
            <Circle cx="84" cy="38" r="4" stroke={color} strokeWidth={2.5} fill="none" />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   BACK — lat pulldown bar + spread wings
──────────────────────────────────────────────────────────────*/
function BackIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            {/* Pulldown bar */}
            <Line x1="15" y1="20" x2="85" y2="20" stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Bar end knobs */}
            <Circle cx="14" cy="20" r="4" fill={color} />
            <Circle cx="86" cy="20" r="4" fill={color} />
            {/* Rope / cable */}
            <Line x1="50" y1="20" x2="50" y2="36" stroke={color} strokeWidth={3} strokeLinecap="round" />
            {/* V-taper torso */}
            <Path
                d="M30 36 Q18 55 22 80 L50 74 L78 80 Q82 55 70 36 Z"
                stroke={color} strokeWidth={3} fill="none"
                strokeLinejoin="round" strokeLinecap="round"
            />
            {/* Spine */}
            <Line x1="50" y1="36" x2="50" y2="74" stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray="3 3" />
            {/* Arms gripping bar */}
            <Line x1="30" y1="36" x2="24" y2="22" stroke={color} strokeWidth={3} strokeLinecap="round" />
            <Line x1="70" y1="36" x2="76" y2="22" stroke={color} strokeWidth={3} strokeLinecap="round" />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   ARMS — dumbbell curl silhouette
──────────────────────────────────────────────────────────────*/
function ArmsIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            {/* Upper arm */}
            <Line x1="38" y1="75" x2="50" y2="48" stroke={color} strokeWidth={10} strokeLinecap="round" />
            {/* Forearm curled */}
            <Line x1="50" y1="48" x2="70" y2="38" stroke={color} strokeWidth={8} strokeLinecap="round" />
            {/* Bicep peak highlight */}
            <Path
                d="M38 68 Q32 52 50 48"
                stroke={color} strokeWidth={3} fill="none"
                strokeLinecap="round"
            />
            {/* Dumbbell bar */}
            <Line x1="62" y1="32" x2="82" y2="28" stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Left plate */}
            <Rect x="58" y="26" width="6" height="12" rx="2" fill={color} />
            {/* Right plate */}
            <Rect x="80" y="22" width="6" height="12" rx="2" fill={color} />
            {/* Shoulder joint */}
            <Circle cx="38" cy="75" r="6" stroke={color} strokeWidth={2.5} fill="none" />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   ABS & FOREARMS — six-pack grid + lightning bolt
──────────────────────────────────────────────────────────────*/
function AbsIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            {/* Torso outline */}
            <Path
                d="M34 20 Q30 22 28 35 L28 72 Q28 78 34 80 L50 82 L66 80 Q72 78 72 72 L72 35 Q70 22 66 20 Z"
                stroke={color} strokeWidth={3} fill="none"
                strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Linea alba (centre line) */}
            <Line x1="50" y1="20" x2="50" y2="82" stroke={color} strokeWidth={2} strokeLinecap="round" />
            {/* Row 1 */}
            <Line x1="28" y1="42" x2="72" y2="42" stroke={color} strokeWidth={2} strokeLinecap="round" />
            {/* Row 2 */}
            <Line x1="28" y1="58" x2="72" y2="58" stroke={color} strokeWidth={2} strokeLinecap="round" />
            {/* Oblique cuts */}
            <Line x1="28" y1="68" x2="72" y2="68" stroke={color} strokeWidth={2} strokeLinecap="round" />
            {/* Lightning bolt */}
            <Polygon
                points="56,18 46,36 53,36 44,55 62,30 55,30"
                fill={color} opacity={0.9}
            />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   SHOULDERS — overhead press silhouette
──────────────────────────────────────────────────────────────*/
function ShouldersIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            {/* Head */}
            <Circle cx="50" cy="18" r="8" stroke={color} strokeWidth={3} fill="none" />
            {/* Neck */}
            <Line x1="50" y1="26" x2="50" y2="34" stroke={color} strokeWidth={3} strokeLinecap="round" />
            {/* Torso */}
            <Path
                d="M35 34 Q24 36 22 50 L24 72 L40 72 L40 54 L60 54 L60 72 L76 72 L78 50 Q76 36 65 34 Z"
                stroke={color} strokeWidth={3} fill="none"
                strokeLinejoin="round" strokeLinecap="round"
            />
            {/* Left arm raised */}
            <Line x1="35" y1="34" x2="18" y2="18" stroke={color} strokeWidth={7} strokeLinecap="round" />
            {/* Right arm raised */}
            <Line x1="65" y1="34" x2="82" y2="18" stroke={color} strokeWidth={7} strokeLinecap="round" />
            {/* Dumbbell bar */}
            <Line x1="10" y1="14" x2="90" y2="14" stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Left plate stack */}
            <Rect x="8" y="8" width="5" height="14" rx="2" fill={color} />
            <Rect x="3" y="10" width="5" height="10" rx="2" fill={color} />
            {/* Right plate stack */}
            <Rect x="87" y="8" width="5" height="14" rx="2" fill={color} />
            <Rect x="92" y="10" width="5" height="10" rx="2" fill={color} />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   LEGS — deep squat silhouette
──────────────────────────────────────────────────────────────*/
function LegsIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            {/* Head */}
            <Circle cx="50" cy="10" r="7" stroke={color} strokeWidth={3} fill="none" />
            {/* Torso (angled forward in squat) */}
            <Path
                d="M50 17 L44 38"
                stroke={color} strokeWidth={5} strokeLinecap="round"
            />
            {/* Barbell across shoulders */}
            <Line x1="18" y1="22" x2="82" y2="22" stroke={color} strokeWidth={4} strokeLinecap="round" />
            <Rect x="10" y="16" width="8" height="14" rx="2.5" fill={color} />
            <Rect x="82" y="16" width="8" height="14" rx="2.5" fill={color} />
            {/* Left arm */}
            <Line x1="50" y1="22" x2="28" y2="22" stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Right arm */}
            <Line x1="50" y1="22" x2="72" y2="22" stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Left upper leg */}
            <Line x1="44" y1="38" x2="30" y2="60" stroke={color} strokeWidth={8} strokeLinecap="round" />
            {/* Left lower leg */}
            <Line x1="30" y1="60" x2="26" y2="85" stroke={color} strokeWidth={7} strokeLinecap="round" />
            {/* Right upper leg */}
            <Line x1="44" y1="38" x2="62" y2="60" stroke={color} strokeWidth={8} strokeLinecap="round" />
            {/* Right lower leg */}
            <Line x1="62" y1="60" x2="70" y2="85" stroke={color} strokeWidth={7} strokeLinecap="round" />
            {/* Left foot */}
            <Line x1="26" y1="85" x2="18" y2="88" stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Right foot */}
            <Line x1="70" y1="85" x2="78" y2="88" stroke={color} strokeWidth={4} strokeLinecap="round" />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   REST — moon + stars (for Sunday rest day)
──────────────────────────────────────────────────────────────*/
function RestIcon({ size = DEFAULTS.size, color = DEFAULTS.color, opacity = DEFAULTS.opacity }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
            <Path
                d="M60 20 A30 30 0 1 0 80 75 A20 20 0 1 1 60 20 Z"
                stroke={color} strokeWidth={3} fill="none"
                strokeLinecap="round" strokeLinejoin="round"
            />
            <Circle cx="72" cy="28" r="3" fill={color} />
            <Circle cx="82" cy="42" r="2" fill={color} />
            <Circle cx="78" cy="20" r="1.5" fill={color} />
        </Svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   Lookup map + generic export
──────────────────────────────────────────────────────────────*/
const ICON_MAP = {
    Chest: ChestIcon,
    Back: BackIcon,
    Arms: ArmsIcon,
    "Abs & Forearms": AbsIcon,
    Shoulders: ShouldersIcon,
    Legs: LegsIcon,
    Rest: RestIcon,
};

/**
 * <DayIcon target="Chest" size={120} color="#fff" opacity={0.18} />
 */
export default function DayIcon({ target, size, color, opacity }) {
    const Icon = ICON_MAP[target] ?? RestIcon;
    return <Icon size={size} color={color} opacity={opacity} />;
}
