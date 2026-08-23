import React from "react";
import { ConquerStreakWidget } from "./ConquerStreakWidget";
import { WORKOUT_PLAN } from "../data/workoutData";
import { getStreakLocal } from "../utils/storage";

/**
 * Resolves current streak and today's scheduled workout from local storage/data.
 */
async function getWidgetData() {
    let streak = 0;
    try {
        streak = await getStreakLocal();
    } catch (e) {
        console.warn("Widget streak read error:", e);
    }

    const d = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
    const dayNum = d === 0 ? 7 : d;

    let workoutName = "Active Recovery";
    let dayName = "Sunday";

    if (dayNum <= 6) {
        const plan = WORKOUT_PLAN[dayNum - 1];
        if (plan) {
            workoutName = plan.target;
            dayName = plan.dayName;
        }
    }

    return { streak, workoutName, dayName };
}

export async function widgetTaskHandler(props) {
    const { widgetAction, renderWidget } = props;

    switch (widgetAction) {
        case "WIDGET_ADDED":
        case "WIDGET_UPDATE":
        case "WIDGET_RESIZED":
        case "WIDGET_CLICK": {
            const { streak, workoutName, dayName } = await getWidgetData();
            renderWidget(
                <ConquerStreakWidget
                    streak={streak}
                    workoutName={workoutName}
                    dayName={dayName}
                />
            );
            break;
        }
        case "WIDGET_DELETED":
            break;
        default:
            break;
    }
}
