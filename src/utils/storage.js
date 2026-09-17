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

// ─────────────────────────────────────────────────────────
// IN-MEMORY ZERO-LATENCY CACHE
// Eliminates AsyncStorage & Firestore latency on screen load
// ─────────────────────────────────────────────────────────
const _memCache = {
    history: null,
    streak: null,
    totalWorkouts: null,
    prRecords: null,
    bodyStats: null,
    latestBW: null,
    activeProgram: null,
    programVersions: null,
    readiness: null,
    xp: null,
    recordStreak: null,
    lastFreezeDate: null,
    previousFreezeDate: null,
    dismissedAlerts: null,
    isHydrated: false,
};

export const isMemCacheHydrated = () => _memCache.isHydrated;

export const getMemCacheSnapshot = () => ({
    streak: _memCache.streak,
    total: _memCache.totalWorkouts,
    xp: _memCache.xp,
    recordStreak: _memCache.recordStreak,
    history: _memCache.history,
    bodyStats: _memCache.bodyStats,
    prRecords: _memCache.prRecords,
    latestBodyweight: _memCache.latestBW,
    readinessHistory: _memCache.readiness,
    activeProgram: _memCache.activeProgram,
    programVersions: _memCache.programVersions,
    lastFreezeDate: _memCache.lastFreezeDate,
    previousFreezeDate: _memCache.previousFreezeDate,
    dismissedAlerts: _memCache.dismissedAlerts,
    isHydrated: _memCache.isHydrated,
});

const readLocalHistory = async () => {
    if (_memCache.history !== null) return _memCache.history;
    try {
        const data = await AsyncStorage.getItem(KEYS.HISTORY);
        if (!data) {
            _memCache.history = [];
            return [];
        }
        const parsed = JSON.parse(data);
        const res = Array.isArray(parsed) ? parsed : [];
        _memCache.history = res;
        return res;
    } catch {
        return [];
    }
};

const readLocalStreak = async () => {
    if (typeof _memCache.streak === "number") return _memCache.streak;
    const streak = await AsyncStorage.getItem(KEYS.STREAK);
    const parsed = streak ? parseInt(streak, 10) : 0;
    _memCache.streak = parsed;
    return parsed;
};

const readLocalTotalWorkouts = async () => {
    if (typeof _memCache.totalWorkouts === "number") return _memCache.totalWorkouts;
    const total = await AsyncStorage.getItem(KEYS.TOTAL_WORKOUTS);
    const parsed = total ? parseInt(total, 10) : 0;
    _memCache.totalWorkouts = parsed;
    return parsed;
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

    _memCache.history = updated;
    _memCache.streak = streak;
    _memCache.totalWorkouts = total;
    _memCache.xp = totalXP;
    _memCache.recordStreak = recordStreak;

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

    _memCache.history = updatedHistory;
    _memCache.streak = streak;
    _memCache.totalWorkouts = total;
    _memCache.xp = totalXP;
    _memCache.recordStreak = recordStreak;

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
                    _memCache.history = cloudHistory;
                    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(cloudHistory));
                }
                const chosen = cloudHistory && cloudHistory.length >= localHistory.length ? cloudHistory : localHistory;
                _memCache.history = chosen;
                return chosen;
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
                _memCache.streak = 0;
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
                _memCache.streak = finalStreak;
                return finalStreak;
            } catch (e) {
                console.warn("[Storage] Cloud streak fetch failed. Falling back to local storage.", e?.message);
            }
        }

        _memCache.streak = localStreak;
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
                    _memCache.totalWorkouts = cloudTotal;
                    await AsyncStorage.setItem(KEYS.TOTAL_WORKOUTS, String(cloudTotal));
                    return cloudTotal;
                }
                const maxTotal = Math.max(localTotal, cloudTotal);
                _memCache.totalWorkouts = maxTotal;
                return maxTotal;
            } catch (e) {
                console.warn("[Storage] Cloud total fetch failed. Falling back to local storage.", e?.message);
            }
        }

        _memCache.totalWorkouts = localTotal;
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
        _memCache.history = [];
        _memCache.streak = 0;
        _memCache.totalWorkouts = 0;
        _memCache.prRecords = {};
        _memCache.lastFreezeDate = null;
        _memCache.previousFreezeDate = null;

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
        _memCache.history = [];
        _memCache.streak = 0;
        _memCache.totalWorkouts = 0;
        _memCache.prRecords = {};
        _memCache.bodyStats = [];
        _memCache.latestBW = null;
        _memCache.readiness = [];
        _memCache.xp = 0;
        _memCache.recordStreak = 0;
        _memCache.lastFreezeDate = null;
        _memCache.previousFreezeDate = null;
        _memCache.dismissedAlerts = {};
        _memCache.activeProgram = createDefaultProgramVersion();
        _memCache.programVersions = [createDefaultProgramVersion()];
        _memCache.isHydrated = false;
        await AsyncStorage.clear();
    } catch (e) {
        console.error("clearAllData error", e);
    }
};

