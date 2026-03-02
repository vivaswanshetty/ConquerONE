import AsyncStorage from "@react-native-async-storage/async-storage";
import { triggerAutoSync } from "./sync";

const CONFIG_KEY = "@workout_overrides";

/**
 * Loads custom workout configurations from storage.
 * Structure: { [exerciseName]: { sets, activeTimeSec, restTimeSec } }
 */
export const getWorkoutOverrides = async () => {
    try {
        const data = await AsyncStorage.getItem(CONFIG_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Failed to load workout overrides", e);
        return {};
    }
};

/**
 * Saves a custom configuration for a specific exercise.
 */
export const saveExerciseConfig = async (exerciseName, config) => {
    try {
        const overrides = await getWorkoutOverrides();
        overrides[exerciseName] = {
            ...overrides[exerciseName],
            ...config
        };
        await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(overrides));
        triggerAutoSync();
    } catch (e) {
        console.error("Failed to save exercise config", e);
    }
};

/**
 * Merges the original workout data with user overrides.
 */
export const getEnhancedWorkoutPlan = async (originalPlan) => {
    const overrides = await getWorkoutOverrides();
    return originalPlan.map(day => ({
        ...day,
        exercises: day.exercises.map(ex => {
            const override = overrides[ex.name];
            if (override) {
                return { ...ex, ...override };
            }
            return ex;
        })
    }));
};
