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
    openHealthConnectSettings as rnhcOpenSettings,
    SdkAvailabilityStatus
} from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';

const HEALTH_CONNECTED_KEY = '@conquerone_health_connected';

/**
 * Open Health Connect settings on device, fallback to app settings.
 */
export const openHealthSettings = () => {
    try {
        rnhcOpenSettings();
    } catch (_) {
        Linking.openSettings();
    }
};

/**
 * Open Google Play Store for Health Connect (install or update).
 */
export const openHealthConnectPlayStore = () => {
    const marketUrl = 'market://details?id=com.google.android.apps.healthdata';
    const webUrl = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
    Linking.openURL(marketUrl).catch(() => {
        Linking.openURL(webUrl).catch(() => {});
    });
};

/**
 * Detailed availability information for Health Connect.
 */
export const getHealthConnectStatusInfo = async () => {
    if (Platform.OS !== 'android') return { available: false, reason: 'unsupported_platform' };
    try {
        const status = await getSdkStatus();
        if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
            console.warn("Health Connect is not available on this device.");
            return { available: false, reason: 'unavailable' };
        }
        if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
            console.warn("Health Connect needs an update.");
            return { available: false, reason: 'needs_update' };
        }
        if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
            const initialized = await initialize();
            return { available: !!initialized };
        }
        return { available: false, reason: 'unknown', status };
    } catch (e) {
        console.log("Health Connect initialization failed:", e);
        return { available: false, reason: 'error', error: e };
    }
};

/**
 * Ensures Health Connect is installed and initialized.
 * Returns boolean for fast checks.
 */
export const checkHealthConnectStatus = async () => {
    const info = await getHealthConnectStatusInfo();
    return !!info.available;
};

/**
 * Requests the primary permissions needed for ConquerONE.
 * Saves connection status to AsyncStorage on success.
 */
export const requestHealthPermissions = async () => {
    try {
        const statusInfo = await getHealthConnectStatusInfo();
        if (!statusInfo.available) {
            return { success: false, reason: statusInfo.reason };
        }

        const result = await requestPermission([
            { accessType: 'read', recordType: 'Steps' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'read', recordType: 'Distance' },
            { accessType: 'read', recordType: 'HeartRate' },
            { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
            { accessType: 'write', recordType: 'TotalCaloriesBurned' },
        ]);

        const hasGranted = Array.isArray(result) && result.length > 0;
        if (hasGranted) {
            await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
            return { success: true, granted: result };
        }

        return { success: false, reason: 'denied' };
    } catch (e) {
        console.log("Permission request failed:", e);
        return { success: false, reason: 'error', error: e?.message || e };
    }
};

/**
 * Fetches daily activity stats for the current day.
 */
export const getDailyStats = async () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = now.toISOString();

    let totalSteps = 0;
    let totalCals = 0;

    // 1. Fetch Steps safely
    try {
        const stepsResult = await readRecords('Steps', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startOfDay,
                endTime: endOfDay,
            },
        });
        const stepRecords = stepsResult?.records || [];
        totalSteps = stepRecords.reduce((sum, cur) => sum + (cur.count || 0), 0);
    } catch (e) {
        console.log("Failed to fetch steps:", e);
    }

    // 2. Fetch Active Calories safely
    try {
        const caloriesResult = await readRecords('ActiveCaloriesBurned', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startOfDay,
                endTime: endOfDay,
            },
        });
        const calRecords = caloriesResult?.records || [];
        totalCals = calRecords.reduce((sum, cur) => {
            const kcal = cur.energy?.inKilocalories ?? cur.energy?.value ?? 0;
            return sum + kcal;
        }, 0);
    } catch (e) {
        console.log("Failed to fetch calories:", e);
    }

    return {
        steps: totalSteps,
        calories: Math.round(totalCals),
        date: startOfDay
    };
};

/**
 * Checks if the user has connected Health Connect.
 * Reads from AsyncStorage and verifies permissions if already active.
 */
export const isHealthConnected = async () => {
    try {
        const saved = await AsyncStorage.getItem(HEALTH_CONNECTED_KEY);
        if (saved !== 'true') return false;

        const info = await getHealthConnectStatusInfo();
        if (!info.available) return false;

        const granted = await getGrantedPermissions();
        const hasPermissions = Array.isArray(granted) && granted.length > 0;
        if (!hasPermissions) {
            await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'false');
            return false;
        }

        return true;
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
        await AsyncStorage.setItem(HEALTH_CONNECTED_KEY, 'false');
        return true;
    }
};