// ─────────────────────────────────────────────────────────
// PR RECORDS  (per-exercise personal bests)
// Structure: { [exerciseName]: { weightKg, reps, date, category, bestFreeWeight, bestMachine, bestWeightedBW, bestBodyweightReps, bestAssisted, bestTimedDurationSec } }
// ─────────────────────────────────────────────────────────

export const getPRRecordsLocal = async () => {
    if (_memCache.prRecords !== null) return _memCache.prRecords;
    try {
        const data = await AsyncStorage.getItem(KEYS.PR_RECORDS);
        const parsed = data ? JSON.parse(data) : {};
        const res = parsed && typeof parsed === "object" ? parsed : {};
        _memCache.prRecords = res;
        return res;
    } catch {
        return {};
    }
};

export const getPRRecords = async () => {
    try {
        if (hasCloudSession()) {
            try {
                const cloudPRs = await fsGetPRRecords();
                if (cloudPRs && Object.keys(cloudPRs).length > 0) {
                    _memCache.prRecords = cloudPRs;
                    await AsyncStorage.setItem(KEYS.PR_RECORDS, JSON.stringify(cloudPRs));
                }
                return cloudPRs;
            } catch (e) {
                console.warn("[Storage] Cloud PR fetch failed. Falling back to local storage.", e?.message);
            }
        }

        return await getPRRecordsLocal();
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

        const records = await getPRRecordsLocal();
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
            _memCache.prRecords = records;
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

export const getBodyStatsLocal = async () => {
    if (_memCache.bodyStats !== null) return _memCache.bodyStats;
    try {
        const data = await AsyncStorage.getItem(KEYS.BODY_STATS);
        const parsed = data ? JSON.parse(data) : [];
        const res = Array.isArray(parsed) ? parsed : [];
        _memCache.bodyStats = res;
        return res;
    } catch {
        return [];
    }
};

export const getBodyStats = async () => {
    try {
        if (hasCloudSession()) {
            try {
                const cloudStats = await fsGetBodyStats();
                if (cloudStats && cloudStats.length > 0) {
                    _memCache.bodyStats = cloudStats;
                    _memCache.latestBW = null;
                    await AsyncStorage.setItem(KEYS.BODY_STATS, JSON.stringify(cloudStats));
                }
                return cloudStats;
            } catch (e) {
                console.warn("[Storage] Cloud body stats fetch failed. Falling back to local storage.", e?.message);
            }
        }

        return await getBodyStatsLocal();
    } catch {
        return [];
    }
};

/**
 * Returns the most recently recorded bodyweight in kg from local cache, or null if unrecorded.
 * NEVER fabricates or invents a fallback bodyweight.
 */
export const getLatestUserBodyweightLocal = async () => {
    if (typeof _memCache.latestBW === "number") return _memCache.latestBW;
    try {
        const stats = await getBodyStatsLocal();
        if (Array.isArray(stats) && stats.length > 0) {
            const latest = stats.find(s => s && typeof s.weightKg === "number" && s.weightKg > 0);
            if (latest && typeof latest.weightKg === "number") {
                _memCache.latestBW = latest.weightKg;
                return latest.weightKg;
            }
        }
        return null;
    } catch {
        return null;
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
                _memCache.latestBW = latest.weightKg;
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

        const stats = await getBodyStatsLocal();
        // Replace same-date entry or prepend
        const filtered = stats.filter(s => s.date !== entryDate);
        const updated = [normalizedEntry, ...filtered].slice(0, 365);
        _memCache.bodyStats = updated;
        _memCache.latestBW = null;
        await AsyncStorage.setItem(KEYS.BODY_STATS, JSON.stringify(updated));

        if (hasCloudSession()) {
            fsSaveBodyStat(normalizedEntry).catch((e) => {
                console.warn("[Storage] Cloud body stat save failed. Falling back to local storage.", e?.message);
            });
        }

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
export const applyStreakFreeze = async () => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const currentLast = await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
        if (currentLast && currentLast !== today) {
            await AsyncStorage.setItem(KEYS.PREVIOUS_FREEZE_DATE, currentLast);
            _memCache.previousFreezeDate = currentLast;
        }
        await AsyncStorage.setItem(KEYS.LAST_FREEZE_DATE, today);
        _memCache.lastFreezeDate = today;
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
            _memCache.lastFreezeDate = prev;
            _memCache.previousFreezeDate = null;
        } else {
            await AsyncStorage.removeItem(KEYS.LAST_FREEZE_DATE);
            _memCache.lastFreezeDate = null;
        }
        triggerAutoSync();
        return true;
    } catch {
        return false;
    }
};

export const getLastFreezeDate = async () => {
    if (_memCache.lastFreezeDate !== null) return _memCache.lastFreezeDate;
    try {
        const val = await AsyncStorage.getItem(KEYS.LAST_FREEZE_DATE);
        _memCache.lastFreezeDate = val;
        return val;
    } catch {
        return null;
    }
};

export const getPreviousFreezeDate = async () => {
    if (_memCache.previousFreezeDate !== null) return _memCache.previousFreezeDate;
    try {
        const val = await AsyncStorage.getItem(KEYS.PREVIOUS_FREEZE_DATE);
        _memCache.previousFreezeDate = val;
        return val;
    } catch {
        return null;
    }
};

export const getStreakLocal = async () => {
    return await readLocalStreak();
};

export const getTotalWorkoutsLocal = async () => {
    return await readLocalTotalWorkouts();
};

export const getWorkoutHistoryLocal = async () => {
    return await readLocalHistory();
};

export const getXPLocal = async () => {
    if (typeof _memCache.xp === "number") return _memCache.xp;
    try {
        const xp = await AsyncStorage.getItem(KEYS.XP);
        const parsed = xp ? parseInt(xp, 10) : 0;
        _memCache.xp = parsed;
        return parsed;
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
                    _memCache.xp = cloudXP;
                    await AsyncStorage.setItem(KEYS.XP, String(cloudXP));
                    return cloudXP;
                }
                const maxXP = Math.max(localXP, cloudXP);
                _memCache.xp = maxXP;
                return maxXP;
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
    if (typeof _memCache.recordStreak === "number") return _memCache.recordStreak;
    try {
        const record = await AsyncStorage.getItem(KEYS.RECORD_STREAK);
        const parsed = record ? parseInt(record, 10) : 0;
        _memCache.recordStreak = parsed;
        return parsed;
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
                    _memCache.recordStreak = cloudRecord;
                    await AsyncStorage.setItem(KEYS.RECORD_STREAK, String(cloudRecord));
                    return cloudRecord;
                }
                const maxRec = Math.max(localRecord, cloudRecord);
                _memCache.recordStreak = maxRec;
                return maxRec;
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
export const getDailyReadinessLocal = async (limit = 60) => {
    if (_memCache.readiness !== null) {
        return _memCache.readiness.slice(0, limit);
    }
    try {
        const raw = await AsyncStorage.getItem(KEYS.READINESS);
        if (!raw) {
            _memCache.readiness = [];
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            _memCache.readiness = [];
            return [];
        }
        _memCache.readiness = parsed;
        return parsed.slice(0, limit);
    } catch (e) {
        console.warn("[Storage] getDailyReadinessLocal error", e);
        return [];
    }
};

export const getDailyReadiness = async (limit = 60) => {
    return await getDailyReadinessLocal(limit);
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

        const existing = await getDailyReadinessLocal(120);
        const filtered = existing.filter(r => r.date !== entryDate);
        const updated = [normalized, ...filtered].slice(0, 120);

        _memCache.readiness = updated;
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
export const getTodayReadinessLocal = async () => {
    try {
        const todayStr = new Date().toISOString().split("T")[0];
        const logs = await getDailyReadinessLocal(7);
        const match = logs.find(r => r.date === todayStr);
        return match || null;
    } catch {
        return null;
    }
};

export const getTodayReadiness = async () => {
    return await getTodayReadinessLocal();
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
 * Retrieves the current active program version from local cache.
 * If active version is an expired temporary deload, automatically restores its sourceVersionId.
 */
export const getActiveProgramLocal = async () => {
    if (_memCache.activeProgram !== null) {
        const cached = _memCache.activeProgram;
        const isExpiredDeload = cached.isTemporaryDeload && cached.expiresAt && new Date(cached.expiresAt).getTime() <= Date.now();
        if (!isExpiredDeload) {
            return cached;
        }
    }
    try {
        const raw = await AsyncStorage.getItem(KEYS.ACTIVE_PROGRAM);
        if (!raw) {
            const def = createDefaultProgramVersion();
            _memCache.activeProgram = def;
            return def;
        }
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
            const def = createDefaultProgramVersion();
            _memCache.activeProgram = def;
            return def;
        }

        // Check if active program is an expired temporary deload
        if (parsed.isTemporaryDeload && parsed.expiresAt) {
            const isExpired = new Date(parsed.expiresAt).getTime() <= Date.now();
            if (isExpired && parsed.sourceVersionId) {
                const versions = await getProgramVersionsLocal();
                const sourceVersion = versions.find(v => v.id === parsed.sourceVersionId);
                const restored = sourceVersion || createDefaultProgramVersion();
                await saveActiveProgram(restored, false);
                _memCache.activeProgram = restored;
                return restored;
            }
        }

        _memCache.activeProgram = parsed;
        return parsed;
    } catch (e) {
        console.warn("[Storage] getActiveProgramLocal error", e);
        const def = createDefaultProgramVersion();
        _memCache.activeProgram = def;
        return def;
    }
};

export const getActiveProgram = async () => {
    return await getActiveProgramLocal();
};

/**
 * Retrieves full history of program version snapshots from local cache.
 */
export const getProgramVersionsLocal = async () => {
    if (_memCache.programVersions !== null) return _memCache.programVersions;
    try {
        const raw = await AsyncStorage.getItem(KEYS.PROGRAM_VERSIONS);
        if (!raw) {
            const defs = [createDefaultProgramVersion()];
            _memCache.programVersions = defs;
            return defs;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            const defs = [createDefaultProgramVersion()];
            _memCache.programVersions = defs;
            return defs;
        }
        _memCache.programVersions = parsed;
        return parsed;
    } catch (e) {
        console.warn("[Storage] getProgramVersionsLocal error", e);
        const defs = [createDefaultProgramVersion()];
        _memCache.programVersions = defs;
        return defs;
    }
};

export const getProgramVersions = async () => {
    return await getProgramVersionsLocal();
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
        _memCache.activeProgram = normalized;

        if (appendToHistory) {
            const currentVersions = await getProgramVersionsLocal();
            const existingIndex = currentVersions.findIndex(v => v.id === normalized.id);
            let updatedVersions = [];
            if (existingIndex >= 0) {
                updatedVersions = currentVersions.map(v => v.id === normalized.id ? normalized : { ...v, active: false });
            } else {
                updatedVersions = [normalized, ...currentVersions.map(v => ({ ...v, active: false }))];
            }
            const sliced = updatedVersions.slice(0, 50);
            _memCache.programVersions = sliced;
            await AsyncStorage.setItem(KEYS.PROGRAM_VERSIONS, JSON.stringify(sliced));
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
        _memCache.dismissedAlerts = existing;
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
    if (_memCache.dismissedAlerts !== null) return _memCache.dismissedAlerts;
    try {
        const raw = await AsyncStorage.getItem(KEYS.DISMISSED_ALERTS);
        if (!raw) {
            _memCache.dismissedAlerts = {};
            return {};
        }
        const parsed = JSON.parse(raw);
        const now = Date.now();
        const valid = {};
        Object.keys(parsed).forEach(k => {
            if (parsed[k] > now) {
                valid[k] = parsed[k];
            }
        });
        _memCache.dismissedAlerts = valid;
        return valid;
    } catch {
        return {};
    }
};

/**
 * Pre-warms the in-memory cache directly from AsyncStorage.
 * Called concurrently during app boot / splash screen loading so that
 * all screens render on frame 1 without I/O or network waiting.
 */
export const preloadLocalCache = async () => {
    try {
        await Promise.all([
            getStreakLocal(),
            getTotalWorkoutsLocal(),
            getXPLocal(),
            getRecordStreakLocal(),
            getWorkoutHistoryLocal(),
            getBodyStatsLocal(),
            getPRRecordsLocal(),
            getLatestUserBodyweightLocal(),
            getActiveProgramLocal(),
            getProgramVersionsLocal(),
            getDailyReadinessLocal(60),
            getLastFreezeDate(),
            getPreviousFreezeDate(),
            getDismissedRecommendations(),
        ]);
        _memCache.isHydrated = true;
    } catch (e) {
        console.warn("[Storage] preloadLocalCache failed", e);
    }
};


