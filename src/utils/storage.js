import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerAutoSync } from "./sync";
import { auth } from "./firebase";
import {
    fssaveWorkoutComplete,
    fssaveManualWorkout,
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
    fsGetXP,
    fsGetRecordStreak,
} from "./firestore";

const KEYS = {
    HISTORY: "workout_history",
    STREAK: "workout_streak",
    LAST_WORKOUT_DATE: "last_workout_date",
    TOTAL_WORKOUTS: "total_workouts",
    PR_RECORDS: "pr_records",
    BODY_STATS: "body_stats",
    LAST_FREEZE_DATE: "last_freeze_date",
    PREVIOUS_FREEZE_DATE: "previous_freeze_date",
    XP: "workout_xp",
    RECORD_STREAK: "record_streak",
    ACTIVE_WORKOUT: "active_workout_session",
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

/**
 * Helper to check if all days strictly between `startDateStr` and `endDateStr`
 * are excused (e.g. Sunday / scheduled rest day, or explicit streak freeze).
 */
const areAllInterveningDaysExcused = (startDateStr, endDateStr, freezeDates = []) => {
    if (!startDateStr || !endDateStr) return true;
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return true;

    // Check each intervening date between start and end
    for (let i = 1; i < diffDays; i++) {
        const checkDate = new Date(start);
        checkDate.setDate(start.getDate() + i);
        checkDate.setHours(0, 0, 0, 0);

        const isSunday = checkDate.getDay() === 0;
        const checkDateStr = checkDate.toISOString().split("T")[0];
        const isFrozen = freezeDates.includes(checkDateStr);

        if (!isSunday && !isFrozen) {
            return false;
        }
    }
    return true;
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
    const prevFreeze = await AsyncStorage.getItem(KEYS.PREVIOUS_FREEZE_DATE);
    const streakStr = await AsyncStorage.getItem(KEYS.STREAK);

    let streak = streakStr ? parseInt(streakStr) : 0;
    const freezeDates = [lastFreeze, prevFreeze].filter(Boolean);

    const lastEffectiveDate = (lastFreeze && (!lastDate || new Date(lastFreeze) > new Date(lastDate)))
        ? lastFreeze
        : lastDate;

    if (lastEffectiveDate) {
        const last = new Date(lastEffectiveDate);
        const todayDate = new Date(today);
        const diff = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));

        if (diff === 0) {
            // Multiple workouts in same day — streak count stays the same
        } else if (diff === 1 || areAllInterveningDaysExcused(lastEffectiveDate, today, freezeDates)) {
            // Consecutive day OR all intervening days were excused (Sundays / Freezes)
            streak += 1;
        } else {
            // Unexcused workout day was skipped
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

    // Calculate XP based on streak tier multipliers
    let xpGained = 10;
    if (streak >= 10) {
        xpGained = 20;
    } else if (streak >= 5) {
        xpGained = 15;
    } else if (streak >= 3) {
        xpGained = 12;
    }

    const xpStr = await AsyncStorage.getItem(KEYS.XP);
    const totalXP = (xpStr ? parseInt(xpStr) : 0) + xpGained;
    await AsyncStorage.setItem(KEYS.XP, String(totalXP));

    // Calculate Record Streak
    const recordStr = await AsyncStorage.getItem(KEYS.RECORD_STREAK);
    let recordStreak = recordStr ? parseInt(recordStr) : 0;
    if (streak > recordStreak) {
        recordStreak = streak;
        await AsyncStorage.setItem(KEYS.RECORD_STREAK, String(recordStreak));
    }

    triggerAutoSync();
    return { streak, total, xpGained, totalXP, recordStreak };
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

/**
 * Calculates the consecutive streak from a history array and optional freeze dates.
 */
export const calculateStreakFromHistory = (history = [], freezeDates = []) => {
    if (!history || history.length === 0) return 0;

    const dateSet = new Set();
    history.forEach((h) => {
        if (h.date) {
            dateSet.add(h.date);
        } else if (h.completedAt) {
            const d = typeof h.completedAt === "object" && h.completedAt.seconds
                ? new Date(h.completedAt.seconds * 1000)
                : new Date(h.completedAt);
            if (!isNaN(d.getTime())) {
                dateSet.add(d.toISOString().split("T")[0]);
            }
        }
    });

    const sortedDates = Array.from(dateSet).sort();
    if (sortedDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const latestDateStr = sortedDates[sortedDates.length - 1];

    const today = new Date(todayStr);
    const latest = new Date(latestDateStr);
    const daysSinceLatest = Math.round((today.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLatest > 1 && !areAllInterveningDaysExcused(latestDateStr, todayStr, freezeDates)) {
        return 0;
    }

    let streak = 1;
    for (let i = sortedDates.length - 1; i > 0; i--) {
        const curr = sortedDates[i];
        const prev = sortedDates[i - 1];
        const currDate = new Date(curr);
        const prevDate = new Date(prev);
        const diff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diff === 0) {
            // Same day, continue
        } else if (diff === 1 || areAllInterveningDaysExcused(prev, curr, freezeDates)) {
            streak += 1;
        } else {
            break;
        }
    }

    return streak;
};

const saveManualWorkoutLocal = async ({
    date,
    day = 1,
    target = "Workout",
    durationSec = 3600,
    exercises = [],
    notes = "",
    caloriesBurned = 0,
}) => {
    const workoutDateStr = date || new Date().toISOString().split("T")[0];
    const isToday = workoutDateStr === new Date().toISOString().split("T")[0];
    const completedAt = isToday
        ? new Date().toISOString()
        : new Date(`${workoutDateStr}T12:00:00.000Z`).toISOString();

    const history = await readLocalHistory();
    const newEntry = {
        day,
        target,
        date: workoutDateStr,
        durationSec,
        completedAt,
        exercises,
        notes: notes || "",
        caloriesBurned: caloriesBurned || Math.round((durationSec || 3600) * 0.11),
        isManual: true,
    };

    // Merge and sort history descending by completedAt / date
    const updatedHistory = [newEntry, ...history]
        .sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date))
        .slice(0, 150);

    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updatedHistory));

    // Get freezes
    const lastFreeze = await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
    const prevFreeze = await AsyncStorage.getItem(KEYS.PREVIOUS_FREEZE_DATE);
    const freezeDates = [lastFreeze, prevFreeze].filter(Boolean);

    // Calculate streak across entire history
    const streak = calculateStreakFromHistory(updatedHistory, freezeDates);
    await AsyncStorage.setItem(KEYS.STREAK, String(streak));

    // Update last workout date if this workout is the latest
    const lastDate = await AsyncStorage.getItem(KEYS.LAST_WORKOUT_DATE);
    if (!lastDate || new Date(workoutDateStr) >= new Date(lastDate)) {
        await AsyncStorage.setItem(KEYS.LAST_WORKOUT_DATE, workoutDateStr);
    }

    // Increment total workouts
    const totalStr = await AsyncStorage.getItem(KEYS.TOTAL_WORKOUTS);
    const total = totalStr ? parseInt(totalStr, 10) + 1 : 1;
    await AsyncStorage.setItem(KEYS.TOTAL_WORKOUTS, String(total));

    // XP calculation
    let xpGained = 10;
    if (streak >= 10) xpGained = 20;
    else if (streak >= 5) xpGained = 15;
    else if (streak >= 3) xpGained = 12;

    const xpStr = await AsyncStorage.getItem(KEYS.XP);
    const totalXP = (xpStr ? parseInt(xpStr, 10) : 0) + xpGained;
    await AsyncStorage.setItem(KEYS.XP, String(totalXP));

    // Record Streak
    const recordStr = await AsyncStorage.getItem(KEYS.RECORD_STREAK);
    let recordStreak = recordStr ? parseInt(recordStr, 10) : 0;
    if (streak > recordStreak) {
        recordStreak = streak;
        await AsyncStorage.setItem(KEYS.RECORD_STREAK, String(recordStreak));
    }

    // PR Check for all logged exercises
    const prsBroken = [];
    if (Array.isArray(exercises)) {
        for (const ex of exercises) {
            const exName = ex.name || ex.exerciseName;
            if (exName && Array.isArray(ex.logs)) {
                for (const log of ex.logs) {
                    const weight = parseFloat(log.weight) || 0;
                    const reps = parseInt(log.reps, 10) || 0;
                    if (weight > 0 && reps > 0) {
                        try {
                            const prRes = await tryUpdatePR(exName, weight, reps);
                            if (prRes && prRes.isNewPR) {
                                prsBroken.push({ exerciseName: exName, weight, reps });
                            }
                        } catch (e) {
                            console.warn("PR check error for manual log:", e);
                        }
                    }
                }
            }
        }
    }

    triggerAutoSync();
    return { streak, total, xpGained, totalXP, recordStreak, prsBroken, workout: newEntry };
};

