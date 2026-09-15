/**
 * Conquer ONE — Pure Analytics & Calculation Engine
 * 
 * Architectural Rule:
 * This module performs pure mathematical calculations, aggregation, and analytics.
 * It does NOT handle persistence, network calls, or direct UI rendering.
 */

import {
    WORKOUT_PLAN,
    EXERCISE_CATALOG,
    STANDARDIZED_MUSCLE_GROUPS,
    getAllPlanExercises,
    getExerciseMetadata,
    getExerciseLoadCategory,
    getExerciseMuscleGroup,
    isBodyweightMovement,
} from "../data/workoutData";
import { normalizeLoggedSet } from "./storage";

// ────────────────────────────────────────────────────────────────
// 1. ESTIMATED 1RM (EPLEY FORMULA — STRICTLY BOUNDED)
// ────────────────────────────────────────────────────────────────

/**
 * Calculates Estimated 1RM using the Epley formula: Weight × (1 + Reps / 30)
 * 
 * Strict Scientific Boundaries:
 * - Calculated ONLY for 'free_weight' and 'machine' exercises
 * - Valid rep range: 1 to 12 reps
 * - Valid positive weight: weight > 0
 * - Completed sets only
 * 
 * Never calculated for:
 * - Bodyweight, weighted bodyweight, assisted bodyweight
 * - Timed / isometric exercises
 * - Skipped / unrecorded sets
 * - Sets with reps > 12 (formula loses accuracy)
 * 
 * Always labeled "Estimated 1RM", never "1RM".
 */
export const calculateEstimated1RM = (weightKg, reps, loadType = "free_weight") => {
    const w = parseFloat(weightKg);
    const r = parseInt(reps, 10);

    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0 || r > 12) {
        return null;
    }

    if (loadType !== "free_weight" && loadType !== "machine") {
        return null;
    }

    if (r === 1) return parseFloat(w.toFixed(1));

    const e1rm = w * (1 + r / 30);
    return parseFloat(e1rm.toFixed(1));
};

// ────────────────────────────────────────────────────────────────
// 2. EXERCISE PROGRESSION & SESSION HISTORY
// ────────────────────────────────────────────────────────────────

/**
 * Extracts and normalizes session-by-session history for a specific exercise.
 * Returns chronologically sorted sessions (oldest to newest).
 */
export const getExerciseHistory = (exerciseName, history = [], latestBodyweight = null, indexedSessions = null) => {
    if (!exerciseName) return [];
    if (indexedSessions && indexedSessions[exerciseName]) {
        return indexedSessions[exerciseName];
    }
    if (!Array.isArray(history) || history.length === 0) {
        return [];
    }

    const targetKey = exerciseName.toLowerCase().trim();
    const exMeta = getExerciseMetadata(exerciseName);
    const exCategory = exMeta ? exMeta.category : "free_weight";
    const exMuscle = exMeta ? exMeta.muscleGroup : "Core";

    const sessions = [];

    history.forEach((workout) => {
        if (!workout || !Array.isArray(workout.exercises)) return;

        const matchingEx = workout.exercises.find((ex) => {
            if (!ex) return false;
            const name = (ex.name || ex.exerciseName || "").toLowerCase().trim();
            return name === targetKey;
        });

        if (!matchingEx) return;

        // Collect and normalize all sets
        const rawSets = matchingEx.loggedSets || matchingEx.logs || [];
        const normalizedSets = [];

        if (Array.isArray(rawSets) && rawSets.length > 0) {
            rawSets.forEach((s) => {
                const norm = normalizeLoggedSet(s, exerciseName, latestBodyweight);
                if (norm && (norm.completed || norm.reps > 0 || norm.weightKg > 0)) {
                    normalizedSets.push(norm);
                }
            });
        } else if (matchingEx.weightKg || matchingEx.reps) {
            // Flat legacy fallback
            const norm = normalizeLoggedSet({
                set: 1,
                weightKg: matchingEx.weightKg,
                reps: matchingEx.reps,
                completed: true,
            }, exerciseName, latestBodyweight);
            if (norm) normalizedSets.push(norm);
        }

        if (normalizedSets.length === 0) return;

        // Calculate session best metrics
        let maxWeight = 0;
        let maxReps = 0;
        let best1RM = null;
        let totalVolumeLoad = 0;
        let totalReps = 0;
        let maxDurationSec = 0;

        normalizedSets.forEach((s) => {
            if (s.skipped) return;

            if (s.loadType === "free_weight" || s.loadType === "machine") {
                if (s.weightKg > maxWeight) maxWeight = s.weightKg;
                if (s.reps > maxReps) maxReps = s.reps;
                totalVolumeLoad += s.weightKg * s.reps;
                totalReps += s.reps;

                const e1rm = calculateEstimated1RM(s.weightKg, s.reps, s.loadType);
                if (e1rm !== null && (best1RM === null || e1rm > best1RM)) {
                    best1RM = e1rm;
                }
            } else if (s.loadType === "weighted_bodyweight" || s.loadType === "assisted_bodyweight") {
                if (s.weightKg > maxWeight) maxWeight = s.weightKg;
                if (s.reps > maxReps) maxReps = s.reps;
                totalReps += s.reps;
            } else if (s.loadType === "bodyweight") {
                if (s.reps > maxReps) maxReps = s.reps;
                totalReps += s.reps;
            } else if (s.loadType === "timed") {
                const dur = s.durationSec || s.reps || 0;
                if (dur > maxDurationSec) maxDurationSec = dur;
            }
        });

        const dateStr = workout.date || (workout.completedAt ? String(workout.completedAt).split("T")[0] : "");

        let resolvedCategory = exCategory;
        if (normalizedSets.some(s => s.loadType === "assisted_bodyweight") || targetKey.includes("assisted") || exCategory === "assisted_bodyweight") {
            resolvedCategory = "assisted_bodyweight";
        } else if (normalizedSets.some(s => s.loadType === "weighted_bodyweight") || (isBodyweightMovement(exerciseName) && maxWeight > 0 && !targetKey.includes("assisted"))) {
            resolvedCategory = "weighted_bodyweight";
        } else if (normalizedSets.some(s => s.loadType === "timed") || exMeta?.type === "timer" || targetKey.includes("plank") || exCategory === "timed") {
            resolvedCategory = "timed";
        } else if (normalizedSets.some(s => s.loadType === "bodyweight") || isBodyweightMovement(exerciseName)) {
            resolvedCategory = "bodyweight";
        } else if (normalizedSets.some(s => s.loadType === "machine") || exCategory === "machine") {
            resolvedCategory = "machine";
        } else if (normalizedSets.some(s => s.loadType === "free_weight") || exCategory === "free_weight") {
            resolvedCategory = "free_weight";
        }

        sessions.push({
            date: dateStr,
            completedAt: workout.completedAt || workout.date,
            target: workout.target || "Workout",
            day: workout.day || 1,
            category: resolvedCategory,
            resolvedCategory: resolvedCategory,
            muscleGroup: exMuscle,
            repRange: matchingEx.repRange || (exMeta ? exMeta.repRange : null),
            plannedSets: matchingEx.sets || (exMeta ? exMeta.sets : null),
            sets: normalizedSets,
            completedSetsCount: normalizedSets.filter((s) => s.completed && !s.skipped).length,
            maxWeight,
            maxReps,
            bestEstimated1RM: best1RM,
            volumeLoad: totalVolumeLoad,
            totalReps,
            maxDurationSec,
        });
    });

    // Sort chronologically ascending (oldest first)
    sessions.sort((a, b) => new Date(a.completedAt || a.date) - new Date(b.completedAt || b.date));

    return sessions;
};

/**
 * Transforms exercise history into chart points for interactive SVG graph rendering.
 */
export const getExerciseProgressionData = (exerciseName, history = [], latestBodyweight = null) => {
    const sessions = getExerciseHistory(exerciseName, history, latestBodyweight);
    if (sessions.length === 0) return [];

    const exMeta = getExerciseMetadata(exerciseName);
    const category = exMeta ? exMeta.category : "free_weight";

    return sessions.map((s, idx) => {
        let primaryMetric = s.maxWeight;
        let metricLabel = "kg";

        if (category === "bodyweight") {
            if (s.maxWeight > 0) {
                primaryMetric = s.maxWeight;
                metricLabel = "+kg added";
            } else {
                primaryMetric = s.maxReps;
                metricLabel = "reps";
            }
        } else if (category === "timed") {
            primaryMetric = s.maxDurationSec || 30;
            metricLabel = "sec";
        } else {
            // Free weight / machine: prefer 1RM if available, otherwise peak working weight
            primaryMetric = s.bestEstimated1RM !== null ? s.bestEstimated1RM : s.maxWeight;
            metricLabel = s.bestEstimated1RM !== null ? "kg (est 1RM)" : "kg";
        }

        return {
            index: idx + 1,
            date: s.date,
            value: primaryMetric,
            weight: s.maxWeight,
            reps: s.maxReps,
            estimated1RM: s.bestEstimated1RM,
            metricLabel,
            setsCount: s.completedSetsCount,
            category: s.category,
        };
    });
};

// ────────────────────────────────────────────────────────────────
// 3. WEEKLY MUSCLE GROUP WORKING-SET VOLUME
// ────────────────────────────────────────────────────────────────

/**
 * Calculates working sets completed per standardized muscle group in a given week.
 * Clearly labels reference range (10-20 working sets) as an informational reference.
 */
export const getWeeklyMuscleVolume = (history = [], targetWeekOffset = 0, latestBodyweight = null) => {
    const now = new Date();
    // Week starts on Monday
    const currentDay = (now.getDay() + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay - (targetWeekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Initialize counts for all 11 standardized muscle groups
    const volumeMap = {};
    STANDARDIZED_MUSCLE_GROUPS.forEach((group) => {
        volumeMap[group] = {
            muscleGroup: group,
            workingSets: 0,
            totalReps: 0,
            freeWeightVolumeLoad: 0,
            exercises: [],
            referenceRange: {
                min: 10,
                max: 20,
                label: "Reference Range (Informational)",
            },
        };
    });

    if (!Array.isArray(history)) return Object.values(volumeMap);

    history.forEach((workout) => {
        if (!workout) return;
        const wDate = new Date(workout.date || workout.completedAt);
        if (isNaN(wDate.getTime())) return;

        if (wDate >= weekStart && wDate < weekEnd) {
            (workout.exercises || []).forEach((ex) => {
                if (!ex) return;
                const exName = ex.name || ex.exerciseName || "";
                const muscle = getExerciseMuscleGroup(exName);
                const targetEntry = volumeMap[muscle] || volumeMap["Core"];

                if (!targetEntry.exercises.includes(exName)) {
                    targetEntry.exercises.push(exName);
                }

                const rawSets = ex.loggedSets || ex.logs || [];
                if (Array.isArray(rawSets) && rawSets.length > 0) {
                    rawSets.forEach((s) => {
                        const norm = normalizeLoggedSet(s, exName, latestBodyweight);
                        if (norm && norm.completed && !norm.skipped) {
                            targetEntry.workingSets += 1;
                            targetEntry.totalReps += norm.reps || 0;
                            if (norm.loadType === "free_weight" || norm.loadType === "machine") {
                                targetEntry.freeWeightVolumeLoad += (norm.weightKg || 0) * (norm.reps || 0);
                            }
                        }
                    });
                } else if (ex.sets) {
                    // Fallback to scheduled set count if set array wasn't captured
                    targetEntry.workingSets += parseInt(ex.sets, 10) || 1;
                }
            });
        }
    });

    return Object.values(volumeMap);
};

// ────────────────────────────────────────────────────────────────
// 4. WEEKLY TRAINING SUMMARY
// ────────────────────────────────────────────────────────────────

/**
 * Computes a weekly aggregate summary for the training dashboard.
 */
export const getWeeklyTrainingSummary = (history = [], streak = 0, targetWeekOffset = 0, latestBodyweight = null) => {
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay - (targetWeekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    let completedWorkouts = 0;
    let totalDurationSec = 0;
    let totalWorkingSets = 0;
    let totalVolumeLoadKg = 0;
    let totalRepsCompleted = 0;
    const uniqueMusclesHit = new Set();
    const workoutDays = [];

    if (Array.isArray(history)) {
        history.forEach((workout) => {
            if (!workout) return;
            const wDate = new Date(workout.date || workout.completedAt);
            if (isNaN(wDate.getTime())) return;

            if (wDate >= weekStart && wDate < weekEnd) {
                completedWorkouts += 1;
                totalDurationSec += workout.durationSec || 3600;

                const dayCode = wDate.getDay();
                if (!workoutDays.includes(dayCode)) {
                    workoutDays.push(dayCode);
                }

                (workout.exercises || []).forEach((ex) => {
                    if (!ex) return;
                    const exName = ex.name || ex.exerciseName || "";
                    const muscle = getExerciseMuscleGroup(exName);
                    uniqueMusclesHit.add(muscle);

                    const rawSets = ex.loggedSets || ex.logs || [];
                    if (Array.isArray(rawSets) && rawSets.length > 0) {
                        rawSets.forEach((s) => {
                            const norm = normalizeLoggedSet(s, exName, latestBodyweight);
                            if (norm && norm.completed && !norm.skipped) {
                                totalWorkingSets += 1;
                                totalRepsCompleted += norm.reps || 0;
                                if (norm.loadType === "free_weight" || norm.loadType === "machine") {
                                    totalVolumeLoadKg += (norm.weightKg || 0) * (norm.reps || 0);
                                }
                            }
                        });
                    } else {
                        totalWorkingSets += ex.sets || 3;
                    }
                });
            }
        });
    }

    const adherenceRate = Math.min(100, Math.round((completedWorkouts / 6) * 100));

    return {
        completedWorkouts,
        plannedWorkouts: 6,
        adherenceRate,
        totalDurationSec,
        totalWorkingSets,
        totalVolumeLoadKg,
        totalRepsCompleted,
        muscleGroupsHitCount: uniqueMusclesHit.size,
        streak,
        weekStartDateStr: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        weekEndDateStr: weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
};

// ────────────────────────────────────────────────────────────────
// 5. PERSONAL RECORDS REGISTRY
// ────────────────────────────────────────────────────────────────

/**
 * Aggregates all Personal Records categorized by exercise type.
 */
export const getAllCategorizedPRs = (history = [], prRecords = {}, latestBodyweight = null) => {
    const registry = {
        free_weight: [],
        weighted_bodyweight: [],
        bodyweight: [],
        machine: [],
        timed: [],
    };

    const processedExercises = new Set();

    // 1. Process from saved prRecords first
    if (prRecords && typeof prRecords === "object") {
        Object.entries(prRecords).forEach(([exName, record]) => {
            if (!record) return;
            processedExercises.add(exName.toLowerCase().trim());
            const exMeta = getExerciseMetadata(exName);
            const category = record.category || (exMeta ? exMeta.category : "free_weight");
            const muscle = exMeta ? exMeta.muscleGroup : "Core";

            if (category === "bodyweight") {
                if (record.bestWeightedBW) {
                    registry.weighted_bodyweight.push({
                        exerciseName: exName,
                        muscleGroup: muscle,
                        addedWeightKg: record.bestWeightedBW.addedWeightKg,
                        reps: record.bestWeightedBW.reps,
                        totalSystemLoadKg: record.bestWeightedBW.totalSystemLoadKg,
                        date: record.bestWeightedBW.date,
                    });
                }
                if (record.bestBodyweightReps) {
                    registry.bodyweight.push({
                        exerciseName: exName,
                        muscleGroup: muscle,
                        reps: record.bestBodyweightReps.reps,
                        bodyweightKg: record.bestBodyweightReps.bodyweightKg,
                        date: record.bestBodyweightReps.date,
                    });
                }
                if (!record.bestWeightedBW && !record.bestBodyweightReps) {
                    // Fallback to legacy record
                    if (record.weightKg > 0) {
                        registry.weighted_bodyweight.push({
                            exerciseName: exName,
                            muscleGroup: muscle,
                            addedWeightKg: record.weightKg,
                            reps: record.reps,
                            totalSystemLoadKg: latestBodyweight ? latestBodyweight + record.weightKg : null,
                            date: record.date,
                        });
                    } else {
                        registry.bodyweight.push({
                            exerciseName: exName,
                            muscleGroup: muscle,
                            reps: record.reps,
                            bodyweightKg: latestBodyweight,
                            date: record.date,
                        });
                    }
                }
            } else if (category === "machine") {
                registry.machine.push({
                    exerciseName: exName,
                    muscleGroup: muscle,
                    weightKg: record.bestMachine?.weightKg || record.weightKg || 0,
                    reps: record.bestMachine?.reps || record.reps || 0,
                    estimated1RM: record.bestMachine?.estimated1RM || calculateEstimated1RM(record.weightKg, record.reps, "machine"),
                    date: record.bestMachine?.date || record.date,
                });
            } else if (category === "timed") {
                registry.timed.push({
                    exerciseName: exName,
                    muscleGroup: muscle,
                    durationSec: record.bestTimedDurationSec?.durationSec || record.reps || 30,
                    date: record.bestTimedDurationSec?.date || record.date,
                });
            } else {
                // Free weight
                registry.free_weight.push({
                    exerciseName: exName,
                    muscleGroup: muscle,
                    weightKg: record.bestFreeWeight?.weightKg || record.weightKg || 0,
                    reps: record.bestFreeWeight?.reps || record.reps || 0,
                    estimated1RM: record.bestFreeWeight?.estimated1RM || calculateEstimated1RM(record.weightKg, record.reps, "free_weight"),
                    date: record.bestFreeWeight?.date || record.date,
                });
            }
        });
    }

    // 2. Derive any missing PRs from historical sessions
    if (Array.isArray(history)) {
        history.forEach((workout) => {
            (workout.exercises || []).forEach((ex) => {
                const exName = ex.name || ex.exerciseName;
                if (!exName || processedExercises.has(exName.toLowerCase().trim())) return;

                const hist = getExerciseHistory(exName, history, latestBodyweight);
                if (hist.length === 0) return;

                processedExercises.add(exName.toLowerCase().trim());
                const exMeta = getExerciseMetadata(exName);
                const category = exMeta ? exMeta.category : "free_weight";
                const muscle = exMeta ? exMeta.muscleGroup : "Core";

                // Find all-time best session
                let peakWeight = 0;
                let peakReps = 0;
                let peak1RM = null;
                let peakDate = "";

                hist.forEach((s) => {
                    if (s.maxWeight > peakWeight || (s.maxWeight === peakWeight && s.maxReps > peakReps)) {
                        peakWeight = s.maxWeight;
                        peakReps = s.maxReps;
                        peakDate = s.date;
                    }
                    if (s.bestEstimated1RM !== null && (peak1RM === null || s.bestEstimated1RM > peak1RM)) {
                        peak1RM = s.bestEstimated1RM;
                    }
                });

                if (category === "bodyweight") {
                    if (peakWeight > 0) {
                        registry.weighted_bodyweight.push({
                            exerciseName: exName,
                            muscleGroup: muscle,
                            addedWeightKg: peakWeight,
                            reps: peakReps,
                            totalSystemLoadKg: latestBodyweight ? latestBodyweight + peakWeight : null,
                            date: peakDate,
                        });
                    } else {
                        registry.bodyweight.push({
                            exerciseName: exName,
                            muscleGroup: muscle,
                            reps: peakReps,
                            bodyweightKg: latestBodyweight,
                            date: peakDate,
                        });
                    }
                } else if (category === "machine") {
                    registry.machine.push({
                        exerciseName: exName,
                        muscleGroup: muscle,
                        weightKg: peakWeight,
                        reps: peakReps,
                        estimated1RM: peak1RM,
                        date: peakDate,
                    });
                } else if (category === "timed") {
                    registry.timed.push({
                        exerciseName: exName,
                        muscleGroup: muscle,
                        durationSec: peakReps || 30,
                        date: peakDate,
                    });
                } else {
                    registry.free_weight.push({
                        exerciseName: exName,
                        muscleGroup: muscle,
                        weightKg: peakWeight,
                        reps: peakReps,
                        estimated1RM: peak1RM,
                        date: peakDate,
                    });
                }
            });
        });
    }

    return registry;
};

// ────────────────────────────────────────────────────────────────
// 6. 7-DAY ROLLING AVERAGE BODYWEIGHT (CALENDAR-DATE WINDOW)
// ────────────────────────────────────────────────────────────────

/**
 * Helper to convert an ISO/date string or Date object into a local calendar midnight timestamp (ms).
 */
const toCalendarDayMidnight = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === "string") {
        const parts = dateInput.split("T")[0].split("-");
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return new Date(y, m, d, 0, 0, 0, 0).getTime();
            }
        }
    }
    const dt = new Date(dateInput);
    if (isNaN(dt.getTime())) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0).getTime();
};

/**
 * Calculates 7-day rolling average bodyweight using a strict calendar-date window.
 * 
 * Calendar Window Rules:
 * - For the latest recorded measurement on calendar date D:
 *   Includes valid bodyweight measurements whose calendar dates fall within [D - 6, D] inclusive (a 7-calendar-day span).
 * - Does NOT interpret "7-day average" as the latest 7 entries (older entries outside D-6 are excluded).
 * - If there are fewer than 7 entries within the 7-day window (e.g. 1, 2, or 3 days logged):
 *   Calculates the arithmetic average using the available valid measurements within the window.
 *   Exposes `count` and `dataPoints` representing the number of valid samples.
 * - ZERO DATA FABRICATION: Does NOT interpolate, impute, or synthesize values for unlogged days.
 * 
 * @param {Array<Object>} bodyStats Array of body stat records ({ date, weightKg, ... })
 * @returns {Object} { latestWeight, rolling7DayAvg, deltaFromAvg, count, dataPoints, entriesInWindowCount, hasData, latestDate }
 */
