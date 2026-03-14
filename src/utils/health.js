/**
 * health.js
 * Comprehensive Health Connect integration for Android.
 * Handles permissions, daily activity syncing, and workout archiving.
 */

import {
    initialize,
    requestPermission,
    getGrantedPermissions,
    revokeAllPermissions,
    readRecords,
    getSdkStatus,
    SdkAvailabilityStatus
} from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_CONNECTED_KEY = '@conquerone_health_connected';

/**
 * Ensures Health Connect is installed and initialized.
 */
export const checkHealthConnectStatus = async () => {
    try {
        const status = await getSdkStatus();
        if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
            console.warn("Health Connect is not available on this device.");
            return false;
        }
        if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
            await initialize();
            return true;
        }
        // SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED (status === 2)
        console.warn("Health Connect needs an update.");
        return false;
    } catch (e) {
        console.log("Health Connect initialization failed:", e);
        return false;
    }
};

/**
 * Requests the primary permissions needed for ConquerONE.
 * Saves connection status to AsyncStorage on success.
 */
export const requestHealthPermissions = async () => {
    try {
        const isReady = await checkHealthConnectStatus();
        if (!isReady) return false;

        const result = await requestPermission([
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'read', recordType: 'Distance' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'write', recordType: 'TotalCaloriesBurned' },
        ]);

        if (result) {
            await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
        }

        return result;
    } catch (e) {
        console.log("Permission request failed:", e);
        return false;
    }
};

/**
 * Fetches daily activity stats for the current day.
 */
export const getDailyStats = async () => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = now.toISOString();

        // 1. Fetch Steps — readRecords returns { records: [...] }
        const stepsResult = await readRecords('Steps', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startOfDay,
                endTime: endOfDay,
            },
        });

        // 2. Fetch Active Calories
        const caloriesResult = await readRecords('ActiveCaloriesBurned', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startOfDay,
                endTime: endOfDay,
            },
        });

        // Calculate totals — safely access .records array
        const stepRecords = stepsResult?.records || [];
        const calRecords = caloriesResult?.records || [];

        const totalSteps = stepRecords.reduce((sum, cur) => sum + (cur.count || 0), 0);
        const totalCals = calRecords.reduce((sum, cur) => {
            const kcal = cur.energy?.inKilocalories ?? cur.energy?.value ?? 0;
            return sum + kcal;
        }, 0);

        return {
            steps: totalSteps,
            calories: Math.round(totalCals),
            date: startOfDay
        };
    } catch (e) {
        console.log("Failed to fetch daily stats:", e);
        return { steps: 0, calories: 0 };
    }
};

/**
 * Checks if the user has previously connected Health Connect.
 * Reads from AsyncStorage for instant, reliable status.
 */
export const isHealthConnected = async () => {
    try {
        const saved = await AsyncStorage.getItem(HEALTH_CONNECTED_KEY);
        return saved === 'true';
    } catch (e) {
        console.log("Failed to check health status:", e);
        return false;
    }
};

/**
 * Revokes all Health Connect permissions (disconnect).
 * Clears the saved status from AsyncStorage.
 */
export const disconnectHealth = async () => {
    try {
        await revokeAllPermissions();
        await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'false');
        console.log("Health Connect permissions revoked.");
        return true;
    } catch (e) {
        console.log("Failed to revoke health permissions:", e);
        return false;
    }
};
