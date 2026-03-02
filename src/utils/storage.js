import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerAutoSync } from "./sync";

const KEYS = {
    HISTORY: "workout_history",
    STREAK: "workout_streak",
    LAST_WORKOUT_DATE: "last_workout_date",
    TOTAL_WORKOUTS: "total_workouts",
    PR_RECORDS: "pr_records",
    BODY_STATS: "body_stats",
};

export const saveWorkoutComplete = async (day, target, durationSec, exercises = []) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const history = await getWorkoutHistory();
        const newEntry = {
            day,
            target,
            date: today,
            durationSec,
            completedAt: new Date().toISOString(),
            exercises: exercises // Store full exercise details
        };
        const updated = [newEntry, ...history].slice(0, 100);
        await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));

        // Update streak
        const lastDate = await AsyncStorage.getItem(KEYS.LAST_WORKOUT_DATE);
        const streakStr = await AsyncStorage.getItem(KEYS.STREAK);
        let streak = streakStr ? parseInt(streakStr) : 0;
        if (lastDate) {
            const last = new Date(lastDate);
            const todayDate = new Date(today);
            const diff = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));
            if (diff === 1) {
                streak += 1;
            } else if (diff > 1) {
                streak = 1;
            }
        } else {
            streak = 1;
        }
        await AsyncStorage.setItem(KEYS.STREAK, String(streak));
        await AsyncStorage.setItem(KEYS.LAST_WORKOUT_DATE, today);

        const totalStr = await AsyncStorage.getItem(KEYS.TOTAL_WORKOUTS);
        const total = totalStr ? parseInt(totalStr) + 1 : 1;
        await AsyncStorage.setItem(KEYS.TOTAL_WORKOUTS, String(total));

        // Auto-save to cloud
        triggerAutoSync();

        return { streak, total };
    } catch (e) {
        console.error("saveWorkoutComplete error", e);
    }
};

export const getWorkoutHistory = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.HISTORY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const getStreak = async () => {
    try {
        const streak = await AsyncStorage.getItem(KEYS.STREAK);
        return streak ? parseInt(streak) : 0;
    } catch {
        return 0;
    }
};

export const getTotalWorkouts = async () => {
    try {
        const total = await AsyncStorage.getItem(KEYS.TOTAL_WORKOUTS);
        return total ? parseInt(total) : 0;
    } catch {
        return 0;
    }
};

export const getLastWorkoutDate = async () => {
    try {
        return await AsyncStorage.getItem(KEYS.LAST_WORKOUT_DATE);
    } catch {
        return null;
    }
};

export const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};

/** Clears all session history, streak, and total count. Settings are kept. */
export const clearHistory = async () => {
    try {
        await AsyncStorage.multiRemove([
            KEYS.HISTORY,
            KEYS.STREAK,
            KEYS.LAST_WORKOUT_DATE,
            KEYS.TOTAL_WORKOUTS,
            KEYS.PR_RECORDS,
        ]);
        triggerAutoSync();
    } catch (e) {
        console.error("clearHistory error", e);
    }
};

/** Wipes every key in AsyncStorage — full factory reset. */
export const clearAllData = async () => {
    try {
        await AsyncStorage.clear();
    } catch (e) {
        console.error("clearAllData error", e);
    }
};

// ─────────────────────────────────────────────────────────
// PR RECORDS  (per-exercise personal bests)
// Structure: { [exerciseName]: { weightKg, reps, date, durationSec } }
// ─────────────────────────────────────────────────────────

export const getPRRecords = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.PR_RECORDS);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

/**
 * Attempt to save a new PR for an exercise.
 * A PR is triggered when: weightKg is higher, OR same weight with more reps.
 * Returns { isNewPR: bool, prev, next }.
 */
export const tryUpdatePR = async (exerciseName, weightKg, reps) => {
    try {
        const records = await getPRRecords();
        const prev = records[exerciseName] || null;
        const today = new Date().toISOString();

        const isNewPR =
            !prev ||
            weightKg > prev.weightKg ||
            (weightKg === prev.weightKg && reps > prev.reps);

        if (isNewPR) {
            const next = { weightKg, reps, date: today };
            records[exerciseName] = next;
            await AsyncStorage.setItem(KEYS.PR_RECORDS, JSON.stringify(records));
            triggerAutoSync();
            return { isNewPR: true, prev, next };
        }
        return { isNewPR: false, prev, next: prev };
    } catch (e) {
        console.error("tryUpdatePR error", e);
        return { isNewPR: false, prev: null, next: null };
    }
};

// ─────────────────────────────────────────────────────────
// BODY STATS  (weight + measurements over time)
// Each entry: { date, weightKg, chest, waist, hips, arms, thighs }
// ─────────────────────────────────────────────────────────

export const getBodyStats = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.BODY_STATS);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const saveBodyStat = async (entry) => {
    try {
        const stats = await getBodyStats();
        // Replace same-day entry or prepend
        const today = new Date().toISOString().split("T")[0];
        const filtered = stats.filter(s => s.date !== today);
        const updated = [{ ...entry, date: today }, ...filtered].slice(0, 365);
        await AsyncStorage.setItem(KEYS.BODY_STATS, JSON.stringify(updated));
        triggerAutoSync();
        return updated;
    } catch (e) {
        console.error("saveBodyStat error", e);
        return [];
    }
};
