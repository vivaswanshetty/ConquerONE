import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerAutoSync } from "./sync";

const KEY = "@workout_settings_v2";

export const DEFAULT_SETTINGS = {
    soundEnabled: true,
    vibrationEnabled: true,
    countdownAudio: true,
    extraRestSec: 0,        // 0 / 15 / 30 / 45 bonus seconds added to every rest phase
    activeTimeSec: null,    // null = use per-exercise default
    setLoggingEnabled: true, // show weight/reps log modal after each set
    keepScreenOn: true,      // prevent screen sleep during workout
    weightUnit: "kg",        // "kg" | "lbs"
    autoStartRest: true,     // auto-start rest timer after work phase ends
    showCalories: true,      // show live calorie estimate during workout
    restMindset: true,       // show motivational tip during rest
    streakFreezeEnabled: true,  // allow 1 missed day without breaking streak
    streakFreezeCount: 1,       // number of freeze days per week
};

export const getSettings = async () => {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

export const saveSettings = async (settings) => {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(settings));
        triggerAutoSync();
    } catch { }
};

/** Rough MET-based calorie burn estimate (kcal/min × duration in minutes) */
export const estimateCalories = (durationSec, weightKg = 75) => {
    const MET = 5.0; // resistance training MET
    const mins = durationSec / 60;
    return Math.round(MET * weightKg * (mins / 60));
};

/** Convert kg display value to lbs if unit is lbs */
export const displayWeight = (kg, unit = "kg") => {
    if (!kg && kg !== 0) return "—";
    if (unit === "lbs") return `${(kg * 2.20462).toFixed(1)} lbs`;
    return `${kg} kg`;
};
