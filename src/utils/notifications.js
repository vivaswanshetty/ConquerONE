/**
 * notifications.js
 * Handles scheduling of workout reminders and streak-at-risk warnings
 * using expo-notifications.
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
    REMINDER_ENABLED: "notif_reminder_enabled",
    REMINDER_HOUR: "notif_reminder_hour",
    REMINDER_MINUTE: "notif_reminder_minute",
    REMINDER_ID: "notif_reminder_id",
    BIRTHDAY_ID: "notif_birthday_id",
};

export const DEFAULT_REMINDER = { enabled: false, hour: 18, minute: 0 };

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/** Request permission. Returns true if granted. */
export const requestNotifPermission = async () => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
};

/** Load saved reminder settings from storage. */
export const getReminderSettings = async () => {
    try {
        const [enabled, hour, minute] = await Promise.all([
            AsyncStorage.getItem(KEYS.REMINDER_ENABLED),
            AsyncStorage.getItem(KEYS.REMINDER_HOUR),
            AsyncStorage.getItem(KEYS.REMINDER_MINUTE),
        ]);
        return {
            enabled: enabled === "1",
            hour: hour != null ? parseInt(hour) : DEFAULT_REMINDER.hour,
            minute: minute != null ? parseInt(minute) : DEFAULT_REMINDER.minute,
        };
    } catch {
        return DEFAULT_REMINDER;
    }
};

/** Cancel any existing scheduled reminder. */
const cancelReminder = async () => {
    try {
        const id = await AsyncStorage.getItem(KEYS.REMINDER_ID);
        if (id) await Notifications.cancelScheduledNotificationAsync(id);
    } catch { }
};

/**
 * Schedule a daily workout reminder at the given hour:minute.
 * Cancels any previously scheduled one first.
 */
export const scheduleReminder = async (hour, minute) => {
    await cancelReminder();

    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "ConquerONE · Time to train. 💪",
                body: "Your workout is waiting. Don't break the streak.",
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
            },
        });

        await AsyncStorage.multiSet([
            [KEYS.REMINDER_ENABLED, "1"],
            [KEYS.REMINDER_HOUR, String(hour)],
            [KEYS.REMINDER_MINUTE, String(minute)],
            [KEYS.REMINDER_ID, id],
        ]);
        return id;
    } catch (e) {
        console.log("[notifications] scheduling not supported in this environment");
        return null;
    }
};

/** Disable reminder and cancel the scheduled notification. */
export const disableReminder = async () => {
    await cancelReminder();
    await AsyncStorage.multiSet([
        [KEYS.REMINDER_ENABLED, "0"],
        [KEYS.REMINDER_ID, ""],
    ]);
};

/**
 * Send an immediate local notification warning the user their streak is at risk.
 * Call this from a background task or on app open when last workout was yesterday.
 */
export const sendStreakAtRiskNotif = async (streak) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `ConquerONE · ${streak}-day streak at risk! 🔥`,
                body: "Complete today's workout to keep your streak alive.",
                sound: true,
            },
            trigger: null, // immediate
        });
    } catch (e) {
        console.log("[notifications] not supported in this environment");
    }
};

/**
 * Schedule a yearly birthday notification.
 * @param {Date} dob - User's date of birth
 */
export const scheduleBirthdayWishes = async (dob) => {
    try {
        const existingId = await AsyncStorage.getItem(KEYS.BIRTHDAY_ID);
        if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId);

        if (!dob) return;
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "HAPPY BIRTHDAY, ATHLETE! 🎂",
                body: "Another year stronger. Today we celebrate your discipline. Enjoy your day!",
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.YEARLY,
                month: birthDate.getMonth(),
                day: birthDate.getDate(),
                hour: 9,
                minute: 0,
            },
        });

        await AsyncStorage.setItem(KEYS.BIRTHDAY_ID, id);
        return id;
    } catch (e) {
        console.log("[notifications] birthday scheduling failed", e);
    }
};

/**
 * Send an immediate milestone achievement notification.
 */
export const sendMilestoneNotif = async (title, body) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: `MILESTONE: ${title.toUpperCase()} 🏆`,
                body: body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
        });
    } catch (e) {
        console.log("[notifications] milestone notif failed", e);
    }
};
