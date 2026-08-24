/**
 * sync.js — Real Firebase sync (replaces the mock implementation)
 */
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
    fsGetSettings,
    fsSaveSettings,
} from "./firestore";

export const isLoggedIn = () => !!auth.currentUser;

export const triggerAutoSync = async () => {
    if (!isLoggedIn()) {
        console.log("[Sync] Skipped — user not logged in");
        return false;
    }
    // In the Firebase model, all writes are immediately synced.
    // This function is kept for compatibility but is a no-op.
    console.log("[Sync] Firebase in sync.");
    return true;
};

export const getLastSyncTime = async () => new Date().toISOString();

// Re-export Firestore functions under legacy names for backward compat
export {
    fssaveWorkoutComplete as saveWorkoutComplete,
    fssaveManualWorkout as saveManualWorkout,
    fsGetWorkoutHistory as getWorkoutHistory,
    fsGetStreak as getStreak,
    fsGetTotalWorkouts as getTotalWorkouts,
    fsGetLastWorkoutDate as getLastWorkoutDate,
    fsClearHistory as clearHistory,
    fsGetPRRecords as getPRRecords,
    fsTryUpdatePR as tryUpdatePR,
    fsGetBodyStats as getBodyStats,
    fsSaveBodyStat as saveBodyStat,
    fsGetSettings as getFirebaseSettings,
    fsSaveSettings as saveFirebaseSettings,
};
