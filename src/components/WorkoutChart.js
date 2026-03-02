import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/theme";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - SPACING.base * 2 - SPACING.base * 2; // inside card
const CHART_HEIGHT = 110;
const BAR_GAP = 8;

// history: array of { completedAt }
// returns last 8 weeks as [{ label, count }]
function computeWeeklyData(history) {
    const now = new Date();
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - w * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const count = history.filter((h) => {
            const d = new Date(h.completedAt);
            return d >= weekStart && d < weekEnd;
        }).length;

        const label = w === 0 ? "Now" : `W-${w}`;
        weeks.push({ label, count });
    }
    return weeks;
}

export default function WorkoutChart({ history }) {
    if (!history || history.length === 0) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>Complete workouts to see your chart.</Text>
            </View>
        );
    }

    const data = computeWeeklyData(history);
    const maxVal = Math.max(...data.map((d) => d.count), 1);
    const n = data.length;
    const barWidth = (CHART_WIDTH - BAR_GAP * (n - 1)) / n;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>WEEKLY FREQUENCY</Text>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 24}>
                {/* Baseline */}
                <Line
                    x1={0} y1={CHART_HEIGHT}
                    x2={CHART_WIDTH} y2={CHART_HEIGHT}
                    stroke={COLORS.border} strokeWidth={1}
                />
                {data.map((d, i) => {
                    const barH = maxVal > 0 ? (d.count / maxVal) * CHART_HEIGHT * 0.88 : 0;
                    const x = i * (barWidth + BAR_GAP);
                    const y = CHART_HEIGHT - barH;
                    const isLast = i === data.length - 1;
                    return (
                        <React.Fragment key={i}>
                            <Rect
                                x={x} y={y}
                                width={barWidth} height={Math.max(barH, 2)}
                                rx={3}
                                fill={isLast ? COLORS.accent : COLORS.bgSurface}
                            />
                            {d.count > 0 && (
                                <SvgText
                                    x={x + barWidth / 2} y={y - 5}
                                    fontSize={FONTS.size.xs}
                                    fill={isLast ? COLORS.accent : COLORS.textSub}
                                    textAnchor="middle"
                                    fontWeight="700"
                                >
                                    {d.count}
                                </SvgText>
                            )}
                            <SvgText
                                x={x + barWidth / 2} y={CHART_HEIGHT + 16}
                                fontSize={FONTS.size.xs - 1}
                                fill={COLORS.textMuted}
                                textAnchor="middle"
                            >
                                {d.label}
                            </SvgText>
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingTop: SPACING.base },
    title: {
        fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold, color: COLORS.textSub,
        letterSpacing: 2, marginBottom: SPACING.md,
    },
    empty: { paddingVertical: SPACING.xl },
    emptyText: { fontSize: FONTS.size.sm, color: COLORS.textMuted, textAlign: "center" },
});
