import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polyline, Circle, Path, Defs, LinearGradient as SvgGradient, Stop, Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";

const { width } = Dimensions.get("window");
const CARD_W = width - 40;
const CHART_W = CARD_W - 32;
const CHART_H = 110;

export default function PerformanceTrajectoryCard({ trajectoryData }) {
    if (!trajectoryData) return null;

    const {
        exerciseName,
        loadType,
        metricUnit,
        sessionCount,
        slopePerWeek,
        recentSlopePerWeek,
        rSquared,
        trajectory,
        confidence,
        currentBaseline,
        projectedIn4Weeks,
        projectedIn8Weeks,
        sessions = [],
    } = trajectoryData;

    const getTrajectoryColor = (t) => {
        switch (t) {
            case "ACCELERATING":
                return "#00E676";
            case "STEADY_PROGRESSION":
                return "#00C853";
            case "STABLE":
                return "#FFB300";
            case "DECLINING":
                return COLORS.primary;
            default:
                return COLORS.textMuted;
        }
    };

    const getTrajectoryLabel = (t) => {
        switch (t) {
            case "ACCELERATING":
                return "ACCELERATING";
            case "STEADY_PROGRESSION":
                return "STEADY PROGRESSION";
            case "STABLE":
                return "STABLE BASELINE";
            case "DECLINING":
                return "DECLINING VELOCITY";
            default:
                return "BUILDING BASELINE";
        }
    };

    const trajColor = getTrajectoryColor(trajectory);
    const trajLabel = getTrajectoryLabel(trajectory);

    // Render chart points if >= 2 sessions
    let chartContent = null;
    if (sessions.length >= 2) {
        const values = sessions.map(s => s.nativeValue);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values, projectedIn4Weeks || maxVal);
        const range = maxVal - minVal || 1;

        const pts = sessions.map((s, i) => ({
            x: (i / (sessions.length - 1)) * (CHART_W * 0.75),
            y: CHART_H - ((s.nativeValue - minVal) / range) * (CHART_H * 0.65) - 16,
            ...s,
        }));

        const polyPoints = pts.map(p => `${p.x},${p.y}`).join(" ");

        // Projected point at 4 weeks
        const projX = CHART_W - 10;
        const projY = projectedIn4Weeks != null
            ? CHART_H - ((projectedIn4Weeks - minVal) / range) * (CHART_H * 0.65) - 16
            : pts[pts.length - 1].y;

        chartContent = (
            <View style={styles.chartContainer}>
                <Svg width={CHART_W} height={CHART_H}>
                    <Defs>
                        <SvgGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={trajColor} stopOpacity="0.25" />
                            <Stop offset="1" stopColor={trajColor} stopOpacity="0.0" />
                        </SvgGradient>
                    </Defs>
                    <Polyline
                        points={polyPoints}
                        fill="none"
                        stroke={trajColor}
                        strokeWidth={2.5}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    {/* Projected dashed line */}
                    {projectedIn4Weeks != null && (
                        <Line
                            x1={pts[pts.length - 1].x}
                            y1={pts[pts.length - 1].y}
                            x2={projX}
                            y2={projY}
                            stroke={trajColor}
                            strokeWidth={2}
                            strokeDasharray="4, 4"
                        />
                    )}
                    {/* Actual session dots */}
                    {pts.map((p, i) => (
                        <Circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={i === pts.length - 1 ? 4.5 : 3}
                            fill={i === pts.length - 1 ? "#FFF" : trajColor}
                            stroke={trajColor}
                            strokeWidth={1.5}
                        />
                    ))}
                    {/* Projected 4w dot */}
                    {projectedIn4Weeks != null && (
                        <Circle
                            cx={projX}
                            cy={projY}
                            r={4}
                            fill="transparent"
                            stroke={trajColor}
                            strokeWidth={2}
                        />
                    )}
                </Svg>
                <View style={styles.chartAxisLabels}>
                    <Text style={styles.axisText}>Baseline: {sessions[0].nativeValue} {metricUnit}</Text>
                    {projectedIn4Weeks != null && (
                        <Text style={[styles.axisText, { color: trajColor }]}>
                            +4w Proj: {projectedIn4Weeks} {metricUnit}
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                    <Text style={styles.exerciseTitle} numberOfLines={1}>
                        {exerciseName}
                    </Text>
                    <Text style={styles.subTitle}>
                        {loadType?.toUpperCase().replace("_", " ")} · {sessionCount} SESSIONS ANALYZED
                    </Text>
                </View>
                <View style={[styles.trajBadge, { backgroundColor: `${trajColor}15`, borderColor: `${trajColor}40` }]}>
                    <Text style={[styles.trajText, { color: trajColor }]}>{trajLabel}</Text>
                </View>
            </View>

            {/* Velocity & Baseline Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statCol}>
                    <Text style={styles.statLabel}>VELOCITY</Text>
                    <Text style={[styles.statValue, { color: slopePerWeek >= 0 ? "#00C853" : COLORS.primary }]}>
                        {slopePerWeek >= 0 ? "+" : ""}{slopePerWeek.toFixed(2)} <Text style={styles.statUnit}>{metricUnit}/wk</Text>
                    </Text>
                </View>
                <View style={styles.statCol}>
                    <Text style={styles.statLabel}>CURRENT BEST</Text>
                    <Text style={styles.statValue}>
                        {currentBaseline != null ? currentBaseline : "—"} <Text style={styles.statUnit}>{metricUnit}</Text>
                    </Text>
                </View>
                <View style={styles.statCol}>
                    <Text style={styles.statLabel}>CONFIDENCE</Text>
                    <View style={styles.confidencePill}>
                        <Ionicons
                            name={confidence === "HIGH" ? "checkmark-circle" : "shield-checkmark-outline"}
                            size={12}
                            color={confidence === "HIGH" ? "#00C853" : confidence === "MEDIUM" ? "#FFB300" : COLORS.textMuted}
                        />
                        <Text style={[styles.confidenceText, { color: confidence === "HIGH" ? "#00C853" : confidence === "MEDIUM" ? "#FFB300" : COLORS.textMuted }]}>
                            {confidence}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Visual SVG Curve */}
            {chartContent}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#141416",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 14,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    titleWrap: {
        flex: 1,
        marginRight: 8,
    },
    exerciseTitle: {
        fontFamily: FAMILY.chakraBold,
        fontSize: 14.5,
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
    subTitle: {
        fontFamily: FAMILY.mono,
        fontSize: 9.5,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    trajBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    trajText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.sm,
        padding: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.04)",
    },
    statCol: {
        flex: 1,
    },
    statLabel: {
        fontFamily: FAMILY.monoBold,
        fontSize: 8,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statValue: {
        fontFamily: FAMILY.monoBold,
        fontSize: 14,
        color: "#FFFFFF",
        fontVariant: ["tabular-nums"],
    },
    statUnit: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textMuted,
    },
    confidencePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 2,
    },
    confidenceText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9.5,
    },
    chartContainer: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.04)",
    },
    chartAxisLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    axisText: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textMuted,
    },
});