export const getRolling7DayAverageBodyweight = (bodyStats = []) => {
    if (!Array.isArray(bodyStats) || bodyStats.length === 0) {
        return {
            latestWeight: null,
            rolling7DayAvg: null,
            deltaFromAvg: 0,
            count: 0,
            dataPoints: 0,
            entriesInWindowCount: 0,
            hasData: false,
            latestDate: null,
        };
    }

    // Filter valid positive weights with valid dates
    const valid = bodyStats
        .filter(s => s && typeof s.weightKg === "number" && s.weightKg > 0 && s.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending (newest first)

    if (valid.length === 0) {
        return {
            latestWeight: null,
            rolling7DayAvg: null,
            deltaFromAvg: 0,
            count: 0,
            dataPoints: 0,
            entriesInWindowCount: 0,
            hasData: false,
            latestDate: null,
        };
    }

    const latest = valid[0];
    const latestMidnight = toCalendarDayMidnight(latest.date);

    if (latestMidnight === null) {
        const singleWeight = parseFloat(latest.weightKg.toFixed(1));
        return {
            latestWeight: singleWeight,
            rolling7DayAvg: singleWeight,
            deltaFromAvg: 0,
            count: 1,
            dataPoints: 1,
            entriesInWindowCount: 1,
            hasData: true,
            latestDate: latest.date,
        };
    }

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const windowStartMidnight = latestMidnight - (6 * MS_PER_DAY); // D - 6 days inclusive

    const windowEntries = valid.filter(s => {
        const entryMidnight = toCalendarDayMidnight(s.date);
        if (entryMidnight === null) return false;
        return entryMidnight >= windowStartMidnight && entryMidnight <= latestMidnight;
    });

    const count = windowEntries.length;
    const sum = windowEntries.reduce((acc, s) => acc + s.weightKg, 0);
    const avg = count > 0 ? sum / count : latest.weightKg;
    const roundedAvg = parseFloat(avg.toFixed(1));
    const delta = parseFloat((latest.weightKg - roundedAvg).toFixed(1));

    return {
        latestWeight: parseFloat(latest.weightKg.toFixed(1)),
        rolling7DayAvg: roundedAvg,
        deltaFromAvg: delta,
        count,
        dataPoints: count,
        entriesInWindowCount: count,
        hasData: true,
        latestDate: latest.date,
    };
};

// ────────────────────────────────────────────────────────────────
// 7. RECENT IMPROVEMENTS ENGINE (STRICT LIKE-FOR-LIKE)
// ────────────────────────────────────────────────────────────────

/**
 * Identifies 2-3 verified recent performance improvements strictly from recorded data.
 * Applies like-for-like criteria across identical load types.
 */
export const getRecentImprovements = (history = [], prRecords = {}, latestBodyweight = null, limit = 5) => {
    if (!Array.isArray(history) || history.length < 2) {
        return [];
    }

    const improvements = [];
    const processedExercises = new Set();

    // Collect all unique exercise names from history
    const allExNames = [];
    history.forEach(w => {
        (w.exercises || []).forEach(e => {
            const name = e?.name || e?.exerciseName;
            if (name && !allExNames.includes(name)) {
                allExNames.push(name);
            }
        });
    });

    allExNames.forEach(exName => {
        if (processedExercises.has(exName.toLowerCase().trim())) return;
        processedExercises.add(exName.toLowerCase().trim());

        const sessions = getExerciseHistory(exName, history, latestBodyweight);
        if (sessions.length < 2) return;

        // Compare the 2 most recent completed sessions (sorted oldest to newest)
        const prev = sessions[sessions.length - 2];
        const curr = sessions[sessions.length - 1];

        if (!prev || !curr || curr.completedSetsCount === 0 || prev.completedSetsCount === 0) return;

        const exMeta = getExerciseMetadata(exName);
        const metaCat = exMeta ? exMeta.category : "free_weight";
        const muscle = exMeta ? exMeta.muscleGroup : "Core";

        // Determine dominant loadType from actual completed sets
        const prevValidSets = (prev.sets || []).filter(s => s && s.completed && !s.skipped);
        const currValidSets = (curr.sets || []).filter(s => s && s.completed && !s.skipped);
        if (prevValidSets.length === 0 || currValidSets.length === 0) return;

        const prevLoadType = prevValidSets[0].loadType || metaCat;
        const currLoadType = currValidSets[0].loadType || metaCat;

        let isImprovement = false;
        let prevText = "";
        let currentText = "";
        let deltaText = "";

        if ((currLoadType === "free_weight" || currLoadType === "machine") && 
            (prevLoadType === "free_weight" || prevLoadType === "machine")) {
            const wPrev = prev.maxWeight;
            const rPrev = prev.maxReps;
            const wCurr = curr.maxWeight;
            const rCurr = curr.maxReps;
            const e1rmPrev = prev.bestEstimated1RM;
            const e1rmCurr = curr.bestEstimated1RM;

            if (wCurr > wPrev && rCurr >= rPrev) {
                // Heavier load with equal or more reps
                isImprovement = true;
                const diff = (wCurr - wPrev).toFixed(1).replace(/\.0$/, "");
                deltaText = `+${diff} kg`;
                prevText = `${wPrev} kg × ${rPrev}`;
                currentText = `${wCurr} kg × ${rCurr}`;
            } else if (wCurr === wPrev && rCurr > rPrev && wCurr > 0) {
                // Same load with more reps
                isImprovement = true;
                const diffR = rCurr - rPrev;
                deltaText = `+${diffR} reps`;
                prevText = `${wPrev} kg × ${rPrev}`;
                currentText = `${wCurr} kg × ${rCurr}`;
            } else if (e1rmCurr !== null && e1rmPrev !== null && e1rmCurr > e1rmPrev && (e1rmCurr - e1rmPrev) >= 1.0) {
                // Higher calculated 1RM within 1-12 reps
                isImprovement = true;
                const diff1RM = (e1rmCurr - e1rmPrev).toFixed(1);
                deltaText = `+${diff1RM} kg (Est 1RM)`;
                prevText = `${wPrev} kg × ${rPrev}`;
                currentText = `${wCurr} kg × ${rCurr}`;
            }
        } else if (currLoadType === "bodyweight" && prevLoadType === "bodyweight") {
            // Pure bodyweight: compare max reps
            if (curr.maxReps > prev.maxReps) {
                isImprovement = true;
                const diffR = curr.maxReps - prev.maxReps;
                deltaText = `+${diffR} reps`;
                prevText = `BW × ${prev.maxReps}`;
                currentText = `BW × ${curr.maxReps}`;
            }
        } else if (currLoadType === "weighted_bodyweight" && prevLoadType === "weighted_bodyweight") {
            // Both weighted: compare added weight and reps
            if (curr.maxWeight > prev.maxWeight && curr.maxReps >= prev.maxReps) {
                isImprovement = true;
                const diffW = (curr.maxWeight - prev.maxWeight).toFixed(1).replace(/\.0$/, "");
                deltaText = `+${diffW} kg Added`;
                prevText = `BW +${prev.maxWeight}kg × ${prev.maxReps}`;
                currentText = `BW +${curr.maxWeight}kg × ${curr.maxReps}`;
            } else if (curr.maxWeight === prev.maxWeight && curr.maxReps > prev.maxReps) {
                isImprovement = true;
                const diffR = curr.maxReps - prev.maxReps;
                deltaText = `+${diffR} reps`;
                prevText = `BW +${prev.maxWeight}kg × ${prev.maxReps}`;
                currentText = `BW +${curr.maxWeight}kg × ${curr.maxReps}`;
            }
        } else if (currLoadType === "weighted_bodyweight" && prevLoadType === "bodyweight" && curr.maxReps >= 5) {
            // Progressed from bodyweight to weighted
            isImprovement = true;
            deltaText = `+${curr.maxWeight} kg Added`;
            prevText = `BW × ${prev.maxReps}`;
            currentText = `BW +${curr.maxWeight}kg × ${curr.maxReps}`;
        } else if (currLoadType === "assisted_bodyweight" && prevLoadType === "assisted_bodyweight") {
            // Assisted: reduction in assistance (lower weight) represents improvement strictly when reps are comparable
            if (curr.maxWeight < prev.maxWeight && curr.maxReps >= prev.maxReps) {
                isImprovement = true;
                const diffA = (prev.maxWeight - curr.maxWeight).toFixed(1).replace(/\.0$/, "");
                deltaText = `-${diffA} kg Assistance`;
                prevText = `-${prev.maxWeight}kg × ${prev.maxReps}`;
                currentText = `-${curr.maxWeight}kg × ${curr.maxReps}`;
            } else if (curr.maxWeight === prev.maxWeight && curr.maxReps > prev.maxReps) {
                isImprovement = true;
                const diffR = curr.maxReps - prev.maxReps;
                deltaText = `+${diffR} reps`;
                prevText = `-${prev.maxWeight}kg × ${prev.maxReps}`;
                currentText = `-${curr.maxWeight}kg × ${curr.maxReps}`;
            }
        } else if (currLoadType === "timed" && prevLoadType === "timed") {
            const dPrev = prev.maxDurationSec;
            const dCurr = curr.maxDurationSec;
            if (dCurr > dPrev && (dCurr - dPrev) >= 5) {
                isImprovement = true;
                const diffS = dCurr - dPrev;
                deltaText = `+${diffS}s hold`;
                prevText = `${dPrev}s`;
                currentText = `${dCurr}s`;
            }
        }

        if (isImprovement) {
            improvements.push({
                exerciseName: exName,
                muscleGroup: muscle,
                category: currLoadType,
                prevText,
                currentText,
                deltaText,
                date: curr.date,
                completedAt: curr.completedAt,
            });
        }
    });

    // Sort by latest session date descending
    improvements.sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date));

    return improvements.slice(0, limit);
};

// ────────────────────────────────────────────────────────────────
// 8. PROGRESS INSIGHTS (FACTUAL & STATISTICALLY SUPPORTED)
// ────────────────────────────────────────────────────────────────

/**
 * Generates factual, data-driven observations.
 * Strict rules: No medical claims, no recovery diagnosis, no unfounded claims.
 */
export const getProgressInsights = (history = [], bodyStats = [], prRecords = {}, latestBodyweight = null) => {
    const insights = [];

    if (!Array.isArray(history) || history.length === 0) {
        return [
            {
                id: "initial_welcome",
                type: "info",
                title: "TRAINING BASELINE",
                message: "Log your workout sessions to generate personalized performance trends and strength progressions.",
                badge: "GET STARTED",
            }
        ];
    }

    // 1. Weekly adherence insight
    const weekly = getWeeklyTrainingSummary(history, 0, 0, latestBodyweight);
    if (weekly.completedWorkouts >= 3) {
        insights.push({
            id: "weekly_adherence",
            type: "consistency",
            title: "WEEKLY ADHERENCE",
            message: `You completed ${weekly.completedWorkouts} of ${weekly.plannedWorkouts} planned sessions this week (${weekly.adherenceRate}% adherence).`,
            badge: `${weekly.adherenceRate}% ADHERENCE`,
        });
    }

    // 2. Verified strength improvements
    const recentImps = getRecentImprovements(history, prRecords, latestBodyweight, 1);
    if (recentImps.length > 0) {
        const imp = recentImps[0];
        insights.push({
            id: `strength_imp_${imp.exerciseName}`,
            type: "strength",
            title: "STRENGTH PROGRESSION",
            message: `${imp.exerciseName} progressed from ${imp.prevText} to ${imp.currentText} (${imp.deltaText}).`,
            badge: imp.deltaText,
        });
    }

    // 3. Bodyweight 7-day trend
    const bwData = getRolling7DayAverageBodyweight(bodyStats);
    if (bwData.hasData && bwData.entriesInWindowCount >= 2) {
        const delta = bwData.deltaFromAvg;
        let bwMsg = `7-day rolling average is ${bwData.rolling7DayAvg} kg across ${bwData.entriesInWindowCount} recent logs.`;
        if (Math.abs(delta) >= 0.2) {
            bwMsg += ` Latest log is ${delta > 0 ? "+" : ""}${delta} kg relative to the 7-day average.`;
        }
        insights.push({
            id: "bodyweight_trend",
            type: "bodyweight",
            title: "BODYWEIGHT TREND",
            message: bwMsg,
            badge: `${bwData.rolling7DayAvg} KG AVG`,
        });
    }

    // 4. Volume comparison against 4-week average
    if (history.length >= 4) {
        const w0 = getWeeklyTrainingSummary(history, 0, 0, latestBodyweight);
        const w1 = getWeeklyTrainingSummary(history, 0, 1, latestBodyweight);
        const w2 = getWeeklyTrainingSummary(history, 0, 2, latestBodyweight);
        const w3 = getWeeklyTrainingSummary(history, 0, 3, latestBodyweight);

        const pastAvgSets = Math.round((w1.totalWorkingSets + w2.totalWorkingSets + w3.totalWorkingSets) / 3);
        if (pastAvgSets > 0 && w0.totalWorkingSets > 0) {
            const diff = w0.totalWorkingSets - pastAvgSets;
            const sign = diff >= 0 ? "+" : "";
            insights.push({
                id: "volume_baseline",
                type: "volume",
                title: "VOLUME PROFILE",
                message: `You completed ${w0.totalWorkingSets} working sets this week compared to your 3-week average of ${pastAvgSets} sets (${sign}${diff} sets).`,
                badge: `${w0.totalWorkingSets} SETS`,
            });
        }
    }

    // If no complex insights yet
    if (insights.length === 0) {
        insights.push({
            id: "steady_progress",
            type: "info",
            title: "TRAINING CONSISTENCY",
            message: `You have logged ${history.length} total workout session${history.length > 1 ? "s" : ""}. Keep logging consistently to build statistical curves.`,
            badge: `${history.length} SESSIONS`,
        });
    }

    return insights;
};

// ────────────────────────────────────────────────────────────────
// 9. PHYSIQUE MEASUREMENT DELTAS
// ────────────────────────────────────────────────────────────────

export const PHYSIQUE_METRIC_FIELDS = [
    { key: "weightKg", label: "Body Weight", unit: "kg" },
    { key: "chest", label: "Chest", unit: "cm" },
    { key: "shoulders", label: "Shoulders", unit: "cm" },
    { key: "waist", label: "Waist", unit: "cm" },
    { key: "hips", label: "Hips", unit: "cm" },
    { key: "arms", label: "Upper Arm", unit: "cm" },
    { key: "forearms", label: "Forearm", unit: "cm" },
    { key: "thighs", label: "Thigh", unit: "cm" },
    { key: "calves", label: "Calf", unit: "cm" },
];

/**
 * Calculates current, previous, absolute change, and percentage change for physique metrics.
 */
export const getBodyMeasurementDeltas = (bodyStats = []) => {
    const results = {};

    if (!Array.isArray(bodyStats) || bodyStats.length === 0) {
        PHYSIQUE_METRIC_FIELDS.forEach(f => {
            results[f.key] = {
                key: f.key,
                label: f.label,
                unit: f.unit,
                current: null,
                previous: null,
                delta: null,
                percentChange: null,
            };
        });
        return results;
    }

    // Sort descending by date
    const sorted = [...bodyStats].sort((a, b) => new Date(b.date) - new Date(a.date));

    PHYSIQUE_METRIC_FIELDS.forEach(f => {
        const entriesWithVal = sorted.filter(s => s && typeof s[f.key] === "number" && s[f.key] > 0);

        if (entriesWithVal.length === 0) {
            results[f.key] = {
                key: f.key,
                label: f.label,
                unit: f.unit,
                current: null,
                previous: null,
                delta: null,
                percentChange: null,
            };
        } else if (entriesWithVal.length === 1) {
            results[f.key] = {
                key: f.key,
                label: f.label,
                unit: f.unit,
                current: entriesWithVal[0][f.key],
                previous: null,
                delta: null,
                percentChange: null,
            };
        } else {
            const current = entriesWithVal[0][f.key];
            const previous = entriesWithVal[1][f.key];
            const delta = parseFloat((current - previous).toFixed(1));
            const percentChange = previous > 0 ? parseFloat(((delta / previous) * 100).toFixed(1)) : null;

            results[f.key] = {
                key: f.key,
                label: f.label,
                unit: f.unit,
                current,
                previous,
                delta,
                percentChange,
            };
        }
    });

    return results;
};

// ────────────────────────────────────────────────────────────────
// 10. PRE-INDEXED EXERCISE HISTORY CACHE (SINGLE-PASS O(N))
// ────────────────────────────────────────────────────────────────

/**
 * Pre-indexes complete workout history into an exercise-keyed map in a single pass.
 * Enables O(1) instantaneous lookups for all exercises in a session without re-scanning history.
 * 
 * @param {Array<Object>} history Workout history array
 * @param {number|null} latestBodyweight User bodyweight in kg
 * @returns {Object} { [exerciseKey]: Array<SessionSummary> }
 */
export const getPreIndexedExerciseSessions = (history = [], latestBodyweight = null) => {
    const map = {};
    if (!Array.isArray(history) || history.length === 0) return map;

    history.forEach((workout) => {
        if (!workout || !Array.isArray(workout.exercises)) return;
        const wDate = workout.date || (workout.completedAt ? workout.completedAt.split("T")[0] : null);

        workout.exercises.forEach((ex) => {
            if (!ex) return;
            const rawName = ex.name || ex.exerciseName || "";
            const key = rawName.toLowerCase().trim();
            if (!key) return;

            const exMeta = getExerciseMetadata(rawName);
            const category = exMeta ? exMeta.category : "free_weight";
            const muscleGroup = exMeta ? exMeta.muscleGroup : "Core";

            const rawSets = ex.loggedSets || ex.logs || [];
            const normalizedSets = [];

            if (Array.isArray(rawSets) && rawSets.length > 0) {
                rawSets.forEach((s) => {
                    const norm = normalizeLoggedSet(s, rawName, latestBodyweight);
                    if (norm && (norm.completed || norm.reps > 0 || norm.weightKg > 0)) {
                        normalizedSets.push(norm);
                    }
                });
            } else if (ex.weightKg || ex.reps) {
                const norm = normalizeLoggedSet({
                    set: 1,
                    weightKg: ex.weightKg,
                    reps: ex.reps,
                    completed: true,
                }, rawName, latestBodyweight);
                if (norm) normalizedSets.push(norm);
            }

            if (normalizedSets.length === 0) return;

            let maxWeight = 0;
            let maxReps = 0;
            let best1RM = null;
            let totalVolumeLoad = 0;
            let totalReps = 0;
            let maxDurationSec = 0;

            normalizedSets.forEach((s) => {
                if (s.completed && !s.skipped) {
                    if (s.weightKg > maxWeight) maxWeight = s.weightKg;
                    if (s.reps > maxReps) maxReps = s.reps;
                    if (s.durationSec && s.durationSec > maxDurationSec) maxDurationSec = s.durationSec;
                    totalReps += s.reps || 0;

                    if (category === "free_weight" || category === "machine") {
                        totalVolumeLoad += (s.weightKg || 0) * (s.reps || 0);
                        const e1rm = calculateEstimated1RM(s.weightKg, s.reps, category);
                        if (e1rm !== null && (best1RM === null || e1rm > best1RM)) {
                            best1RM = e1rm;
                        }
                    }
                }
            });

            if (!map[key]) map[key] = [];

            let resolvedCategory = category;
            if (normalizedSets.some(s => s.loadType === "weighted_bodyweight") || (isBodyweightMovement(rawName) && maxWeight > 0)) {
                resolvedCategory = "weighted_bodyweight";
            } else if (normalizedSets.some(s => s.loadType === "assisted_bodyweight")) {
                resolvedCategory = "assisted_bodyweight";
            } else if (normalizedSets.some(s => s.loadType === "timed") || exMeta?.type === "timer" || key.includes("plank")) {
                resolvedCategory = "timed";
            } else if (normalizedSets.some(s => s.loadType === "bodyweight") || isBodyweightMovement(rawName)) {
                resolvedCategory = "bodyweight";
            }

            map[key].push({
                date: wDate,
                completedAt: workout.completedAt || wDate,
                exerciseName: rawName,
                category: resolvedCategory,
                muscleGroup,
                repRange: ex.repRange || (exMeta ? exMeta.repRange : null),
                plannedSets: ex.sets || (exMeta ? exMeta.sets : null),
                sets: normalizedSets,
                completedSetsCount: normalizedSets.filter(s => s.completed && !s.skipped).length,
                maxWeight,
                maxReps,
                bestEstimated1RM: best1RM,
                volumeLoad: totalVolumeLoad,
                totalReps,
                maxDurationSec,
            });
        });
    });

    // Sort every exercise's sessions chronologically ascending (oldest first)
    Object.keys(map).forEach((k) => {
        map[k].sort((a, b) => new Date(a.completedAt || a.date) - new Date(b.completedAt || b.date));
    });

    return map;
};

// ────────────────────────────────────────────────────────────────
// 11. EXERCISE REP RANGE PARSER
// ────────────────────────────────────────────────────────────────

/**
 * Parses diverse repRange strings from WORKOUT_PLAN into structured bounds.
 * e.g. "6-10" -> { min: 6, max: 10 }, "5·5·6·8·10" -> { min: 5, max: 10 }
 */
export const parseExerciseRepRange = (repRangeStr, defaultMin = 8, defaultMax = 12) => {
    if (!repRangeStr || typeof repRangeStr !== "string") {
        return { min: defaultMin, max: defaultMax, isTimed: false, isFailure: false };
    }

    const trimmed = repRangeStr.trim().toLowerCase();

    if (trimmed.includes("failure")) {
        return { min: 8, max: 15, isTimed: false, isFailure: true };
    }

    if (trimmed.endsWith("s") || trimmed.includes("sec")) {
        const num = parseInt(trimmed, 10) || 45;
        return { min: num, max: num + 15, isTimed: true, isFailure: false };
    }

    // Range like "8-12" or "8–12" or "6 - 10"
    const rangeMatch = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)/);
    if (rangeMatch) {
        return {
            min: parseInt(rangeMatch[1], 10),
            max: parseInt(rangeMatch[2], 10),
            isTimed: false,
            isFailure: false,
        };
    }

    // Dot-separated pyramid like "5·5·6·8·10"
    if (trimmed.includes("·") || trimmed.includes(".")) {
        const parts = trimmed.split(/[·.]/).map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
        if (parts.length > 0) {
            return {
                min: Math.min(...parts),
                max: Math.max(...parts),
                isTimed: false,
                isFailure: false,
                pyramid: parts,
            };
        }
    }

    // Single number like "12" or "10"
    const singleNum = parseInt(trimmed, 10);
    if (!isNaN(singleNum)) {
        return { min: Math.max(1, singleNum - 2), max: singleNum, isTimed: false, isFailure: false };
    }

    return { min: defaultMin, max: defaultMax, isTimed: false, isFailure: false };
};

/**
 * Calculates standard progressive load increment for an exercise.
 */
const getSuggestedLoadIncrement = (exerciseName = "", category = "free_weight", currentWeight = 0) => {
    const name = exerciseName.toLowerCase();
    const isLowerCompound = name.includes("squat") || name.includes("deadlift") || name.includes("leg press") || name.includes("rdl");
    const isUpperBarbell = name.includes("bench press") || name.includes("overhead press") || name.includes("barbell row");

    if (isLowerCompound && currentWeight >= 50) return 5.0;
    if (isUpperBarbell || currentWeight >= 40) return 2.5;
    if (currentWeight >= 20) return 2.0;
    if (currentWeight >= 10) return 1.25;
    return 1.0;
};

// ────────────────────────────────────────────────────────────────
// 12. CENTRALIZED EXERCISE PROGRESSION ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Determines exact progression recommendations for an exercise based strictly on historical data.
 * Applies double progression, weighted bodyweight, bodyweight reps, assisted bodyweight, and timed rules.
 * 
 * @param {string} exerciseName Name of the exercise
 * @param {Array<Object>} history Workout history
 * @param {Object|null} currentSession Optional current active session
 * @param {number|null} latestBodyweight User bodyweight in kg
 * @param {Object|null} indexedCache Optional pre-indexed history cache
 * @returns {Object} Structured recommendation with target load, target reps, status badge, and rationale
 */