export const saveManualWorkout = async (manualData) => {
    try {
        const localResult = await saveManualWorkoutLocal(manualData);

        if (hasCloudSession()) {
            fssaveManualWorkout(manualData).catch((e) => {
                console.warn("[Storage] Cloud manual workout sync failed. Local save completed.", e?.message);
            });
        }

        return localResult;
    } catch (e) {
        console.error("saveManualWorkout error", e);
        throw e;
    }
};

export const getWorkoutHistory = async () => {
    try {
        const localHistory = await readLocalHistory();
        if (hasCloudSession()) {
            try {
                const cloudHistory = await fsGetWorkoutHistory();
                if (cloudHistory && cloudHistory.length > 0) {
                    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(cloudHistory));
                }
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
        const prevFreeze = await AsyncStorage.getItem(KEYS.PREVIOUS_FREEZE_DATE);
        const streakStr = await AsyncStorage.getItem(KEYS.STREAK);
        let streak = streakStr ? parseInt(streakStr) : 0;

        if (streak === 0) return { wasReset: false, previousStreak: 0 };

        const freezeDates = [lastFreeze, prevFreeze].filter(Boolean);
        const lastEffectiveDate = (lastFreeze && (!lastDate || new Date(lastFreeze) > new Date(lastDate)))
            ? lastFreeze
            : lastDate;

        if (lastEffectiveDate) {
            const today = new Date().toISOString().split("T")[0];

            // If all intervening days were excused (Sundays / Freezes), streak remains intact
            const allExcused = areAllInterveningDaysExcused(lastEffectiveDate, today, freezeDates);

            if (!allExcused) {
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
                
                let finalStreak = localStreak;
                if (cloudLastDate) {
                    if (!localLastDate || cloudLastDate > localLastDate || (cloudLastDate === localLastDate && cloudStreak > localStreak)) {
                        finalStreak = cloudStreak;
                        await AsyncStorage.setItem(KEYS.STREAK, String(cloudStreak));
                        await AsyncStorage.setItem(KEYS.LAST_WORKOUT_DATE, cloudLastDate);
                    }
                }
                return finalStreak;
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
                if (cloudTotal > localTotal) {
                    await AsyncStorage.setItem(KEYS.TOTAL_WORKOUTS, String(cloudTotal));
                    return cloudTotal;
                }
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
                const cloudPRs = await fsGetPRRecords();
                if (cloudPRs && Object.keys(cloudPRs).length > 0) {
                    await AsyncStorage.setItem(KEYS.PR_RECORDS, JSON.stringify(cloudPRs));
                }
                return cloudPRs;
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
                const cloudStats = await fsGetBodyStats();
                if (cloudStats && cloudStats.length > 0) {
                    await AsyncStorage.setItem(KEYS.BODY_STATS, JSON.stringify(cloudStats));
                }
                return cloudStats;
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
        const currentLast = await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
        if (currentLast && currentLast !== today) {
            await AsyncStorage.setItem(KEYS.PREVIOUS_FREEZE_DATE, currentLast);
        }
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
        const prev = await AsyncStorage.getItem(KEYS.PREVIOUS_FREEZE_DATE);
        if (prev) {
            await AsyncStorage.setItem(KEYS.LAST_FREEZE_DATE, prev);
            await AsyncStorage.removeItem(KEYS.PREVIOUS_FREEZE_DATE);
        } else {
            await AsyncStorage.removeItem(KEYS.LAST_FREEZE_DATE);
        }
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

export const getPreviousFreezeDate = async () => {
    try {
        return await AsyncStorage.getItem(KEYS.PREVIOUS_FREEZE_DATE);
    } catch {
        return null;
    }
};

export const getStreakLocal = async () => {
    try {
        await checkAndCleanStreak();
    } catch {}
    return await readLocalStreak();
};

export const getTotalWorkoutsLocal = async () => {
    return await readLocalTotalWorkouts();
};

export const getWorkoutHistoryLocal = async () => {
    return await readLocalHistory();
};

export const getXPLocal = async () => {
    try {
        const xp = await AsyncStorage.getItem(KEYS.XP);
        return xp ? parseInt(xp) : 0;
    } catch {
        return 0;
    }
};

export const getXP = async () => {
    try {
        const localXP = await getXPLocal();
        if (hasCloudSession()) {
            try {
                const cloudXP = await fsGetXP();
                if (cloudXP > localXP) {
                    await AsyncStorage.setItem(KEYS.XP, String(cloudXP));
                    return cloudXP;
                }
                return Math.max(localXP, cloudXP);
            } catch (e) {
                console.warn("[Storage] Cloud XP fetch failed. Falling back to local storage.", e?.message);
            }
        }
        return localXP;
    } catch {
        return 0;
    }
};

export const getRecordStreakLocal = async () => {
    try {
        const record = await AsyncStorage.getItem(KEYS.RECORD_STREAK);
        return record ? parseInt(record) : 0;
    } catch {
        return 0;
    }
};

export const getRecordStreak = async () => {
    try {
        const localRecord = await getRecordStreakLocal();
        if (hasCloudSession()) {
            try {
                const cloudRecord = await fsGetRecordStreak();
                if (cloudRecord > localRecord) {
                    await AsyncStorage.setItem(KEYS.RECORD_STREAK, String(cloudRecord));
                    return cloudRecord;
                }
                return Math.max(localRecord, cloudRecord);
            } catch (e) {
                console.warn("[Storage] Cloud record streak fetch failed. Falling back to local storage.", e?.message);
            }
        }
        return localRecord;
    } catch {
        return 0;
    }
};

/* ── Active Workout Persistence ────────────────────────────── */
export const saveActiveWorkoutSession = async (sessionData) => {
    try {
        if (!sessionData || !sessionData.day || !sessionData.day.exercises) {
            return;
        }
        const payload = {
            ...sessionData,
            lastUpdated: Date.now(),
        };
        await AsyncStorage.setItem(KEYS.ACTIVE_WORKOUT, JSON.stringify(payload));
    } catch (e) {
        console.warn("[Storage] Failed to save active workout session", e);
    }
};

export const getActiveWorkoutSession = async () => {
    try {
        const raw = await AsyncStorage.getItem(KEYS.ACTIVE_WORKOUT);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.day || !Array.isArray(parsed.day.exercises)) {
            await clearActiveWorkoutSession();
            return null;
        }
        // Expire session if older than 12 hours (43,200,000 ms)
        if (Date.now() - (parsed.lastUpdated || 0) > 12 * 60 * 60 * 1000) {
            await clearActiveWorkoutSession();
            return null;
        }
        return parsed;
    } catch (e) {
        console.warn("[Storage] Failed to load active workout session", e);
        await clearActiveWorkoutSession();
        return null;
    }
};

export const clearActiveWorkoutSession = async () => {
    try {
        await AsyncStorage.removeItem(KEYS.ACTIVE_WORKOUT);
    } catch (e) {
        console.warn("[Storage] Failed to clear active workout session", e);
    }
};

