/**
 * Strength Standards & Relative Strength Engine
 * Computes 1RM and compares against bodyweight standards across major compound movements.
 */

// Core compound movement definitions and alias matching
export const COMPOUND_CATEGORIES = [
    {
        id: "bench",
        name: "Bench Press",
        targetGroup: "Chest",
        icon: "barbell-outline",
        color: "#E31E24",
        aliases: [
            "barbell bench press",
            "bench press",
            "flat bench press",
            "incline bench press",
            "incline barbell bench press",
            "dumbbell bench press",
            "incline dumbbell press",
            "close grip bench press",
        ],
        // Multipliers based on bodyweight: [Novice, Intermediate, Advanced, Elite]
        thresholds: [0.65, 0.95, 1.30, 1.65],
    },
    {
        id: "squat",
        name: "Squat",
        targetGroup: "Legs",
        icon: "fitness-outline",
        color: "#30D158",
        aliases: [
            "barbell back squat",
            "barbell squat",
            "back squat",
            "squat",
            "front squat",
            "hack squat",
            "leg press",
            "goblet squat",
        ],
        thresholds: [0.85, 1.25, 1.70, 2.15],
    },
    {
        id: "deadlift",
        name: "Deadlift",
        targetGroup: "Posterior",
        icon: "flash-outline",
        color: "#FF9500",
        aliases: [
            "barbell deadlift",
            "conventional deadlift",
            "deadlift",
            "romanian deadlift",
            "stiff leg deadlift",
            "sumo deadlift",
            "trap bar deadlift",
        ],
        thresholds: [1.00, 1.45, 1.95, 2.50],
    },
    {
        id: "ohp",
        name: "Overhead Press",
        targetGroup: "Shoulders",
        icon: "trophy-outline",
        color: "#30B0C7",
        aliases: [
            "overhead press",
            "barbell overhead press",
            "standing overhead press",
            "military press",
            "dumbbell shoulder press",
            "seated dumbbell shoulder press",
            "push press",
        ],
        thresholds: [0.40, 0.60, 0.80, 1.05],
    },
    {
        id: "pull",
        name: "Row & Pull",
        targetGroup: "Back",
        icon: "trending-up-outline",
        color: "#AF52DE",
        aliases: [
            "barbell row",
            "bent over barbell row",
            "bent over row",
            "pendlay row",
            "t-bar row",
            "weighted pull-up",
            "pull-ups",
            "lat pulldown",
            "seated cable row",
        ],
        thresholds: [0.60, 0.85, 1.15, 1.45],
    },
];

export const TIERS = [
    { key: "UNTRAINED", label: "UNTRAINED", color: "#8E8E93", badge: "UN" },
    { key: "NOVICE", label: "NOVICE", color: "#30B0C7", badge: "NOV" },
    { key: "INTERMEDIATE", label: "INTERMEDIATE", color: "#30D158", badge: "INT" },
    { key: "ADVANCED", label: "ADVANCED", color: "#FF9500", badge: "ADV" },
    { key: "ELITE", label: "ELITE", color: "#E31E24", badge: "ELT" },
];

/**
 * Calculates estimated One-Rep Max using the Epley formula:
 * 1RM = weight * (1 + reps / 30)
 */
export function calculate1RM(weightKg, reps) {
    if (!weightKg || weightKg <= 0) return 0;
    if (!reps || reps <= 1) return weightKg;
    return Math.round(weightKg * (1 + reps / 30));
}

/**
 * Find the matching compound category for a given exercise name
 */
export function matchCompoundCategory(exerciseName) {
    if (!exerciseName) return null;
    const clean = exerciseName.toLowerCase().trim();
    for (const cat of COMPOUND_CATEGORIES) {
        for (const alias of cat.aliases) {
            if (clean === alias || clean.includes(alias)) {
                return cat;
            }
        }
    }
    return null;
}

/**
 * Evaluates the athlete's relative strength profile from their PR records and bodyweight
 * @param {Object} prRecords - { [exerciseName]: { weightKg, reps, date, ... } }
 * @param {number} bodyweightKg - User bodyweight (e.g. 75)
 * @returns {Object} Comprehensive strength analysis
 */