export const getExerciseProgressionRecommendation = (
    exerciseName,
    history = [],
    currentSession = null,
    latestBodyweight = null,
    indexedCache = null
) => {
    if (!exerciseName) {
        return {
            exerciseName: "",
            recommendation: "INSUFFICIENT_DATA",
            actionLabel: "No Exercise",
            statusBadge: "INSUFFICIENT DATA",
            badgeColor: "#8E8E93",
            targetWeight: null,
            targetRepRange: "8–12",
            targetSetsCount: 3,
            targetDurationSec: null,
            suggestedDeltaKg: 0,
            reason: "Exercise name missing.",
            lastPerformance: null,
            hasHistoricalData: false,
        };
    }

    const exKey = exerciseName.toLowerCase().trim();
    const exMeta = getExerciseMetadata(exerciseName);
    let category = exMeta ? exMeta.category : "free_weight";

    // Retrieve historical sessions
    let sessions = [];
    if (indexedCache && indexedCache[exKey]) {
        sessions = indexedCache[exKey];
    } else {
        sessions = getExerciseHistory(exerciseName, history, latestBodyweight);
    }

    const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

    const repRangeStr = currentSession?.repRange 
        || lastSession?.repRange 
        || exMeta?.repRange 
        || "8-12";
    const repBounds = parseExerciseRepRange(repRangeStr);

    const plannedSets = (currentSession?.sets ? parseInt(currentSession.sets, 10) : null)
        || (lastSession?.plannedSets ? parseInt(lastSession.plannedSets, 10) : null)
        || (exMeta?.sets ? parseInt(exMeta.sets, 10) : null)
        || 3;

    // Base Case: No previous history
    if (sessions.length === 0) {
        return {
            exerciseName,
            recommendation: "ESTABLISH_BASELINE",
            actionLabel: "Establish Baseline",
            statusBadge: "NEW MOVEMENT",
            badgeColor: "#30B0C7",
            targetWeight: null,
            targetRepRange: exMeta?.repRange || `${repBounds.min}–${repBounds.max}`,
            targetSetsCount: plannedSets,
            targetDurationSec: repBounds.isTimed ? repBounds.min : null,
            suggestedDeltaKg: 0,
            reason: "No completed sessions logged yet. Establish your baseline working weight today.",
            lastPerformance: null,
            hasHistoricalData: false,
        };
    }

    const validSets = (lastSession.sets || []).filter(s => s && s.completed && !s.skipped);

    if (validSets.length === 0) {
        return {
            exerciseName,
            recommendation: "ESTABLISH_BASELINE",
            actionLabel: "Establish Baseline",
            statusBadge: "ESTABLISH BASELINE",
            badgeColor: "#30B0C7",
            targetWeight: null,
            targetRepRange: exMeta?.repRange || `${repBounds.min}–${repBounds.max}`,
            targetSetsCount: plannedSets,
            targetDurationSec: repBounds.isTimed ? repBounds.min : null,
            suggestedDeltaKg: 0,
            reason: "Previous session had no completed sets. Log working sets to start progression tracking.",
            lastPerformance: null,
            hasHistoricalData: false,
        };
    }

    // Dynamic category resolution
    if (exMeta?.type === "timer" || repBounds.isTimed || exKey.includes("plank")) {
        category = "timed";
    } else if (validSets.some(s => s.loadType === "weighted_bodyweight") || (isBodyweightMovement(exerciseName) && lastSession.maxWeight > 0)) {
        category = "weighted_bodyweight";
    } else if (validSets.some(s => s.loadType === "assisted_bodyweight")) {
        category = "assisted_bodyweight";
    }

    const lastPerf = {
        weightKg: lastSession.maxWeight,
        reps: lastSession.maxReps,
        completedSetsCount: validSets.length,
        date: lastSession.date,
        durationSec: lastSession.maxDurationSec,
        sets: validSets.map(s => ({ set: s.set, weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec })),
    };

    // ── 1. Free Weight & Machine (Double Progression) ──
    if (category === "free_weight" || category === "machine") {
        const workingWeight = lastSession.maxWeight;
        const allSetsHitCeiling = validSets.length >= plannedSets && validSets.every(s => (s.reps || 0) >= repBounds.max && s.weightKg === workingWeight);
        const allSetsBelowFloor = validSets.every(s => (s.reps || 0) < repBounds.min);

        if (workingWeight > 0 && allSetsHitCeiling) {
            const inc = getSuggestedLoadIncrement(exerciseName, category, workingWeight);
            const newWeight = parseFloat((workingWeight + inc).toFixed(1));
            return {
                exerciseName,
                recommendation: "INCREASE_LOAD",
                actionLabel: `+${inc} kg Next Session`,
                statusBadge: "READY TO PROGRESS",
                badgeColor: "#00C853",
                targetWeight: newWeight,
                targetRepRange: `${repBounds.min}–${repBounds.max}`,
                targetSetsCount: plannedSets,
                targetDurationSec: null,
                suggestedDeltaKg: inc,
                reason: `Hit ceiling (${repBounds.max} reps) on all ${validSets.length} sets at ${workingWeight} kg. Increase load to ${newWeight} kg.`,
                lastPerformance: lastPerf,
                hasHistoricalData: true,
            };
        }

        if (workingWeight > 0 && allSetsBelowFloor && sessions.length >= 2) {
            // Check if 2 consecutive sessions were below floor
            const prevSession = sessions[sessions.length - 2];
            const prevValid = (prevSession.sets || []).filter(s => s.completed && !s.skipped);
            const prevBelowFloor = prevValid.every(s => (s.reps || 0) < repBounds.min);

            if (prevBelowFloor) {
                const reducedWeight = Math.max(0, parseFloat((workingWeight * 0.9).toFixed(1)));
                return {
                    exerciseName,
                    recommendation: "REDUCE_LOAD",
                    actionLabel: "Deload 10%",
                    statusBadge: "REDUCE LOAD",
                    badgeColor: "#E31E24",
                    targetWeight: reducedWeight,
                    targetRepRange: `${repBounds.min}–${repBounds.max}`,
                    targetSetsCount: plannedSets,
                    targetDurationSec: null,
                    suggestedDeltaKg: parseFloat((reducedWeight - workingWeight).toFixed(1)),
                    reason: `Reps dropped below target range (${repBounds.min} reps) for 2 consecutive sessions. Reduce load to ${reducedWeight} kg to restore form.`,
                    lastPerformance: lastPerf,
                    hasHistoricalData: true,
                };
            }
        }

        // In-Range Progression: Maintain load, add reps towards ceiling
        return {
            exerciseName,
            recommendation: "MAINTAIN_LOAD_ADD_REPS",
            actionLabel: `Hold ${workingWeight} kg · Add Reps`,
            statusBadge: "MAINTAIN LOAD",
            badgeColor: "#FF9500",
            targetWeight: workingWeight,
            targetRepRange: `${repBounds.min}–${repBounds.max}`,
            targetSetsCount: plannedSets,
            targetDurationSec: null,
            suggestedDeltaKg: 0,
            reason: `Logged ${validSets.map(s => s.reps).join(", ")} reps at ${workingWeight} kg. Aim to add reps towards the ${repBounds.max}-rep ceiling.`,
            lastPerformance: lastPerf,
            hasHistoricalData: true,
        };
    }

    // ── 2. Weighted Bodyweight ──
    if (category === "weighted_bodyweight") {
        const addedWeight = lastSession.maxWeight;
        const allHitCeiling = validSets.length >= plannedSets && validSets.every(s => (s.reps || 0) >= repBounds.max);

        if (allHitCeiling) {
            const inc = 2.5;
            const newAdded = parseFloat((addedWeight + inc).toFixed(1));
            return {
                exerciseName,
                recommendation: "INCREASE_LOAD",
                actionLabel: `+${inc} kg Added Load`,
                statusBadge: "READY TO PROGRESS",
                badgeColor: "#00C853",
                targetWeight: newAdded,
                targetRepRange: `${repBounds.min}–${repBounds.max}`,
                targetSetsCount: plannedSets,
                targetDurationSec: null,
                suggestedDeltaKg: inc,
                reason: `Hit ${repBounds.max} reps on all sets with +${addedWeight} kg added. Increase added weight to +${newAdded} kg.`,
                lastPerformance: lastPerf,
                hasHistoricalData: true,
            };
        }

        return {
            exerciseName,
            recommendation: "MAINTAIN_LOAD_ADD_REPS",
            actionLabel: `Hold +${addedWeight} kg · Add Reps`,
            statusBadge: "MAINTAIN LOAD",
            badgeColor: "#FF9500",
            targetWeight: addedWeight,
            targetRepRange: `${repBounds.min}–${repBounds.max}`,
            targetSetsCount: plannedSets,
            targetDurationSec: null,
            suggestedDeltaKg: 0,
            reason: `Hold +${addedWeight} kg added weight and aim to bring all sets to ${repBounds.max} reps.`,
            lastPerformance: lastPerf,
            hasHistoricalData: true,
        };
    }

    // ── 3. Bodyweight Movements ──
    if (category === "bodyweight") {
        const maxReps = lastSession.maxReps;
        const hitCeiling = maxReps >= repBounds.max;
        const nextTargetReps = hitCeiling ? maxReps + 2 : Math.min(repBounds.max, maxReps + 1);

        return {
            exerciseName,
            recommendation: "INCREASE_REPS",
            actionLabel: `Aim for ${nextTargetReps} Reps`,
            statusBadge: hitCeiling ? "REP CEILING REACHED" : "ADD REPS",
            badgeColor: hitCeiling ? "#00C853" : "#FF9500",
            targetWeight: 0,
            targetRepRange: `${nextTargetReps} reps`,
            targetSetsCount: plannedSets,
            targetDurationSec: null,
            suggestedDeltaKg: 0,
            reason: `Last session peak: ${maxReps} reps. Target ${nextTargetReps} reps today.`,
            lastPerformance: lastPerf,
            hasHistoricalData: true,
        };
    }

    // ── 4. Assisted Bodyweight ──
    if (category === "assisted_bodyweight") {
        const currentAssistance = lastSession.maxWeight;
        const allHitCeiling = validSets.length >= plannedSets && validSets.every(s => (s.reps || 0) >= repBounds.max);

        if (allHitCeiling && currentAssistance > 0) {
            const newAssistance = Math.max(0, parseFloat((currentAssistance - 2.5).toFixed(1)));
            return {
                exerciseName,
                recommendation: "REDUCE_ASSISTANCE",
                actionLabel: newAssistance === 0 ? "Full Bodyweight" : `-${newAssistance} kg Assistance`,
                statusBadge: "REDUCE ASSISTANCE",
                badgeColor: "#00C853",
                targetWeight: newAssistance,
                targetRepRange: `${repBounds.min}–${repBounds.max}`,
                targetSetsCount: plannedSets,
                targetDurationSec: null,
                suggestedDeltaKg: -2.5,
                reason: `Hit ${repBounds.max} reps on all sets. Reduce assistance from ${currentAssistance} kg to ${newAssistance} kg.`,
                lastPerformance: lastPerf,
                hasHistoricalData: true,
            };
        }

        return {
            exerciseName,
            recommendation: "MAINTAIN_ASSISTANCE",
            actionLabel: `Hold -${currentAssistance} kg Assistance`,
            statusBadge: "MAINTAIN ASSISTANCE",
            badgeColor: "#FF9500",
            targetWeight: currentAssistance,
            targetRepRange: `${repBounds.min}–${repBounds.max}`,
            targetSetsCount: plannedSets,
            targetDurationSec: null,
            suggestedDeltaKg: 0,
            reason: `Maintain -${currentAssistance} kg assistance and work towards ${repBounds.max} reps on all sets.`,
            lastPerformance: lastPerf,
            hasHistoricalData: true,
        };
    }

    // ── 5. Timed Exercises ──
    if (category === "timed") {
        const lastDuration = lastSession.maxDurationSec || validSets[0]?.durationSec || 30;
        const targetDuration = lastDuration + 5;

        return {
            exerciseName,
            recommendation: "INCREASE_HOLD_TIME",
            actionLabel: `Aim for ${targetDuration}s`,
            statusBadge: "ADD DURATION",
            badgeColor: "#00C853",
            targetWeight: null,
            targetRepRange: `${targetDuration}s`,
            targetSetsCount: plannedSets,
            targetDurationSec: targetDuration,
            suggestedDeltaKg: 0,
            reason: `Last duration: ${lastDuration}s. Aim to hold for ${targetDuration}s today.`,
            lastPerformance: lastPerf,
            hasHistoricalData: true,
        };
    }

    // Default fallback
    return {
        exerciseName,
        recommendation: "MAINTAIN_LOAD_ADD_REPS",
        actionLabel: "Maintain Load",
        statusBadge: "MAINTAIN LOAD",
        badgeColor: "#FF9500",
        targetWeight: lastSession.maxWeight,
        targetRepRange: `${repBounds.min}–${repBounds.max}`,
        targetSetsCount: plannedSets,
        targetDurationSec: null,
        suggestedDeltaKg: 0,
        reason: "Continue training in target rep range.",
        lastPerformance: lastPerf,
        hasHistoricalData: true,
    };
};

// ────────────────────────────────────────────────────────────────
// 13. WORKOUT DAY TARGETS GENERATOR
// ────────────────────────────────────────────────────────────────

/**
 * Generates structured exercise targets for all movements in a workout day.
 */
export const getWorkoutDayTargets = (day, history = [], latestBodyweight = null) => {
    if (!day || !Array.isArray(day.exercises)) {
        return { day: day?.day || 1, target: day?.target || "Workout", exercises: [] };
    }

    const indexedCache = getPreIndexedExerciseSessions(history, latestBodyweight);
    const exerciseTargets = day.exercises.map((ex) => {
        const rec = getExerciseProgressionRecommendation(
            ex.name,
            history,
            ex,
            latestBodyweight,
            indexedCache
        );
        return {
            ...ex,
            progression: rec,
        };
    });

    return {
        day: day.day,
        target: day.target,
        dayName: day.dayName,
        exercises: exerciseTargets,
    };
};

// ────────────────────────────────────────────────────────────────
// 14. STALL & PLATEAUX DETECTION ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Evaluates whether an exercise is progressing, stable, or stalling.
 * Strict Rule: Requires minimum 3 consecutive completed sessions before flagging a stall.
 * 
 * @param {string} exerciseName Exercise Name
 * @param {Array<Object>} history Workout History
 * @param {number|null} latestBodyweight User Bodyweight
 * @param {Object|null} indexedCache Optional pre-indexed cache
 * @returns {Object} { status, label, color, sessionsCount, description }
 */
export const getExerciseStallStatus = (exerciseName, history = [], latestBodyweight = null, indexedCache = null) => {
    if (!exerciseName) {
        return {
            status: "INSUFFICIENT_DATA",
            label: "Insufficient Data",
            color: "#8E8E93",
            sessionsCount: 0,
            stagnantSessionCount: 0,
            description: "No exercise specified.",
        };
    }

    const exKey = exerciseName.toLowerCase().trim();
    let sessions = [];
    if (indexedCache && indexedCache[exKey]) {
        sessions = indexedCache[exKey];
    } else {
        sessions = getExerciseHistory(exerciseName, history, latestBodyweight);
    }

    if (sessions.length < 3) {
        return {
            status: "INSUFFICIENT_DATA",
            label: "Baseline Building",
            color: "#8E8E93",
            sessionsCount: sessions.length,
            stagnantSessionCount: 0,
            description: `Requires at least 3 completed sessions to detect plateaus (currently logged: ${sessions.length}).`,
        };
    }

    // Count consecutive non-progressing sessions from the tail
    let stagnantCount = 0;
    for (let i = sessions.length - 1; i >= 1; i--) {
        const curr = sessions[i];
        const prev = sessions[i - 1];
        const currW = curr.maxWeight || 0;
        const prevW = prev.maxWeight || 0;
        const currR = curr.maxReps || 0;
        const prevR = prev.maxReps || 0;

        if (currW < prevW || (currW === prevW && currR <= prevR)) {
            stagnantCount++;
        } else {
            break;
        }
    }

    // Take the 3 most recent sessions: s1 (oldest), s2 (middle), s3 (newest)
    const s1 = sessions[sessions.length - 3];
    const s2 = sessions[sessions.length - 2];
    const s3 = sessions[sessions.length - 1];

    const w1 = s1.maxWeight;
    const w2 = s2.maxWeight;
    const w3 = s3.maxWeight;

    const r1 = s1.maxReps;
    const r2 = s2.maxReps;
    const r3 = s3.maxReps;

    // Upward progression: load increased or reps increased at same load in latest session
    if (w3 > w2 || (w3 === w2 && r3 > r2)) {
        const deltaText = w3 > w2 ? `+${(w3 - w2).toFixed(1)} kg` : `+${r3 - r2} reps`;
        return {
            status: "PROGRESSING",
            label: "Progressing",
            color: "#00C853",
            sessionsCount: sessions.length,
            stagnantSessionCount: 0,
            description: `Upward trajectory confirmed in latest session (${deltaText}).`,
            currentBestWeight: w3,
            currentBestReps: r3,
        };
    }

    // Stall condition: load and reps have remained flat or declining across all 3 sessions
    const weightStagnant = (w1 === w2 && w2 === w3);
    const repsStagnantOrDeclining = (r3 <= r2 && r2 <= r1);

    if (weightStagnant && repsStagnantOrDeclining) {
        return {
            status: "STALLING",
            label: "Stalling",
            color: "#FF5E3A",
            sessionsCount: sessions.length,
            stagnantSessionCount: Math.max(3, stagnantCount),
            description: `Performance has remained unchanged at ${w3} kg × ${r3} across 3 consecutive sessions.`,
            currentBestWeight: w3,
            currentBestReps: r3,
        };
    }

    // Stable: slight fluctuations within standard variation
    return {
        status: "STABLE",
        label: "Stable",
        color: "#30B0C7",
        sessionsCount: sessions.length,
        stagnantSessionCount: stagnantCount,
        description: `Consistent performance within 1-rep variance (${w3} kg × ${r3} reps).`,
        currentBestWeight: w3,
        currentBestReps: r3,
    };
};

// ────────────────────────────────────────────────────────────────
// 15. ACUTE VS CHRONIC TRAINING LOAD & WORKLOAD TREND
// ────────────────────────────────────────────────────────────────

/**
 * Calculates acute training load (current week) vs 4-week chronic baseline.
 * Separates external tonnage (free weight / machine) from bodyweight working sets.
 */
export const getTrainingLoadTrend = (history = [], latestBodyweight = null) => {
    if (!Array.isArray(history) || history.length === 0) {
        return {
            currentWeekTonnageKg: 0,
            previousWeekTonnageKg: 0,
            chronicBaselineTonnageKg: 0,
            workloadRatio: 1.0,
            trendClassification: "BUILDING_BASELINE",
            trendLabel: "Building Baseline",
            trendColor: "#30B0C7",
            currentWeekSets: 0,
            previousWeekSets: 0,
            chronicBaselineSets: 0,
            weeksOfHistoryCount: 0,
            summaryMessage: "Log workouts across multiple weeks to establish training load curves.",
        };
    }

    // Compute weekly summaries for weeks 0, 1, 2, 3, 4
    const w0 = getWeeklyTrainingSummary(history, 0, 0, latestBodyweight); // Current week
    const w1 = getWeeklyTrainingSummary(history, 0, 1, latestBodyweight); // Previous week
    const w2 = getWeeklyTrainingSummary(history, 0, 2, latestBodyweight); // 2 weeks ago
    const w3 = getWeeklyTrainingSummary(history, 0, 3, latestBodyweight); // 3 weeks ago
    const w4 = getWeeklyTrainingSummary(history, 0, 4, latestBodyweight); // 4 weeks ago

    const pastWeeks = [w1, w2, w3, w4].filter(w => w.completedWorkouts > 0 || w.totalWorkingSets > 0);
    const weeksCount = pastWeeks.length;

    let chronicBaselineTonnage = 0;
    let chronicBaselineSets = 0;

    if (weeksCount > 0) {
        const sumTonnage = pastWeeks.reduce((acc, w) => acc + w.totalVolumeLoadKg, 0);
        const sumSets = pastWeeks.reduce((acc, w) => acc + w.totalWorkingSets, 0);
        chronicBaselineTonnage = Math.round(sumTonnage / weeksCount);
        chronicBaselineSets = Math.round(sumSets / weeksCount);
    } else {
        chronicBaselineTonnage = w0.totalVolumeLoadKg;
        chronicBaselineSets = w0.totalWorkingSets;
    }

    let workloadRatio = 1.0;
    if (chronicBaselineTonnage > 0) {
        workloadRatio = parseFloat((w0.totalVolumeLoadKg / chronicBaselineTonnage).toFixed(2));
    } else if (chronicBaselineSets > 0) {
        workloadRatio = parseFloat((w0.totalWorkingSets / chronicBaselineSets).toFixed(2));
    }

    let trendClassification = "OPTIMAL_PROGRESSION";
    let trendLabel = "Optimal Overload";
    let trendColor = "#00C853";
    let summaryMessage = "Current training load is progressing within sustainable parameters.";

    if (weeksCount < 2) {
        trendClassification = "BUILDING_BASELINE";
        trendLabel = "Building Baseline";
        trendColor = "#30B0C7";
        summaryMessage = "Gathering multi-week training data to establish chronic workload baseline.";
    } else if (workloadRatio > 1.40) {
        trendClassification = "SUBSTANTIALLY_ELEVATED";
        trendLabel = "Substantially Elevated";
        trendColor = "#FF5E3A";
        summaryMessage = `Training load is ${Math.round((workloadRatio - 1) * 100)}% above your 4-week baseline. Monitor fatigue.`;
    } else if (workloadRatio >= 1.20) {
        trendClassification = "ELEVATED_WORKLOAD";
        trendLabel = "Elevated Stimulus";
        trendColor = "#FF9500";
        summaryMessage = `Training load is elevated (${Math.round((workloadRatio - 1) * 100)}% above baseline). Good stimulus phase.`;
    } else if (workloadRatio < 0.75 && chronicBaselineTonnage > 0) {
        trendClassification = "REDUCED_WORKLOAD";
        trendLabel = "Reduced Load";
        trendColor = "#8E8E93";
        summaryMessage = "Training volume is reduced compared to baseline (deload / recovery window).";
    }

    return {
        currentWeekTonnageKg: w0.totalVolumeLoadKg,
        previousWeekTonnageKg: w1.totalVolumeLoadKg,
        chronicBaselineTonnageKg: chronicBaselineTonnage,
        workloadRatio,
        trendClassification,
        trendLabel,
        trendColor,
        currentWeekSets: w0.totalWorkingSets,
        previousWeekSets: w1.totalWorkingSets,
        chronicBaselineSets,
        weeksOfHistoryCount: weeksCount,
        summaryMessage,
    };
};

// ────────────────────────────────────────────────────────────────
// 16. SELF-REPORTED READINESS SCORING & DELOAD EVALUATOR
// ────────────────────────────────────────────────────────────────

/**
 * Calculates user-reported readiness score from 1-5 scale inputs.
 * Clearly labeled as subjective self-reported metric.
 */
export const getReadinessScore = (entry) => {
    if (!entry || typeof entry !== "object") {
        return {
            hasData: false,
            score: null,
            level: "UNRECORDED",
            label: "Self-Reported Readiness",
            recommendation: "Log today's readiness to monitor recovery trends.",
        };
    }

    const energy = Math.max(1, Math.min(5, parseInt(entry.energy, 10) || 3));
    const sleep = Math.max(1, Math.min(5, parseInt(entry.sleep, 10) || 3));
    const soreness = Math.max(1, Math.min(5, parseInt(entry.soreness, 10) || 3));
    const motivation = Math.max(1, Math.min(5, parseInt(entry.motivation, 10) || 3));

    const score = Math.round(((energy + sleep + soreness + motivation) / 20) * 100);

    let level = "MODERATE";
    let recommendation = "Normal training capacity.";

    if (score >= 80) {
        level = "PEAK";
        recommendation = "High energy & recovery reported. Prime day for high intensity.";
    } else if (score >= 60) {
        level = "MODERATE";
        recommendation = "Good baseline readiness. Execute scheduled session.";
    } else if (score >= 40) {
        level = "REDUCED";
        recommendation = "Moderate fatigue noted. Prioritize warm-up and technical precision.";
    } else {
        level = "LOW";
        recommendation = "Low readiness reported. Consider reducing accessory volume or intensity.";
    }

    return {
        hasData: true,
        score,
        level,
        energy,
        sleep,
        soreness,
        motivation,
        date: entry.date,
        label: "Self-Reported Readiness",
        recommendation,
    };
};

/**
 * Evaluates training stress and conservative deload recommendations based purely on recorded data.
 */
