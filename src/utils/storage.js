import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerAutoSync } from "./sync";
import { auth } from "./firebase";
import {
    fssaveWorkoutComplete,
    fsGetWorkoutHistory,
    fsGetStreak,
    fsGetTotalWorkouts,
    fsGetLastWorkoutDate,
    fsClearHistory,
    fsGetPRRecords,
    fsTryUpdatePR,
    fsGetBodyStats,
    fsSaveBodyStat,
    fsUpdateStreak,
} from "./firestore";

const KEYS = {
    HISTORY: "workout_history",
    STREAK: "workout_streak",
    LAST_WORKOUT_DATE: "last_workout_date",
    TOTAL_WORKOUTS: "total_workouts",
    PR_RECORDS: "pr_records",
    BODY_STATS: "body_stats",
    LAST_FREEZE_DATE: "last_freeze_date",
};

const hasCloudSession = () => !!auth.currentUser;

const readLocalHistory = async () => {
    const data = await AsyncStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
};

const readLocalStreak = async () => {
    const streak = await AsyncStorage.getItem(KEYS.STREAK);
    return streak ? parseInt(streak) : 0;
};

const readLocalTotalWorkouts = async () => {
    const total = await AsyncStorage.getItem(KEYS.TOTAL_WORKOUTS);
    return total ? parseInt(total) : 0;
};

const readLocalLastWorkoutDate = async () => {
    return await AsyncStorage.getItem(KEYS.LAST_WORKOUT_DATE);
};

const saveWorkoutCompleteLocal = async (day, target, durationSec, exercises = []) => {
    const today = new Date().toISOString().split("T")[0];
    const history = await readLocalHistory();
    const newEntry = {
        day,
        target,
        date: today,
        durationSec,
        completedAt: new Date().toISOString(),
        exercises,
    };
    const updated = [newEntry, ...history].slice(0, 100);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));

    const lastDate = await AsyncStorage.getItem(KEYS.LAST_WORKOUT_DATE);
    const lastFreeze = await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
    const streakStr = await AsyncStorage.getItem(KEYS.STREAK);

    let streak = streakStr ? parseInt(streakStr) : 0;
    const lastEffectiveDate = (lastFreeze && (!lastDate || new Date(lastFreeze) > new Date(lastDate)))
        ? lastFreeze
        : lastDate;

    if (lastEffectiveDate) {
        const last = new Date(lastEffectiveDate);
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

    triggerAutoSync();
    return { streak, total };
};

export const saveWorkoutComplete = async (day, target, durationSec, exercises = []) => {
    try {
        const localResult = await saveWorkoutCompleteLocal(day, target, durationSec, exercises);

        if (hasCloudSession()) {
            fssaveWorkoutComplete(day, target, durationSec, exercises).catch((e) => {
                console.warn("[Storage] Cloud workout sync failed. Local save already completed.", e?.message);
            });
        }

        return localResult;
    } catch (e) {
        console.error("saveWorkoutComplete error", e);
    }
};

export const getWorkoutHistory = async () => {
    try {
        const localHistory = await readLocalHistory();
        if (hasCloudSession()) {
            try {
                const cloudHistory = await fsGetWorkoutHistory();
                return cloudHistory.length >= localHistory.length ? cloudHistory : localHistory;
            } catch (e) {
                console.warn("[Storage] Cloud history fetch failed. Falling back to local storage.", e?.message);
            }
        }

        return localHistory;
    } catch {
        return [];
    }
};

export const checkAndCleanStreak = async () => {
    try {
        const lastDate = await AsyncStorage.getItem(KEYS.LAST_WORKOUT_DATE);
        const lastFreeze = await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
        const streakStr = await AsyncStorage.getItem(KEYS.STREAK);
        let streak = streakStr ? parseInt(streakStr) : 0;

        if (streak === 0) return { wasReset: false, previousStreak: 0 };

        const lastEffectiveDate = (lastFreeze && (!lastDate || new Date(lastFreeze) > new Date(lastDate)))
            ? lastFreeze
            : lastDate;

        if (lastEffectiveDate) {
            const today = new Date().toISOString().split("T")[0];
            const last = new Date(lastEffectiveDate);
            const todayDate = new Date(today);
            const diff = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));

            if (diff > 1) {
                // Streak is broken!
                await AsyncStorage.setItem(KEYS.STREAK, "0");
                if (hasCloudSession()) {
                    await fsUpdateStreak(0);
                }
                triggerAutoSync();
                return { wasReset: true, previousStreak: streak };
            }
        }
        return { wasReset: false, previousStreak: streak };
    } catch (e) {
        console.warn("[Storage] checkAndCleanStreak failed", e);
        return { wasReset: false, previousStreak: 0 };
    }
};

