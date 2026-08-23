import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";

function getMuscleColor(target) {
    if (!target) return "#8E8E93";
    const t = String(target).toUpperCase();
    if (t.includes("CHEST") || t.includes("TRICEPS") || t.includes("PUSH")) return "#E31E24";
    if (t.includes("BACK") || t.includes("BICEPS") || t.includes("PULL")) return "#FF9500";
    if (t.includes("SHOULDERS") || t.includes("CORE") || t.includes("ARMS") || t.includes("ABS")) return "#30B0C7";
    if (t.includes("LEGS") || t.includes("QUADS") || t.includes("LOWER") || t.includes("CALVES")) return "#A78BFA";
    if (t.includes("RECOVERY") || t.includes("REST") || t.includes("MOBILITY") || t.includes("MINDFULNESS")) return "#30D158";
    return "#8E8E93";
}

const FLAME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#E31E24" d="M12 12.9a3.1 3.1 0 0 0-3.1 3.1c0 1.71 1.39 3.1 3.1 3.1s3.1-1.39 3.1-3.1c0-1.71-1.39-3.1-3.1-3.1zm5.1-5.1C16.4 5.3 14.5 3 12 2c-.3 0-.6.2-.6.5v.3c0 2.2-1.3 4.2-3.3 5.1-2.4 1.1-4.1 3.6-4.1 6.4a8 8 0 1 0 16-1.2c-.3-2.1-1.3-4-2.9-5.3z"/></svg>`;

export function ConquerStreakWidget({ streak = 0, workoutName = "Today's Workout", dayName = "" }) {
    const muscleColor = getMuscleColor(workoutName);
    const displayDay = dayName ? dayName.slice(0, 3).toUpperCase() : new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundGradient: {
                    from: "#16161D",
                    to: "#08080A",
                    orientation: "TL_BR",
                },
                borderRadius: 22,
                borderWidth: 1.5,
                borderColor: "rgba(255, 255, 255, 0.12)",
                padding: 14,
                flexDirection: "column",
                justifyContent: "space-between",
            }}
            clickAction="OPEN_APP"
        >
            {/* Header Brand Bar */}
            <FlexWidget
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "match_parent",
                }}
            >
                <FlexWidget
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <FlexWidget
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: 3.5,
                            backgroundColor: "#E31E24",
                            marginRight: 6,
                        }}
                    />
                    <TextWidget
                        text="CONQUER"
                        style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            color: "#FFFFFF",
                            letterSpacing: 1.2,
                        }}
                    />
                    <TextWidget
                        text="ONE"
                        style={{
                            fontSize: 10,
                            fontWeight: "bold",
                            color: "#E31E24",
                            letterSpacing: 1.2,
                        }}
                    />
                </FlexWidget>

                <FlexWidget
                    style={{
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.10)",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                    }}
                >
                    <TextWidget
                        text={displayDay}
                        style={{
                            fontSize: 9,
                            fontWeight: "bold",
                            color: "#EDEAE3",
                            letterSpacing: 0.8,
                        }}
                    />
                </FlexWidget>
            </FlexWidget>

            {/* Streak Counter Hero Section */}
            <FlexWidget
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(227, 30, 36, 0.08)",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(227, 30, 36, 0.22)",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginVertical: 4,
                    width: "match_parent",
                    justifyContent: "space-between",
                }}
            >
                <FlexWidget
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <TextWidget
                        text={`${streak}`}
                        style={{
                            fontSize: 34,
                            fontWeight: "bold",
                            color: "#FFFFFF",
                            marginRight: 8,
                            textShadowColor: "#E31E24",
                            textShadowRadius: 8,
                            textShadowOffset: { width: 0, height: 0 },
                        }}
                    />
                    <FlexWidget
                        style={{
                            flexDirection: "column",
                            justifyContent: "center",
                        }}
                    >
                        <TextWidget
                            text="DAYS"
                            style={{
                                fontSize: 12,
                                fontWeight: "bold",
                                color: "#E31E24",
                                letterSpacing: 1.2,
                            }}
                        />
                        <TextWidget
                            text="STREAK"
                            style={{
                                fontSize: 8.5,
                                fontWeight: "bold",
                                color: "#8E8E93",
                                letterSpacing: 1.2,
                            }}
                        />
                    </FlexWidget>
                </FlexWidget>

                <SvgWidget
                    svg={FLAME_SVG}
                    style={{
                        width: 24,
                        height: 24,
                    }}
                />
            </FlexWidget>

            {/* Today's Target Card */}
            <FlexWidget
                style={{
                    flexDirection: "column",
                    width: "match_parent",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                }}
            >
                <FlexWidget
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 3,
                    }}
                >
                    <TextWidget
                        text="TODAY'S TARGET"
                        style={{
                            fontSize: 7.5,
                            fontWeight: "bold",
                            color: "#8E8E93",
                            letterSpacing: 1,
                        }}
                    />
                    <FlexWidget
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: muscleColor,
                        }}
                    />
                </FlexWidget>
                <TextWidget
                    text={workoutName}
                    style={{
                        fontSize: 12.5,
                        fontWeight: "bold",
                        color: "#FFFFFF",
                        letterSpacing: 0.2,
                    }}
                    maxLines={1}
                    truncate="END"
                />
            </FlexWidget>
        </FlexWidget>
    );
}
