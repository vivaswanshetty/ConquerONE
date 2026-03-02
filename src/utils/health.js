import {
    initialize as initHealthConnect,
    requestPermission as requestHealthConnectPermission,
    insertRecords as insertHealthConnectRecords,
} from 'react-native-health-connect';
import AppleHealthKit from 'react-native-health';
import { Platform } from 'react-native';

/**
 * Health Permissions Configuration
 */
const HEALTH_CONNECT_PERMISSIONS = [
    { accessType: 'write', recordType: 'ExerciseSession' },
    { accessType: 'write', recordType: 'TotalCaloriesBurned' },
];

const APPLE_HEALTH_PERMISSIONS = {
    permissions: {
        write: [
            AppleHealthKit.Constants.Permissions.Workout,
            AppleHealthKit.Constants.Permissions.EnergyBurned,
        ],
    },
};

/**
 * Initializes Health components for the current platform
 */
export const initHealthSync = async () => {
    if (Platform.OS === 'android') {
        try {
            return await initHealthConnect();
        } catch (e) { return false; }
    }
    return true; // iOS doesn't need explicit init before permission request
};

/**
 * Requests necessary permissions for syncing workouts (Android & iOS)
 */
export const requestHealthPermissions = async () => {
    if (Platform.OS === 'android') {
        try {
            await initHealthConnect();
            return await requestHealthConnectPermission(HEALTH_CONNECT_PERMISSIONS);
        } catch (e) { return false; }
    }

    if (Platform.OS === 'ios') {
        return new Promise((resolve) => {
            AppleHealthKit.initHealthKit(APPLE_HEALTH_PERMISSIONS, (err) => {
                if (err) resolve(false);
                else resolve(true);
            });
        });
    }

    return false;
};

/**
 * Syncs a completed workout session to Health (Google Fit or Apple Health)
 */
export const syncWorkoutToHealth = async (workoutData) => {
    if (Platform.OS === 'android') {
        return syncToAndroid(workoutData);
    } else if (Platform.OS === 'ios') {
        return syncToIOS(workoutData);
    }
};

const syncToAndroid = async (workoutData) => {
    try {
        const isInitialized = await initHealthConnect();
        if (!isInitialized) return;

        const startTime = new Date(workoutData.startTime).toISOString();
        const endTime = new Date(workoutData.endTime).toISOString();

        const records = [
            {
                recordType: 'ExerciseSession',
                startTime,
                endTime,
                exerciseType: 'strength_training',
                title: `CONQUER ONE - ${workoutData.title}`,
                notes: `${workoutData.totalSets} sets completed.`,
            }
        ];

        if (workoutData.calories > 0) {
            records.push({
                recordType: 'TotalCaloriesBurned',
                startTime,
                endTime,
                energy: { value: workoutData.calories, unit: 'kilocalories' }
            });
        }

        await insertHealthConnectRecords(records);
        return true;
    } catch (e) { return false; }
};

const syncToIOS = async (workoutData) => {
    return new Promise((resolve) => {
        const options = {
            type: 'Workout',
            startDate: new Date(workoutData.startTime).toISOString(),
            endDate: new Date(workoutData.endTime).toISOString(),
            energyBurned: workoutData.calories,
            energyBurnedUnit: 'calorie',
            activityType: 'TraditionalStrengthTraining',
            metadata: {
                HKExternalUUID: `CONQUER_${workoutData.title}_${Date.now()}`,
                HKDeviceName: 'CONQUER ONE CORE',
            }
        };

        AppleHealthKit.saveWorkout(options, (err) => {
            if (err) resolve(false);
            else resolve(true);
        });
    });
};