export const getStreak = async () => {
    try {
        await checkAndCleanStreak();
        const [localStreak, localLastDate] = await Promise.all([readLocalStreak(), readLocalLastWorkoutDate()]);
        if (hasCloudSession()) {
            try {
                const [cloudStreak, cloudLastDate] = await Promise.all([fsGetStreak(), fsGetLastWorkoutDate()]);
                if (!cloudLastDate) return localStreak;
                if (!localLastDate) return cloudStreak;
                if (localLastDate > cloudLastDate) return localStreak;
                if (cloudLastDate > localLastDate) return cloudStreak;
                return Math.max(localStreak, cloudStreak);
            } catch (e) {
                console.warn("[Storage] Cloud streak fetch failed. Falling back to local storage.", e?.message);
            }
        }

        return localStreak;
    } catch {
        return 0;
    }
};

export const getTotalWorkouts = async () => {
    try {
        const localTotal = await readLocalTotalWorkouts();
        if (hasCloudSession()) {
            try {
                const cloudTotal = await fsGetTotalWorkouts();
                return Math.max(localTotal, cloudTotal);
            } catch (e) {
                console.warn("[Storage] Cloud total fetch failed. Falling back to local storage.", e?.message);
            }
        }

        return localTotal;
    } catch {
        return 0;
    }
};

export const getLastWorkoutDate = async () => {
    try {
        const localLastDate = await readLocalLastWorkoutDate();
        if (hasCloudSession()) {
            try {
                const cloudLastDate = await fsGetLastWorkoutDate();
                if (!cloudLastDate) return localLastDate;
                if (!localLastDate) return cloudLastDate;
                return localLastDate > cloudLastDate ? localLastDate : cloudLastDate;
            } catch (e) {
                console.warn("[Storage] Cloud last workout date fetch failed. Falling back to local storage.", e?.message);
            }
        }

        return localLastDate;
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
        if (hasCloudSession()) {
            try {
                await fsClearHistory();
            } catch (e) {
                console.warn("[Storage] Cloud history clear failed. Clearing local storage only.", e?.message);
            }
        }

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
        if (hasCloudSession()) {
            try {
                return await fsGetPRRecords();
            } catch (e) {
                console.warn("[Storage] Cloud PR fetch failed. Falling back to local storage.", e?.message);
            }
        }

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
        if (hasCloudSession()) {
            try {
                return await fsTryUpdatePR(exerciseName, weightKg, reps);
            } catch (e) {
                console.warn("[Storage] Cloud PR save failed. Falling back to local storage.", e?.message);
            }
        }

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
        if (hasCloudSession()) {
            try {
                return await fsGetBodyStats();
            } catch (e) {
                console.warn("[Storage] Cloud body stats fetch failed. Falling back to local storage.", e?.message);
            }
        }

        const data = await AsyncStorage.getItem(KEYS.BODY_STATS);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

export const saveBodyStat = async (entry) => {
    try {
        if (hasCloudSession()) {
            try {
                await fsSaveBodyStat(entry);
                return await fsGetBodyStats();
            } catch (e) {
                console.warn("[Storage] Cloud body stat save failed. Falling back to local storage.", e?.message);
            }
        }

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

/** 
 * Manually freeze the streak for TODAY. 
 * This treats today as a "protected" day so missing it doesn't break the streak tomorrow.
 */
/** 
 * Manually freeze the streak for TODAY. 
 * This treats today as a "protected" day so missing it doesn't break the streak tomorrow.
 */
export const applyStreakFreeze = async () => {
    try {
        const today = new Date().toISOString().split("T")[0];
        await AsyncStorage.setItem(KEYS.LAST_FREEZE_DATE, today);
        triggerAutoSync();
        return true;
    } catch {
        return false;
    }
};

/** 
 * Withdraw the streak freeze for TODAY. 
 * Allows users to change their mind and continue their streak normally.
 */
export const withdrawStreakFreeze = async () => {
    try {
        await AsyncStorage.removeItem(KEYS.LAST_FREEZE_DATE);
        triggerAutoSync();
        return true;
    } catch {
        return false;
    }
};

export const getLastFreezeDate = async () => {
    try {
        return await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
    } catch {
        return null;
    }
};