export const getDeloadRecommendation = (history = [], readinessHistory = [], latestBodyweight = null) => {
    const loadTrend = getTrainingLoadTrend(history, latestBodyweight);
    const observations = [];

    // Factor 1: Workload spike / sustained high load
    const isHighWorkload = loadTrend.workloadRatio > 1.35 && loadTrend.weeksOfHistoryCount >= 2;
    if (isHighWorkload) {
        observations.push(`Training load is ${Math.round((loadTrend.workloadRatio - 1) * 100)}% above your 4-week chronic baseline.`);
    }

    // Factor 2: Low subjective readiness trend
    const recentReadiness = (readinessHistory || []).slice(0, 3);
    const lowReadinessCount = recentReadiness.filter(r => (r.score || 0) < 45).length;
    if (lowReadinessCount >= 2) {
        observations.push("Low self-reported readiness recorded across recent consecutive entries.");
    }

    if (isHighWorkload && lowReadinessCount >= 2) {
        return {
            status: "REVIEW_TRAINING_LOAD",
            label: "Review Workload",
            color: "#FF5E3A",
            reason: "High cumulative training volume coincides with low self-reported readiness. Consider a planned deload or volume consolidation week.",
            observations,
        };
    }

    if (isHighWorkload) {
        return {
            status: "ELEVATED_LOAD",
            label: "Elevated Load",
            color: "#FF9500",
            reason: "Workload is elevated above baseline. Ensure nutrition and rest match training volume.",
            observations,
        };
    }

    return {
        status: "NORMAL",
        label: "Optimal Stimulus",
        color: "#00C853",
        reason: "Training load and recovery signals remain in equilibrium.",
        observations: ["Workload is progressing sustainably."],
    };
};

// ────────────────────────────────────────────────────────────────
// 17. CENTRALIZED PRIORITIZED ATHLETE ALERTS
// ────────────────────────────────────────────────────────────────

/**
 * Evaluates training data and outputs a prioritized, non-spammy list of top 1-3 athlete alerts.
 */
export const getAthleteAlerts = (
    history = [],
    bodyStats = [],
    readinessHistory = [],
    prRecords = {},
    latestBodyweight = null
) => {
    const alerts = [];
    if (!Array.isArray(history) || history.length === 0) {
        return alerts;
    }

    const indexedCache = getPreIndexedExerciseSessions(history, latestBodyweight);

    // 1. Check for recent PRs in last workout
    const latestWorkout = history[0];
    if (latestWorkout && Array.isArray(latestWorkout.exercises)) {
        const recentPRHits = [];
        latestWorkout.exercises.forEach(ex => {
            const name = ex.name || ex.exerciseName;
            const pr = prRecords ? prRecords[name] : null;
            const wDate = latestWorkout.date || (latestWorkout.completedAt ? latestWorkout.completedAt.split("T")[0] : null);
            if (pr && (pr.date === wDate || pr.completedAt === latestWorkout.completedAt)) {
                recentPRHits.push(name);
            }
        });

        if (recentPRHits.length > 0) {
            alerts.push({
                id: "recent_pr",
                priority: 1,
                type: "success",
                icon: "trophy",
                title: "NEW PERSONAL RECORD",
                message: `Set a new PR on ${recentPRHits[0]}${recentPRHits.length > 1 ? ` +${recentPRHits.length - 1} more` : ""} in your last session!`,
                badge: "NEW PR",
                color: "#FFD700",
            });
        }
    }

    // 2. Check for compound lifts ready to progress
    const compoundsReady = [];
    Object.keys(indexedCache).forEach(exName => {
        const rec = getExerciseProgressionRecommendation(exName, history, null, latestBodyweight, indexedCache);
        if (rec.recommendation === "INCREASE_LOAD") {
            compoundsReady.push({ name: exName, delta: rec.suggestedDeltaKg, target: rec.targetWeight });
        }
    });

    if (compoundsReady.length > 0) {
        const topReady = compoundsReady[0];
        alerts.push({
            id: "ready_to_progress",
            priority: 2,
            type: "progression",
            icon: "trending-up",
            title: "READY TO PROGRESS",
            message: `${topReady.name} hit top of rep range. Increase load by +${topReady.delta} kg (Target: ${topReady.target} kg).`,
            badge: "OVERLOAD READY",
            color: "#00C853",
        });
    }

    // 3. Check for stalling lifts (3+ sessions flat)
    const stalledLifts = [];
    Object.keys(indexedCache).forEach(exName => {
        const stall = getExerciseStallStatus(exName, history, latestBodyweight, indexedCache);
        if (stall.status === "STALLING") {
            stalledLifts.push(exName);
        }
    });

    if (stalledLifts.length > 0) {
        alerts.push({
            id: "stall_alert",
            priority: 3,
            type: "warning",
            icon: "alert-circle-outline",
            title: "PLATEAU OBSERVED",
            message: `${stalledLifts[0]} performance has remained unchanged across 3 consecutive sessions.`,
            badge: "STALL DETECTED",
            color: "#FF5E3A",
        });
    }

    // 4. Deload / Training Stress Alert
    const deload = getDeloadRecommendation(history, readinessHistory, latestBodyweight);
    if (deload.status === "REVIEW_TRAINING_LOAD") {
        alerts.push({
            id: "deload_review",
            priority: 4,
            type: "alert",
            icon: "pulse",
            title: "WORKLOAD ELEVATED",
            message: deload.reason,
            badge: "REVIEW LOAD",
            color: "#FF5E3A",
        });
    }

    // Sort by priority ascending and cap to top 2-3 alerts
    alerts.sort((a, b) => a.priority - b.priority);
    return alerts.slice(0, 3);
};

// ────────────────────────────────────────────────────────────────
// 18. ATHLETE PROGRESSION PROFILE
// ────────────────────────────────────────────────────────────────

/**
 * Computes an athlete's macro progression profile: fastest lifts, consistency matrix, strong muscle groups.
 */
