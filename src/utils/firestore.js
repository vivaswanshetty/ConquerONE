/**
 * firestore.js — All Firestore read/write operations.
 * This replaces the mock `triggerAutoSync` in sync.js with real cloud persistence.
 * 
 * Data structure:
 *   /users/{uid}                    — profile, streak, totalWorkouts
 *   /users/{uid}/history/{id}       — individual workout sessions
 *   /users/{uid}/prs/{exerciseName} — personal records per exercise
 *   /users/{uid}/bodyStats/{date}   — body measurements over time
 *   /users/{uid}/customWorkouts/{id}— user-created workouts
 */

import {
    doc, collection,
    getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
    query, orderBy, limit, serverTimestamp, increment,
    writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get current user's UID — throws if not logged in */
const uid = () => {
    const u = auth.currentUser;
    if (!u) throw new Error("Not authenticated");
    return u.uid;
};

const userDoc = () => doc(db, "users", uid());
const subCol = (name) => collection(db, "users", uid(), name);

// ─── Workout History ───────────────────────────────────────────────────────────

const areAllInterveningDaysExcused = (startDateStr, endDateStr, freezeDates = []) => {
    if (!startDateStr || !endDateStr) return true;
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return true;

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

/**
 * Save a completed workout session and update streak + total count.
 * This is the Firestore equivalent of `saveWorkoutComplete` in storage.js.
 */
export const fssaveWorkoutComplete = async (day, target, durationSec, exercises = []) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        // 1. Add workout to history subcollection
        await addDoc(subCol("history"), {
            day,
            target,
            date: today,
            durationSec,
            exercises,
            completedAt: serverTimestamp(),
        });

        // 2. Get user doc to calculate streak
        const snap = await getDoc(userDoc());
        const data = snap.exists() ? snap.data() : {};
        const lastDate = data.lastWorkoutDate || null;
        const lastFreeze = data.lastFreezeDate || null;
        let streak = data.streak || 0;
        const freezeDates = [lastFreeze].filter(Boolean);

        const lastEffectiveDate = (lastFreeze && (!lastDate || new Date(lastFreeze) > new Date(lastDate)))
            ? lastFreeze
            : lastDate;

        if (lastEffectiveDate) {
            const last = new Date(lastEffectiveDate);
            const todayDate = new Date(today);
            const diff = Math.floor((todayDate - last) / (1000 * 60 * 60 * 24));
            if (diff === 0) {
                // same day, keep current streak
            } else if (diff === 1 || areAllInterveningDaysExcused(lastEffectiveDate, today, freezeDates)) {
                streak += 1;
            } else {
                streak = 1;
            }
        } else {
            streak = 1;
        }

        let multiplier = 1.0;
        let xpGained = 10;
        if (streak >= 10) {
            multiplier = 2.0;
            xpGained = 20;
        } else if (streak >= 5) {
            multiplier = 1.5;
            xpGained = 15;
        } else if (streak >= 3) {
            multiplier = 1.2;
            xpGained = 12;
        }

        let recordStreak = data.recordStreak || 0;
        if (streak > recordStreak) {
            recordStreak = streak;
        }

        // 3. Update user doc atomically
        await setDoc(userDoc(), {
            streak,
            lastWorkoutDate: today,
            totalWorkouts: increment(1),
            xp: increment(xpGained),
            recordStreak,
        }, { merge: true });

        return { streak, total: (data.totalWorkouts || 0) + 1 };
    } catch (e) {
        console.error("[Firestore] saveWorkoutComplete error", e);
        throw e;
    }
};

/**
 * Save a manually logged past/today workout session and update streak + total count.
 */
export const fssaveManualWorkout = async ({
    date,
    day = 1,
    target = "Workout",
    durationSec = 3600,
    exercises = [],
    notes = "",
    caloriesBurned = 0,
}) => {
    try {
        const workoutDateStr = date || new Date().toISOString().split("T")[0];
        const isToday = workoutDateStr === new Date().toISOString().split("T")[0];
        const completedAt = isToday
            ? new Date()
            : new Date(`${workoutDateStr}T12:00:00.000Z`);

        // 1. Add workout to history subcollection
        await addDoc(subCol("history"), {
            day,
            target,
            date: workoutDateStr,
            durationSec,
            exercises,
            notes: notes || "",
            caloriesBurned: caloriesBurned || Math.round((durationSec || 3600) * 0.11),
            completedAt: isToday ? serverTimestamp() : completedAt,
            isManual: true,
        });

        // 2. Fetch user doc and recent history to recalculate streak
        const snap = await getDoc(userDoc());
        const data = snap.exists() ? snap.data() : {};
        const lastFreeze = data.lastFreezeDate || null;
        const freezeDates = [lastFreeze].filter(Boolean);

        const q = query(subCol("history"), orderBy("completedAt", "desc"), limit(100));
        const histSnap = await getDocs(q);
        const history = histSnap.docs.map((d) => d.data());

        const streak = calculateStreakFromHistory(history, freezeDates);

        let xpGained = 10;
        if (streak >= 10) xpGained = 20;
        else if (streak >= 5) xpGained = 15;
        else if (streak >= 3) xpGained = 12;

        let recordStreak = data.recordStreak || 0;
        if (streak > recordStreak) {
            recordStreak = streak;
        }

        const lastWorkoutDate = (data.lastWorkoutDate && new Date(data.lastWorkoutDate) > new Date(workoutDateStr))
            ? data.lastWorkoutDate
            : workoutDateStr;

        // 3. Update user doc atomically
        await setDoc(userDoc(), {
            streak,
            lastWorkoutDate,
            totalWorkouts: increment(1),
            xp: increment(xpGained),
            recordStreak,
        }, { merge: true });

        return { streak, total: (data.totalWorkouts || 0) + 1 };
    } catch (e) {
        console.error("[Firestore] fssaveManualWorkout error", e);
        throw e;
    }
};

