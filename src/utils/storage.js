import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerAutoSync } from "./sync";
import { auth } from "./firebase";
import {
    WORKOUT_PLAN,
    getExerciseLoadCategory,
    getExerciseMuscleGroup,
    isBodyweightMovement,
} from "../data/workoutData";
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

export const KEYS = {
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
    READINESS: "daily_readiness",
    ACTIVE_PROGRAM: "active_program_version",
    PROGRAM_VERSIONS: "program_versions_history",
    DISMISSED_ALERTS: "dismissed_adaptive_alerts",
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
    const activeProg = await getActiveProgram();
    const newEntry = {
        day,
        target,
        date: today,
        durationSec,
        completedAt: new Date().toISOString(),
        exercises,
        programVersionId: activeProg?.id || "v1.0.0",
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
    const activeProg = await getActiveProgram();
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
        programVersionId: activeProg?.id || "v1.0.0",
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
// Structure: { [exerciseName]: { weightKg, reps, date, category, bestFreeWeight, bestMachine, bestWeightedBW, bestBodyweightReps, bestAssisted, bestTimedDurationSec } }
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
 * Supports multi-type tracking (free weight, machine, weighted bodyweight, bodyweight reps, assisted, timed)
 * while preserving backwards compatibility.
 * Returns { isNewPR: bool, prev, next }.
 */
export const tryUpdatePR = async (exerciseName, weightKg, reps, options = {}) => {
    try {
        if (hasCloudSession()) {
            try {
                fsTryUpdatePR(exerciseName, weightKg, reps).catch(() => {});
            } catch (e) {
                console.warn("[Storage] Cloud PR save failed. Falling back to local storage.", e?.message);
            }
        }

        const records = await getPRRecords();
        const prev = records[exerciseName] || null;
        const today = new Date().toISOString();
        const { loadType, bodyweightKg, durationSec } = options;
        const exCategory = getExerciseLoadCategory(exerciseName);
        const effectiveType = loadType || (exCategory === "bodyweight" ? (weightKg > 0 ? "weighted_bodyweight" : "bodyweight") : exCategory);

        let isNewPR = false;
        let updatedRecord = prev ? { ...prev } : { category: exCategory };

        if (effectiveType === "weighted_bodyweight") {
            const prevBest = prev?.bestWeightedBW;
            if (!prevBest || weightKg > (prevBest.addedWeightKg || 0) || (weightKg === (prevBest.addedWeightKg || 0) && reps > (prevBest.reps || 0))) {
                isNewPR = true;
                updatedRecord.bestWeightedBW = {
                    addedWeightKg: weightKg,
                    reps,
                    totalSystemLoadKg: typeof bodyweightKg === "number" ? bodyweightKg + weightKg : null,
                    date: today,
                };
            }
        } else if (effectiveType === "bodyweight") {
            const prevBest = prev?.bestBodyweightReps;
            if (!prevBest || reps > (prevBest.reps || 0)) {
                isNewPR = true;
                updatedRecord.bestBodyweightReps = {
                    reps,
                    bodyweightKg: typeof bodyweightKg === "number" ? bodyweightKg : null,
                    date: today,
                };
            }
        } else if (effectiveType === "machine") {
            const prevBest = prev?.bestMachine;
            if (!prevBest || weightKg > (prevBest.weightKg || 0) || (weightKg === (prevBest.weightKg || 0) && reps > (prevBest.reps || 0))) {
                isNewPR = true;
                const estimated1RM = (weightKg > 0 && reps >= 1 && reps <= 12) ? parseFloat((weightKg * (1 + reps / 30)).toFixed(1)) : null;
                updatedRecord.bestMachine = {
                    weightKg,
                    reps,
                    estimated1RM,
                    date: today,
                };
            }
        } else if (effectiveType === "timed") {
            const dur = durationSec || reps || 30;
            const prevBest = prev?.bestTimedDurationSec;
            if (!prevBest || dur > (prevBest.durationSec || 0)) {
                isNewPR = true;
                updatedRecord.bestTimedDurationSec = {
                    durationSec: dur,
                    date: today,
                };
            }
        } else {
            // free_weight
            const prevBest = prev?.bestFreeWeight;
            if (!prevBest || weightKg > (prevBest.weightKg || 0) || (weightKg === (prevBest.weightKg || 0) && reps > (prevBest.reps || 0))) {
                isNewPR = true;
                const estimated1RM = (weightKg > 0 && reps >= 1 && reps <= 12) ? parseFloat((weightKg * (1 + reps / 30)).toFixed(1)) : null;
                updatedRecord.bestFreeWeight = {
                    weightKg,
                    reps,
                    estimated1RM,
                    date: today,
                };
            }
        }

        // Maintain top-level backward compatibility
        const prevWeight = prev?.weightKg || 0;
        const prevReps = prev?.reps || 0;
        if (!prev || weightKg > prevWeight || (weightKg === prevWeight && reps > prevReps)) {
            updatedRecord.weightKg = weightKg;
            updatedRecord.reps = reps;
            updatedRecord.date = today;
            isNewPR = true;
        }

        if (isNewPR) {
            records[exerciseName] = updatedRecord;
            await AsyncStorage.setItem(KEYS.PR_RECORDS, JSON.stringify(records));
            triggerAutoSync();
            return { isNewPR: true, prev, next: updatedRecord };
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

/**
 * Returns the most recently recorded bodyweight in kg, or null if unrecorded.
 * NEVER fabricates or invents a fallback bodyweight.
 */
export const getLatestUserBodyweight = async () => {
    try {
        const stats = await getBodyStats();
        if (Array.isArray(stats) && stats.length > 0) {
            const latest = stats.find(s => s && typeof s.weightKg === "number" && s.weightKg > 0);
            if (latest && typeof latest.weightKg === "number") {
                return latest.weightKg;
            }
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Non-destructively normalizes any logged set (legacy or structured).
 * Interprets legacy logs using exercise taxonomy without inventing fake values or deleting history.
 */
export const normalizeLoggedSet = (rawSet, exerciseName = "", latestBodyweight = null) => {
    if (!rawSet) return null;
    const exCategory = getExerciseLoadCategory(exerciseName);
    const setNum = rawSet.set || 1;
    const completed = !!rawSet.completed;
    const skipped = !!rawSet.skipped || (!completed && (rawSet.weightKg === 0 || rawSet.weight === 0) && (rawSet.reps === 0 || rawSet.reps === "0"));

    // Hierarchy for bodyweight: explicit set BW -> latest recorded bodyweight -> null
    const explicitBW = (typeof rawSet.bodyweightKg === "number" && rawSet.bodyweightKg > 0) 
        ? rawSet.bodyweightKg 
        : (typeof rawSet.userBodyweightKg === "number" && rawSet.userBodyweightKg > 0)
        ? rawSet.userBodyweightKg
        : null;
    const resolvedBW = explicitBW !== null ? explicitBW : (typeof latestBodyweight === "number" && latestBodyweight > 0 ? latestBodyweight : null);

    const reps = parseInt(rawSet.reps, 10) || 0;
    const rawWeight = typeof rawSet.weightKg === "number"
        ? rawSet.weightKg
        : (typeof rawSet.addedWeightKg === "number"
            ? rawSet.addedWeightKg
            : (typeof rawSet.addedWeight === "number"
                ? rawSet.addedWeight
                : (parseFloat(rawSet.weight) || 0)));
    const durationSec = rawSet.durationSec != null ? parseInt(rawSet.durationSec, 10) : (rawSet.loadType === "timed" || exCategory === "timed" ? (parseInt(rawSet.reps, 10) || 0) : null);

    // If loadType is already explicitly set
    if (rawSet.loadType) {
        let totalSystemLoadKg = rawSet.totalSystemLoadKg != null ? rawSet.totalSystemLoadKg : null;
        let effectiveLoadKg = rawSet.effectiveLoadKg != null ? rawSet.effectiveLoadKg : null;

        if (rawSet.loadType === "weighted_bodyweight" && totalSystemLoadKg === null && resolvedBW !== null) {
            totalSystemLoadKg = resolvedBW + rawWeight;
        } else if (rawSet.loadType === "assisted_bodyweight" && effectiveLoadKg === null && resolvedBW !== null) {
            effectiveLoadKg = Math.max(0, resolvedBW - rawWeight);
        } else if (rawSet.loadType === "bodyweight" && totalSystemLoadKg === null && resolvedBW !== null) {
            totalSystemLoadKg = resolvedBW;
        }

        return {
            set: setNum,
            loadType: rawSet.loadType,
            weightKg: rawWeight,
            bodyweightKg: resolvedBW,
            totalSystemLoadKg,
            effectiveLoadKg,
            reps,
            durationSec,
            completed,
            skipped,
        };
    }

    // Legacy set classification based on exercise category
    if (exCategory === "bodyweight" || isBodyweightMovement(exerciseName)) {
        if (rawWeight > 0) {
            return {
                set: setNum,
                loadType: "weighted_bodyweight",
                weightKg: rawWeight, // added weight
                bodyweightKg: resolvedBW,
                totalSystemLoadKg: resolvedBW !== null ? resolvedBW + rawWeight : null,
                effectiveLoadKg: null,
                reps,
                durationSec: null,
                completed,
                skipped,
            };
        } else {
            return {
                set: setNum,
                loadType: "bodyweight",
                weightKg: 0,
                bodyweightKg: resolvedBW,
                totalSystemLoadKg: resolvedBW !== null ? resolvedBW : null,
                effectiveLoadKg: null,
                reps,
                durationSec: null,
                completed,
                skipped,
            };
        }
    }

    if (exCategory === "machine") {
        return {
            set: setNum,
            loadType: "machine",
            weightKg: rawWeight,
            bodyweightKg: resolvedBW,
            totalSystemLoadKg: rawWeight,
            effectiveLoadKg: null,
            reps,
            durationSec: null,
            completed,
            skipped,
        };
    }

    if (exCategory === "timed") {
        return {
            set: setNum,
            loadType: "timed",
            weightKg: rawWeight,
            bodyweightKg: resolvedBW,
            totalSystemLoadKg: rawWeight > 0 ? rawWeight : (resolvedBW || null),
            effectiveLoadKg: null,
            reps,
            durationSec: rawSet.durationSec || (reps > 0 ? reps : 30),
            completed,
            skipped,
        };
    }

    // Default to free_weight
    return {
        set: setNum,
        loadType: "free_weight",
        weightKg: rawWeight,
        bodyweightKg: resolvedBW,
        totalSystemLoadKg: rawWeight,
        effectiveLoadKg: null,
        reps,
        durationSec: null,
        completed,
        skipped,
    };
};

export const saveBodyStat = async (entry) => {
    try {
        const entryDate = entry?.date || new Date().toISOString().split("T")[0];
        const normalizedEntry = { ...entry, date: entryDate };

        if (hasCloudSession()) {
            try {
                await fsSaveBodyStat(normalizedEntry);
                return await fsGetBodyStats();
            } catch (e) {
                console.warn("[Storage] Cloud body stat save failed. Falling back to local storage.", e?.message);
            }
        }

        const stats = await getBodyStats();
        // Replace same-date entry or prepend
        const filtered = stats.filter(s => s.date !== entryDate);
        const updated = [normalizedEntry, ...filtered].slice(0, 365);
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

/* ── Daily Self-Reported Readiness ─────────────────────────── */

/**
 * Retrieves daily self-reported readiness logs.
 * Stored in an isolated key without altering workout history.
 */
export const getDailyReadiness = async (limit = 60) => {
    try {
        const raw = await AsyncStorage.getItem(KEYS.READINESS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, limit);
    } catch (e) {
        console.warn("[Storage] getDailyReadiness error", e);
        return [];
    }
};

/**
 * Saves a daily self-reported readiness log.
 * Entry: { date, energy: 1-5, sleep: 1-5, soreness: 1-5, motivation: 1-5, score: 0-100 }
 */
export const saveDailyReadiness = async (entry) => {
    try {
        if (!entry) return [];
        const entryDate = entry.date || new Date().toISOString().split("T")[0];
        const energy = Math.max(1, Math.min(5, parseInt(entry.energy, 10) || 3));
        const sleep = Math.max(1, Math.min(5, parseInt(entry.sleep, 10) || 3));
        const soreness = Math.max(1, Math.min(5, parseInt(entry.soreness, 10) || 3));
        const motivation = Math.max(1, Math.min(5, parseInt(entry.motivation, 10) || 3));
        const score = Math.round(((energy + sleep + soreness + motivation) / 20) * 100);

        const normalized = {
            date: entryDate,
            energy,
            sleep,
            soreness,
            motivation,
            score,
            loggedAt: new Date().toISOString(),
        };

        const existing = await getDailyReadiness(120);
        const filtered = existing.filter(r => r.date !== entryDate);
        const updated = [normalized, ...filtered].slice(0, 120);

        await AsyncStorage.setItem(KEYS.READINESS, JSON.stringify(updated));
        triggerAutoSync();
        return updated;
    } catch (e) {
        console.error("[Storage] saveDailyReadiness error", e);
        return [];
    }
};

/**
 * Returns today's logged readiness entry if recorded, otherwise null.
 */
export const getTodayReadiness = async () => {
    try {
        const todayStr = new Date().toISOString().split("T")[0];
        const logs = await getDailyReadiness(7);
        const match = logs.find(r => r.date === todayStr);
        return match || null;
    } catch {
        return null;
    }
};

/* ── Program Versioning & Adaptation Storage ──────────────── */

/**
 * Creates default v1.0.0 baseline snapshot from immutable WORKOUT_PLAN.
 */
export const createDefaultProgramVersion = () => {
    return {
        id: "v1.0.0",
        version: "1.0.0",
        name: "Vivaswan Elite (6-Day Split)",
        basePlanId: "vivaswan_elite_6day_v1",
        sourceVersionId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        changeType: "BASE_PLAN",
        changes: [],
        days: JSON.parse(JSON.stringify(WORKOUT_PLAN)),
        active: true,
        isTemporaryDeload: false,
        expiresAt: null,
    };
};

/**
 * Retrieves the current active program version.
 * If active version is an expired temporary deload, automatically restores its sourceVersionId.
 */
export const getActiveProgram = async () => {
    try {
        const raw = await AsyncStorage.getItem(KEYS.ACTIVE_PROGRAM);
        if (!raw) {
            return createDefaultProgramVersion();
        }
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
            return createDefaultProgramVersion();
        }

        // Check if active program is an expired temporary deload
        if (parsed.isTemporaryDeload && parsed.expiresAt) {
            const isExpired = new Date(parsed.expiresAt).getTime() <= Date.now();
            if (isExpired && parsed.sourceVersionId) {
                const versions = await getProgramVersions();
                const sourceVersion = versions.find(v => v.id === parsed.sourceVersionId);
                const restored = sourceVersion || createDefaultProgramVersion();
                await saveActiveProgram(restored, false);
                return restored;
            }
        }

        return parsed;
    } catch (e) {
        console.warn("[Storage] getActiveProgram error", e);
        return createDefaultProgramVersion();
    }
};

/**
 * Retrieves full history of program version snapshots.
 */
export const getProgramVersions = async () => {
    try {
        const raw = await AsyncStorage.getItem(KEYS.PROGRAM_VERSIONS);
        if (!raw) {
            return [createDefaultProgramVersion()];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return [createDefaultProgramVersion()];
        }
        return parsed;
    } catch (e) {
        console.warn("[Storage] getProgramVersions error", e);
        return [createDefaultProgramVersion()];
    }
};

/**
 * Saves a new active program version.
 * Appends to version history array while de-activating prior versions.
 */
export const saveActiveProgram = async (programVersion, appendToHistory = true) => {
    try {
        if (!programVersion || !Array.isArray(programVersion.days)) return null;

        const normalized = {
            ...programVersion,
            active: true,
            updatedAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(KEYS.ACTIVE_PROGRAM, JSON.stringify(normalized));

        if (appendToHistory) {
            const currentVersions = await getProgramVersions();
            const existingIndex = currentVersions.findIndex(v => v.id === normalized.id);
            let updatedVersions = [];
            if (existingIndex >= 0) {
                updatedVersions = currentVersions.map(v => v.id === normalized.id ? normalized : { ...v, active: false });
            } else {
                updatedVersions = [normalized, ...currentVersions.map(v => ({ ...v, active: false }))];
            }
            await AsyncStorage.setItem(KEYS.PROGRAM_VERSIONS, JSON.stringify(updatedVersions.slice(0, 50)));
        }

        triggerAutoSync();
        return normalized;
    } catch (e) {
        console.error("[Storage] saveActiveProgram error", e);
        return null;
    }
};

/**
 * Resets active program back to base v1.0.0.
 */
export const resetToDefaultProgram = async () => {
    const defaultProg = createDefaultProgramVersion();
    return await saveActiveProgram(defaultProg, true);
};

/**
 * Dismisses/suppresses an adaptive alert for a set period (default 7 days).
 */
export const dismissAdaptiveRecommendation = async (recId, durationDays = 7) => {
    try {
        if (!recId) return {};
        const raw = await AsyncStorage.getItem(KEYS.DISMISSED_ALERTS);
        const existing = raw ? JSON.parse(raw) : {};
        const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        existing[recId] = expiresAt;
        await AsyncStorage.setItem(KEYS.DISMISSED_ALERTS, JSON.stringify(existing));
        return existing;
    } catch (e) {
        console.warn("[Storage] dismissAdaptiveRecommendation error", e);
        return {};
    }
};

/**
 * Returns currently active alert suppressions.
 */
export const getDismissedRecommendations = async () => {
    try {
        const raw = await AsyncStorage.getItem(KEYS.DISMISSED_ALERTS);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        const now = Date.now();
        const valid = {};
        Object.keys(parsed).forEach(k => {
            if (parsed[k] > now) {
                valid[k] = parsed[k];
            }
        });
        return valid;
    } catch {
        return {};
    }
};