export const getAthleteProgressionProfile = (history = [], prRecords = {}, latestBodyweight = null) => {
    if (!Array.isArray(history) || history.length < 2) {
        return {
            hasSufficientData: false,
            fastestProgressing: [],
            stalledLifts: [],
            consistentWeekdays: [],
            totalLoggedSessions: history.length,
        };
    }

    const indexedCache = getPreIndexedExerciseSessions(history, latestBodyweight);
    const progressionRates = [];
    const stalledLifts = [];

    Object.keys(indexedCache).forEach(exName => {
        const sessions = indexedCache[exName];
        if (sessions.length >= 2) {
            const first = sessions[0];
            const latest = sessions[sessions.length - 1];
            if (latest.maxWeight > 0 && first.maxWeight > 0) {
                const diff = latest.maxWeight - first.maxWeight;
                const pct = ((diff / first.maxWeight) * 100);
                if (diff > 0) {
                    progressionRates.push({
                        name: sessions[0].exerciseName,
                        weightDelta: parseFloat(diff.toFixed(1)),
                        percentGain: parseFloat(pct.toFixed(1)),
                        category: latest.category,
                    });
                }
            }
        }

        const stall = getExerciseStallStatus(exName, history, latestBodyweight, indexedCache);
        if (stall.status === "STALLING") {
            stalledLifts.push({
                name: sessions[0].exerciseName,
                weight: stall.currentBestWeight,
                reps: stall.currentBestReps,
            });
        }
    });

    progressionRates.sort((a, b) => b.percentGain - a.percentGain);

    // Weekday Consistency Matrix
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    history.forEach(w => {
        const dStr = w.date || (w.completedAt ? w.completedAt.split("T")[0] : null);
        if (dStr) {
            const dayNum = new Date(dStr + "T00:00:00").getDay();
            dayCounts[dayNum] = (dayCounts[dayNum] || 0) + 1;
        }
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const consistentWeekdays = Object.entries(dayCounts)
        .map(([dayNum, count]) => ({ day: dayNames[dayNum], count }))
        .sort((a, b) => b.count - a.count)
        .filter(d => d.count > 0);

    return {
        hasSufficientData: true,
        fastestProgressing: progressionRates.slice(0, 3),
        stalledLifts: stalledLifts.slice(0, 3),
        consistentWeekdays: consistentWeekdays.slice(0, 3),
        totalLoggedSessions: history.length,
    };
};

// ────────────────────────────────────────────────────────────────
// 19. IN-SESSION SET MICRO-FEEDBACK EVALUATOR
// ────────────────────────────────────────────────────────────────

/**
 * Returns instantaneous, non-intrusive set feedback strings after a set is logged.
 */
export const evaluateCompletedSetFeedback = (currentSet, targetSet = null, previousSessionSet = null) => {
    if (!currentSet || !currentSet.completed || currentSet.skipped) {
        return null;
    }

    const w = parseFloat(currentSet.weightKg) || 0;
    const r = parseInt(currentSet.reps, 10) || 0;

    // Check against target
    if (targetSet) {
        const targetW = parseFloat(targetSet.weightKg) || 0;
        const targetR = parseInt(targetSet.reps, 10) || 0;
        if (targetW > 0 && w >= targetW && r >= targetR) {
            return `🎯 Target achieved: ${w} kg × ${r}`;
        }
    }

    // Check against previous session matching set
    if (previousSessionSet) {
        const prevW = parseFloat(previousSessionSet.weightKg) || 0;
        const prevR = parseInt(previousSessionSet.reps, 10) || 0;

        if (prevW > 0 && w > prevW) {
            return `🔥 +${(w - prevW).toFixed(1)} kg over previous session!`;
        }
        if (w === prevW && r > prevR) {
            return `⚡ +${r - prevR} rep${r - prevR > 1 ? "s" : ""} over previous session!`;
        }
        if (w === prevW && r === prevR && r > 0) {
            return `✓ Matched previous session (${w} kg × ${r})`;
        }
    }

    return `✓ Set ${currentSet.set || 1} logged (${w > 0 ? `${w} kg × ` : ""}${r} reps)`;
};

// ────────────────────────────────────────────────────────────────
// 20. PHASE 4: ADAPTIVE PROGRAM PERFORMANCE SUMMARY
// ────────────────────────────────────────────────────────────────

/**
 * Calculates comprehensive 28-day program performance summary.
 * Returns structured metrics: planned vs completed sessions, adherence %, set completion ratio,
 * load-type aware progression ratio, stalls count, and weekly frequency.
 */
export const getProgramPerformanceSummary = (
    program = null,
    history = [],
    bodyStats = [],
    readinessHistory = [],
    latestBodyweight = null
) => {
    const programDays = (program && Array.isArray(program.days) && program.days.length > 0)
        ? program.days
        : WORKOUT_PLAN;

    const plannedWeeklyFrequency = programDays.length;
    const totalPlannedSessions28d = plannedWeeklyFrequency * 4;

    const now = new Date();
    const cutoff28d = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const recentHistory = (Array.isArray(history) ? history : []).filter((h) => {
        if (!h) return false;
        const d = new Date(h.date || h.completedAt);
        return !isNaN(d.getTime()) && d >= cutoff28d;
    });

    const completedSessionsCount = recentHistory.length;
    const adherencePct = totalPlannedSessions28d > 0
        ? Math.min(100, Math.round((completedSessionsCount / totalPlannedSessions28d) * 100))
        : 100;

    let plannedSetsInLogged = 0;
    let completedWorkingSets = 0;
    let plannedExercisesCount = 0;
    let completedExercisesCount = 0;

    recentHistory.forEach((h) => {
        const matchedDay = programDays.find(d => d.day === h.day) || programDays[0];
        if (matchedDay && Array.isArray(matchedDay.exercises)) {
            plannedExercisesCount += matchedDay.exercises.length;
            matchedDay.exercises.forEach((ex) => {
                plannedSetsInLogged += (parseInt(ex.sets, 10) || 3);
            });
        }

        if (Array.isArray(h.exercises)) {
            completedExercisesCount += h.exercises.length;
            h.exercises.forEach((ex) => {
                const sets = ex.loggedSets || ex.logs || [];
                sets.forEach((s) => {
                    if (s && s.completed && !s.skipped) {
                        completedWorkingSets++;
                    }
                });
            });
        }
    });

    const setCompletionRatio = plannedSetsInLogged > 0
        ? Math.min(100, Math.round((completedWorkingSets / plannedSetsInLogged) * 100))
        : (completedWorkingSets > 0 ? 100 : 0);

    const weeklyTrainingFrequency = parseFloat((completedSessionsCount / 4).toFixed(1));

    // Load-Type Aware Progression Ratio across all movements with >= 2 sessions
    const indexedCache = getPreIndexedExerciseSessions(history, latestBodyweight);
    let qualifiedMovementsCount = 0;
    let progressingMovementsCount = 0;
    let stalledMovementsCount = 0;

    Object.keys(indexedCache).forEach((exKey) => {
        const sessions = indexedCache[exKey];
        if (!Array.isArray(sessions) || sessions.length < 2) return;

        qualifiedMovementsCount++;
        const sPrev = sessions[sessions.length - 2];
        const sCurr = sessions[sessions.length - 1];
        const category = sCurr.category || "free_weight";

        let hasProgressed = false;

        if (category === "free_weight" || category === "machine") {
            const wInc = sCurr.maxWeight > sPrev.maxWeight;
            const rInc = (sCurr.maxWeight === sPrev.maxWeight) && (sCurr.maxReps > sPrev.maxReps);
            const e1rmInc = (sCurr.bestEstimated1RM !== null && sPrev.bestEstimated1RM !== null && sCurr.bestEstimated1RM > sPrev.bestEstimated1RM);
            hasProgressed = wInc || rInc || e1rmInc;
        } else if (category === "weighted_bodyweight") {
            const wInc = sCurr.maxWeight > sPrev.maxWeight;
            const rInc = (sCurr.maxWeight === sPrev.maxWeight) && (sCurr.maxReps > sPrev.maxReps);
            hasProgressed = wInc || rInc;
        } else if (category === "bodyweight") {
            hasProgressed = sCurr.maxReps > sPrev.maxReps;
        } else if (category === "assisted_bodyweight") {
            hasProgressed = (sCurr.maxWeight < sPrev.maxWeight) && (sCurr.maxReps >= sPrev.maxReps);
        } else if (category === "timed") {
            hasProgressed = (sCurr.maxDurationSec || 0) > (sPrev.maxDurationSec || 0);
        }

        if (hasProgressed) {
            progressingMovementsCount++;
        }

        // Check stall status
        const stallInfo = getExerciseStallStatus(sCurr.exerciseName || exKey, history, latestBodyweight, indexedCache);
        if (stallInfo.status === "STALLING") {
            stalledMovementsCount++;
        }
    });

    const progressionRatio = qualifiedMovementsCount > 0
        ? Math.round((progressingMovementsCount / qualifiedMovementsCount) * 100)
        : 100;

    // Training load & readiness integration (reusing exact Phase 3 functions)
    const trainingLoad = getTrainingLoadTrend(history, latestBodyweight);
    const deloadAdvisory = getDeloadRecommendation(history, readinessHistory, latestBodyweight);

    // Readiness 7-day rolling mean
    const recentReadiness = (readinessHistory || []).slice(0, 7);
    const validReadinessScores = recentReadiness.map(r => r.score).filter(s => typeof s === "number" && !isNaN(s));
    const averageReadiness7d = validReadinessScores.length > 0
        ? Math.round(validReadinessScores.reduce((a, b) => a + b, 0) / validReadinessScores.length)
        : null;

    return {
        programId: program?.id || "v1.0.0",
        programVersion: program?.version || "1.0.0",
        programName: program?.name || "Vivaswan Elite",
        plannedWeeklyFrequency,
        totalPlannedSessions28d,
        completedSessions28d: completedSessionsCount,
        adherencePercentage: adherencePct,
        plannedSetsInLoggedSessions: plannedSetsInLogged,
        completedWorkingSets,
        setCompletionRatio,
        plannedExercisesCount,
        completedExercisesCount,
        weeklyTrainingFrequency,
        qualifiedMovementsCount,
        progressingMovementsCount,
        progressionRatio,
        stalledMovementsCount,
        trainingLoad,
        deloadAdvisory,
        averageReadiness7d,
    };
};

// ────────────────────────────────────────────────────────────────
// 21. PHASE 4: DYNAMIC WEEKLY TRAINING DISTRIBUTION
// ────────────────────────────────────────────────────────────────

/**
 * Analyzes weekly training distribution by comparing actual execution against
 * the active program definition dynamically without hardcoded assumptions.
 */
export const getWeeklyTrainingDistribution = (
    program = null,
    history = [],
    targetWeekOffset = 0,
    latestBodyweight = null
) => {
    const programDays = (program && Array.isArray(program.days) && program.days.length > 0)
        ? program.days
        : WORKOUT_PLAN;

    // Dynamically calculate expected weekly frequency per muscle group from active program
    const expectedMuscleFrequency = {};
    STANDARDIZED_MUSCLE_GROUPS.forEach((group) => {
        expectedMuscleFrequency[group] = 0;
    });

    programDays.forEach((day) => {
        const groupsInDay = new Set();
        (day.exercises || []).forEach((ex) => {
            const mg = ex.muscleGroup || getExerciseMuscleGroup(ex.name);
            if (mg && expectedMuscleFrequency[mg] !== undefined) {
                groupsInDay.add(mg);
            }
        });
        groupsInDay.forEach(g => {
            expectedMuscleFrequency[g] += 1;
        });
    });

    // Actual volume and working sets in target week
    const muscleVolume = getWeeklyMuscleVolume(history, targetWeekOffset, latestBodyweight);

    // Compute actual distinct day frequency per muscle group in target week
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - currentDay - (targetWeekOffset * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const actualMuscleFrequency = {};
    STANDARDIZED_MUSCLE_GROUPS.forEach((group) => {
        actualMuscleFrequency[group] = 0;
    });

    const weekWorkouts = (Array.isArray(history) ? history : []).filter((h) => {
        if (!h) return false;
        const d = new Date(h.date || h.completedAt);
        return !isNaN(d.getTime()) && d >= weekStart && d < weekEnd;
    });

    const workoutDates = [];

    weekWorkouts.forEach((w) => {
        const dStr = w.date || (w.completedAt ? String(w.completedAt).split("T")[0] : null);
        if (dStr && !workoutDates.includes(dStr)) {
            workoutDates.push(dStr);
        }

        const groupsInWorkout = new Set();
        (w.exercises || []).forEach((ex) => {
            const rawName = ex.name || ex.exerciseName || "";
            const mg = getExerciseMuscleGroup(rawName);
            if (mg && actualMuscleFrequency[mg] !== undefined) {
                groupsInWorkout.add(mg);
            }
        });
        groupsInWorkout.forEach(g => {
            actualMuscleFrequency[g] += 1;
        });
    });

    // Consecutive training days check
    workoutDates.sort();
    let maxConsecutive = 0;
    let currentStreak = 0;

    for (let i = 0; i < workoutDates.length; i++) {
        if (i === 0) {
            currentStreak = 1;
            maxConsecutive = 1;
        } else {
            const prev = new Date(workoutDates[i - 1]);
            const curr = new Date(workoutDates[i]);
            const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
            if (diff === 1) {
                currentStreak++;
                if (currentStreak > maxConsecutive) maxConsecutive = currentStreak;
            } else if (diff > 1) {
                currentStreak = 1;
            }
        }
    }

    const distributionItems = STANDARDIZED_MUSCLE_GROUPS.map((group) => {
        const vol = muscleVolume[group] || { workingSets: 0, totalReps: 0, freeWeightVolumeLoad: 0 };
        const expectedFreq = expectedMuscleFrequency[group] || 0;
        const actualFreq = actualMuscleFrequency[group] || 0;

        return {
            muscleGroup: group,
            expectedFrequency: expectedFreq,
            actualFrequency: actualFreq,
            workingSets: vol.workingSets,
            totalReps: vol.totalReps,
            volumeLoadKg: vol.freeWeightVolumeLoad,
            status: actualFreq >= expectedFreq ? "MET" : (actualFreq === 0 && expectedFreq > 0 ? "UNSTIMULATED" : "PARTIAL"),
        };
    });

    const isBalanced = distributionItems.every(d => d.actualFrequency >= d.expectedFrequency || d.expectedFrequency === 0);

    return {
        targetWeekOffset,
        totalSessionsCompleted: weekWorkouts.length,
        maxConsecutiveTrainingDays: maxConsecutive,
        consecutiveTrainingDays: maxConsecutive,
        consecutiveTrainingAlert: maxConsecutive >= 5,
        isBalanced,
        distribution: distributionItems,
        muscleGroups: distributionItems.map(d => ({
            muscle: d.muscleGroup,
            muscleGroup: d.muscleGroup,
            expectedFreq: d.expectedFrequency,
            expectedFrequency: d.expectedFrequency,
            actualFreq: d.actualFrequency,
            actualFrequency: d.actualFrequency,
            workingSets: d.workingSets,
            totalReps: d.totalReps,
            volumeLoadKg: d.volumeLoadKg,
            status: d.status,
        })),
    };
};

// ────────────────────────────────────────────────────────────────
// 22. PHASE 4: CONSERVATIVE VOLUME ADAPTATION ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Evaluates volume adjustments for a muscle group.
 * Strictly enforces conservative bounds: maximum ±1 working set per movement.
 */
export const getVolumeRecommendation = (
    muscleGroup,
    program = null,
    history = [],
    readinessHistory = [],
    latestBodyweight = null
) => {
    if (!muscleGroup) {
        return {
            muscleGroup: "",
            action: "MAINTAIN",
            suggestedSetDelta: 0,
            statusBadge: "MAINTAIN",
            badgeColor: "#30B0C7",
            reason: "No muscle group specified.",
        };
    }

    const loadTrend = getTrainingLoadTrend(history, latestBodyweight);
    const indexedCache = getPreIndexedExerciseSessions(history, latestBodyweight);

    // Stalls in this muscle group
    let stalledInGroup = 0;
    let groupExercisesCount = 0;
    let groupProgressingCount = 0;

    Object.keys(indexedCache).forEach((k) => {
        const sessions = indexedCache[k];
        if (!sessions || sessions.length === 0) return;
        const last = sessions[sessions.length - 1];
        if (last.muscleGroup === muscleGroup) {
            groupExercisesCount++;
            const stall = getExerciseStallStatus(last.exerciseName || k, history, latestBodyweight, indexedCache);
            if (stall.status === "STALLING") {
                stalledInGroup++;
            } else if (stall.status === "PROGRESSING") {
                groupProgressingCount++;
            }
        }
    });

    // Recent readiness check
    const recentReadiness = (readinessHistory || []).slice(0, 3);
    const lowReadinessCount = recentReadiness.filter(r => (r.score || 0) < 45).length;

    // Rule 1: High stress / multi-stall -> REDUCE_SLIGHTLY (-1 set)
    if (stalledInGroup >= 3 || loadTrend.workloadRatio > 1.40 || lowReadinessCount >= 2) {
        return {
            muscleGroup,
            action: "REDUCE_SLIGHTLY",
            suggestedSetDelta: -1,
            statusBadge: "REDUCE 1 SET",
            badgeColor: "#FF5E3A",
            reason: `Elevated training load (${Math.round((loadTrend.workloadRatio - 1) * 100)}% above baseline) or ${stalledInGroup} stalled movements observed. Propose reducing 1 accessory set to aid recovery.`,
        };
    }

    // Rule 2: Sustained multi-week progress + high readiness -> INCREASE_SLIGHTLY (+1 set)
    const progSummary = getProgramPerformanceSummary(program, history, [], readinessHistory, latestBodyweight);
    const isMultiWeekProgress = loadTrend.weeksOfHistoryCount >= 3 && progSummary.progressionRatio >= 75;
    const isHighReadiness = (progSummary.averageReadiness7d || 70) >= 75;

    if (isMultiWeekProgress && isHighReadiness && stalledInGroup === 0 && loadTrend.workloadRatio <= 1.20) {
        return {
            muscleGroup,
            action: "INCREASE_SLIGHTLY",
            suggestedSetDelta: 1,
            statusBadge: "ADD 1 SET",
            badgeColor: "#00C853",
            reason: `Consistent progression (${progSummary.progressionRatio}%) and high recovery capacity observed. Propose adding +1 working set to primary movement.`,
        };
    }

    // Rule 3: Single isolated stall -> REVIEW
    if (stalledInGroup === 1 && groupProgressingCount >= 1) {
        return {
            muscleGroup,
            action: "REVIEW",
            suggestedSetDelta: 0,
            statusBadge: "REVIEW MOVEMENT",
            badgeColor: "#FF9500",
            reason: "Isolated exercise stagnation detected while parent muscle group progresses sustainably.",
        };
    }

    // Default: MAINTAIN
    return {
        muscleGroup,
        action: "MAINTAIN",
        suggestedSetDelta: 0,
        statusBadge: "OPTIMAL VOLUME",
        badgeColor: "#30B0C7",
        reason: "Current working set volume is producing stable adaptation.",
    };
};

// ────────────────────────────────────────────────────────────────
// 23. PHASE 4: EXERCISE REVIEW STATUS & ROTATION ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Evaluates whether an exercise should be flagged for athlete review.
 * Strictly non-destructive: Never automatically replaces exercises.
 */
export const getExerciseReviewStatus = (
    exerciseName,
    program = null,
    history = [],
    latestBodyweight = null,
    indexedCache = null
) => {
    if (!exerciseName) {
        return {
            exerciseName: "",
            status: "INSUFFICIENT_DATA",
            label: "No Exercise",
            color: "#8E8E93",
            sessionsCount: 0,
            alternatives: [],
            description: "No exercise specified.",
        };
    }

    const exKey = exerciseName.toLowerCase().trim();
    let sessions = [];
    if (indexedCache && indexedCache[exKey]) {
        sessions = indexedCache[exKey];
    } else {
        sessions = getExerciseHistory(exerciseName, history, latestBodyweight);
    }

    if (sessions.length < 3) {
        return {
            exerciseName,
            status: "INSUFFICIENT_DATA",
            label: "Building Baseline",
            color: "#8E8E93",
            sessionsCount: sessions.length,
            alternatives: [],
            description: `Requires at least 3 completed sessions to evaluate movement adaptation (currently logged: ${sessions.length}).`,
        };
    }

    const exMeta = getExerciseMetadata(exerciseName);
    const muscleGroup = exMeta ? exMeta.muscleGroup : getExerciseMuscleGroup(exerciseName);
    const category = exMeta ? exMeta.category : getExerciseLoadCategory(exerciseName);

    // Count stagnant sessions from recent end
    let stagnantCount = 1;
    for (let i = sessions.length - 1; i > 0; i--) {
        const curr = sessions[i];
        const prev = sessions[i - 1];
        const sameWeight = curr.maxWeight === prev.maxWeight;
        const sameOrLowerReps = curr.maxReps <= prev.maxReps;
        if (sameWeight && sameOrLowerReps) {
            stagnantCount++;
        } else {
            break;
        }
    }

    // Find alternative suggestions from EXERCISE_CATALOG
    const alternatives = [];
    if (EXERCISE_CATALOG && typeof EXERCISE_CATALOG.forEach === "function") {
        EXERCISE_CATALOG.forEach((item, key) => {
            if (key !== exKey && item.muscleGroup === muscleGroup && item.category === category) {
                if (alternatives.length < 3) {
                    alternatives.push({
                        name: item.name,
                        equipment: item.equipment,
                        primaryTarget: item.primaryTarget,
                        tag: item.tag,
                    });
                }
            }
        });
    }

    if (stagnantCount >= 4) {
        return {
            exerciseName,
            status: "REVIEW_EXERCISE",
            label: "Review Movement",
            color: "#FF5E3A",
            sessionsCount: sessions.length,
            stagnantSessionsCount: stagnantCount,
            alternatives,
            description: `Performance has remained stagnant across ${stagnantCount} consecutive sessions. Consider reviewing movement mechanics, rest intervals, or exploring alternative exercises.`,
        };
    }

    if (stagnantCount === 3) {
        return {
            exerciseName,
            status: "STALLING",
            label: "Plateau Detected",
            color: "#FF9500",
            sessionsCount: sessions.length,
            stagnantSessionsCount: stagnantCount,
            alternatives,
            description: `Performance flat across 3 consecutive sessions. Maintain strict form and attempt to add +1 rep.`,
        };
    }

    const stallInfo = getExerciseStallStatus(exerciseName, history, latestBodyweight, indexedCache);
    if (stallInfo.status === "PROGRESSING") {
        return {
            exerciseName,
            status: "PERFORMING_WELL",
            label: "Progressing",
            color: "#00C853",
            sessionsCount: sessions.length,
            stagnantSessionsCount: 0,
            alternatives: [],
            description: stallInfo.description,
        };
    }

    return {
        exerciseName,
        status: "STABLE",
        label: "Stable",
        color: "#30B0C7",
        sessionsCount: sessions.length,
        stagnantSessionsCount: stagnantCount,
        alternatives: [],
        description: `Consistent performance within target rep range.`,
    };
};

// ────────────────────────────────────────────────────────────────
// 24. PHASE 4: WEEKLY PROGRAM RECOMMENDATION ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Reuses exact Phase 3 ACWR classification and deload recommendation to generate
 * macro program-level status and action proposals.
 */
export const getWeeklyProgramRecommendation = (
    program = null,
    history = [],
    readinessHistory = [],
    bodyStats = [],
    latestBodyweight = null
) => {
    const summary = getProgramPerformanceSummary(program, history, bodyStats, readinessHistory, latestBodyweight);
    const deloadRec = getDeloadRecommendation(history, readinessHistory, latestBodyweight);
    const loadTrend = getTrainingLoadTrend(history, latestBodyweight);

    // Insufficient history
    if (loadTrend.weeksOfHistoryCount < 2) {
        return {
            status: "INSUFFICIENT_DATA",
            label: "Building Baseline",
            color: "#8E8E93",
            confidenceScore: 50,
            actionType: "NONE",
            observation: "Gathering multi-week training logs to establish baseline adaptation patterns.",
            recommendation: "Continue with your scheduled program to build performance history.",
            affectedDays: [],
            affectedMuscleGroups: [],
        };
    }

    // High training stress -> Deload proposal
    if (deloadRec.status === "REVIEW_TRAINING_LOAD" || loadTrend.workloadRatio > 1.40) {
        return {
            status: "REDUCE_TRAINING_STRESS",
            label: "Deload Recommended",
            color: "#FF5E3A",
            confidenceScore: 90,
            actionType: "PROPOSE_DELOAD",
            observation: `Cumulative workload is ${Math.round((loadTrend.workloadRatio - 1) * 100)}% above chronic baseline alongside recovery fatigue signals.`,
            recommendation: "Propose a structured 7-day deload week (-40% working sets, 85–90% load) to restore adaptive capacity.",
            affectedDays: [1, 2, 3, 4, 5, 6],
            affectedMuscleGroups: STANDARDIZED_MUSCLE_GROUPS,
        };
    }

    // Systemic stalling across multiple muscle groups or poor adherence
    if (summary.stalledMovementsCount >= 3 || summary.adherencePercentage < 50) {
        return {
            status: "REVIEW_PROGRAM",
            label: "Review Program Structure",
            color: "#FF9500",
            confidenceScore: 80,
            actionType: "REVIEW_STRUCTURE",
            observation: `${summary.stalledMovementsCount} movements are currently stalled, and 28-day adherence is ${summary.adherencePercentage}%.`,
            recommendation: "Review training frequency or exercise selection to improve consistency and break plateaus.",
            affectedDays: [],
            affectedMuscleGroups: [],
        };
    }

    // Minor adjustment available
    if (summary.stalledMovementsCount > 0 || deloadRec.status === "ELEVATED_LOAD") {
        return {
            status: "MINOR_ADJUSTMENT",
            label: "Minor Optimization Available",
            color: "#30B0C7",
            confidenceScore: 85,
            actionType: "ADJUST_VOLUME",
            observation: `${summary.stalledMovementsCount} isolated exercise plateau detected within an otherwise progressing program.`,
            recommendation: "Consider reviewing stalled exercise mechanics or adjusting accessory set volume.",
            affectedDays: [],
            affectedMuscleGroups: [],
        };
    }

    // Nominal
    return {
        status: "CURRENT_PROGRAM",
        label: "Program on Track",
        color: "#00C853",
        confidenceScore: 95,
        actionType: "NONE",
        observation: `Adherence is ${summary.adherencePercentage}% and progression ratio is ${summary.progressionRatio}%.`,
        recommendation: "Current program parameters are producing optimal progressive overload.",
        affectedDays: [],
        affectedMuscleGroups: [],
    };
};

// ────────────────────────────────────────────────────────────────
// 25. PHASE 4: MISSED WORKOUT ADVISORY ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Determines non-destructive recommendations when a scheduled workout is missed.
 * Never automatically stacks or doubles volume.
 */
export const getMissedWorkoutAdvisory = (
    program = null,
    history = [],
    todayDate = null,
    readinessHistory = []
) => {
    const programDays = (program && Array.isArray(program.days) && program.days.length > 0)
        ? program.days
        : WORKOUT_PLAN;

    const now = todayDate ? new Date(todayDate) : new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const todayDayNum = dayOfWeek === 0 ? 7 : dayOfWeek;

    // Week start on Monday
    const currentDay = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDay);
    monday.setHours(0, 0, 0, 0);

    const weekWorkouts = (Array.isArray(history) ? history : []).filter((h) => {
        if (!h) return false;
        const d = new Date(h.date || h.completedAt);
        return !isNaN(d.getTime()) && d >= monday && d <= now;
    });

    const loggedDayNums = new Set();
    weekWorkouts.forEach(w => {
        if (w.day) loggedDayNums.add(w.day);
    });

    // Check if any programmed days prior to today were missed
    const missedDays = [];
    for (let d = 1; d < todayDayNum && d <= 6; d++) {
        if (!loggedDayNums.has(d)) {
            const matched = programDays.find(p => p.day === d);
            if (matched) {
                missedDays.push(matched);
            }
        }
    }

    if (missedDays.length === 0 || todayDayNum === 1) {
        return {
            hasMissedWorkout: false,
            missedDay: null,
            missedTarget: null,
            scheduledTodayDay: todayDayNum <= 6 ? todayDayNum : null,
            scheduledTodayTarget: todayDayNum <= 6 ? programDays.find(p => p.day === todayDayNum)?.target : "Active Recovery",
            options: [],
        };
    }

    const firstMissed = missedDays[0];
    const todayPlan = programDays.find(p => p.day === todayDayNum) || programDays[0];

    return {
        hasMissedWorkout: true,
        missedDay: firstMissed.day,
        missedTarget: firstMissed.target,
        scheduledTodayDay: todayDayNum <= 6 ? todayDayNum : null,
        scheduledTodayTarget: todayPlan.target,
        options: [
            {
                id: "RESUME_NEXT",
                title: `Resume Day 0${todayDayNum}: ${todayPlan.target} (Recommended)`,
                badge: "RECOMMENDED",
                badgeColor: "#00C853",
                targetDay: todayDayNum,
                action: "RESUME_SCHEDULED",
                reason: "Preserves your weekly split rhythm and ensures balanced muscle recovery intervals.",
            },
            {
                id: "MAKEUP_MISSED",
                title: `Make Up Day 0${firstMissed.day}: ${firstMissed.target} Today`,
                badge: "MAKEUP",
                badgeColor: "#FF9500",
                targetDay: firstMissed.day,
                action: "MAKEUP_SESSION",
                reason: `Executes missed ${firstMissed.target} today and shifts remaining workouts forward within the week.`,
            },
            {
                id: "SKIP_AND_ADVANCE",
                title: `Skip Missed Day 0${firstMissed.day} & Continue`,
                badge: "SKIP",
                badgeColor: "#8E8E93",
                targetDay: todayDayNum,
                action: "SKIP_AND_ADVANCE",
                reason: `Marks Day 0${firstMissed.day} as rest day and advances directly to today's schedule.`,
            },
        ],
    };
};

// ────────────────────────────────────────────────────────────────
// 26. PHASE 4: PROPOSED DELOAD PLAN PROTOCOL
// ────────────────────────────────────────────────────────────────

/**
 * Generates a structured 7-day Deload Program snapshot.
 * Captures sourceVersionId from current active program to enable automatic restoration upon completion.
 */
export const getProposedDeloadPlan = (
    program = null,
    history = [],
    latestBodyweight = null
) => {
    const baseProgram = (program && Array.isArray(program.days) && program.days.length > 0)
        ? program
        : { id: "v1.0.0", version: "1.0.0", name: "Vivaswan Elite (6-Day Split)", days: WORKOUT_PLAN };

    const deloadDays = JSON.parse(JSON.stringify(baseProgram.days));
    const changes = [];

    deloadDays.forEach((day) => {
        if (Array.isArray(day.exercises)) {
            day.exercises.forEach((ex) => {
                const origSets = parseInt(ex.sets, 10) || 3;
                const deloadSets = Math.max(2, Math.round(origSets * 0.6));
                changes.push({
                    type: "VOLUME_ADJUSTMENT",
                    day: day.day,
                    exerciseName: ex.name,
                    previousSets: origSets,
                    newSets: deloadSets,
                    reason: "Deload protocol: -40% working sets, 85–90% working load",
                });
                ex.sets = deloadSets;
                ex.tips = [
                    "Deload week: Focus on technical precision and speed.",
                    "Use ~85-90% of your typical working weight.",
                    "Stop 2-3 reps short of failure (RPE 7-8).",
                    ...(ex.tips || []),
                ];
            });
        }
    });

    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

    return {
        id: `prog_deload_${now}`,
        version: "Deload Protocol",
        name: `${baseProgram.name || "Vivaswan Elite"} (Deload Week)`,
        basePlanId: baseProgram.basePlanId || "vivaswan_elite_6day_v1",
        sourceVersionId: baseProgram.id || "v1.0.0",
        createdAt: new Date(now).toISOString(),
        changeType: "DELOAD_WEEK",
        changes,
        days: deloadDays,
        active: true,
        isTemporaryDeload: true,
        expiresAt,
    };
};

// ────────────────────────────────────────────────────────────────
// 27. PHASE 4: LONG-TERM ATHLETE PROFILE
// ────────────────────────────────────────────────────────────────

/**
 * Builds a multi-dimensional athlete profile strictly from logged performance and body stats.
 * Does not make pseudo-scientific claims (genetics, somatotype, hormonal inference).
 */
export const getAthleteLongTermProfile = (
    programOrHistory = null,
    historyOrPr = [],
    bodyStatsOrBw = [],
    readinessHistory = [],
    prRecords = {},
    latestBodyweight = null
) => {
    let program = programOrHistory;
    let history = historyOrPr;
    let bodyStats = bodyStatsOrBw;
    let readiness = readinessHistory;
    let prs = prRecords;
    let bodyweight = latestBodyweight;

    if (Array.isArray(programOrHistory)) {
        history = programOrHistory;
        program = null;
        prs = (historyOrPr && typeof historyOrPr === "object" && !Array.isArray(historyOrPr)) ? historyOrPr : {};
        bodyweight = (typeof bodyStatsOrBw === "number") ? bodyStatsOrBw : null;
        bodyStats = Array.isArray(bodyStatsOrBw) ? bodyStatsOrBw : [];
        readiness = Array.isArray(readinessHistory) ? readinessHistory : [];
    }

    const totalWorkouts = Array.isArray(history) ? history.length : 0;

    let trainingTenureDays = 0;
    let lifetimeTonnageKg = 0;
    let totalWorkingSets = 0;

    if (totalWorkouts > 0) {
        const sorted = [...history].sort((a, b) => new Date(a.date || a.completedAt) - new Date(b.date || b.completedAt));
        const oldest = new Date(sorted[0].date || sorted[0].completedAt);
        const newest = new Date(sorted[sorted.length - 1].date || sorted[sorted.length - 1].completedAt);
        trainingTenureDays = Math.max(1, Math.round((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        history.forEach((h) => {
            (h.exercises || []).forEach((ex) => {
                const sets = ex.loggedSets || ex.logs || [];
                sets.forEach((s) => {
                    if (s && s.completed && !s.skipped) {
                        totalWorkingSets += 1;
                        const w = parseFloat(s.weightKg) || 0;
                        const r = parseInt(s.reps, 10) || 0;
                        if (w > 0 && r > 0) {
                            lifetimeTonnageKg += w * r;
                        }
                    }
                });
            });
        });
    }

    const macroProfile = getAthleteProgressionProfile(history, prs, bodyweight);
    const progSummary = getProgramPerformanceSummary(program, history, bodyStats, readiness, bodyweight);

    const weeksCount = Math.max(1, Math.ceil(trainingTenureDays / 7));
    const meanWeeklySets = Math.round(totalWorkingSets / weeksCount);
    const meanWeeklyWorkouts = progSummary.weeklyTrainingFrequency || (Math.round((totalWorkouts / weeksCount) * 10) / 10);

    const volumeResponseTier = meanWeeklySets >= 20 ? "HIGH RESPONSE" : (meanWeeklySets >= 8 ? "OPTIMAL" : "MODERATE");
    const consistencyTier = (meanWeeklyWorkouts >= 4 || totalWorkouts >= 15) ? "HIGH" : (meanWeeklyWorkouts >= 2.5 ? "CONSISTENT" : "BUILDING");

    const progressionRatePercent = progSummary.progressionRatio != null
        ? progSummary.progressionRatio
        : (macroProfile.fastestProgressing && macroProfile.fastestProgressing.length > 0
            ? Math.round(macroProfile.fastestProgressing.reduce((acc, curr) => acc + curr.percentGain, 0) / macroProfile.fastestProgressing.length)
            : 12);

    // Progression rates across load taxonomies
    const indexedCache = getPreIndexedExerciseSessions(history, bodyweight);
    const loadTypeMap = {};

    Object.keys(indexedCache).forEach((exName) => {
        const sessions = indexedCache[exName];
        if (sessions && sessions.length >= 2) {
            const first = sessions[0];
            const latest = sessions[sessions.length - 1];
            const loadType = latest.resolvedCategory || latest.category || getExerciseLoadCategory(exName) || "free_weight";
            if (!loadTypeMap[loadType]) {
                loadTypeMap[loadType] = { total: 0, progressed: 0, gainSum: 0 };
            }
            loadTypeMap[loadType].total += 1;
            const diff = (latest.maxWeight - first.maxWeight) || (latest.maxReps - first.maxReps);
            if (diff > 0) {
                loadTypeMap[loadType].progressed += 1;
                const base = first.maxWeight > 0 ? first.maxWeight : (first.maxReps > 0 ? first.maxReps : 1);
                loadTypeMap[loadType].gainSum += (diff / base) * 100;
            }
        }
    });

    const loadTypeProgressionRates = {};
    Object.keys(loadTypeMap).forEach((type) => {
        const item = loadTypeMap[type];
        const avgGain = item.progressed > 0 ? Math.round(item.gainSum / item.progressed) : 0;
        loadTypeProgressionRates[type] = {
            rate: avgGain,
            count: item.total,
        };
    });

    if (Object.keys(loadTypeProgressionRates).length === 0) {
        loadTypeProgressionRates["free_weight"] = { rate: 0, count: 0 };
        loadTypeProgressionRates["machine"] = { rate: 0, count: 0 };
        loadTypeProgressionRates["bodyweight"] = { rate: 0, count: 0 };
    }

    // Bodyweight 30-day delta
    let bodyweightTrajectory = 0;
    if (Array.isArray(bodyStats) && bodyStats.length >= 2) {
        const sortedStats = [...bodyStats].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latestStat = sortedStats[sortedStats.length - 1].weightKg;
        const oldestStat = sortedStats[0].weightKg;
        if (latestStat && oldestStat) {
            bodyweightTrajectory = parseFloat((latestStat - oldestStat).toFixed(1));
        }
    }

    // Readiness compliance
    const readinessLogsCount = Array.isArray(readiness) ? readiness.length : 0;
    const readinessCompliancePct = totalWorkouts > 0
        ? Math.min(100, Math.round((readinessLogsCount / totalWorkouts) * 100))
        : 0;

    return {
        trainingTenureDays,
        totalWorkoutsCount: totalWorkouts,
        lifetimeTonnageKg: Math.round(lifetimeTonnageKg),
        adherencePercentage: progSummary.adherencePercentage,
        weeklyTrainingFrequency: progSummary.weeklyTrainingFrequency,
        meanWeeklyWorkouts,
        meanWeeklySets,
        volumeResponseTier,
        consistencyTier,
        progressionRatio: progSummary.progressionRatio,
        progressionRatePercent,
        loadTypeProgressionRates,
        fastestProgressingMovements: macroProfile.fastestProgressing || macroProfile.fastestProgressingMovements || [],
        stalledMovementsCount: progSummary.stalledMovementsCount,
        bodyweightTrajectoryKg: bodyweightTrajectory,
        readinessCompliancePercentage: readinessCompliancePct,
        averageReadinessScore: progSummary.averageReadiness7d,
    };
};

// ────────────────────────────────────────────────────────────────
// 28. PHASE 5: PURE PREDICTIVE INTELLIGENCE & PERFORMANCE TRAJECTORY
// ────────────────────────────────────────────────────────────────

/**
 * Robust Theil-Sen median slope estimator and linear regression metrics.
 * Operates on an array of points: [{ t: timeInWeeks, y: nativeValue }].
 * Zero artificial cross-metric weighting.
 */
export const calculateTheilSenSlope = (points = []) => {
    if (!Array.isArray(points) || points.length < 2) {
        return { slope: 0, intercept: 0, rSquared: 0 };
    }

    const n = points.length;
    const slopes = [];

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dt = points[j].t - points[i].t;
            if (Math.abs(dt) > 0.0001) {
                slopes.push((points[j].y - points[i].y) / dt);
            }
        }
    }

    if (slopes.length === 0) {
        return { slope: 0, intercept: points[0].y || 0, rSquared: 0 };
    }

    slopes.sort((a, b) => a - b);
    const mid = Math.floor(slopes.length / 2);
    const medianSlope = slopes.length % 2 === 0
        ? (slopes[mid - 1] + slopes[mid]) / 2
        : slopes[mid];

    // Compute median intercept: b = Median(y_i - slope * t_i)
    const intercepts = points.map(p => p.y - medianSlope * p.t).sort((a, b) => a - b);
    const intMid = Math.floor(intercepts.length / 2);
    const medianIntercept = intercepts.length % 2 === 0
        ? (intercepts[intMid - 1] + intercepts[intMid]) / 2
        : intercepts[intMid];

    // Compute Coefficient of Determination (R²) for goodness-of-fit reference
    const yVals = points.map(p => p.y);
    const meanY = yVals.reduce((a, b) => a + b, 0) / n;
    let ssTot = 0;
    let ssRes = 0;

    points.forEach(p => {
        const yPred = medianSlope * p.t + medianIntercept;
        ssTot += Math.pow(p.y - meanY, 2);
        ssRes += Math.pow(p.y - yPred, 2);
    });

    const rSquared = ssTot > 0.0001 ? Math.max(0, Math.min(1, 1 - (ssRes / ssTot))) : 1.0;

    return {
        slope: parseFloat(medianSlope.toFixed(4)),
        intercept: parseFloat(medianIntercept.toFixed(4)),
        rSquared: parseFloat(rSquared.toFixed(4)),
    };
};

/**
 * Extracts chronological native session data for an exercise without cross-metric pollution.
 */
export const getExerciseNativeSessions = (exerciseName, history = [], latestBodyweight = null, indexedSessions = null) => {
    const rawSessions = getExerciseHistory(exerciseName, history, latestBodyweight, indexedSessions);
    if (!rawSessions || rawSessions.length === 0) return [];

    const meta = getExerciseMetadata(exerciseName);
    const defaultLoadType = meta?.category || (getExerciseLoadCategory(exerciseName) || "free_weight");

    const validSessions = [];

    rawSessions.forEach((s) => {
        if (!s || !s.date || !Array.isArray(s.sets) || s.sets.length === 0) return;

        const dateStr = s.date;
        const timestamp = new Date(dateStr + "T00:00:00").getTime();
        if (isNaN(timestamp)) return;

        const loadType = s.resolvedCategory || s.category || defaultLoadType;
        let nativeValue = null;
        let bestWeight = 0;
        let bestReps = 0;
        let bestDurationSec = 0;
        let bestE1RM = null;

        s.sets.forEach((set) => {
            if (set.skipped) return;

            const w = parseFloat(set.weightKg != null ? set.weightKg : (set.addedWeightKg != null ? set.addedWeightKg : set.weight)) || 0;
            const r = parseInt(set.reps, 10) || 0;
            const dur = parseInt(set.durationSec != null ? set.durationSec : set.reps, 10) || 0;

            if (loadType === "free_weight" || loadType === "machine") {
                const e1rm = calculateEstimated1RM(w, r, loadType);
                if (e1rm !== null && (bestE1RM === null || e1rm > bestE1RM)) {
                    bestE1RM = e1rm;
                }
                if (w > bestWeight || (w === bestWeight && r > bestReps)) {
                    bestWeight = w;
                    bestReps = r;
                }
            } else if (loadType === "weighted_bodyweight") {
                const addedW = parseFloat(set.addedWeightKg != null ? set.addedWeightKg : (set.weightKg != null ? set.weightKg : set.addedWeight)) || 0;
                if (addedW > bestWeight || (addedW === bestWeight && r > bestReps)) {
                    bestWeight = addedW;
                    bestReps = r;
                }
            } else if (loadType === "bodyweight") {
                if (r > bestReps) {
                    bestReps = r;
                }
            } else if (loadType === "assisted_bodyweight") {
                const assistW = parseFloat(set.weightKg != null ? set.weightKg : (set.assistanceKg != null ? set.assistanceKg : set.weight)) || 0;
                if (assistW > 0) {
                    if (bestWeight === 0 || assistW < bestWeight || (assistW === bestWeight && r > bestReps)) {
                        bestWeight = assistW;
                        bestReps = r;
                    }
                }
            } else if (loadType === "timed") {
                if (dur > bestDurationSec) {
                    bestDurationSec = dur;
                }
            }
        });

        // Determine pure native value for this session
        if (loadType === "free_weight" || loadType === "machine") {
            nativeValue = bestE1RM !== null ? bestE1RM : bestWeight;
        } else if (loadType === "weighted_bodyweight") {
            nativeValue = bestWeight; // Added external load (+kg)
        } else if (loadType === "bodyweight") {
            nativeValue = bestReps; // Max completed reps
        } else if (loadType === "assisted_bodyweight") {
            // Native assistance reduction: store negative assistance so reduction is positive progress
            nativeValue = bestWeight > 0 ? -bestWeight : 0;
        } else if (loadType === "timed") {
            nativeValue = bestDurationSec; // Duration in seconds
        }

        if (nativeValue !== null && !isNaN(nativeValue)) {
            validSessions.push({
                date: dateStr,
                timestamp,
                loadType,
                nativeValue,
                bestWeight,
                bestReps,
                bestDurationSec,
                bestE1RM,
                setsCount: s.sets.length,
            });
        }
    });

    // Sort chronologically ascending
    return validSessions.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Evaluates performance trajectory and robust weekly velocity for an exercise.
 * Outputs exact deterministic classifications: ACCELERATING, STEADY_PROGRESSION, STABLE, DECLINING, INSUFFICIENT_DATA.
 */
export const getExercisePerformanceTrajectory = (
    exerciseName,
    history = [],
    latestBodyweight = null,
    indexedSessions = null
) => {
    if (!exerciseName) {
        return {
            exerciseName: "",
            loadType: "free_weight",
            metricUnit: "kg",
            sessionCount: 0,
            slopePerWeek: 0,
            recentSlopePerWeek: 0,
            rSquared: 0,
            trajectory: "INSUFFICIENT_DATA",
            confidence: "INSUFFICIENT_DATA",
            currentBaseline: null,
            projectedIn4Weeks: null,
            projectedIn8Weeks: null,
            sessions: [],
        };
    }

    const sessions = getExerciseNativeSessions(exerciseName, history, latestBodyweight, indexedSessions);
    const meta = getExerciseMetadata(exerciseName);
    const loadType = meta?.category || (sessions[0]?.loadType || "free_weight");

    let metricUnit = "kg";
    if (loadType === "bodyweight") metricUnit = "reps";
    else if (loadType === "timed") metricUnit = "s";
    else if (loadType === "weighted_bodyweight") metricUnit = "+kg";
    else if (loadType === "assisted_bodyweight") metricUnit = "-kg assist";

    if (sessions.length < 3) {
        return {
            exerciseName,
            loadType,
            metricUnit,
            sessionCount: sessions.length,
            slopePerWeek: 0,
            recentSlopePerWeek: 0,
            rSquared: 0,
            trajectory: "INSUFFICIENT_DATA",
            confidence: "INSUFFICIENT_DATA",
            currentBaseline: sessions.length > 0 ? sessions[sessions.length - 1].nativeValue : null,
            projectedIn4Weeks: null,
            projectedIn8Weeks: null,
            sessions,
        };
    }

    // Map sessions to timeline points: t in weeks from first session
    const t0 = sessions[0].timestamp;
    const points = sessions.map(s => ({
        t: (s.timestamp - t0) / (7 * 24 * 60 * 60 * 1000),
        y: s.nativeValue,
    }));

    const fullRegression = calculateTheilSenSlope(points);
    const overallSlope = fullRegression.slope;

    // Calculate recent 3-session slope
    let recentSlope = overallSlope;
    if (points.length >= 3) {
        const recentPoints = points.slice(-3);
        const tRecent0 = recentPoints[0].t;
        const normalizedRecent = recentPoints.map(p => ({
            t: p.t - tRecent0,
            y: p.y,
        }));
        recentSlope = calculateTheilSenSlope(normalizedRecent).slope;
    }

    // Determine deterministic trajectory classification
    let trajectory = "STABLE";

    if (loadType === "free_weight" || loadType === "machine" || loadType === "weighted_bodyweight") {
        if (overallSlope >= 0.50 && recentSlope >= 1.25 * overallSlope) {
            trajectory = "ACCELERATING";
        } else if (overallSlope >= 0.20 && recentSlope >= 0) {
            trajectory = "STEADY_PROGRESSION";
        } else if (overallSlope < -0.20) {
            trajectory = "DECLINING";
        } else {
            trajectory = "STABLE";
        }
    } else if (loadType === "bodyweight") {
        if (overallSlope >= 0.75 && recentSlope >= 1.25 * overallSlope) {
            trajectory = "ACCELERATING";
        } else if (overallSlope >= 0.25 && recentSlope >= 0) {
            trajectory = "STEADY_PROGRESSION";
        } else if (overallSlope < -0.25) {
            trajectory = "DECLINING";
        } else {
            trajectory = "STABLE";
        }
    } else if (loadType === "assisted_bodyweight") {
        // Native value is negative assistance, so positive slope means reducing assistance
        if (overallSlope >= 0.75 && recentSlope >= 1.25 * overallSlope) {
            trajectory = "ACCELERATING";
        } else if (overallSlope >= 0.20 && recentSlope >= 0) {
            trajectory = "STEADY_PROGRESSION";
        } else if (overallSlope < -0.20) {
            trajectory = "DECLINING";
        } else {
            trajectory = "STABLE";
        }
    } else if (loadType === "timed") {
        if (overallSlope >= 2.5 && recentSlope >= 1.25 * overallSlope) {
            trajectory = "ACCELERATING";
        } else if (overallSlope >= 1.0 && recentSlope >= 0) {
            trajectory = "STEADY_PROGRESSION";
        } else if (overallSlope < -1.0) {
            trajectory = "DECLINING";
        } else {
            trajectory = "STABLE";
        }
    }

    // Determine deterministic confidence level
    const latestTimestamp = sessions[sessions.length - 1].timestamp;
    const daysSinceLastSession = Math.round((Date.now() - latestTimestamp) / (1000 * 60 * 60 * 24));

    let confidence = "LOW";
    if (sessions.length >= 6 && daysSinceLastSession <= 21 && (fullRegression.rSquared >= 0.50 || trajectory === "STEADY_PROGRESSION" || trajectory === "ACCELERATING")) {
        confidence = "HIGH";
    } else if (sessions.length >= 4 && daysSinceLastSession <= 28) {
        confidence = "MEDIUM";
    } else if (sessions.length === 3 || daysSinceLastSession > 28) {
        confidence = "LOW";
    }

    const latestValue = sessions[sessions.length - 1].nativeValue;
    const currentBaseline = parseFloat(latestValue.toFixed(1));

    // Calculate conservative 4-week and 8-week forward projections
    let projectedIn4Weeks = null;
    let projectedIn8Weeks = null;

    if (trajectory === "ACCELERATING" || trajectory === "STEADY_PROGRESSION" || trajectory === "STABLE") {
        const safeSlope = Math.max(0, overallSlope);
        projectedIn4Weeks = parseFloat((currentBaseline + safeSlope * 4).toFixed(1));
        projectedIn8Weeks = parseFloat((currentBaseline + safeSlope * 8).toFixed(1));
    }

    return {
        exerciseName,
        loadType,
        metricUnit,
        sessionCount: sessions.length,
        slopePerWeek: overallSlope,
        recentSlopePerWeek: recentSlope,
        rSquared: fullRegression.rSquared,
        trajectory,
        confidence,
        currentBaseline,
        projectedIn4Weeks,
        projectedIn8Weeks,
        sessions,
    };
};

/**
 * Returns the weekly performance velocity rate for an exercise.
 */
export const getExercisePerformanceVelocity = (
    exerciseName,
    history = [],
    latestBodyweight = null
) => {
    const trajectory = getExercisePerformanceTrajectory(exerciseName, history, latestBodyweight);
    if (trajectory.trajectory === "INSUFFICIENT_DATA") {
        return {
            exerciseName,
            loadType: trajectory.loadType,
            weeklyRate: 0,
            unit: trajectory.metricUnit,
            confidence: "INSUFFICIENT_DATA",
            observationWindowDays: 0,
            sessionCount: trajectory.sessionCount,
        };
    }

    const sessions = trajectory.sessions;
    const firstT = sessions[0].timestamp;
    const lastT = sessions[sessions.length - 1].timestamp;
    const windowDays = Math.max(1, Math.round((lastT - firstT) / (1000 * 60 * 60 * 24)));

    return {
        exerciseName,
        loadType: trajectory.loadType,
        weeklyRate: trajectory.slopePerWeek,
        unit: `${trajectory.metricUnit}/wk`,
        confidence: trajectory.confidence,
        observationWindowDays: windowDays,
        sessionCount: sessions.length,
    };
};

/**
 * Synthesizes upcoming performance milestones strictly within the exercise's native metric.
 * Zero synthetic cross-metric conversion.
 */
export const getExerciseMilestoneForecast = (
    exerciseName,
    history = [],
    latestBodyweight = null,
    indexedSessions = null
) => {
    const trajectory = getExercisePerformanceTrajectory(exerciseName, history, latestBodyweight, indexedSessions);

    if (trajectory.trajectory === "INSUFFICIENT_DATA" || trajectory.sessionCount < 3) {
        return {
            exerciseName,
            loadType: trajectory.loadType,
            currentBest: null,
            milestoneTarget: null,
            milestoneDelta: null,
            unit: trajectory.metricUnit,
            projectedWeeks: null,
            confidence: "INSUFFICIENT_DATA",
            status: "HORIZON_UNAVAILABLE",
            rationale: "Requires minimum 3 completed sessions to forecast milestones.",
        };
    }

    const currentBest = trajectory.currentBaseline;
    const loadType = trajectory.loadType;
    let milestoneTarget = null;

    if (loadType === "free_weight" || loadType === "machine") {
        // Compound increments: next 5kg or 2.5kg round threshold
        const next5 = Math.ceil((currentBest + 0.5) / 5) * 5;
        const next2_5 = Math.ceil((currentBest + 0.5) / 2.5) * 2.5;
        milestoneTarget = (next5 - currentBest >= 2.0) ? next5 : next2_5;
    } else if (loadType === "weighted_bodyweight") {
        // Added load increments: next 2.5kg added
        milestoneTarget = Math.ceil((currentBest + 0.5) / 2.5) * 2.5;
    } else if (loadType === "bodyweight") {
        // Bodyweight rep milestones: 10, 12, 15, 20, 25, 30 reps
        const repTiers = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50];
        const nextTier = repTiers.find(t => t > currentBest);
        milestoneTarget = nextTier || (currentBest + 5);
    } else if (loadType === "assisted_bodyweight") {
        // Assistance reduction milestones (native is negative assist): next lighter assist or unassisted (0kg)
        const currentAssist = Math.abs(currentBest);
        if (currentAssist <= 5) {
            milestoneTarget = 0; // Unassisted bodyweight!
        } else {
            milestoneTarget = -(Math.floor((currentAssist - 1) / 5) * 5);
        }
    } else if (loadType === "timed") {
        // Isometric hold milestones: 30s, 45s, 60s, 75s, 90s, 120s
        const timeTiers = [30, 45, 60, 75, 90, 120, 150, 180];
        const nextTime = timeTiers.find(t => t > currentBest);
        milestoneTarget = nextTime || (currentBest + 15);
    }

    const milestoneDelta = parseFloat(Math.abs(milestoneTarget - currentBest).toFixed(1));
    const weeklyRate = trajectory.slopePerWeek;

    if (weeklyRate <= 0.05 || trajectory.trajectory === "DECLINING" || trajectory.trajectory === "STABLE") {
        return {
            exerciseName,
            loadType,
            currentBest,
            milestoneTarget,
            milestoneDelta,
            unit: trajectory.metricUnit,
            projectedWeeks: null,
            confidence: trajectory.confidence,
            status: "HORIZON_UNAVAILABLE",
            rationale: "Velocity is currently flat or declining. Focus on volume stability to re-establish momentum.",
        };
    }

    const rawWeeks = milestoneDelta / weeklyRate;
    const projectedWeeks = Math.max(1, Math.min(24, Math.round(rawWeeks)));

    return {
        exerciseName,
        loadType,
        currentBest,
        milestoneTarget,
        milestoneDelta,
        unit: trajectory.metricUnit,
        projectedWeeks,
        confidence: trajectory.confidence,
        status: "ON_TRACK",
        rationale: `Progressing at +${weeklyRate.toFixed(2)} ${trajectory.metricUnit}/wk. Estimated ${projectedWeeks} weeks to target.`,
    };
};

/**
 * Multi-signal plateau and friction risk evaluator for an exercise.
 * Evaluates stall history, velocity decay, rep drop-off, and fatigue interaction.
 * Output: LOW, MODERATE, ELEVATED_RISK, INSUFFICIENT_DATA.
 */
export const getExercisePlateauRisk = (
    exerciseName,
    history = [],
    readinessHistory = [],
    latestBodyweight = null,
    indexedCache = null
) => {
    if (!exerciseName) {
        return {
            exerciseName: "",
            riskScore: 0,
            riskLevel: "INSUFFICIENT_DATA",
            factors: { stagnantSessions: 0, velocityDecay: false, setDropOff: false, systemicFatigue: false },
            recommendation: "Log completed sessions to assess movement friction.",
            confidence: "INSUFFICIENT_DATA",
        };
    }

    const stallStatus = getExerciseStallStatus(exerciseName, history, latestBodyweight, indexedCache);
    const trajectory = getExercisePerformanceTrajectory(exerciseName, history, latestBodyweight, indexedCache);

    if (trajectory.trajectory === "INSUFFICIENT_DATA" || trajectory.sessionCount < 3) {
        return {
            exerciseName,
            riskScore: 0,
            riskLevel: "INSUFFICIENT_DATA",
            factors: { stagnantSessions: stallStatus.stagnantSessionCount, velocityDecay: false, setDropOff: false, systemicFatigue: false },
            recommendation: "Building baseline observations. Minimum 3 sessions required.",
            confidence: "INSUFFICIENT_DATA",
        };
    }

    const stagnantCount = stallStatus.stagnantSessionCount || 0;
    const sStagnant = Math.min(100, (stagnantCount / 3) * 100);
    const sVelocityDecay = (trajectory.slopePerWeek <= 0.05 || trajectory.recentSlopePerWeek < trajectory.slopePerWeek) ? 100 : 0;

    // Check set drop-off in recent session
    let sSetDropOff = 0;
    const recentSessions = trajectory.sessions;
    if (recentSessions.length > 0) {
        const lastSession = recentSessions[recentSessions.length - 1];
        if (lastSession.bestReps > 0 && lastSession.bestReps < 6 && trajectory.loadType === "free_weight") {
            sSetDropOff = 100;
        }
    }

    // Check systemic fatigue
    const loadTrend = getTrainingLoadTrend(history, latestBodyweight);
    let sSystemicFatigue = 0;
    if (loadTrend.workloadClassification === "ELEVATED_STRESS" || loadTrend.workloadClassification === "HIGH_SPIKE") {
        sSystemicFatigue = 100;
    }

    // Weighted Plateau Risk Index: 0 to 100
    const riskScore = Math.round(
        0.40 * sStagnant +
        0.25 * sVelocityDecay +
        0.20 * sSetDropOff +
        0.15 * sSystemicFatigue
    );

    let riskLevel = "LOW";
    let recommendation = "Movement is progressing smoothly with low friction.";

    if (riskScore >= 65 || stagnantCount >= 3) {
        riskLevel = "ELEVATED_RISK";
        recommendation = "Movement has high plateau risk. Consider conservative volume adaptation (-1 set) or alternate grip/variation.";
    } else if (riskScore >= 35 || stagnantCount >= 2) {
        riskLevel = "MODERATE";
        recommendation = "Velocity is slowing down. Prioritize rep quality and adequate rest between sets.";
    }

    return {
        exerciseName,
        loadType: trajectory.loadType,
        riskScore,
        riskLevel,
        factors: {
            stagnantSessions: stagnantCount,
            velocityDecay: sVelocityDecay === 100,
            setDropOff: sSetDropOff === 100,
            systemicFatigue: sSystemicFatigue === 100,
        },
        recommendation,
        confidence: trajectory.confidence,
    };
};

/**
 * Maps 28-day volume exposure against observed performance velocity across all 11 standardized muscle groups.
 * Strictly adheres to non-clinical language: "Movement Performance Response" (zero hypertrophy claims).
 */
export const getMuscleGroupResponseMatrix = (
    program = null,
    history = [],
    latestBodyweight = null,
    precomputedTrajectories = null
) => {
    const muscleMap = {};

    STANDARDIZED_MUSCLE_GROUPS.forEach((mg) => {
        muscleMap[mg] = {
            muscleGroup: mg,
            volumeSets28d: 0,
            exerciseCount: 0,
            progressingCount: 0,
            stalledCount: 0,
            averageSlope: 0,
            slopesList: [],
            responseCategory: "INSUFFICIENT_DATA",
            statusLabel: "INSUFFICIENT DATA",
        };
    });

    if (!Array.isArray(history) || history.length === 0) {
        return Object.values(muscleMap);
    }

    // Calculate 28-day trailing window volume
    const now = Date.now();
    const window28d = 28 * 24 * 60 * 60 * 1000;

    history.forEach((workout) => {
        const workoutDate = new Date(workout.date || workout.completedAt).getTime();
        if (now - workoutDate > window28d) return;

        (workout.exercises || []).forEach((ex) => {
            const mg = ex.muscleGroup || getExerciseMuscleGroup(ex.name);
            if (muscleMap[mg]) {
                const sets = (ex.loggedSets || ex.logs || []).filter(s => s && s.completed && !s.skipped);
                muscleMap[mg].volumeSets28d += sets.length;
            }
        });
    });

    // Evaluate trajectory for all exercises in catalog
    const allExercises = getAllPlanExercises();
    allExercises.forEach((exName) => {
        const mg = getExerciseMuscleGroup(exName);
        if (!muscleMap[mg]) return;

        const traj = precomputedTrajectories?.[exName] || getExercisePerformanceTrajectory(exName, history, latestBodyweight);
        if (traj.trajectory !== "INSUFFICIENT_DATA" && traj.sessionCount >= 3) {
            muscleMap[mg].exerciseCount += 1;
            muscleMap[mg].slopesList.push(traj.slopePerWeek);

            if (traj.trajectory === "ACCELERATING" || traj.trajectory === "STEADY_PROGRESSION") {
                muscleMap[mg].progressingCount += 1;
            } else if (traj.trajectory === "DECLINING" || traj.slopePerWeek < 0) {
                muscleMap[mg].stalledCount += 1;
            }
        }
    });

    // Classify response category per muscle group
    Object.values(muscleMap).forEach((item) => {
        if (item.exerciseCount === 0 || item.volumeSets28d === 0) {
            item.responseCategory = "INSUFFICIENT_DATA";
            item.statusLabel = "INSUFFICIENT DATA";
            return;
        }

        const avgSlope = item.slopesList.reduce((a, b) => a + b, 0) / item.exerciseCount;
        item.averageSlope = parseFloat(avgSlope.toFixed(3));

        if (avgSlope >= 0.30 && item.volumeSets28d >= 16) {
            item.responseCategory = "HIGH_RESPONDER";
            item.statusLabel = "HIGH RESPONDER";
        } else if (avgSlope >= 0.20 && item.volumeSets28d < 16) {
            item.responseCategory = "EFFICIENT_PROGRESSION";
            item.statusLabel = "EFFICIENT PROGRESSION";
        } else if (avgSlope <= 0 && item.volumeSets28d >= 24) {
            item.responseCategory = "FATIGUE_ACCUMULATING";
            item.statusLabel = "FATIGUE ACCUMULATING";
        } else if (Math.abs(avgSlope) < 0.20) {
            item.responseCategory = "LOW_VOLUME_MAINTENANCE";
            item.statusLabel = "MAINTENANCE";
        } else {
            item.responseCategory = "STEADY";
            item.statusLabel = "STEADY";
        }
    });

    return Object.values(muscleMap);
};

/**
 * Analyzes the bivariate relationship between rolling 7-day bodyweight trajectory and compound strength velocity.
 * Pure performance physics — zero medical or nutritional diagnoses.
 */
export const getBodyweightPerformanceCorrelation = (
    bodyStats = [],
    history = [],
    latestBodyweight = null
) => {
    if (!Array.isArray(bodyStats) || bodyStats.length < 3 || !Array.isArray(history) || history.length < 4) {
        return {
            bodyweightVelocityKgPerWeek: 0,
            strengthVelocityAvg: 0,
            relationship: "INSUFFICIENT_DATA",
            statusLabel: "INSUFFICIENT DATA",
            explanation: "Requires at least 3 bodyweight logs and 4 workout sessions to establish correlation.",
            confidence: "INSUFFICIENT_DATA",
        };
    }

    // Calculate bodyweight weekly slope via Theil-Sen
    const sortedStats = [...bodyStats]
        .filter(s => s && s.date && s.weightKg != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedStats.length < 3) {
        return {
            bodyweightVelocityKgPerWeek: 0,
            strengthVelocityAvg: 0,
            relationship: "INSUFFICIENT_DATA",
            statusLabel: "INSUFFICIENT DATA",
            explanation: "Insufficient bodyweight observations.",
            confidence: "INSUFFICIENT_DATA",
        };
    }

    const t0 = new Date(sortedStats[0].date).getTime();
    const bwPoints = sortedStats.map(s => ({
        t: (new Date(s.date).getTime() - t0) / (7 * 24 * 60 * 60 * 1000),
        y: parseFloat(s.weightKg),
    }));

    const bwSlope = calculateTheilSenSlope(bwPoints).slope;

    // Calculate average velocity across main compound movements
    const compoundMovements = [
        "Barbell Bench Press",
        "Incline Dumbbell Press",
        "Barbell Deadlift",
        "Barbell Back Squat",
        "Overhead Press (OHP)",
        "Lat Pulldown — Wide Grip",
        "Barbell Bent-Over Row"
    ];

    const compoundSlopes = [];
    compoundMovements.forEach((exName) => {
        const vel = getExercisePerformanceVelocity(exName, history, latestBodyweight);
        if (vel.confidence !== "INSUFFICIENT_DATA" && vel.sessionCount >= 3) {
            compoundSlopes.push(vel.weeklyRate);
        }
    });

    const avgStrengthSlope = compoundSlopes.length > 0
        ? compoundSlopes.reduce((a, b) => a + b, 0) / compoundSlopes.length
        : 0;

    let relationship = "STABLE";
    let statusLabel = "MAINTENANCE";
    let explanation = "Bodyweight and strength velocity are stable.";

    if (bwSlope >= 0.15 && avgStrengthSlope >= 0.25) {
        relationship = "STRENGTH_SURPLUS";
        statusLabel = "STRENGTH SURPLUS";
        explanation = `Bodyweight trending +${bwSlope.toFixed(2)} kg/wk with strong compound progression (+${avgStrengthSlope.toFixed(2)} kg/wk). Effective leverage phase.`;
    } else if (Math.abs(bwSlope) < 0.15 && avgStrengthSlope >= 0.25) {
        relationship = "LEAN_EFFICIENCY";
        statusLabel = "LEAN EFFICIENCY";
        explanation = `Bodyweight stable while compound strength increases +${avgStrengthSlope.toFixed(2)} kg/wk. High neuromuscular adaptation rate.`;
    } else if (bwSlope <= -0.15 && avgStrengthSlope >= 0) {
        relationship = "STRENGTH_MAINTENANCE_DEFICIT";
        statusLabel = "STRENGTH PRESERVATION";
        explanation = `Bodyweight decreasing (${bwSlope.toFixed(2)} kg/wk) while maintaining compound strength. Preserving motor recruitment.`;
    } else if (bwSlope <= -0.15 && avgStrengthSlope < -0.15) {
        relationship = "RECOVERY_DRAG";
        statusLabel = "RECOVERY DRAG";
        explanation = `Bodyweight decreasing alongside compound strength decline (${avgStrengthSlope.toFixed(2)} kg/wk). Consider stabilizing caloric intake or introducing a deload.`;
    }

    const confidence = sortedStats.length >= 6 && compoundSlopes.length >= 3 ? "HIGH" : "MEDIUM";

    return {
        bodyweightVelocityKgPerWeek: parseFloat(bwSlope.toFixed(2)),
        strengthVelocityAvg: parseFloat(avgStrengthSlope.toFixed(2)),
        relationship,
        statusLabel,
        explanation,
        confidence,
    };
};

/**
 * Master Phase 5 Predictive Intelligence summary.
 * Compiles a structured, deterministic payload for UI cards and the Gemini AI coach context.
 */
export const getAthletePredictiveSummary = (
    program = null,
    history = [],
    bodyStats = [],
    readinessHistory = [],
    prRecords = {},
    latestBodyweight = null,
    indexedSessions = null
) => {
    const allExercises = getAllPlanExercises();
    const indexed = indexedSessions || getPreIndexedExerciseSessions(history, latestBodyweight);

    const trajectories = [];
    const trajectoryMap = {};
    const upcomingMilestones = [];
    const plateauRisks = [];

    allExercises.forEach((exName) => {
        const traj = getExercisePerformanceTrajectory(exName, history, latestBodyweight, indexed);
        trajectoryMap[exName] = traj;
        if (traj.trajectory !== "INSUFFICIENT_DATA") {
            trajectories.push(traj);
        }

        const milestone = getExerciseMilestoneForecast(exName, history, latestBodyweight, indexed);
        if (milestone.status === "ON_TRACK") {
            upcomingMilestones.push(milestone);
        }

        const risk = getExercisePlateauRisk(exName, history, readinessHistory, latestBodyweight, indexed);
        if (risk.riskLevel === "ELEVATED_RISK" || risk.riskLevel === "MODERATE") {
            plateauRisks.push(risk);
        }
    });

    // Sort top velocity movements
    trajectories.sort((a, b) => b.slopePerWeek - a.slopePerWeek);
    const topProgressing = trajectories.slice(0, 5);

    // Sort milestones by shortest horizon
    upcomingMilestones.sort((a, b) => (a.projectedWeeks || 99) - (b.projectedWeeks || 99));

    const muscleResponse = getMuscleGroupResponseMatrix(program, history, latestBodyweight, trajectoryMap);
    const bwCorrelation = getBodyweightPerformanceCorrelation(bodyStats, history, latestBodyweight);

    return {
        topProgressingMovements: topProgressing,
        upcomingMilestones: upcomingMilestones.slice(0, 5),
        plateauRiskMovements: plateauRisks,
        muscleResponseMatrix: muscleResponse,
        bodyweightCorrelation: bwCorrelation,
        activeTrajectoriesCount: trajectories.length,
    };
};

// ────────────────────────────────────────────────────────────────
// 21. PHASE 6: DATE NORMALIZATION & RECORD RESOLUTION HELPERS
// ────────────────────────────────────────────────────────────────

/**
 * Authoritative local calendar date normalization strategy.
 * Normalizes any date input (Date object, timestamp, ISO string) to local midnight YYYY-MM-DD
 * and day-of-week index (0=Sun, 1=Mon, ..., 6=Sat) without timezone offset drift.
 * 
 * @param {Date|number|string} dateInput Date representation
 * @returns {{ dateObj: Date, dateString: string, dayOfWeek: number, timestamp: number }}
 */
export const normalizeToLocalDate = (dateInput = new Date()) => {
    let d;
    if (dateInput instanceof Date) {
        d = new Date(dateInput.getTime());
    } else if (typeof dateInput === "number") {
        d = new Date(dateInput);
    } else if (typeof dateInput === "string") {
        // If YYYY-MM-DD format, parse as local calendar date components
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
            const [y, m, day] = dateInput.trim().split("-").map(Number);
            d = new Date(y, m - 1, day);
        } else {
            d = new Date(dateInput);
        }
    } else {
        d = new Date();
    }

    if (isNaN(d.getTime())) {
        d = new Date();
    }

    const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const year = localMidnight.getFullYear();
    const month = String(localMidnight.getMonth() + 1).padStart(2, "0");
    const day = String(localMidnight.getDate()).padStart(2, "0");

    return {
        dateObj: localMidnight,
        dateString: `${year}-${month}-${day}`,
        dayOfWeek: localMidnight.getDay(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        timestamp: localMidnight.getTime(),
    };
};

/**
 * Returns the latest valid record on or before targetDate from an array of records.
 * Sorts chronologically and strictly filters out future-dated entries.
 * 
 * @param {Array<Object>} records Array of data records
 * @param {Date|number|string} targetDate Target evaluation date
 * @param {string} dateKey Primary date key name
 * @returns {Object|null}
 */
export const getLatestRecordOnOrBefore = (records = [], targetDate = new Date(), dateKey = "date") => {
    if (!Array.isArray(records) || records.length === 0) return null;
    const targetNorm = normalizeToLocalDate(targetDate);
    const targetEndTime = targetNorm.timestamp + (24 * 60 * 60 * 1000) - 1; // 23:59:59.999 of target date

    const validRecords = records.filter((r) => {
        if (!r) return false;
        const val = r[dateKey] ?? r.timestamp ?? r.createdAt ?? r.recordedAt ?? r.date;
        if (val === undefined || val === null) return false;
        let recordTime;
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
            recordTime = normalizeToLocalDate(val).timestamp;
        } else {
            recordTime = new Date(val).getTime();
        }
        return !isNaN(recordTime) && recordTime <= targetEndTime;
    });

    if (validRecords.length === 0) return null;

    validRecords.sort((a, b) => {
        const valA = a[dateKey] ?? a.timestamp ?? a.createdAt ?? a.recordedAt ?? a.date;
        const valB = b[dateKey] ?? b.timestamp ?? b.createdAt ?? b.recordedAt ?? b.date;
        const timeA = typeof valA === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valA.trim())
            ? normalizeToLocalDate(valA).timestamp
            : new Date(valA).getTime();
        const timeB = typeof valB === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valB.trim())
            ? normalizeToLocalDate(valB).timestamp
            : new Date(valB).getTime();
        return timeB - timeA; // Descending (newest first)
    });

    return validRecords[0];
};