/** Get last 100 workout history entries, newest first */
export const fsGetWorkoutHistory = async () => {
    try {
        const q = query(subCol("history"), orderBy("completedAt", "desc"), limit(100));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("[Firestore] getWorkoutHistory error", e);
        return [];
    }
};

// ─── Streak & Stats ────────────────────────────────────────────────────────────

export const fsGetStreak = async () => {
    try {
        const snap = await getDoc(userDoc());
        return snap.exists() ? (snap.data().streak || 0) : 0;
    } catch { return 0; }
};

export const fsUpdateStreak = async (streak) => {
    try {
        await setDoc(userDoc(), { streak }, { merge: true });
        return true;
    } catch (e) {
        console.warn("[Firestore] Failed to update streak", e);
        return false;
    }
};

export const fsGetXP = async () => {
    try {
        const snap = await getDoc(userDoc());
        return snap.exists() ? (snap.data().xp || 0) : 0;
    } catch { return 0; }
};

export const fsGetRecordStreak = async () => {
    try {
        const snap = await getDoc(userDoc());
        return snap.exists() ? (snap.data().recordStreak || 0) : 0;
    } catch { return 0; }
};

export const fsGetTotalWorkouts = async () => {
    try {
        const snap = await getDoc(userDoc());
        return snap.exists() ? (snap.data().totalWorkouts || 0) : 0;
    } catch { return 0; }
};

export const fsGetLastWorkoutDate = async () => {
    try {
        const snap = await getDoc(userDoc());
        return snap.exists() ? (snap.data().lastWorkoutDate || null) : null;
    } catch { return null; }
};

export const fsClearHistory = async () => {
    try {
        const snap = await getDocs(subCol("history"));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();

        await setDoc(userDoc(), {
            streak: 0,
            totalWorkouts: 0,
            lastWorkoutDate: null,
        }, { merge: true });
    } catch (e) {
        console.error("[Firestore] clearHistory error", e);
    }
};

// ─── PR Records ────────────────────────────────────────────────────────────────

export const fsGetPRRecords = async () => {
    try {
        const snap = await getDocs(subCol("prs"));
        const records = {};
        snap.docs.forEach((d) => { records[d.id] = d.data(); });
        return records;
    } catch { return {}; }
};

export const fsTryUpdatePR = async (exerciseName, weightKg, reps) => {
    try {
        const ref = doc(db, "users", uid(), "prs", exerciseName);
        const snap = await getDoc(ref);
        const prev = snap.exists() ? snap.data() : null;

        const isNewPR =
            !prev ||
            weightKg > prev.weightKg ||
            (weightKg === prev.weightKg && reps > prev.reps);

        if (isNewPR) {
            const next = { weightKg, reps, date: new Date().toISOString() };
            await setDoc(ref, next);
            return { isNewPR: true, prev, next };
        }
        return { isNewPR: false, prev, next: prev };
    } catch (e) {
        console.error("[Firestore] tryUpdatePR error", e);
        return { isNewPR: false, prev: null, next: null };
    }
};

// ─── Body Stats ────────────────────────────────────────────────────────────────

export const fsGetBodyStats = async () => {
    try {
        const q = query(subCol("bodyStats"), orderBy("date", "desc"), limit(365));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch { return []; }
};

export const fsSaveBodyStat = async (entry) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const ref = doc(db, "users", uid(), "bodyStats", today);
        const data = { ...entry, date: today, savedAt: serverTimestamp() };
        await setDoc(ref, data, { merge: true });
        return data;
    } catch (e) {
        console.error("[Firestore] saveBodyStat error", e);
    }
};

// ─── Settings ──────────────────────────────────────────────────────────────────

