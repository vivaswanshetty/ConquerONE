import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Platform, Animated, Modal, Share,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, APP_VERSION } from "../utils/theme";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "../utils/settings";
import {
    clearHistory, clearAllData,
    getWorkoutHistory, getStreak,
    applyStreakFreeze, withdrawStreakFreeze, getLastFreezeDate,
} from "../utils/storage";
import {
    getReminderSettings, scheduleReminder, disableReminder,
    requestNotifPermission, sendStreakAtRiskNotif
} from "../utils/notifications";
import UpdateScreen from "./UpdateScreen";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";


/* --- Legal Content --- */
const TERMS_CONTENT = `CONQUER ONE - TERMS OF USE

1. ACCEPTANCE
By using Conquer One, you agree to these terms. If you do not agree, do not use the application.

2. LICENSE
We grant you a personal, non-exclusive license to use the app for personal fitness tracking for the duration of its life cycle.

3. DATA PRIVACY
We respect your privacy. All workout data is stored locally on your device and synced with your private Firebase account as described in our Privacy Policy.

4. UPDATES
We may update the app at any time to improve performance or security.
`;

const DISCLAIMER_CONTENT = `HEALTH & SAFETY DISCLAIMER

1. NO MEDICAL ADVICE
The content in Conquer One is for informational purposes only. It is not medical advice and is not intended to replace professional consultation.

2. PHYSICAL RISK
Fitness training involves inherent risks of injury. Consult a physician before starting any new exercise program, especially if you have pre-existing conditions.

3. ASSUMPTION OF RISK
By using this app, you acknowledge and assume all risks associated with your physical activity. Conquer One is not responsible for any injuries sustained while training.

4. EQUIPMENT SAFETY
Ensure all equipment is properly maintained and used according to manufacturer instructions.
`;

const REST_OPTIONS = [
    { label: "NONE", val: 0 },
    { label: "+15S", val: 15 },
    { label: "+30S", val: 30 },
    { label: "+45S", val: 45 },
];

const WEIGHT_UNITS = [
    { label: "KG", val: "kg" },
    { label: "LBS", val: "lbs" },
];

const TIME_SLOTS = [
    { label: "07:00 AM", hour: 7, minute: 0 },
    { label: "12:00 PM", hour: 12, minute: 0 },
    { label: "06:00 PM", hour: 18, minute: 0 },
    { label: "09:00 PM", hour: 21, minute: 0 },
];