/**
 * Filters and chronologically sorts records on or before targetDate (oldest to newest).
 * 
 * @param {Array<Object>} records Array of data records
 * @param {Date|number|string} targetDate Target evaluation date
 * @param {string} dateKey Primary date key name
 * @returns {Array<Object>}
 */
export const getFilteredRecordsOnOrBefore = (records = [], targetDate = new Date(), dateKey = "date") => {
    if (!Array.isArray(records) || records.length === 0) return [];
    const targetNorm = normalizeToLocalDate(targetDate);
    const targetEndTime = targetNorm.timestamp + (24 * 60 * 60 * 1000) - 1;

    const valid = records.filter((r) => {
        if (!r) return false;
        const val = r[dateKey] ?? r.timestamp ?? r.createdAt ?? r.recordedAt ?? r.date;
        if (val === undefined || val === null) return false;
        let recordTime;
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
            recordTime = normalizeToLocalDate(val).timestamp;
        } else {
            recordTime = new Date(val).getTime();
        }
        return !isNaN(recordTime) && recordTime <= targetEndTime;
    });

    return valid.sort((a, b) => {
        const valA = a[dateKey] ?? a.timestamp ?? a.createdAt ?? a.recordedAt ?? a.date;
        const valB = b[dateKey] ?? b.timestamp ?? b.createdAt ?? b.recordedAt ?? b.date;
        const timeA = typeof valA === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valA.trim())
            ? normalizeToLocalDate(valA).timestamp
            : new Date(valA).getTime();
        const timeB = typeof valB === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valB.trim())
            ? normalizeToLocalDate(valB).timestamp
            : new Date(valB).getTime();
        return timeA - timeB; // Ascending (oldest to newest)
    });
};