export const fsGetSettings = async () => {
    try {
        const snap = await getDoc(userDoc());
        return snap.exists() ? (snap.data().settings || {}) : {};
    } catch { return {}; }
};

export const fsSaveSettings = async (settings) => {
    try {
        await setDoc(userDoc(), { settings }, { merge: true });
    } catch (e) {
        console.error("[Firestore] saveSettings error", e);
    }
};

// ─── Custom Workouts ───────────────────────────────────────────────────────────

export const fsGetCustomWorkouts = async () => {
    try {
        const snap = await getDocs(subCol("customWorkouts"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch { return []; }
};

export const fsSaveCustomWorkout = async (workout) => {
    try {
        if (workout.id) {
            const ref = doc(db, "users", uid(), "customWorkouts", workout.id);
            await setDoc(ref, { ...workout, updatedAt: serverTimestamp() }, { merge: true });
            return workout.id;
        } else {
            const ref = await addDoc(subCol("customWorkouts"), {
                ...workout,
                createdAt: serverTimestamp(),
            });
            return ref.id;
        }
    } catch (e) {
        console.error("[Firestore] saveCustomWorkout error", e);
    }
};

export const fsDeleteCustomWorkout = async (id) => {
    try {
        await deleteDoc(doc(db, "users", uid(), "customWorkouts", id));
    } catch (e) {
        console.error("[Firestore] deleteCustomWorkout error", e);
    }
};

// ─── Migration ─────────────────────────────────────────────────────────────────

/**
 * Migration function: One-time push of AsyncStorage data to Firestore.
 * This is called the first time a user signs up.
 */
export const migrateLocalDataToCloud = async (uid) => {
    try {
        console.log("[Migration] Starting local data migration for:", uid);

        // 1. Check if migration was already done
        const MIGRATION_KEY = `migration_done_${uid}`;
        const done = await AsyncStorage.getItem(MIGRATION_KEY);
        if (done === "true") {
            console.log("[Migration] Already completed. Skipping.");
            return;
        }

        // 2. Fetch all local data
        const [historyStr, streakStr, lastDate, totalStr, prsStr, statsStr, xpStr, recStr] = await Promise.all([
            AsyncStorage.getItem("workout_history"),
            AsyncStorage.getItem("workout_streak"),
            AsyncStorage.getItem("last_workout_date"),
            AsyncStorage.getItem("total_workouts"),
            AsyncStorage.getItem("pr_records"),
            AsyncStorage.getItem("body_stats"),
            AsyncStorage.getItem("workout_xp"),
            AsyncStorage.getItem("record_streak"),
        ]);

        const hasAnyData = historyStr || streakStr || lastDate || totalStr || prsStr || statsStr || xpStr || recStr;
        if (!hasAnyData) {
            console.log("[Migration] No local data found. Marking as done.");
            await AsyncStorage.setItem(MIGRATION_KEY, "true");
            return;
        }

        const batch = writeBatch(db);
        const userRef = doc(db, "users", uid);

        // 3. Migrate Stats (Streak, Total, Last Date)
        const updates = {};
        if (streakStr) updates.streak = parseInt(streakStr);
        if (totalStr) updates.totalWorkouts = parseInt(totalStr);
        if (lastDate) updates.lastWorkoutDate = lastDate;
        if (xpStr) updates.xp = parseInt(xpStr);
        if (recStr) updates.recordStreak = parseInt(recStr);

        if (Object.keys(updates).length > 0) {
            batch.set(userRef, updates, { merge: true });
        }

        // 4. Migrate History
        if (historyStr) {
            const history = JSON.parse(historyStr);
            history.forEach((entry) => {
                const histRef = doc(collection(db, "users", uid, "history"));
                batch.set(histRef, {
                    ...entry,
                    completedAt: entry.completedAt ? new Date(entry.completedAt) : serverTimestamp(),
                });
            });
        }

        // 5. Migrate PRs
        if (prsStr) {
            const prs = JSON.parse(prsStr);
            Object.keys(prs).forEach((exercise) => {
                const prRef = doc(db, "users", uid, "prs", exercise);
                batch.set(prRef, prs[exercise]);
            });
        }

        // 6. Migrate Body Stats
        if (statsStr) {
            const stats = JSON.parse(statsStr);
            stats.forEach((s) => {
                const statRef = doc(db, "users", uid, "bodyStats", s.date);
                batch.set(statRef, { ...s, savedAt: serverTimestamp() });
            });
        }

        // 7. Commit Batch
        await batch.commit();

        // 8. Mark as done
        await AsyncStorage.setItem(MIGRATION_KEY, "true");
        console.log("[Migration] Successfully migrated local data to Firestore.");

    } catch (e) {
        console.error("[Migration] Error during data migration:", e);
    }
};
