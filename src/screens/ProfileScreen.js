import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, Image, ActivityIndicator, Animated,
    Modal, TextInput, KeyboardAvoidingView, Platform, DeviceEventEmitter, InteractionManager
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { getStreak, getTotalWorkouts, getStreakLocal, getTotalWorkoutsLocal } from "../utils/storage";
import { COLORS, SPACING, FAMILY, APP_VERSION, RADIUS } from "../utils/theme";
import { uploadImage } from "../utils/cloudStorage";
import { scheduleBirthdayWishes } from "../utils/notifications";
import { requestHealthPermissions, getDailyStats, isHealthConnected, disconnectHealth } from "../utils/health";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

/* ─── Edit Modal ─────────────────────────────────────────────── */
function EditModal({ visible, title, value, onSave, onClose, multiChoice, choices, inputType = "default" }) {
    const [text, setText] = useState(value || "");
    const [selected, setSelected] = useState(value || "");
    const [date, setDate] = useState(value ? new Date(value) : new Date());
    const [dateTrigger, setDateTrigger] = useState(false);
    const isDate = inputType === "date";

    useEffect(() => {
        setText(value || "");
        setSelected(value || "");
        if (isDate) {
            const d = value ? new Date(value) : new Date();
            setDate(isNaN(d.getTime()) ? new Date() : d);
        }
    }, [value, visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>{title}</Text>

                    {isDate ? (
                        <View style={{ marginBottom: 24, alignItems: 'center' }}>
                            {Platform.OS === 'ios' ? (
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.md, width: '100%', overflow: 'hidden' }}>
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display="spinner"
                                        maximumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) setDate(selectedDate);
                                        }}
                                        textColor={COLORS.text}
                                    />
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.modalInputWrap}
                                        onPress={() => setDateTrigger(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                                        <Text style={styles.modalInput}>
                                            {date.toLocaleDateString()}
                                        </Text>
                                    </TouchableOpacity>
                                    {dateTrigger && (
                                        <DateTimePicker
                                            value={date}
                                            mode="date"
                                            display="default"
                                            maximumDate={new Date()}
                                            onChange={(event, selectedDate) => {
                                                setDateTrigger(false);
                                                if (selectedDate) setDate(selectedDate);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    ) : multiChoice ? (
                        <View style={styles.choiceGrid}>
                            {choices.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.choiceBtn, selected === c && styles.choiceBtnActive]}
                                    onPress={() => setSelected(c)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.choiceBtnText, selected === c && styles.choiceBtnTextActive]}>
                                        {c.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.modalInputWrap}>
                            <TextInput
                                style={styles.modalInput}
                                value={text}
                                onChangeText={setText}
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize={inputType === "email" ? "none" : "words"}
                                keyboardType={inputType === "email" ? "email-address" : "default"}
                                autoFocus
                            />
                        </View>
                    )}

                    <View style={styles.modalBtns}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} activeOpacity={0.7}>
                            <Text style={styles.modalCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalSaveBtn}
                            onPress={() => {
                                let finalVal = multiChoice ? selected : text;
                                if (isDate) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const d = String(date.getDate()).padStart(2, '0');
                                    finalVal = `${year}-${month}-${d}`;
                                }
                                onSave(finalVal);
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.modalSaveText}>SAVE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}



function ActionRow({ icon, label, onPress, color, last, sublabel }) {
    const c = color || COLORS.text;
    const labelColor = color || COLORS.text;
    return (
        <TouchableOpacity
            style={[styles.infoRow, !last && styles.rowBorder]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.rowIconWrap, color && { backgroundColor: `${color}18` }]}>
                <Ionicons name={icon} size={14} color={c} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
                {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
        </TouchableOpacity>
    );
}

function SectionTitle({ title }) {
    return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Card({ children }) {
    return <View style={styles.card}>{children}</View>;
}





export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, profile, signOut, updateUserProfile, verifyEmail, changeEmail, reloadProfile } = useAuth();
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [healthStatus, setHealthStatus] = useState("inactive"); // inactive, active, syncing
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.photoURL);
    const [pwLoading, setPwLoading] = useState(false);

    // Animations
    const ringAnim1 = useRef(new Animated.Value(1)).current;
    const ringAnim2 = useRef(new Animated.Value(1)).current;
    const liveDotOpacity = useRef(new Animated.Value(0.4)).current;

    const [editModal, setEditModal] = useState({ visible: false, field: "", title: "", value: "", type: "text" });
    const { showToast, showDialog } = useNotification();

    useEffect(() => {
        // Breathing ring 1 (chest/crimson accent)
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim1, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
                Animated.timing(ringAnim1, { toValue: 1, duration: 1800, useNativeDriver: true }),
            ])
        ).start();

        // Breathing ring 2 (silver outline accent)
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim2, { toValue: 1.35, duration: 2400, useNativeDriver: true }),
                Animated.timing(ringAnim2, { toValue: 1, duration: 2400, useNativeDriver: true }),
            ])
        ).start();

        // Live Status indicators pulse loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(liveDotOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(liveDotOpacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            loadStats();
            // Sync current avatar state with profile from auth
            if (profile?.photoURL) {
                setCurrentAvatarUrl(profile.photoURL);
            }
            const task = InteractionManager.runAfterInteractions(() => {
                if (cancelled) return;
                checkHealthOnLoad();
                if (user) {
                    user.reload().catch(() => { });
                }
            });
            return () => {
                cancelled = true;
                task.cancel();
            };
        }, [profile?.photoURL, user])
    );

    const checkHealthOnLoad = async () => {
        try {
            const connected = await isHealthConnected();
            if (connected) setHealthStatus("active");
        } catch (_) { }
    };

    const loadStats = async () => {
        // 1. Immediate local cache load
        try {
            const cachedStreak = await getStreakLocal();
            const cachedTotal = await getTotalWorkoutsLocal();
            setStreak(cachedStreak);
            setTotal(cachedTotal);
        } catch (e) {
            console.warn("Failed to load cached stats in ProfileScreen", e);
        }

        // 2. Background cloud sync
        try {
            const [s, t] = await Promise.all([getStreak(), getTotalWorkouts()]);
            setStreak(s);
            setTotal(t);
        } catch (_) { }
    };

    const openEdit = (field, title, value, type = "text") => {
        setEditModal({ visible: true, field, title, value: value || "", type });
    };

    const handleSaveEdit = async (newValue) => {
        const { field } = editModal;
        setEditModal(e => ({ ...e, visible: false }));

        // Handle values gracefully
        if (newValue === undefined || newValue === null) return;
        const val = typeof newValue === "string" ? newValue.trim() : newValue;
        if (val === "" && field !== "gender") return;

        try {
            if (field === "email") {
                await changeEmail(val);
                showToast("Verification link sent to new email", "success");
            } else {
                await updateUserProfile({ [field]: val });
                if (field === "dateOfBirth") {
                    await scheduleBirthdayWishes(val);
                }
            }
        } catch (e) {
            console.warn("[Profile] Update failed:", e.code, e.message);
            const msg = e.code === "auth/requires-recent-login"
                ? "For security, changing your email requires a recent login. Please log out and back in."
                : e.message;
            showToast(msg, "error");
        }
    };

    const handleVerifyEmail = async () => {
        try {
            await verifyEmail();
            showToast("Verification link sent to inbox", "success");
        } catch (e) {
            showToast(e.message, "error");
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            showToast("Gallery access permission required", "error");
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false, // Skip OS crop — we crop programmatically for reliability
                quality: 0.8,
            });

            if (result.canceled) return;

            const uri = result.assets[0].uri;

            // 1. Optimistic UI — show the picked image immediately
            setCurrentAvatarUrl(uri);
            setIsUploading(true);
            setUploadProgress(0);

            // 2. Process image (crop to square + compress + base64)
            const dataUri = await uploadImage(uri, `avatars/${user.uid}`, (pct) => {
                setUploadProgress(pct);
            });

            if (!dataUri) throw new Error("Image processing returned empty.");

            // 3. Save to Firestore
            await updateUserProfile({ photoURL: dataUri });
            setCurrentAvatarUrl(dataUri);

        } catch (err) {
            console.error("[Profile] Upload error:", err);
            setCurrentAvatarUrl(profile?.photoURL);
            showToast("Profile upload failed", "error");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleLogout = () => {
        showDialog({
            title: "LOG OUT",
            message: "End your current session?",
            confirmText: "LOG OUT",
            cancelText: "CANCEL",
            isDestructive: true,
            singleButton: false,
            onConfirm: () => {
                signOut();
            }
        });
    };

    const handleSyncNow = async () => {
        // If already connected, offer to disconnect
        if (healthStatus === "active") {
            showDialog({
                title: "Disconnect Google Fit?",
                message: "This will stop syncing your workouts and health data with Health Connect.",
                confirmText: "Disconnect",
                cancelText: "Cancel",
                isDestructive: true,
                singleButton: false,
                onConfirm: async () => {
                    setSyncing(true);
                    const revoked = await disconnectHealth();
                    if (revoked) {
                        setHealthStatus("inactive");
                        showToast("Google Fit sync disabled", "success");
                    }
                    setSyncing(false);
                }
            });
            return;
        }

        // Connect flow
        setSyncing(true);
        DeviceEventEmitter.emit('showNetworkBanner');

        try {
            const hasCnx = await fetch("https://www.google.com", { method: "HEAD", mode: "no-cors" });
            if (!hasCnx) throw new Error("Offline");

            const success = await requestHealthPermissions();
            if (success) {
                setHealthStatus("active");
                const stats = await getDailyStats();
                console.log("Health Stats:", stats);
                showToast("Google Fit sync enabled", "success");
            }
        } catch (e) {
            showToast("Sync failed. Check connection & settings.", "error");
        } finally {
            setSyncing(false);
        }
    };

    const displayName = profile?.fullName || user?.displayName || "ATHLETE";
    const email = user?.email || "";
    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt?.seconds ? profile.createdAt.seconds * 1000 : profile.createdAt)
            .toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()
        : "—";
    const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    // Dynamic rank based on total workouts
    const getRank = () => {
        if (total >= 100) return { label: "LEGEND", pct: "100%" };
        if (total >= 50) return { label: "TITAN", pct: "95%" };
        if (total >= 25) return { label: "WARRIOR", pct: "88%" };
        if (total >= 10) return { label: "CHADLITE", pct: "75%" };
        if (total >= 5) return { label: "ROOKIE", pct: "60%" };
        return { label: "RECRUIT", pct: "40%" };
    };
    const rank = getRank();

    const handleChangePassword = async () => {
        if (!email) return showToast("No email associated with account", "error");
        showDialog({
            title: "RESET PASSWORD",
            message: `We'll send a password reset link to:\n${email}`,
            confirmText: "SEND LINK",
            cancelText: "CANCEL",
            isDestructive: false,
            singleButton: false,
            onConfirm: async () => {
                setPwLoading(true);
                try {
                    await sendPasswordResetEmail(auth, email);
                    showToast("Password reset link sent", "success");
                } catch (e) {
                    showToast(e.message, "error");
                } finally {
                    setPwLoading(false);
                }
            }
        });
    };

    const firstName = displayName.split(' ')[0];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* ── Floating Header Icons ── */}
            <View style={[styles.topBar, {
                paddingTop: insets.top + 8,
            }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={18} color={COLORS.textSub} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* ── Profile Hero ── */}
                <View style={styles.heroSection}>
                    {/* Breathing concentric double-rings */}
                    <View style={styles.avatarRingsContainer}>
                        <Animated.View style={[
                            styles.avatarHaloRing,
                            {
                                transform: [{ scale: ringAnim2 }],
                                opacity: ringAnim2.interpolate({ inputRange: [1, 1.35], outputRange: [0.35, 0.08] }),
                                borderColor: 'rgba(255, 255, 255, 0.12)'
                            }
                        ]} />
                        <Animated.View style={[
                            styles.avatarHaloRing,
                            {
                                transform: [{ scale: ringAnim1 }],
                                opacity: ringAnim1.interpolate({ inputRange: [1, 1.18], outputRange: [0.6, 0.15] }),
                                borderColor: COLORS.accent
                            }
                        ]} />
                    </View>

                    <TouchableOpacity
                        style={styles.avatarWrap}
                        onPress={pickImage}
                        activeOpacity={0.8}
                        disabled={isUploading}
                    >
                        <View style={styles.avatarRing}>
                            {(() => {
                                const hasImage = typeof currentAvatarUrl === 'string' && currentAvatarUrl.length > 0;
                                if (hasImage) {
                                    return (
                                        <>
                                            <Image
                                                key={currentAvatarUrl}
                                                source={{ uri: currentAvatarUrl }}
                                                style={[styles.avatarImg, isUploading && { opacity: 0.6 }]}
                                                resizeMode="cover"
                                                onError={() => {
                                                    console.warn("Image load failed for:", currentAvatarUrl);
                                                    setCurrentAvatarUrl(null);
                                                }}
                                            />
                                            {isUploading && (
                                                <View style={styles.avatarProgressOverlay}>
                                                    <ActivityIndicator size="small" color="#FFF" style={{ marginBottom: 4 }} />
                                                    <Text style={styles.avatarProgressText}>
                                                        {Math.round(uploadProgress * 100)}%
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    );
                                }
                                return (
                                    <View style={styles.avatarBg}>
                                        <Text style={styles.initials}>{initials}</Text>
                                        {isUploading && (
                                            <View style={styles.avatarProgressOverlay}>
                                                <ActivityIndicator size="small" color="#FFF" />
                                            </View>
                                        )}
                                    </View>
                                );
                            })()}
                        </View>
                        <View style={styles.cameraBtn}>
                            <Ionicons name="camera" size={12} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.heroGreeting}>Welcome back,</Text>
                    <Text style={styles.heroName}>{displayName}</Text>
                    <Text style={styles.heroEmail}>{email}</Text>

                    <View style={styles.heroBadges}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.05)', 'transparent']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.rankBadge}
                        >
                            <Ionicons name="flash" size={10} color={COLORS.accent} />
                            <Text style={styles.rankBadgeText}>{rank.label}</Text>
                        </LinearGradient>
                        <View style={styles.dateBadge}>
                            <Ionicons name="calendar-outline" size={9} color={COLORS.textMuted} />
                            <Text style={styles.dateBadgeText}>SINCE {memberSince}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Stats Strip ── */}
                <View style={styles.statsRow}>
                    <TouchableOpacity
                        style={[styles.statCard, styles.statCardActive]}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            navigation.navigate("Main", { openStreakIntelligence: true });
                        }}
                    >
                        <LinearGradient
                            colors={["rgba(255,255,255,0.03)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.statIconWrap}>
                            <Ionicons name="flame" size={16} color={COLORS.text} />
                        </View>
                        <Text style={styles.statValue}>{streak}</Text>
                        <Text style={styles.statLabel}>DAY STREAK</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={["rgba(255,255,255,0.015)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.statIconWrap}>
                            <Ionicons name="barbell-outline" size={16} color={COLORS.accent} />
                        </View>
                        <Text style={styles.statValue}>{total}</Text>
                        <Text style={styles.statLabel}>SESSIONS</Text>
                    </View>
                    
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={["rgba(255,255,255,0.015)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.statIconWrap}>
                            <Ionicons name="trending-up" size={16} color={COLORS.accent} />
                        </View>
                        <Text style={styles.statValue}>{rank.pct}</Text>
                        <Text style={styles.statLabel}>TOP RANK</Text>
                    </View>
                </View>

                {/* ── Personal Info ── */}
                <SectionTitle title="PERSONAL INFO" />
                <Card>
                    <TouchableOpacity
                        style={[styles.detailRow, styles.rowBorder]}
                        onPress={() => openEdit("fullName", "Edit Name", displayName)}
                        activeOpacity={0.6}
                    >
                        <View style={styles.detailContent}>
                            <Text style={styles.detailValue}>{displayName}</Text>
                            <Text style={styles.detailLabel}>FULL NAME</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.12)" />
                    </TouchableOpacity>

                    <View style={[styles.detailRow, styles.rowBorder]}>
                        <View style={styles.detailContent}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                                <Text style={[styles.detailValue, { flexShrink: 1 }]} numberOfLines={1}>{email}</Text>
                                <View style={[styles.verifiedBadge, { backgroundColor: user?.emailVerified ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)', borderColor: user?.emailVerified ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)' }]}>
                                    <Animated.View style={[
                                        styles.verifiedDot,
                                        {
                                            backgroundColor: user?.emailVerified ? '#FFF' : COLORS.textSub,
                                            opacity: user?.emailVerified ? 1 : liveDotOpacity
                                        }
                                    ]} />
                                    <Text style={[styles.verifiedText, { color: user?.emailVerified ? '#FFF' : COLORS.textSub }]}>
                                        {user?.emailVerified ? "VERIFIED" : "UNVERIFIED"}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.detailLabel}>EMAIL ADDRESS</Text>
                        </View>
                        {!user?.emailVerified && (
                            <TouchableOpacity onPress={handleVerifyEmail} style={styles.miniActionBtn}>
                                <Text style={styles.miniActionBtnText}>VERIFY</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => openEdit("email", "Change Email", email, "email")}
                            style={styles.chevronAction}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.12)" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.detailRow, styles.rowBorder]}
                        onPress={() => openEdit("dateOfBirth", "Edit Birth Date", profile?.dateOfBirth, "date")}
                        activeOpacity={0.6}
                    >
                        <View style={styles.detailContent}>
                            <Text style={styles.detailValue}>{profile?.dateOfBirth || "—"}</Text>
                            <Text style={styles.detailLabel}>DATE OF BIRTH</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.12)" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.detailRow}
                        onPress={() => openEdit("gender", "Select Gender", profile?.gender, "choice")}
                        activeOpacity={0.6}
                    >
                        <View style={styles.detailContent}>
                            <Text style={styles.detailValue}>{profile?.gender || "—"}</Text>
                            <Text style={styles.detailLabel}>GENDER</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.12)" />
                    </TouchableOpacity>
                </Card>

                {/* ── Connected Services ── */}
                <SectionTitle title="CONNECTED SERVICES" />
                <Card>
                    <View style={[styles.serviceRow, styles.rowBorder]}>
                        <View style={[styles.serviceIcon, healthStatus === "active" && { backgroundColor: 'rgba(66,133,244,0.08)', borderColor: 'rgba(66,133,244,0.15)' }]}>
                            <Ionicons
                                name={healthStatus === "active" ? "heart" : "fitness-outline"}
                                size={18}
                                color={healthStatus === "active" ? "#4285F4" : COLORS.textMuted}
                            />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <Text style={[styles.serviceTitle, { flexShrink: 1 }]} numberOfLines={1}>Health Connect</Text>
                                {healthStatus === "active" && (
                                    <View style={styles.liveBadgeMini}>
                                        <Animated.View style={[styles.liveDotMini, { opacity: liveDotOpacity }]} />
                                        <Text style={styles.liveBadgeTextMini}>LIVE</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.serviceSub, { marginTop: 2 }]} numberOfLines={1}>
                                {healthStatus === "active" ? "Linked to Google Fit" : "Sync steps & calories"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.serviceAction, healthStatus === "active" && { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.15)' }]}
                            onPress={handleSyncNow}
                            activeOpacity={0.7}
                        >
                            {syncing ? (
                                <ActivityIndicator size="small" color={COLORS.text} />
                            ) : (
                                <Text style={[styles.serviceActionText, healthStatus === "active" && { color: '#EF4444' }]}>
                                    {healthStatus === "active" ? "DISCONNECT" : "CONNECT"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.serviceRow}>
                        <View style={[styles.serviceIcon, { backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.1)' }]}>
                            <Ionicons name="cloud-done-outline" size={18} color="#22c55e" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.serviceTitle}>Firebase Sync</Text>
                            <Text style={styles.serviceSub}>Real-time backup active</Text>
                        </View>
                        <View style={styles.liveBadge}>
                            <Animated.View style={[styles.liveDot, { opacity: liveDotOpacity }]} />
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                    </View>
                </Card>

                {/* ── Account ── */}
                <SectionTitle title="ACCOUNT" />
                <Card>
                    <ActionRow
                        icon="lock-closed-outline"
                        label="Change Password"
                        sublabel={pwLoading ? "Sending reset link..." : "Reset via email link"}
                        onPress={handleChangePassword}
                    />
                    <ActionRow
                        icon="shield-checkmark-outline"
                        label="Data & Privacy"
                        sublabel="Encryption & data policies"
                        onPress={() => showDialog({
                            title: "DATA & PRIVACY",
                            message: "Your workout data is stored securely on Firebase with end-to-end encryption.\n\n• We never sell your personal data\n• Workout history is backed up to the cloud\n• You can delete your account at any time\n\nFor questions, contact support@conquer-one.app",
                            confirmText: "CLOSE",
                            singleButton: true,
                            isDestructive: false
                        })}
                        last
                    />
                </Card>
 
                <Card>
                    <TouchableOpacity
                        style={styles.dangerRow}
                        onPress={() => showDialog({
                            title: "DELETE ACCOUNT?",
                            message: "This will permanently delete your account and ALL workout data. This action cannot be undone.",
                            confirmText: "DELETE",
                            cancelText: "CANCEL",
                            isDestructive: true,
                            singleButton: false,
                            onConfirm: () => {
                                showDialog({
                                    title: "CONTACT SUPPORT",
                                    message: "Email support@conquer-one.app to process your account deletion.",
                                    confirmText: "CLOSE",
                                    singleButton: true,
                                    isDestructive: false
                                });
                            }
                        })}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="trash-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.dangerText}>Delete Account</Text>
                    </TouchableOpacity>
                </Card>

                <View style={styles.footerSection}>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerBrand}>CONQUER ONE</Text>
                    <Text style={styles.footerAuthor}>by <Text style={{ color: COLORS.accent }}>Vivaswan Shetty</Text></Text>
                    <Text style={styles.version}>{APP_VERSION}</Text>
                </View>

            </ScrollView>

            <EditModal
                visible={editModal.visible}
                title={editModal.title}
                value={editModal.value}
                onClose={() => setEditModal(e => ({ ...e, visible: false }))}
                onSave={handleSaveEdit}
                multiChoice={editModal.type === "choice"}
                choices={GENDER_OPTIONS}
                inputType={editModal.type}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // Header
    topBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 8,
    },
    backBtn: {
        width: 48, height: 48, borderRadius: RADIUS.md,
        backgroundColor: "rgba(255,255,255,0.03)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    },
    logoutBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.03)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    scroll: { paddingBottom: 40 },

    // Hero
    heroSection: {
        alignItems: "center", paddingTop: 16, paddingBottom: 36,
    },
    
    // Concentric double-ring animated styles
    avatarRingsContainer: {
        position: 'absolute',
        top: 16,
        width: 200,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarHaloRing: {
        position: 'absolute',
        width: 122,
        height: 122,
        borderRadius: 61,
        borderWidth: 1.5,
    },
    
    avatarWrap: { position: "relative", marginBottom: 20 },
    avatarRing: {
        padding: 3,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarBg: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: "rgba(255,255,255,0.02)",
        alignItems: "center", justifyContent: "center",
    },
    avatarImg: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#000" },
    avatarLoading: { backgroundColor: "rgba(0,0,0,0.3)" },
    avatarProgressOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 55,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center", justifyContent: "center",
    },
    avatarProgressText: {
        fontSize: 14, fontFamily: FAMILY.monoBold, color: "#fff",
    },
    initials: { fontSize: 32, fontFamily: FAMILY.header, color: COLORS.textMuted },
    cameraBtn: {
        position: "absolute", bottom: 6, right: 6, width: 32, height: 32, borderRadius: 16,
        backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: "#000",
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
    },
    heroGreeting: {
        fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textMuted,
        letterSpacing: 0.5, marginBottom: 4,
    },
    heroName: {
        fontSize: 28, fontFamily: FAMILY.header, color: COLORS.text,
        marginBottom: 4,
    },
    heroEmail: {
        fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textMuted,
        marginBottom: 18,
    },
    heroBadges: { flexDirection: "row", gap: 8 },
    rankBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.03)",
    },
    rankBadgeText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text, letterSpacing: 1 },
    dateBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
    },
    dateBadgeText: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted, letterSpacing: 0.5 },

    // Stats Grid
    statsRow: {
        flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 36,
    },
    statCard: {
        flex: 1, alignItems: "center", paddingVertical: 22, gap: 8,
        backgroundColor: "rgba(13,13,13,0.75)", borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    statCardActive: {
        borderColor: "rgba(255,255,255,0.12)",
        backgroundColor: "rgba(13,13,13,0.75)",
    },
    statIconWrap: {
        width: 36, height: 36, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.03)",
        alignItems: "center", justifyContent: "center",
        marginBottom: 2,
        borderWidth: 0.5, borderColor: "rgba(255,255,255,0.05)",
    },
    statValue: { fontSize: 24, fontFamily: FAMILY.monoBold, color: COLORS.text },
    statLabel: { fontSize: 8, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1.2 },

    // Sections
    sectionTitle: {
        fontSize: 10, fontFamily: FAMILY.semibold, color: COLORS.textMuted,
        letterSpacing: 1.5, marginHorizontal: 20, marginBottom: 14, marginTop: 24,
    },
    card: {
        marginHorizontal: 20, marginBottom: 16,
        backgroundColor: "rgba(13,13,13,0.75)", borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden",
    },

    // Detail rows (value-first pattern)
    detailRow: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingVertical: 18,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
    detailContent: { flex: 1, marginRight: 12 },
    detailValue: {
        fontSize: 15, fontFamily: FAMILY.monoBold, color: COLORS.text,
        marginBottom: 3,
    },
    detailLabel: {
        fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted,
        letterSpacing: 1,
    },

    // Legacy info row
    infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 18 },
    rowIconWrap: { width: 34, height: 34, borderRadius: RADIUS.sm, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center", marginRight: 12, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.05)" },
    rowContent: { flex: 1, marginRight: 12 },
    rowLabel: { fontSize: 13, fontFamily: FAMILY.medium, color: COLORS.text, marginBottom: 2 },
    rowValue: { fontSize: 15, fontFamily: FAMILY.monoBold, color: COLORS.text },
    rowSublabel: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },

    // Verified Badge
    verifiedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
        borderWidth: 1,
    },
    verifiedDot: { width: 4, height: 4, borderRadius: 2 },
    verifiedText: { fontSize: 8, fontFamily: FAMILY.medium, letterSpacing: 0.5 },

    // Connected Services
    serviceRow: {
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingHorizontal: 20, paddingVertical: 18,
    },
    serviceIcon: {
        width: 40, height: 40, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.02)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
    },
    serviceTitle: { fontSize: 14, fontFamily: FAMILY.medium, color: COLORS.text },
    serviceSub: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textMuted },
    serviceAction: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
    },
    serviceActionText: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.text, letterSpacing: 1 },
    
    // Live syncing badges
    liveBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(34,197,94,0.06)",
        borderWidth: 1, borderColor: "rgba(34,197,94,0.12)",
    },
    liveDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e",
    },
    liveBadgeText: { fontSize: 8, fontFamily: FAMILY.monoBold, color: "#22c55e", letterSpacing: 1 },
    
    liveBadgeMini: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(34,197,94,0.06)",
        borderWidth: 0.5,
        borderColor: "rgba(34,197,94,0.15)",
    },
    liveDotMini: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#22c55e",
    },
    liveBadgeTextMini: {
        fontSize: 7,
        fontFamily: FAMILY.monoBold,
        color: "#22c55e",
        letterSpacing: 0.5,
    },

    // Danger
    dangerRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 20, paddingVertical: 18,
    },
    dangerText: { fontSize: 14, fontFamily: FAMILY.medium, color: COLORS.primary },

    footerSection: {
        alignItems: 'center', paddingVertical: 48, gap: 8,
    },
    footerDivider: {
        width: 40, height: 2, borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 16,
    },
    footerBrand: {
        fontSize: 11, fontFamily: FAMILY.header, color: 'rgba(255,255,255,0.15)',
        letterSpacing: 3,
    },
    footerAuthor: {
        fontSize: 10, fontFamily: FAMILY.regular, color: 'rgba(255,255,255,0.08)',
        letterSpacing: 0.5,
    },
    version: { fontSize: 9, fontFamily: FAMILY.mono, color: "rgba(255,255,255,0.06)", letterSpacing: 1.5 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.85)" },
    modalSheet: {
        backgroundColor: "#0A0A0A", borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
        padding: 28, paddingBottom: 48,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "center", marginBottom: 24 },
    modalTitle: { fontSize: 16, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: 0.2, marginBottom: 24 },
    modalInputWrap: {
        backgroundColor: "rgba(255,255,255,0.02)", borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 20, paddingVertical: 16, marginBottom: 28,
        flexDirection: "row", alignItems: "center",
    },
    modalInput: { color: COLORS.text, fontFamily: FAMILY.regular, fontSize: 16, flex: 1, letterSpacing: 0.1 },
    choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
    choiceBtn: {
        paddingHorizontal: 20, paddingVertical: 14, borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
    },
    choiceBtnActive: { backgroundColor: "rgba(237,234,227,0.08)", borderColor: COLORS.border },
    choiceBtnText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 0.5 },
    choiceBtnTextActive: { color: COLORS.text },
    modalBtns: { flexDirection: "row", gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: RADIUS.md, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
    modalCancelText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1 },
    modalSaveBtn: { flex: 2, paddingVertical: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center" },
    modalSaveText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 1 },
    miniActionBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    miniActionBtnText: { fontSize: 8, fontFamily: FAMILY.medium, color: COLORS.text, letterSpacing: 0.5 },
    miniVerifyBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    miniVerifyBtnText: { fontSize: 8, fontFamily: FAMILY.medium, color: COLORS.text, letterSpacing: 0.5 },
    chevronAction: { paddingLeft: 12 },
    customToast: {
        position: "absolute",
        left: 20,
        right: 20,
        backgroundColor: "rgba(10, 10, 10, 0.95)",
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        zIndex: 99999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 10,
        overflow: "hidden",
    },
    customToastText: {
        fontFamily: FAMILY.medium,
        fontSize: 9,
        color: COLORS.textSub,
        flex: 1,
        letterSpacing: 0.5,
    },
    dialogOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
    },
    dialogSheet: {
        width: "86%",
        backgroundColor: "#0A0A0A",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 20,
    },
    dialogTitle: {
        fontSize: 14,
        fontFamily: FAMILY.header,
        color: COLORS.text,
        letterSpacing: 1.5,
        marginBottom: 12,
        textAlign: "center",
    },
    dialogMessage: {
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 18,
        marginBottom: 28,
        textAlign: "center",
    },
});