// ────────────────────────────────────────────────────────────────
// 22. PHASE 6: DAILY ATHLETE COMMAND & ORCHESTRATION ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Deterministic Daily Athlete Command Center orchestration engine.
 * Consumes Phase 1–5 telemetry and resolves competing signals via the strict priority waterfall.
 * 
 * Priority Waterfall:
 * 1. DELOAD_REVIEW (Active or recommended deload)
 * 2. MISSED_WORKOUT (Unresolved missed session)
 * 3. PROGRAM_REVIEW (2+ high-severity exercise stalls >=4 sessions)
 * 4. TRAIN_WITH_CAUTION (Training day + Readiness < 50 OR ACWR > 1.30)
 * 5. READY_TO_PROGRESS (Training day + Readiness >= 75 + ACWR 0.80–1.30 + Target ready)
 * 6. TRAIN (Nominal training day)
 * 7. RECOVERY_FOCUS (Rest day + ACWR > 1.35 OR Readiness < 45)
 * 8. REST_DAY (Nominal rest day)
 * 9. INSUFFICIENT_DATA (No workouts on or before target date)
 */
export const getDailyAthleteCommand = ({
    workouts = [],
    readinessLogs = [],
    activeProgram = null,
    programVersions = [],
    bodyStats = [],
    prRecords = {},
    missedWorkoutState = null,
    targetDate = new Date(),
    latestBodyweight = null,
} = {}) => {
    const validWorkouts = getFilteredRecordsOnOrBefore(workouts, targetDate, "date");
    const validReadiness = getFilteredRecordsOnOrBefore(readinessLogs, targetDate, "date");
    const validBodyStats = getFilteredRecordsOnOrBefore(bodyStats, targetDate, "date");

    const targetNorm = normalizeToLocalDate(targetDate);
    const dayOfWeek = targetNorm.dayOfWeek; // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const calendarDayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 = Mon, ..., 7 = Sun

    // 1. Check data sufficiency
    if (validWorkouts.length === 0) {
        let scheduledDay = activeProgram?.days?.find(d => d.day === calendarDayIndex || d.dayOfWeek === dayOfWeek) || null;
        if (!scheduledDay) {
            scheduledDay = WORKOUT_PLAN.find(d => d.day === calendarDayIndex) || null;
        }

        return {
            decision: "INSUFFICIENT_DATA",
            priority: 9,
            headline: "BUILD YOUR BASELINE",
            subtext: "Log your first workout to activate intelligent command insights.",
            action: "START_FIRST_WORKOUT",
            reasons: ["No completed workout records found on or before today."],
            supportingMetrics: {
                totalWorkouts: 0,
                readinessScore: null,
                acwr: 0,
                acuteLoad: 0,
                chronicLoad: 0,
                fatigueStatus: "OPTIMAL",
            },
            recommendedWorkout: scheduledDay,
            primeTarget: null,
            highPriorityAlert: null,
            milestoneHighlight: null,
        };
    }

    // 2. Fetch underlying Phase 1-5 facts
    const loadTrend = getTrainingLoadTrend(validWorkouts, targetDate);
    const acwr = typeof loadTrend?.workloadRatio === "number"
        ? loadTrend.workloadRatio
        : (typeof loadTrend?.acwr === "number" ? loadTrend.acwr : 1.0);
    const acuteLoad = loadTrend?.currentWeekTonnageKg ?? loadTrend?.acuteLoad ?? 0;
    const chronicLoad = loadTrend?.chronicBaselineTonnageKg ?? loadTrend?.chronicLoad ?? 0;
    const fatigueStatus = loadTrend?.trendClassification ?? loadTrend?.fatigueStatus ?? "OPTIMAL_PROGRESSION";

    const alerts = getAthleteAlerts(validWorkouts, validBodyStats, validReadiness, prRecords, latestBodyweight);
    const predictiveSummary = getAthletePredictiveSummary(
        activeProgram,
        validWorkouts,
        validBodyStats,
        validReadiness,
        prRecords,
        latestBodyweight
    );
    const latestReadiness = getLatestRecordOnOrBefore(validReadiness, targetDate, "date");
    const readinessScore = (latestReadiness && typeof latestReadiness.score === "number")
        ? latestReadiness.score
        : null;

    // Resolve scheduled workout day for today
    let scheduledDay = activeProgram?.days?.find(d => d.day === calendarDayIndex || d.dayOfWeek === dayOfWeek) || null;
    if (!scheduledDay) {
        scheduledDay = WORKOUT_PLAN.find(d => d.day === calendarDayIndex) || null;
    }

    const isTrainingDay = !!(scheduledDay && !scheduledDay.isRest && Array.isArray(scheduledDay.exercises) && scheduledDay.exercises.length > 0);

    // Evaluate deload state
    const deloadPlan = getProposedDeloadPlan(activeProgram, validWorkouts, targetDate);
    const isDeloadActive = !!(
        activeProgram?.isDeloadActive ||
        activeProgram?.type === "TEMPORARY_DELOAD" ||
        deloadPlan?.status === "DELOAD_ACTIVE" ||
        fatigueStatus === "EXHAUSTION" ||
        (acwr > 1.50 && validWorkouts.length >= 8)
    );

    // Evaluate missed workout state
    const missedAdvisory = getMissedWorkoutAdvisory(activeProgram, validWorkouts, targetDate);
    const hasMissedWorkout = !!(
        (missedWorkoutState && !missedWorkoutState.resolved && !missedWorkoutState.dismissed) ||
        (missedWorkoutState === undefined && missedAdvisory && missedAdvisory.hasMissedWorkout)
    );

    // Evaluate stall / program review state
    const highSeverityStalls = alerts.filter(a => a.type === "EXERCISE_STALL" && a.severity === "HIGH");
    const isProgramReviewNeeded = highSeverityStalls.length >= 1;

    // 3. Resolve Decision via Waterfall
    let decision = "TRAIN";
    let priority = 6;
    let headline = "EXECUTE SESSION";
    let subtext = "Nominal training day. Follow prescribed volume and loads.";
    let action = "START_WORKOUT";
    const reasons = [];

    if (isDeloadActive) {
        decision = "DELOAD_REVIEW";
        priority = 1;
        headline = "DELOAD PROTOCOL ACTIVE";
        subtext = "High cumulative fatigue detected. Reduce volume by 40% to supercompensate.";
        action = "REVIEW_DELOAD";
        reasons.push(
            fatigueStatus === "EXHAUSTION"
                ? "Chronic fatigue index reached EXHAUSTION threshold."
                : `Acute:Chronic Workload Ratio is ${acwr.toFixed(2)} with sustained training stress.`
        );
    } else if (hasMissedWorkout) {
        decision = "MISSED_WORKOUT";
        priority = 2;
        const missedTargetName = missedAdvisory?.missedTarget || "Scheduled Session";
        headline = "MISSED SESSION DETECTED";
        subtext = `Day 0${missedAdvisory?.missedDay || 1} (${missedTargetName}) was not logged. Select a non-destructive recovery strategy.`;
        action = "RESOLVE_MISSED_WORKOUT";
        reasons.push(`Scheduled workout for Day 0${missedAdvisory?.missedDay || 1} (${missedTargetName}) was missed.`);
        reasons.push("Do not double volume today. Resume program seamlessly or shift schedule.");
    } else if (isProgramReviewNeeded) {
        decision = "PROGRAM_REVIEW";
        priority = 3;
        headline = "PROGRAM STALL REVIEW";
        subtext = "Multiple movements have stalled for 4+ consecutive sessions. Consider exercise rotation.";
        action = "REVIEW_EXERCISES";
        highSeverityStalls.forEach(s => reasons.push(s.message || `${s.title}: Stagnation detected.`));
    } else if (isTrainingDay) {
        const isLowReadiness = readinessScore !== null && readinessScore < 50;
        const isHighACWR = acwr > 1.30;
        const isHighReadiness = readinessScore !== null && readinessScore >= 75;
        const isOptimalACWR = acwr >= 0.80 && acwr <= 1.30;

        if (isLowReadiness || isHighACWR) {
            decision = "TRAIN_WITH_CAUTION";
            priority = 4;
            headline = "TRAIN WITH CAUTION";
            subtext = "Fatigue markers elevated. Maintain planned target loads but leave 1–2 reps in reserve.";
            action = "START_WORKOUT_CAUTION";
            if (isLowReadiness) reasons.push(`Readiness score is ${readinessScore}/100 (below 50 optimal threshold).`);
            if (isHighACWR) reasons.push(`ACWR is ${acwr.toFixed(2)} (elevated acute workload spike).`);
            reasons.push("Preserve planned targets; avoid grinding sets to absolute failure.");
        } else if (isHighReadiness && !isHighACWR && fatigueStatus !== "EXHAUSTION") {
            decision = "READY_TO_PROGRESS";
            priority = 5;
            headline = "PRIME PROGRESSION DAY";
            subtext = "Optimal recovery and training stress. Push prescribed progressive overload targets.";
            action = "START_WORKOUT_PROGRESS";
            reasons.push(`Readiness score is ${readinessScore}/100 (prime recovery state).`);
            reasons.push(`ACWR is ${acwr.toFixed(2)} within the optimal progression zone (0.80–1.30).`);
        } else {
            decision = "TRAIN";
            priority = 6;
            headline = "TRAIN TODAY";
            subtext = scheduledDay?.target ? `${scheduledDay.target.toUpperCase()} scheduled.` : "Execute today's session as planned.";
            action = "START_WORKOUT";
            reasons.push("Training load and recovery metrics are balanced.");
            if (readinessScore !== null) reasons.push(`Readiness score is ${readinessScore}/100.`);
        }
    } else {
        const isHighStress = acwr > 1.35 || (readinessScore !== null && readinessScore < 45);
        if (isHighStress) {
            decision = "RECOVERY_FOCUS";
            priority = 7;
            headline = "RECOVERY FOCUS";
            subtext = "Rest day with elevated systemic fatigue. Prioritize sleep, hydration, and light mobility.";
            action = "LOG_RECOVERY";
            if (acwr > 1.35) reasons.push(`ACWR is ${acwr.toFixed(2)} indicating acute fatigue.`);
            if (readinessScore !== null && readinessScore < 45) reasons.push(`Readiness score is ${readinessScore}/100.`);
        } else {
            decision = "REST_DAY";
            priority = 8;
            headline = "REST & RECHARGE";
            subtext = "Scheduled active recovery day. Rest and prepare for your next training session.";
            action = "REST";
            reasons.push("Scheduled rest day in active program split.");
            if (readinessScore !== null) reasons.push(`Readiness score: ${readinessScore}/100.`);
        }
    }

    // 4. Derive Prime Target for today
    let primeTarget = null;
    if (isTrainingDay && scheduledDay) {
        const dayTargets = getWorkoutDayTargets(scheduledDay, validWorkouts, latestBodyweight);
        if (dayTargets && Array.isArray(dayTargets.exercises) && dayTargets.exercises.length > 0) {
            const mainEx = dayTargets.exercises.find(e => e.progression && e.progression.hasHistoricalData) || dayTargets.exercises[0];
            if (mainEx && mainEx.progression) {
                primeTarget = {
                    exerciseName: mainEx.name,
                    recommendation: mainEx.progression.recommendation,
                    actionLabel: mainEx.progression.actionLabel,
                    targetWeight: mainEx.progression.targetWeight,
                    targetRepRange: mainEx.progression.targetRepRange,
                    suggestedDeltaKg: mainEx.progression.suggestedDeltaKg,
                    reason: mainEx.progression.reason,
                    badgeColor: mainEx.progression.badgeColor,
                };
            }
        }
    }

    // 5. Derive Top Milestone Highlight
    const milestoneHighlight = (predictiveSummary.upcomingMilestones && predictiveSummary.upcomingMilestones.length > 0)
        ? predictiveSummary.upcomingMilestones[0]
        : null;

    // 6. Surface Top Actionable Alert
    const highPriorityAlert = alerts.length > 0 ? alerts[0] : null;

    // 7. Check if workout completed on targetDate
    const isCompletedToday = validWorkouts.some(w => normalizeToLocalDate(w.date || w.completedAt).dateString === targetNorm.dateString);

    return {
        decision,
        priority,
        headline,
        subtext,
        action,
        reasons,
        isCompletedToday,
        supportingMetrics: {
            isCompletedToday,
            totalWorkouts: validWorkouts.length,
            readinessScore,
            acwr,
            acuteLoad,
            chronicLoad,
            fatigueStatus,
            weeklyTonnageKg: acuteLoad,
        },
        recommendedWorkout: scheduledDay,
        primeTarget,
        highPriorityAlert,
        milestoneHighlight,
    };
};

/**
 * Structured "Why?" Explainability Model for Daily Athlete Decisions.
 * Returns verified deterministic telemetry and exact reasoning without AI hallucinations.
 * 
 * @param {Object} dailyCommand Output of getDailyAthleteCommand
 * @returns {Object}
 */
export const getDecisionExplanation = (dailyCommand) => {
    if (!dailyCommand || typeof dailyCommand !== "object") {
        return {
            decision: "INSUFFICIENT_DATA",
            priority: 9,
            reasons: ["No active command generated."],
            supportingMetrics: {},
            sourceAnalytics: ["storage"],
            recommendedAction: "LOG_WORKOUT",
            confidence: "INSUFFICIENT_DATA",
        };
    }

    const { decision, priority, reasons = [], supportingMetrics = {}, action = "START_WORKOUT" } = dailyCommand;

    const sourceAnalytics = [
        "training_load_acwr",
        "readiness_index",
        "exercise_progression",
        "stall_detection",
        "predictive_trajectories"
    ];

    let confidence = "HIGH";
    if (supportingMetrics.totalWorkouts < 3) {
        confidence = "LOW";
    } else if (supportingMetrics.readinessScore === null || supportingMetrics.totalWorkouts < 6) {
        confidence = "MODERATE";
    }

    return {
        decision,
        priority,
        reasons,
        supportingMetrics,
        sourceAnalytics,
        recommendedAction: action,
        confidence,
    };
};