export function evaluateStrengthProfile(prRecords = {}, bodyweightKg = 75) {
    const bw = bodyweightKg && bodyweightKg > 30 ? bodyweightKg : 75;
    const results = [];
    let totalScore = 0;
    let scoredCount = 0;

    for (const cat of COMPOUND_CATEGORIES) {
        let best1RM = 0;
        let bestRecord = null;
        let matchedExerciseName = null;

        // Search PR records for the best lift in this compound category
        Object.entries(prRecords || {}).forEach(([exName, record]) => {
            const cleanEx = exName.toLowerCase().trim();
            const isMatch = cat.aliases.some(alias => cleanEx === alias || cleanEx.includes(alias));
            if (isMatch && record && record.weightKg > 0) {
                const est1RM = calculate1RM(record.weightKg, record.reps || 1);
                if (est1RM > best1RM) {
                    best1RM = est1RM;
                    bestRecord = record;
                    matchedExerciseName = exName;
                }
            }
        });

        const ratio = best1RM > 0 ? parseFloat((best1RM / bw).toFixed(2)) : 0;
        const [noviceThresh, interThresh, advThresh, eliteThresh] = cat.thresholds;

        let currentTier = TIERS[0]; // UNTRAINED
        let nextTier = TIERS[1]; // NOVICE
        let progressToNext = 0;
        let targetKgNext = Math.round(noviceThresh * bw);

        if (ratio >= eliteThresh) {
            currentTier = TIERS[4]; // ELITE
            nextTier = null;
            progressToNext = 1.0;
            targetKgNext = Math.round(eliteThresh * bw);
        } else if (ratio >= advThresh) {
            currentTier = TIERS[3]; // ADVANCED
            nextTier = TIERS[4]; // ELITE
            progressToNext = Math.min((ratio - advThresh) / (eliteThresh - advThresh), 1);
            targetKgNext = Math.round(eliteThresh * bw);
        } else if (ratio >= interThresh) {
            currentTier = TIERS[2]; // INTERMEDIATE
            nextTier = TIERS[3]; // ADVANCED
            progressToNext = Math.min((ratio - interThresh) / (advThresh - interThresh), 1);
            targetKgNext = Math.round(advThresh * bw);
        } else if (ratio >= noviceThresh) {
            currentTier = TIERS[1]; // NOVICE
            nextTier = TIERS[2]; // INTERMEDIATE
            progressToNext = Math.min((ratio - noviceThresh) / (interThresh - noviceThresh), 1);
            targetKgNext = Math.round(interThresh * bw);
        } else {
            currentTier = TIERS[0]; // UNTRAINED
            nextTier = TIERS[1]; // NOVICE
            progressToNext = Math.min(ratio / noviceThresh, 1);
            targetKgNext = Math.round(noviceThresh * bw);
        }

        const kgNeeded = best1RM > 0 && nextTier ? Math.max(targetKgNext - best1RM, 1) : targetKgNext;

        if (best1RM > 0) {
            const tierIndex = TIERS.findIndex(t => t.key === currentTier.key);
            totalScore += tierIndex + progressToNext;
            scoredCount++;
        }

        results.push({
            category: cat,
            exerciseName: matchedExerciseName || cat.name,
            bestRecord,
            best1RM,
            ratio,
            currentTier,
            nextTier,
            progressToNext: Math.max(0, Math.min(progressToNext, 1)),
            targetKgNext,
            kgNeeded,
            hasData: best1RM > 0,
        });
    }

    // Overall Athlete Strength Rank
    let overallTier = TIERS[0];
    const overallScore = scoredCount > 0 
        ? Math.min(100, Math.round((totalScore / (COMPOUND_CATEGORIES.length * 4)) * 100)) 
        : 0;

    if (scoredCount > 0) {
        const avgScore = totalScore / COMPOUND_CATEGORIES.length;
        if (avgScore >= 3.5) overallTier = TIERS[4]; // ELITE
        else if (avgScore >= 2.5) overallTier = TIERS[3]; // ADVANCED
        else if (avgScore >= 1.5) overallTier = TIERS[2]; // INTERMEDIATE
        else if (avgScore >= 0.7) overallTier = TIERS[1]; // NOVICE
        else overallTier = TIERS[0];
    }

    return {
        bodyweightKg: bw,
        results,
        overallTier,
        overallScore,
        completedCount: scoredCount,
        totalCategories: COMPOUND_CATEGORIES.length,
    };
}
