import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

function getMuscleColor(target) {
    if (!target) return "#8E8E93";
    const t = String(target).toUpperCase();
    if (t.includes("CHEST") || t.includes("TRICEPS") || t.includes("PUSH")) return "#E31E24";
    if (t.includes("BACK") || t.includes("BICEPS") || t.includes("PULL")) return "#FF9500";
    if (t.includes("SHOULDERS") || t.includes("CORE") || t.includes("ARMS") || t.includes("ABS")) return "#30B0C7";
    if (t.includes("LEGS") || t.includes("QUADS") || t.includes("LOWER") || t.includes("CALVES")) return "#D1D1D1";
    if (t.includes("RECOVERY") || t.includes("REST") || t.includes("MOBILITY") || t.includes("MINDFULNESS")) return "#30D158";
    return "#8E8E93";
}

export function ConquerStreakWidget({ streak = 0, workoutName = "Today's Workout", dayName = "" }) {
    const muscleColor = getMuscleColor(workoutName);
    const displayDay = dayName ? dayName.slice(0, 3).toUpperCase() : "";

    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: "#0A0A0B",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#1E1E20",
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
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#E31E24",
                            marginRight: 6,
                        }}
                    />
                    <TextWidget
                        text="CONQUERONE"
                        style={{
                            fontSize: 9.5,
                            fontWeight: "bold",
                            color: "#8A8A8E",
                            letterSpacing: 1.2,
                        }}
                    />
                </FlexWidget>

                {displayDay ? (
                    <TextWidget
                        text={displayDay}
                        style={{
                            fontSize: 9,
                            fontWeight: "bold",
                            color: "#5A5A5E",
                            letterSpacing: 0.8,
                        }}
                    />
                ) : null}
            </FlexWidget>

            {/* Streak Counter Section */}
            <FlexWidget
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 6,
                    marginBottom: 4,
                }}
            >
                <TextWidget
                    text={`${streak}`}
                    style={{
                        fontSize: 28,
                        fontWeight: "bold",
                        color: "#E31E24",
                        marginRight: 8,
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
                            fontSize: 11,
                            fontWeight: "bold",
                            color: "#EDEAE3",
                        }}
                    />
                    <TextWidget
                        text="STREAK"
                        style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "#8A8A8E",
                            letterSpacing: 1,
                        }}
                    />
                </FlexWidget>
            </FlexWidget>

            {/* Divider */}
            <FlexWidget
                style={{
                    height: 1,
                    width: "match_parent",
                    backgroundColor: "#1E1E20",
                    marginVertical: 4,
                }}
            />

            {/* Today's Workout Section */}
            <FlexWidget
                style={{
                    flexDirection: "column",
                    width: "match_parent",
                }}
            >
                <TextWidget
                    text="TODAY'S TARGET"
                    style={{
                        fontSize: 8,
                        fontWeight: "bold",
                        color: "#5A5A5E",
                        letterSpacing: 1,
                        marginBottom: 2,
                    }}
                />
                <FlexWidget
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <FlexWidget
                        style={{
                            width: 5,
                            height: 5,
                            borderRadius: 2.5,
                            backgroundColor: muscleColor,
                            marginRight: 6,
                        }}
                    />
                    <TextWidget
                        text={workoutName}
                        style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color: "#EDEAE3",
                        }}
                        maxLines={1}
                        truncate="END"
                    />
                </FlexWidget>
            </FlexWidget>
        </FlexWidget>
    );
}