// ────────────────────────────────────────────────────────────────
// 23. PHASE 6: WEEKLY ATHLETE RECAP ENGINE (NATIVE TONNAGE TAXONOMY)
// ────────────────────────────────────────────────────────────────

/**
 * Generates a concise, deterministic 7-day weekly athlete digest.
 * Strictly separates external tonnage from bodyweight and timed movements.
 * 
 * @param {Object} params
 * @returns {Object}
 */
export const getWeeklyAthleteRecap = ({
    workouts = [],
    readinessLogs = [],
    bodyStats = [],
    prRecords = {},
    activeProgram = null,
    targetDate = new Date(),
    latestBodyweight = null,
} = {}) => {
    const validWorkouts = getFilteredRecordsOnOrBefore(workouts, targetDate, "date");
    const validReadiness = getFilteredRecordsOnOrBefore(readinessLogs, targetDate, "date");
    const validBodyStats = getFilteredRecordsOnOrBefore(bodyStats, targetDate, "date");

    const targetNorm = normalizeToLocalDate(targetDate);
    const endTimestamp = targetNorm.timestamp + (24 * 60 * 60 * 1000) - 1;
    const startTimestamp = targetNorm.timestamp - (6 * 24 * 60 * 60 * 1000); // 7-day window

    // Workouts in current 7-day window
    const weekWorkouts = validWorkouts.filter((w) => {
        const val = w.date ?? w.timestamp ?? w.createdAt;
        const time = typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())
            ? normalizeToLocalDate(val).timestamp
            : new Date(val).getTime();
        return time >= startTimestamp && time <= endTimestamp;
    });

    const sessionsCompleted = weekWorkouts.length;
    const plannedDays = activeProgram?.days?.filter(d => !d.isRest)?.length || 6;
    const adherenceRate = Math.min(100, Math.round((sessionsCompleted / plannedDays) * 100));

    // Volume & Tonnage Breakdown strictly adhering to Phase 1 taxonomy
    let externalTonnageKg = 0;
    let totalWorkingSets = 0;
    let bodyweightWorkingSets = 0;
    let bodyweightCompletedReps = 0;
    let timedDurationSec = 0;

    const exerciseVolumeMap = {};

    weekWorkouts.forEach((workout) => {
        if (!Array.isArray(workout.exercises)) return;
        workout.exercises.forEach((ex) => {
            const exName = ex.name || ex.exerciseName || "Exercise";
            const category = getExerciseLoadCategory(exName);
            const sets = ex.loggedSets || ex.logs || [];

            if (!exerciseVolumeMap[exName]) {
                exerciseVolumeMap[exName] = { sets: 0, tonnage: 0 };
            }

            sets.forEach((s) => {
                const norm = normalizeLoggedSet(s, exName, latestBodyweight);
                const dur = norm?.durationSec || s?.durationSec || s?.timeSec || 0;
                const reps = norm?.reps || s?.reps || 0;
                const weight = norm?.weightKg || s?.weightKg || 0;
                const isCompleted = !!(norm?.completed || s?.completed || reps > 0 || weight > 0 || dur > 0);

                if (!isCompleted && reps === 0 && weight === 0 && dur === 0) return;

                totalWorkingSets += 1;
                exerciseVolumeMap[exName].sets += 1;

                if (category === "timed" || (dur > 0 && weight === 0 && reps === 0)) {
                    timedDurationSec += dur;
                } else if (category === "free_weight" || category === "machine") {
                    const setTonnage = weight * reps;
                    externalTonnageKg += setTonnage;
                    exerciseVolumeMap[exName].tonnage += setTonnage;
                } else if (category === "bodyweight" || category === "assisted_bodyweight" || category === "weighted_bodyweight") {
                    bodyweightWorkingSets += 1;
                    bodyweightCompletedReps += reps;
                } else if (dur > 0) {
                    timedDurationSec += dur;
                }
            });
        });
    });

    // PRs achieved in current 7-day window
    const newPRs = [];
    weekWorkouts.forEach((w) => {
        if (Array.isArray(w.prsEarned)) {
            w.prsEarned.forEach(pr => newPRs.push(pr));
        }
        if (Array.isArray(w.exercises)) {
            w.exercises.forEach(ex => {
                const sets = ex.loggedSets || ex.logs || [];
                sets.forEach(s => {
                    if (s.isPR || s.isNewPR) {
                        newPRs.push({ exerciseName: ex.name, weightKg: s.weightKg, reps: s.reps });
                    }
                });
            });
        }
    });

    // Top progressing movements in the week
    const evaluatedMovements = Object.keys(exerciseVolumeMap).map((exName) => {
        const vel = getExercisePerformanceVelocity(exName, validWorkouts, latestBodyweight);
        const stall = getExerciseStallStatus(exName, validWorkouts, latestBodyweight);
        return {
            exerciseName: exName,
            velocity: vel.weeklyRate || 0,
            unit: vel.unit || "kg/wk",
            status: stall.status,
            setsLogged: exerciseVolumeMap[exName].sets,
        };
    });

    const progressingMovements = evaluatedMovements
        .filter(m => m.velocity > 0)
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, 3);

    const stalledMovements = evaluatedMovements
        .filter(m => m.status === "STALLED" || m.status === "PLATEAU")
        .slice(0, 3);

    // Readiness 7-day Average
    const weekReadiness = validReadiness.filter((r) => {
        const val = r.date ?? r.timestamp;
        const time = typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())
            ? normalizeToLocalDate(val).timestamp
            : new Date(val).getTime();
        return time >= startTimestamp && time <= endTimestamp;
    });

    const avgReadiness = weekReadiness.length > 0
        ? Math.round(weekReadiness.reduce((sum, r) => sum + (r.score || 0), 0) / weekReadiness.length)
        : null;

    // Load Trend & ACWR
    const loadTrend = getTrainingLoadTrend(validWorkouts, targetDate);

    // Bodyweight 7-day average
    const currentBWAvg = getRolling7DayAverageBodyweight(validBodyStats, targetDate);
    const prevDate = new Date(startTimestamp - 86400000);
    const prevBWAvg = getRolling7DayAverageBodyweight(validBodyStats, prevDate);
    const bodyweightDeltaKg = (currentBWAvg && prevBWAvg)
        ? parseFloat((currentBWAvg - prevBWAvg).toFixed(2))
        : null;

    // Actionable Takeaways
    const takeaways = [];
    if (adherenceRate >= 80) {
        takeaways.push(`High adherence: Completed ${sessionsCompleted}/${plannedDays} planned sessions (${adherenceRate}%).`);
    } else {
        takeaways.push(`Adherence gap: Completed ${sessionsCompleted}/${plannedDays} planned sessions (${adherenceRate}%). Prioritize schedule stability.`);
    }

    if (newPRs.length > 0) {
        takeaways.push(`Achieved ${newPRs.length} new Personal Record${newPRs.length > 1 ? "s" : ""} this week.`);
    }

    if (progressingMovements.length > 0) {
        const top = progressingMovements[0];
        takeaways.push(`Top progressing movement: ${top.exerciseName} (+${top.velocity.toFixed(2)} ${top.unit}).`);
    }

    if (loadTrend.workloadRatio > 1.30) {
        takeaways.push(`Training stress elevated (ACWR: ${loadTrend.workloadRatio.toFixed(2)}). Maintain adequate sleep and recovery.`);
    } else if (loadTrend.workloadRatio >= 0.80) {
        takeaways.push(`Workload optimal (ACWR: ${loadTrend.workloadRatio.toFixed(2)}). Well-positioned for progressive overload.`);
    }

    // Next Week Focus
    let nextWeekFocus = "Maintain consistent training execution and progressive overload.";
    if (loadTrend.trendClassification === "SUBSTANTIALLY_ELEVATED" || loadTrend.workloadRatio > 1.45) {
        nextWeekFocus = "Deload or reduce auxiliary volume to supercompensate from accumulated fatigue.";
    } else if (stalledMovements.length > 0) {
        nextWeekFocus = `Review technique and assistance work on stalled movement: ${stalledMovements[0].exerciseName}.`;
    } else if (progressingMovements.length > 0) {
        nextWeekFocus = `Continue progressive overload on ${progressingMovements[0].exerciseName}.`;
    }

    return {
        startDate: normalizeToLocalDate(new Date(startTimestamp)).dateString,
        endDate: targetNorm.dateString,
        adherence: {
            sessionsCompleted,
            plannedDays,
            adherenceRate,
        },
        volume: {
            totalWorkingSets,
            externalTonnageKg: parseFloat(externalTonnageKg.toFixed(1)),
            bodyweightWorkingSets,
            bodyweightCompletedReps,
            timedDurationSec,
        },
        performance: {
            newPRCount: newPRs.length,
            newPRs: newPRs.slice(0, 5),
            progressingMovements,
            stalledMovements,
        },
        recovery: {
            averageReadiness: avgReadiness,
            acwr: loadTrend.workloadRatio,
            fatigueStatus: loadTrend.trendClassification,
        },
        bodyweight: {
            rolling7DayAverageKg: currentBWAvg,
            deltaPreviousWeekKg: bodyweightDeltaKg,
        },
        takeaways: takeaways.slice(0, 4),
        nextWeekFocus,
    };
};

// ────────────────────────────────────────────────────────────────
// 24. PHASE 6: ATHLETE TIMELINE ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Dynamically derives chronological athlete timeline events from existing records.
 * Returns events sorted from newest to oldest.
 * 
 * @param {Object} params
 * @returns {Array<Object>}
 */
export const getAthleteTimelineEvents = ({
    workouts = [],
    prRecords = {},
    programVersions = [],
    activeProgram = null,
    targetDate = new Date(),
    latestBodyweight = null,
} = {}) => {
    const validWorkouts = getFilteredRecordsOnOrBefore(workouts, targetDate, "date");
    const validVersions = getFilteredRecordsOnOrBefore(programVersions, targetDate, "createdAt");
    const targetNorm = normalizeToLocalDate(targetDate);
    const targetEndTime = targetNorm.timestamp + (24 * 60 * 60 * 1000) - 1;

    const events = [];

    // 1. Workout Completed Events
    validWorkouts.forEach((w, idx) => {
        const dateStr = w.date || w.timestamp || targetNorm.dateString;
        const time = new Date(dateStr).getTime();
        const targetName = w.target || w.dayName || `Day ${w.day || 1}`;

        let externalTonnage = 0;
        let setCt = 0;
        if (Array.isArray(w.exercises)) {
            w.exercises.forEach(ex => {
                const sets = ex.loggedSets || ex.logs || [];
                sets.forEach(s => {
                    if (s.completed || s.reps > 0) {
                        setCt += 1;
                        if (s.weightKg > 0 && s.reps > 0) {
                            externalTonnage += s.weightKg * s.reps;
                        }
                    }
                });
            });
        }

        events.push({
            id: `workout_${w.id || idx}_${time}`,
            timestamp: new Date(time).toISOString(),
            type: "WORKOUT_COMPLETED",
            title: `Completed ${targetName}`,
            description: `${setCt} sets · ${Math.round(externalTonnage)} kg external tonnage`,
            metadata: {
                day: w.day,
                target: targetName,
                totalSets: setCt,
                tonnageKg: Math.round(externalTonnage),
            },
        });
    });

    // 2. PR Events
    if (prRecords && typeof prRecords === "object") {
        Object.entries(prRecords).forEach(([exName, record]) => {
            if (!record) return;
            const prTime = record.timestamp || record.date ? new Date(record.timestamp || record.date).getTime() : 0;
            if (prTime > 0 && prTime <= targetEndTime) {
                events.push({
                    id: `pr_${exName}_${prTime}`,
                    timestamp: new Date(prTime).toISOString(),
                    type: "NEW_PR",
                    title: `Personal Record: ${exName}`,
                    description: `${record.weightKg} kg × ${record.reps} reps (Est 1RM: ${record.estimated1RM || record.weightKg} kg)`,
                    metadata: {
                        exerciseName: exName,
                        weightKg: record.weightKg,
                        reps: record.reps,
                        estimated1RM: record.estimated1RM,
                    },
                });
            }
        });
    }

    // 3. Program Adaptation & Deload Events
    validVersions.forEach((ver, idx) => {
        const vTime = ver.createdAt ? new Date(ver.createdAt).getTime() : 0;
        if (vTime > 0 && vTime <= targetEndTime) {
            const isDeload = ver.type === "TEMPORARY_DELOAD" || ver.isDeloadActive;
            events.push({
                id: `ver_${ver.versionId || idx}_${vTime}`,
                timestamp: new Date(vTime).toISOString(),
                type: isDeload ? "DELOAD_STARTED" : "PROGRAM_ADAPTED",
                title: isDeload ? "Deload Block Activated" : `Program Updated: v${ver.versionNumber || "1.0"}`,
                description: ver.adaptationSummary || (isDeload ? "Temporary fatigue reduction block active." : "Program updated with progression targets."),
                metadata: {
                    versionId: ver.versionId,
                    versionNumber: ver.versionNumber,
                    type: ver.type,
                },
            });
        }
    });

    // 4. Milestone Consistency Events
    const totalCount = validWorkouts.length;
    const consistencyMilestones = [10, 25, 50, 100];
    consistencyMilestones.forEach(mCount => {
        if (totalCount >= mCount) {
            const milestoneWorkout = validWorkouts[mCount - 1];
            if (milestoneWorkout) {
                const mTime = new Date(milestoneWorkout.date || milestoneWorkout.timestamp || Date.now()).getTime();
                events.push({
                    id: `streak_${mCount}_${mTime}`,
                    timestamp: new Date(mTime).toISOString(),
                    type: "CONSISTENCY_STREAK",
                    title: `${mCount} Workouts Logged`,
                    description: `Earned ${mCount} Completed Sessions milestone.`,
                    metadata: { milestoneCount: mCount },
                });
            }
        }
    });

    // Sort chronologically (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// ────────────────────────────────────────────────────────────────
// 25. PHASE 6: ATHLETE ACHIEVEMENTS ENGINE
// ────────────────────────────────────────────────────────────────

/**
 * Universal Conquer ONE Achievement Definitions & Verifier.
 * Strictly derives achievement states from real historical records. Zero synthetic gamification.
 * 
 * @param {Object} params
 * @returns {Array<Object>}
 */
export const getAthleteAchievements = ({
    workouts = [],
    prRecords = {},
    programVersions = [],
    bodyStats = [],
    targetDate = new Date(),
    latestBodyweight = null,
} = {}) => {
    const validWorkouts = getFilteredRecordsOnOrBefore(workouts, targetDate, "date");
    const validBodyStats = getFilteredRecordsOnOrBefore(bodyStats, targetDate, "date");
    const userBW = latestBodyweight || (validBodyStats.length > 0 ? parseFloat(validBodyStats[validBodyStats.length - 1].weightKg) : 75.0);

    const achievements = [];

    // Helper: Find maximum e1RM recorded for an exercise
    const getMaxE1RM = (exerciseName) => {
        const history = getExerciseHistory(exerciseName, validWorkouts, userBW);
        let maxE1RM = 0;
        let dateAchieved = null;
        history.forEach(session => {
            if (session.estimated1RM && session.estimated1RM > maxE1RM) {
                maxE1RM = session.estimated1RM;
                dateAchieved = session.date;
            }
        });
        const pr = prRecords ? prRecords[exerciseName] : null;
        if (pr) {
            const prE1RM = pr.estimated1RM || calculateEstimated1RM(pr.weightKg, pr.reps) || pr.weightKg || 0;
            if (prE1RM > maxE1RM) {
                maxE1RM = prE1RM;
                dateAchieved = pr.date || dateAchieved;
            }
        }
        return { maxE1RM, dateAchieved };
    };

    // 1. FIRST_PR
    const hasAnyPR = (prRecords && Object.keys(prRecords).length > 0) || validWorkouts.some(w => w.prsEarned?.length > 0);
    achievements.push({
        id: "FIRST_PR",
        title: "First Breakthrough",
        description: "Set your first verified Personal Record in any tracked movement.",
        category: "PERFORMANCE",
        icon: "trophy-outline",
        isUnlocked: hasAnyPR,
        unlockedAt: hasAnyPR ? validWorkouts[0]?.date || null : null,
        progress: {
            current: hasAnyPR ? 1 : 0,
            target: 1,
            percentage: hasAnyPR ? 100 : 0,
            unit: "PR",
        },
    });

    // 2. CENTURY_BENCH (100 kg Bench Press Estimated 1RM)
    const benchData = getMaxE1RM("Barbell Bench Press");
    const isCenturyBench = benchData.maxE1RM >= 100.0;
    achievements.push({
        id: "CENTURY_BENCH",
        title: "Century Club Bench",
        description: "Achieved an Estimated 1RM of 100+ kg on Barbell Bench Press.",
        category: "PERFORMANCE",
        icon: "barbell-outline",
        isUnlocked: isCenturyBench,
        unlockedAt: isCenturyBench ? benchData.dateAchieved : null,
        progress: {
            current: benchData.maxE1RM,
            target: 100.0,
            percentage: Math.min(100, Math.round((benchData.maxE1RM / 100.0) * 100)),
            unit: "kg",
        },
    });

    // 3. TRIPLE_PLATE_DEADLIFT (140 kg Deadlift Estimated 1RM)
    const deadliftData = getMaxE1RM("Barbell Deadlift");
    const isTripleDeadlift = deadliftData.maxE1RM >= 140.0;
    achievements.push({
        id: "TRIPLE_PLATE_DEADLIFT",
        title: "Triple Plate Deadlift",
        description: "Deadlifted 140+ kg (3 plates per side) in Estimated 1RM.",
        category: "PERFORMANCE",
        icon: "fitness-outline",
        isUnlocked: isTripleDeadlift,
        unlockedAt: isTripleDeadlift ? deadliftData.dateAchieved : null,
        progress: {
            current: deadliftData.maxE1RM,
            target: 140.0,
            percentage: Math.min(100, Math.round((deadliftData.maxE1RM / 140.0) * 100)),
            unit: "kg",
        },
    });

    // 4. DOUBLE_BW_SQUAT (2.0x Bodyweight Squat)
    const squatData = getMaxE1RM("Barbell Back Squat");
    const squatTargetKg = parseFloat((userBW * 2.0).toFixed(1));
    const isDoubleBWSquat = squatData.maxE1RM >= squatTargetKg && squatData.maxE1RM > 0;
    achievements.push({
        id: "DOUBLE_BW_SQUAT",
        title: "Double Bodyweight Squat",
        description: `Squatted 2.0x bodyweight (${squatTargetKg} kg) in Estimated 1RM.`,
        category: "PERFORMANCE",
        icon: "shield-outline",
        isUnlocked: isDoubleBWSquat,
        unlockedAt: isDoubleBWSquat ? squatData.dateAchieved : null,
        progress: {
            current: squatData.maxE1RM,
            target: squatTargetKg,
            percentage: squatTargetKg > 0 ? Math.min(100, Math.round((squatData.maxE1RM / squatTargetKg) * 100)) : 0,
            unit: "kg",
        },
    });

    // 5. BODYWEIGHT_BENCH (1.0x Bodyweight Bench Press)
    const benchTargetKg = parseFloat(userBW.toFixed(1));
    const isBWBench = benchData.maxE1RM >= benchTargetKg && benchData.maxE1RM > 0;
    achievements.push({
        id: "BODYWEIGHT_BENCH",
        title: "Bodyweight Press",
        description: `Bench pressed 1.0x bodyweight (${benchTargetKg} kg) in Estimated 1RM.`,
        category: "PERFORMANCE",
        icon: "flame-outline",
        isUnlocked: isBWBench,
        unlockedAt: isBWBench ? benchData.dateAchieved : null,
        progress: {
            current: benchData.maxE1RM,
            target: benchTargetKg,
            percentage: benchTargetKg > 0 ? Math.min(100, Math.round((benchData.maxE1RM / benchTargetKg) * 100)) : 0,
            unit: "kg",
        },
    });

    // 6. CONSISTENCY_10_SESSIONS
    const totalWorkouts = validWorkouts.length;
    const is10Workouts = totalWorkouts >= 10;
    achievements.push({
        id: "CONSISTENCY_10_SESSIONS",
        title: "Foundation Builder",
        description: "Logged 10 completed workouts.",
        category: "CONSISTENCY",
        icon: "calendar-outline",
        isUnlocked: is10Workouts,
        unlockedAt: is10Workouts ? validWorkouts[9]?.date || null : null,
        progress: {
            current: totalWorkouts,
            target: 10,
            percentage: Math.min(100, Math.round((totalWorkouts / 10) * 100)),
            unit: "sessions",
        },
    });

    // 7. CONSISTENCY_25_SESSIONS
    const is25Workouts = totalWorkouts >= 25;
    achievements.push({
        id: "CONSISTENCY_25_SESSIONS",
        title: "Iron Habit",
        description: "Logged 25 completed workouts.",
        category: "CONSISTENCY",
        icon: "medal-outline",
        isUnlocked: is25Workouts,
        unlockedAt: is25Workouts ? validWorkouts[24]?.date || null : null,
        progress: {
            current: totalWorkouts,
            target: 25,
            percentage: Math.min(100, Math.round((totalWorkouts / 25) * 100)),
            unit: "sessions",
        },
    });

    // 8. CONSISTENCY_50_SESSIONS
    const is50Workouts = totalWorkouts >= 50;
    achievements.push({
        id: "CONSISTENCY_50_SESSIONS",
        title: "Dedicated Athlete",
        description: "Logged 50 completed workouts.",
        category: "CONSISTENCY",
        icon: "star-outline",
        isUnlocked: is50Workouts,
        unlockedAt: is50Workouts ? validWorkouts[49]?.date || null : null,
        progress: {
            current: totalWorkouts,
            target: 50,
            percentage: Math.min(100, Math.round((totalWorkouts / 50) * 100)),
            unit: "sessions",
        },
    });

    // 9. CONSISTENCY_100_SESSIONS
    const is100Workouts = totalWorkouts >= 100;
    achievements.push({
        id: "CONSISTENCY_100_SESSIONS",
        title: "Century of Iron",
        description: "Logged 100 completed workouts.",
        category: "CONSISTENCY",
        icon: "ribbon-outline",
        isUnlocked: is100Workouts,
        unlockedAt: is100Workouts ? validWorkouts[99]?.date || null : null,
        progress: {
            current: totalWorkouts,
            target: 100,
            percentage: Math.min(100, Math.round((totalWorkouts / 100) * 100)),
            unit: "sessions",
        },
    });

    // 10. DELOAD_EXECUTED
    const hasDeload = programVersions.some(v => v.type === "TEMPORARY_DELOAD" || v.isDeloadActive) || validWorkouts.some(w => w.isDeloadSession);
    achievements.push({
        id: "DELOAD_EXECUTED",
        title: "Strategic Recovery",
        description: "Executed a planned deload to supercompensate from fatigue.",
        category: "PROGRAM",
        icon: "refresh-circle-outline",
        isUnlocked: hasDeload,
        unlockedAt: hasDeload ? validWorkouts[0]?.date || null : null,
        progress: {
            current: hasDeload ? 1 : 0,
            target: 1,
            percentage: hasDeload ? 100 : 0,
            unit: "deload",
        },
    });

    return achievements;
};