export default function SettingsScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef(null);
    const notificationsY = useRef(0);
    const { user, profile = null } = useAuth();
    const { showDialog } = useNotification();
    const displayName = profile?.fullName || user?.displayName || "Athlete";
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);
    const [reminder, setReminder] = useState({ enabled: false, hour: 18, minute: 0 });
    const [isFrozenToday, setIsFrozenToday] = useState(false);
    const [freezing, setFreezing] = useState(false);
    const [updateStatus, setUpdateStatus] = useState("idle");
    const [updateId, setUpdateId] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
    const [legalModal, setLegalModal] = useState({ visible: false, title: "", content: "" });
    const contentFade = useRef(new Animated.Value(0)).current;
    const headerFade = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadInitial();
    }, []);

    const loadInitial = async () => {
        // Fetch all at once
        const [s, r, lastFreeze] = await Promise.all([
            getSettings(),
            getReminderSettings(),
            getLastFreezeDate()
        ]);

        setSettings(s);
        setReminder(r);
        setUpdateId(Updates.updateId);
        setIsFrozenToday(lastFreeze === new Date().toISOString().split("T")[0]);
        setLoaded(true);
        Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    };

    useEffect(() => {
        if (route?.params?.scrollTo === "notifications" && loaded) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: notificationsY.current, animated: true });
            }, 600);
        }
    }, [route?.params?.scrollTo, loaded]);

    const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

    const update = async (key, val) => {
        const next = { ...settings, [key]: val };
        setSettings(next);
        await saveSettings(next);
        flash();
    };

    const toggleReminder = async (val) => {
        if (val) {
            const granted = await requestNotifPermission();
            if (!granted) {
                showDialog({
                    title: "PERMISSION REQUIRED",
                    message: "Enable notifications in settings to activate reminders.",
                    confirmText: "CLOSE",
                    singleButton: true
                });
                return;
            }
            await scheduleReminder(reminder.hour, reminder.minute);
        } else {
            await disableReminder();
        }
        setReminder(r => ({ ...r, enabled: val }));
        flash();
    };

    const handleManualFreeze = async () => {
        setFreezing(true);
        if (isFrozenToday) {
            const success = await withdrawStreakFreeze();
            if (success) {
                setIsFrozenToday(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showDialog({
                    title: "FREEZE WITHDRAWN",
                    message: "Streak protection removed. Go get after it, Athlete!",
                    confirmText: "CLOSE",
                    singleButton: true
                });
            }
        } else {
            const success = await applyStreakFreeze();
            if (success) {
                setIsFrozenToday(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showDialog({
                    title: "STREAK FROZEN",
                    message: "Your streak is protected for today. Rest up!",
                    confirmText: "CLOSE",
                    singleButton: true
                });
            }
        }
        setFreezing(false);
        flash();
    };



    if (isDownloadingUpdate) return <UpdateScreen />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            <Animated.View style={[styles.header, {
                paddingTop: insets.top + 12,
                opacity: headerFade
            }]}>
                <View style={{ width: 60, alignItems: "flex-start" }}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>SETTINGS</Text>
                <View style={{ width: 60, alignItems: "flex-end" }}>
                    {saved && (
                        <View style={[styles.savedBadge, { backgroundColor: "rgba(237,234,227,0.06)" }]}>
                            <Text style={[styles.savedText, { color: COLORS.text }]} adjustsFontSizeToFit numberOfLines={1}>SAVED</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            <Animated.ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingBottom: 60 }}
                style={{ opacity: contentFade, transform: [{ translateY: contentFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
            >



                <SectionLabel title="WORKOUT SETTINGS" icon="barbell-outline" />
                <View style={styles.card}>
                    <ToggleRow
                        label="Persistent Display"
                        sublabel="Prevent screen lockout during workouts"
                        icon="phone-portrait-outline"
                        value={settings.keepScreenOn}
                        onToggle={(v) => update("keepScreenOn", v)}
                    />
                    <Divider />
                    <ToggleRow
                        label="Auto-Rest"
                        sublabel="Rest timer starts on set completion"
                        icon="timer-outline"
                        value={settings.autoStartRest}
                        onToggle={(v) => update("autoStartRest", v)}
                    />
                    <Divider />
                    <ToggleRow
                        label="Calorie Analytics"
                        sublabel="Real-time estimate of energy burned"
                        icon="flame-outline"
                        value={settings.showCalories}
                        onToggle={(v) => update("showCalories", v)}
                    />
                    <Divider />
                    <ToggleRow
                        label="Mindset Cues"
                        sublabel="Motivational quotes during rest"
                        icon="bulb-outline"
                        value={settings.restMindset}
                        onToggle={(v) => update("restMindset", v)}
                    />
                </View>

                <SectionLabel title="LOGGING" icon="trophy-outline" />
                <View style={styles.card}>
                    <ToggleRow
                        label="Set Logging"
                        sublabel="Prompt for performance after every set"
                        icon="create-outline"
                        value={settings.setLoggingEnabled}
                        onToggle={(v) => update("setLoggingEnabled", v)}
                    />
                    <Divider />
                    <View style={styles.chipSection}>
                        <View style={styles.chipLabelRow}>
                            <Ionicons name="scale-outline" size={16} color={COLORS.textMuted} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.chipLabel}>MASS UNIT</Text>
                                <Text style={styles.chipSub}>Metric system for logging & tracking</Text>
                            </View>
                        </View>
                        <View style={styles.chipRow}>
                            {WEIGHT_UNITS.map((u) => (
                                <TouchableOpacity
                                    key={u.val}
                                    style={[styles.chip, settings.weightUnit === u.val && styles.chipActive]}
                                    onPress={() => update("weightUnit", u.val)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.chipText, settings.weightUnit === u.val && styles.chipTextActive]}>
                                        {u.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <SectionLabel title="PREFERENCES" icon="pulse-outline" />
                <View style={styles.card}>
                    <ToggleRow
                        label="Haptic Feedback"
                        sublabel="Vibration cues during sessions"
                        icon="finger-print-outline"
                        value={settings.vibrationEnabled}
                        onToggle={(v) => update("vibrationEnabled", v)}
                    />
                    <Divider />
                    <ToggleRow
                        label="Voice Guidance"
                        sublabel="Exercise and rest audio cues"
                        icon="mic-outline"
                        value={settings.soundEnabled}
                        onToggle={(v) => update("soundEnabled", v)}
                    />
                </View>



                <SectionLabel title="REST ALLOCATION" icon="bed-outline" />
                <View style={styles.card}>
                    <View style={styles.chipSection}>
                        <View style={styles.chipLabelRow}>
                            <Ionicons name="add-circle-outline" size={16} color={COLORS.textMuted} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.chipLabel}>RECOVERY OFFSET</Text>
                                <Text style={styles.chipSub}>Global extension for recovery phases</Text>
                            </View>
                        </View>
                        <View style={styles.chipRow}>
                            {REST_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.val}
                                    style={[styles.chip, settings.extraRestSec === opt.val && styles.chipActive]}
                                    onPress={() => update("extraRestSec", opt.val)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.chipText, settings.extraRestSec === opt.val && styles.chipTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <SectionLabel title="STREAK PROTECTION" icon="flame-outline" />
                <View style={[styles.card, { paddingVertical: 10 }]}>
                    <ToggleRow
                        label="Enable Streak Insurance"
                        sublabel="Allows you to manually freeze your streak for recovery days"
                        icon="shield-checkmark-outline"
                        value={settings.streakFreezeEnabled}
                        onToggle={(v) => update("streakFreezeEnabled", v)}
                    />

                    {settings.streakFreezeEnabled && (
                        <View style={styles.freezeActionArea}>
                            <View style={styles.freezeDivider} />
                            <TouchableOpacity
                                style={[styles.freezeMainBtn, isFrozenToday && styles.freezeMainBtnActive]}
                                onPress={handleManualFreeze}
                                disabled={freezing}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.freezeIconCircle, isFrozenToday && { backgroundColor: 'rgba(96,165,250,0.1)' }]}>
                                    <Ionicons
                                        name={isFrozenToday ? "snow" : "snow-outline"}
                                        size={20}
                                        color={isFrozenToday ? "#60A5FA" : COLORS.textSub}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.freezeActionTitle, isFrozenToday && { color: "#60A5FA" }]}>
                                        {isFrozenToday ? "STREAK CURRENTLY FROZEN" : "ACTIVATE FREEZE FOR TODAY"}
                                    </Text>
                                    <Text style={styles.freezeActionSub}>
                                        {isFrozenToday ? "Progress is protected until tomorrow." : "Use this if you can't work out today."}
                                    </Text>
                                </View>
                                {isFrozenToday && (
                                    <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <SectionLabel title="REMINDERS" icon="notifications-outline" />
                <View
                    style={styles.card}
                    onLayout={(e) => { notificationsY.current = e.nativeEvent.layout.y; }}
                >
                    <ToggleRow
                        label="Daily Reminder"
                        sublabel="Notification to stay on track"
                        icon="alarm-outline"
                        value={reminder.enabled}
                        onToggle={toggleReminder}
                    />
                    {reminder.enabled && (
                        <>
                            <Divider />
                            <View style={{ paddingHorizontal: 24, paddingBottom: 20, paddingTop: 12 }}>
                                <Text style={styles.chipSub}>DEPLOYMENT SCHEDULE</Text>
                                <View style={[styles.chipRow, { paddingTop: 16 }]}>
                                    {TIME_SLOTS.map((slot) => {
                                        const active = reminder.hour === slot.hour && reminder.minute === slot.minute;
                                        return (
                                            <TouchableOpacity
                                                key={slot.label}
                                                style={[styles.chip, active && styles.chipActive]}
                                                activeOpacity={0.75}
                                                onPress={async () => {
                                                    await scheduleReminder(slot.hour, slot.minute);
                                                    setReminder(r => ({ ...r, hour: slot.hour, minute: slot.minute }));
                                                    flash();
                                                }}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                    {slot.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    <TouchableOpacity
                                        style={[styles.chip, styles.chipCustom]}
                                        activeOpacity={0.75}
                                        onPress={() => setShowPicker(true)}
                                    >
                                        <Ionicons name="time-outline" size={14} color={COLORS.textSub} style={{ marginRight: 6 }} />
                                        <Text style={styles.chipText}>
                                            {(() => {
                                                const h = reminder.hour % 12 || 12;
                                                const m = String(reminder.minute).padStart(2, "0");
                                                const p = reminder.hour >= 12 ? "PM" : "AM";
                                                const isPreset = TIME_SLOTS.some(s => s.hour === reminder.hour && s.minute === reminder.minute);
                                                return isPreset ? "CUSTOM" : `${h}:${m} ${p}`;
                                            })()}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {showPicker && (
                                    <DateTimePicker
                                        value={(() => {
                                            const d = new Date();
                                            d.setHours(reminder.hour);
                                            d.setMinutes(reminder.minute);
                                            return d;
                                        })()}
                                        mode="time"
                                        is24Hour={false}
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        onChange={async (event, selectedDate) => {
                                            setShowPicker(false);
                                            if (selectedDate) {
                                                const h = selectedDate.getHours();
                                                const m = selectedDate.getMinutes();
                                                await scheduleReminder(h, m);
                                                setReminder(r => ({ ...r, hour: h, minute: m }));
                                                flash();
                                            }
                                        }}
                                    />
                                )}
                            </View>
                        </>
                    )}
                </View>

                <SectionLabel title="ABOUT" icon="cloud-download-outline" />
                <View style={styles.card}>
                    <InfoRow
                        label="App Version"
                        value={__DEV__ ? "DEV" : updateId ? updateId.slice(0, 8).toUpperCase() : "1.0.0"}
                        icon="layers-outline"
                    />
                    <Divider />
                    <TouchableOpacity
                        style={styles.toggleRow}
                        activeOpacity={0.7}
                        onPress={() => Share.share({ message: "💪 CONQUER ONE — Elite Training Protocol. Train like a champion!\n\nDownload: https://conquer-one.app", title: "CONQUER ONE" })}
                    >
                        <View style={styles.toggleIconWrap}>
                            <Ionicons name="share-social-outline" size={18} color={COLORS.textSub} />
                        </View>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>SHARE APP</Text>
                            <Text style={styles.toggleSub}>Invite other athletes to the protocol</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.1)" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                        style={styles.toggleRow}
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL("mailto:support@conquer-one.app?subject=CONQUER ONE - SUPPORT REQUEST")}
                    >
                        <View style={styles.toggleIconWrap}>
                            <Ionicons name="help-buoy-outline" size={18} color={COLORS.textSub} />
                        </View>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>CONTACT SUPPORT</Text>
                            <Text style={styles.toggleSub}>Direct channel to the engineering team</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.1)" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                        style={styles.toggleRow}
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL("mailto:support@conquer-one.app?subject=BUG REPORT - v2.0.0")}
                    >
                        <View style={styles.toggleIconWrap}>
                            <Ionicons name="bug-outline" size={18} color={COLORS.textSub} />
                        </View>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>BUG REPORT</Text>
                            <Text style={styles.toggleSub}>Report technical anomalies in the system</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.1)" />
                    </TouchableOpacity>
                    <Divider />
                    <TouchableOpacity
                        style={styles.updateCheckRow}
                        activeOpacity={0.7}
                        onPress={async () => {
                            setUpdateStatus("checking");
                            try {
                                const result = await Updates.checkForUpdateAsync();
                                if (result.isAvailable) {
                                    setUpdateStatus("available");
                                    setIsDownloadingUpdate(true);
                                    try {
                                        await Updates.fetchUpdateAsync();
                                        setTimeout(() => {
                                            Updates.reloadAsync();
                                        }, 2000);
                                    } catch (fetchErr) {
                                        console.warn("Fetch failed", fetchErr);
                                        setIsDownloadingUpdate(false);
                                        setUpdateStatus("error");
                                    }
                                } else {
                                    setUpdateStatus("latest");
                                    setTimeout(() => setUpdateStatus("idle"), 3000);
                                }
                            } catch (e) {
                                setUpdateStatus("error");
                                setIsDownloadingUpdate(false);
                                setTimeout(() => setUpdateStatus("idle"), 3000);
                            }
                        }}
                    >
                        <Ionicons
                            name={
                                updateStatus === "checking" ? "sync-outline" :
                                    updateStatus === "available" ? "download-outline" :
                                        updateStatus === "latest" ? "checkmark-circle-outline" :
                                            updateStatus === "error" ? "alert-circle-outline" :
                                                "refresh-outline"
                            }
                            size={18}
                            color={
                                updateStatus === "latest" ? "#A0A0A0" :
                                    updateStatus === "error" ? COLORS.accent :
                                        COLORS.textSub
                            }
                        />
                        <Text style={[
                            styles.updateCheckText,
                            updateStatus === "latest" && { color: "#A0A0A0" },
                            updateStatus === "error" && { color: COLORS.accent },
                        ]}>
                            {updateStatus === "checking" ? "CHECKING..." :
                                updateStatus === "available" ? "DOWNLOADING..." :
                                    updateStatus === "latest" ? "UP TO DATE" :
                                        updateStatus === "error" ? "CHECK FAILED" :
                                            "CHECK FOR UPDATES"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <SectionLabel title="LEGAL & SAFETY" icon="shield-checkmark-outline" />
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.toggleRow}
                        activeOpacity={0.7}
                        onPress={() => setLegalModal({ visible: true, title: "TERMS OF USE", content: TERMS_CONTENT })}
                    >
                        <View style={styles.toggleIconWrap}>
                            <Ionicons name="document-text-outline" size={18} color={COLORS.textSub} />
                        </View>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>TERMS OF USE</Text>
                            <Text style={styles.toggleSub}>Review our usage agreement</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.1)" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.toggleRow}
                        activeOpacity={0.7}
                        onPress={() => setLegalModal({ visible: true, title: "HEALTH DISCLAIMER", content: DISCLAIMER_CONTENT })}
                    >
                        <View style={styles.toggleIconWrap}>
                            <Ionicons name="medical-outline" size={18} color={COLORS.textSub} />
                        </View>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>DISCLAIMER</Text>
                            <Text style={styles.toggleSub}>Physical safety & risk notice</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.1)" />
                    </TouchableOpacity>
                </View>

                <SectionLabel title="CRITICAL OPERATIONS" icon="warning-outline" />
                <View style={styles.dangerCard}>
                    <TouchableOpacity
                        style={styles.dangerRow}
                        activeOpacity={0.7}
                        onPress={() =>
                            showDialog({
                                title: "ERASE HISTORY?",
                                message: "Permanently delete session archives, streaks, and performance metrics. Control settings persist.",
                                confirmText: "CONFIRM ERASURE",
                                cancelText: "ABORT",
                                isDestructive: true,
                                onConfirm: async () => {
                                    await clearHistory();
                                    flash();
                                }
                            })
                        }
                    >
                        <Ionicons name="trash-outline" size={18} color={COLORS.accent} style={{ marginRight: 16 }} />
                        <View style={styles.dangerInfo}>
                            <Text style={styles.dangerLabel}>DELETE HISTORY</Text>
                            <Text style={styles.dangerSub}>Wipe all workout logs and streaks</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.dangerDivider} />

                    <TouchableOpacity
                        style={styles.dangerRow}
                        activeOpacity={0.7}
                        onPress={() =>
                            showDialog({
                                title: "RESET EVERYTHING?",
                                message: "All history and settings will be wiped. The app will return to its original state.",
                                confirmText: "RESET",
                                cancelText: "ABORT",
                                isDestructive: true,
                                onConfirm: async () => {
                                    await clearAllData();
                                    navigation.replace("Onboarding");
                                }
                            })
                        }
                    >
                        <Ionicons name="nuclear-outline" size={18} color={COLORS.accent} style={{ marginRight: 16 }} />
                        <View style={styles.dangerInfo}>
                            <Text style={styles.dangerLabel}>FACTORY RESET</Text>
                            <Text style={styles.dangerSub}>Wipe all data and restart</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                        showDialog({
                            title: "RESTORE DEFAULTS?",
                            message: "This will reset all settings to their original values. Your workout data will NOT be affected.",
                            confirmText: "RESET",
                            cancelText: "CANCEL",
                            isDestructive: true,
                            onConfirm: async () => {
                                await saveSettings(DEFAULT_SETTINGS);
                                setSettings(DEFAULT_SETTINGS);
                                flash();
                            }
                        });
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="refresh-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.resetText}>RESTORE DEFAULT SETTINGS</Text>
                </TouchableOpacity>

                <View style={[styles.creditWrap, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={styles.creditText}>BUILT FOR POWER BY <Text style={styles.creditName}>VIVASWAN SHETTY</Text></Text>
                    <Text style={styles.creditVersion}>CONQUER ONE CORE PROTOCOL {APP_VERSION}</Text>
                </View>
            </Animated.ScrollView>

            <LegalModal
                visible={legalModal.visible}
                title={legalModal.title}
                content={legalModal.content}
                onClose={() => setLegalModal({ ...legalModal, visible: false })}
            />
        </View>
    );
}

function LegalModal({ visible, title, content, onClose }) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={styles.modalSheet}>
                    {/* macOS Liquid Glass Gradient */}
                    <LinearGradient
                        colors={['rgba(32, 32, 40, 0.95)', 'rgba(14, 14, 18, 0.98)', 'rgba(8, 8, 10, 0.99)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.2, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Top Gloss Specular Highlight */}
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
                        pointerEvents="none"
                    />

                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>{title}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                        <Text style={styles.legalBody}>{content}</Text>
                    </ScrollView>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.modalCloseText}>UNDERSTOOD</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function Divider() { return <View style={styles.divider} />; }

function SectionLabel({ title, icon }) {
    return (
        <View style={styles.sectionLabelRow}>
            {icon && <Ionicons name={icon} size={12} color={COLORS.textMuted} />}
            <Text style={styles.sectionLabel}>{title}</Text>
        </View>
    );
}

function ToggleRow({ label, sublabel, icon, value, onToggle, disabled }) {
    return (
        <TouchableOpacity
            style={[styles.toggleRow, disabled && { opacity: 0.3 }]}
            activeOpacity={0.7}
            onPress={() => onToggle(!value)}
            disabled={disabled}
        >
            {icon && (
                <View style={styles.toggleIconWrap}>
                    <Ionicons name={icon} size={18} color={COLORS.textSub} />
                </View>
            )}
            <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{label.toUpperCase()}</Text>
                {sublabel && <Text style={styles.toggleSub}>{sublabel}</Text>}
            </View>
            <PremiumSwitch value={value} disabled={disabled} />
        </TouchableOpacity>
    );
}

function PremiumSwitch({ value, disabled }) {
    const swAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(swAnim, {
            toValue: value ? 1 : 0,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start();
    }, [value]);

    const trackColor = swAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(255,255,255,0.06)", COLORS.primary],
    });

    const thumbTranslate = swAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 18],
    });

    return (
        <Animated.View style={[styles.appleSwitchTrack, { backgroundColor: trackColor }]}>
            <Animated.View style={[
                styles.appleSwitchThumb,
                { transform: [{ translateX: thumbTranslate }] }
            ]} />
        </Animated.View>
    );
}

function InfoRow({ label, value, icon }) {
    return (
        <View style={styles.infoRow}>
            {icon && <Ionicons name={icon} size={18} color={COLORS.textMuted} style={{ marginRight: 16 }} />}
            <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.bgCard,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },
    savedBadge: { backgroundColor: "rgba(255, 255, 255, 0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
    savedText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text },

    betaBadge: { backgroundColor: "rgba(255, 255, 255, 0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
    betaText: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted },

    sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.2 },

    card: {
        marginHorizontal: 20, backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden",
    },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },

    toggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    toggleIconWrap: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 13, fontFamily: FAMILY.medium, color: COLORS.text },
    toggleSub: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },

    appleSwitchTrack: {
        width: 38,
        height: 22,
        borderRadius: 11,
        padding: 2,
        justifyContent: "center",
    },
    appleSwitchThumb: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#FFFFFF",
    },

    chipSection: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 },
    chipLabelRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
    chipLabel: { fontSize: 13, fontFamily: FAMILY.medium, color: COLORS.text },
    chipSub: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textMuted },
    chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg, flexDirection: "row", alignItems: "center" },
    chipActive: { backgroundColor: "rgba(227, 30, 36, 0.12)", borderColor: "rgba(227, 30, 36, 0.4)" },
    chipCustom: { borderStyle: "dashed", borderColor: COLORS.border },
    chipText: { fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.textSub },
    chipTextActive: { color: COLORS.text, fontFamily: FAMILY.monoBold },

    infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16 },
    infoLabel: { fontSize: 13, fontFamily: FAMILY.medium, color: COLORS.textSub, flex: 1 },
    infoValue: { fontSize: 12, fontFamily: FAMILY.monoBold, color: COLORS.text },

    profileIconWrap: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
    profileTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text },
    profileSub: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub, marginTop: 2 },
    freezeActionArea: { marginTop: 4 },
    freezeDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },
    freezeMainBtn: {
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingVertical: 16, paddingHorizontal: 18,
    },
    freezeMainBtnActive: {
        backgroundColor: "rgba(227, 30, 36, 0.08)",
    },
    freezeIconCircle: {
        width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
    freezeActionTitle: {
        fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text,
    },
    freezeActionSub: {
        fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2,
    },
    resetBtn: {
        marginHorizontal: 20, marginTop: 32, paddingVertical: 14,
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
        alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
        backgroundColor: COLORS.bgCard,
    },
    resetText: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub },

    dangerCard: { marginHorizontal: 20, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard, overflow: "hidden" },
    dangerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16 },
    dangerDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 18 },
    dangerInfo: { flex: 1 },
    dangerLabel: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.primary },
    dangerSub: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },

    updateCheckRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
    updateCheckText: { fontSize: 13, fontFamily: FAMILY.medium, color: COLORS.text },

    creditWrap: { marginTop: 40, alignItems: "center", paddingHorizontal: 40 },
    creditText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5, textAlign: "center" },
    creditName: { color: COLORS.primary, fontFamily: FAMILY.bold },
    creditVersion: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 4 },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
    modalSheet: {
        backgroundColor: "rgba(22, 22, 26, 0.95)", borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: 26, paddingBottom: 40,
        borderWidth: 1.2, borderColor: "rgba(255, 255, 255, 0.14)", borderBottomWidth: 0,
        overflow: "hidden",
    },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5, marginBottom: 16 },
    legalBody: { fontSize: 12.5, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 19, marginBottom: 24 },
    modalCloseBtn: { height: 50, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
    modalCloseText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#FFFFFF", letterSpacing: 1 },
});
