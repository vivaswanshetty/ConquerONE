import React from "react";
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { ConquerStreakWidget } from "../widgets/ConquerStreakWidget";
import { WORKOUT_PLAN } from "../data/workoutData";
import { getStreakLocal } from "./storage";

/**
 * Triggers an immediate refresh of the Android home screen widget with the latest streak and workout data.
 */
export async function syncAndroidWidget() {
    if (Platform.OS !== "android") return;

    try {
        const streak = await getStreakLocal();
        const d = new Date().getDay();
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

        await requestWidgetUpdate({
            widgetName: "ConquerStreakWidget",
            renderWidget: () => (
                <ConquerStreakWidget
                    streak={streak}
                    workoutName={workoutName}
                    dayName={dayName}
                />
            ),
        });
    } catch (e) {
        // Quietly handle if widget is not active on home screen
    }
}
