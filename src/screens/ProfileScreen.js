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
import { getRankData } from "./RankScreen";

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
                    <LinearGradient
                        colors={['rgba(32, 32, 40, 0.95)', 'rgba(14, 14, 18, 0.98)', 'rgba(8, 8, 10, 0.99)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.2, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.02)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80 }}
                        pointerEvents="none"
                    />

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
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelected(c);
                                    }}
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

/* ─── Modern Components ──────────────────────────────────────── */
function SectionHeader({ title, icon }) {
    return (
        <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentLine} />
            {icon && <Ionicons name={icon} size={13} color={COLORS.primary} style={{ marginRight: 2 }} />}
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

function ProfileCard({ children, style }) {
    return (
        <View style={[styles.card, style]}>
            <LinearGradient
                colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.005)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
            />
            {children}
        </View>
    );
}

function ActionRow({ icon, label, value, sublabel, onPress, last, isDestructive, rightElement }) {
    return (
        <TouchableOpacity
            style={[styles.actionRow, !last && styles.rowBorder]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={[styles.rowIconWrap, isDestructive && styles.destructiveIconWrap]}>
                <Ionicons name={icon} size={16} color={isDestructive ? COLORS.primary : COLORS.textSub} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, isDestructive && styles.destructiveText]}>{label}</Text>
                {sublabel ? (
                    <Text style={styles.rowSublabel}>{sublabel}</Text>
                ) : value ? (
                    <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
                ) : null}
            </View>
            {rightElement ? (
                rightElement
            ) : onPress ? (
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" />
            ) : null}
        </TouchableOpacity>
    );
}

export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, profile, signOut, updateUserProfile, verifyEmail, changeEmail } = useAuth();
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [healthStatus, setHealthStatus] = useState("inactive"); // inactive, active
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile?.photoURL);
    const [pwLoading, setPwLoading] = useState(false);

    // Breathing animations
    const ringAnim1 = useRef(new Animated.Value(1)).current;
    const ringAnim2 = useRef(new Animated.Value(1)).current;
    const liveDotOpacity = useRef(new Animated.Value(0.4)).current;

    const [editModal, setEditModal] = useState({ visible: false, field: "", title: "", value: "", type: "text" });
    const { showToast, showDialog } = useNotification();

    useEffect(() => {
        // Breathing ring 1
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim1, { toValue: 1.15, duration: 2000, useNativeDriver: true }),
                Animated.timing(ringAnim1, { toValue: 1, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        // Breathing ring 2
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim2, { toValue: 1.28, duration: 2600, useNativeDriver: true }),
                Animated.timing(ringAnim2, { toValue: 1, duration: 2600, useNativeDriver: true }),
            ])
        ).start();

        // Live pulse indicator
        Animated.loop(
            Animated.sequence([
                Animated.timing(liveDotOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(liveDotOpacity, { toValue: 0.35, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            loadStats();
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
        try {
            const cachedStreak = await getStreakLocal();
            const cachedTotal = await getTotalWorkoutsLocal();
            setStreak(cachedStreak);
            setTotal(cachedTotal);
        } catch (e) {
            console.warn("Failed to load cached stats in ProfileScreen", e);
        }

        try {
            const [s, t] = await Promise.all([getStreak(), getTotalWorkouts()]);
            setStreak(s);
            setTotal(t);
        } catch (_) { }
    };

    const openEdit = (field, title, value, type = "text") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditModal({ visible: true, field, title, value: value || "", type });
    };

    const handleSaveEdit = async (newValue) => {
        const { field } = editModal;
        setEditModal(e => ({ ...e, visible: false }));

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
                showToast("Profile updated successfully", "success");
            }
        } catch (e) {
            console.warn("[Profile] Update failed:", e.code, e.message);
            const msg = e.code === "auth/requires-recent-login"
                ? "For security, changing email requires a recent login. Please log out and back in."
                : e.message;
            showToast(msg, "error");
        }
    };

    const handleVerifyEmail = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await verifyEmail();
            showToast("Verification link sent to your inbox", "success");
        } catch (e) {
            showToast(e.message, "error");
        }
    };

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            showToast("Gallery access permission required", "error");
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (result.canceled) return;

            const uri = result.assets[0].uri;
            setCurrentAvatarUrl(uri);
            setIsUploading(true);
            setUploadProgress(0);

            const dataUri = await uploadImage(uri, `avatars/${user.uid}`, (pct) => {
                setUploadProgress(pct);
            });

            if (!dataUri) throw new Error("Image processing returned empty.");

            await updateUserProfile({ photoURL: dataUri });
            setCurrentAvatarUrl(dataUri);
            showToast("Avatar updated successfully", "success");
        } catch (err) {
            console.error("[Profile] Upload error:", err);
            setCurrentAvatarUrl(profile?.photoURL);
            showToast("Profile image upload failed", "error");
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: "LOG OUT",
            message: "Are you sure you want to end your current session?",
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (healthStatus === "active") {
            showDialog({
                title: "Disconnect Google Fit?",
                message: "This will stop syncing your workouts and health metrics with Health Connect.",
                confirmText: "Disconnect",
                cancelText: "Cancel",
                isDestructive: true,
                singleButton: false,
                onConfirm: async () => {
                    setSyncing(true);
                    const revoked = await disconnectHealth();
                    if (revoked) {
                        setHealthStatus("inactive");
                        showToast("Google Fit disconnected", "success");
                    }
                    setSyncing(false);
                }
            });
            return;
        }

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
                showToast("Google Fit sync connected", "success");
            }
        } catch (e) {
            showToast("Sync failed. Check permissions & connection.", "error");
        } finally {
            setSyncing(false);
        }
    };

    const handleChangePassword = async () => {
        if (!email) return showToast("No email associated with this account", "error");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showDialog({
            title: "RESET PASSWORD",
            message: `We will send a password reset link to:\n${email}`,
            confirmText: "SEND LINK",
            cancelText: "CANCEL",
            isDestructive: false,
            singleButton: false,
            onConfirm: async () => {
                setPwLoading(true);
                try {
                    await sendPasswordResetEmail(auth, email);
                    showToast("Password reset link sent to inbox", "success");
                } catch (e) {
                    showToast(e.message, "error");
                } finally {
                    setPwLoading(false);
                }
            }
        });
    };

    const displayName = profile?.fullName || user?.displayName || "ATHLETE";
    const email = user?.email || "";
    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt?.seconds ? profile.createdAt.seconds * 1000 : profile.createdAt)
            .toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()
        : "—";
    const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const currentRank = getRankData(total);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* ── App Navigation Header ── */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>ATHLETE PROFILE</Text>
                    <Text style={styles.headerSubtitle}>ACCOUNT & SETTINGS</Text>
                </View>

                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons name="log-out-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* ── 1. Elite Athlete Identity Hero ── */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={["rgba(227, 30, 36, 0.07)", "rgba(255, 255, 255, 0.02)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />

                    {/* Interactive Avatar with Concentric Breathing Halos */}
                    <TouchableOpacity
                        style={styles.avatarWrap}
                        onPress={pickImage}
                        activeOpacity={0.85}
                        disabled={isUploading}
                    >
                        <Animated.View style={[
                            styles.avatarHaloRing,
                            {
                                transform: [{ scale: ringAnim2 }],
                                opacity: ringAnim2.interpolate({ inputRange: [1, 1.28], outputRange: [0.35, 0.06] }),
                                borderColor: 'rgba(255, 255, 255, 0.14)'
                            }
                        ]} pointerEvents="none" />
                        <Animated.View style={[
                            styles.avatarHaloRing,
                            {
                                transform: [{ scale: ringAnim1 }],
                                opacity: ringAnim1.interpolate({ inputRange: [1, 1.15], outputRange: [0.65, 0.12] }),
                                borderColor: COLORS.primary
                            }
                        ]} pointerEvents="none" />

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

                    {/* Name & Identity */}
                    <Text style={styles.heroName}>{displayName}</Text>
                    <Text style={styles.heroEmail} numberOfLines={1}>{email}</Text>

                    {/* Badges Row */}
                    <View style={styles.heroBadgesRow}>
                        <TouchableOpacity
                            style={[styles.rankBadge, { borderColor: `${currentRank.color}4D` }]}
                            activeOpacity={0.8}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate("Rank");
                            }}
                        >
                            <Ionicons name={currentRank.icon} size={12} color={currentRank.color} />
                            <Text style={[styles.rankBadgeText, { color: currentRank.color }]}>{currentRank.title}</Text>
                            <Ionicons name="chevron-forward" size={10} color={currentRank.color} opacity={0.6} />
                        </TouchableOpacity>

                        <View style={styles.dateBadge}>
                            <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
                            <Text style={styles.dateBadgeText}>MEMBER SINCE {memberSince}</Text>
                        </View>
                    </View>
                </View>

                {/* ── 2. Performance Bento Grid ── */}
                <View style={styles.statsBento}>
                    {/* Streak Card */}
                    <TouchableOpacity
                        style={[styles.bentoCard, styles.bentoCardActive]}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate("Main", { openStreakIntelligence: true });
                        }}
                    >
                        <View style={styles.bentoTop}>
                            <Ionicons name="flame" size={14} color="#FF9500" />
                            <Text style={styles.bentoLabel}>STREAK</Text>
                        </View>
                        <Text style={styles.bentoValue}>{streak}</Text>
                        <Text style={styles.bentoSub}>consecutive days</Text>
                    </TouchableOpacity>

                    {/* Sessions Card */}
                    <TouchableOpacity
                        style={styles.bentoCard}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate("History");
                        }}
                    >
                        <View style={styles.bentoTop}>
                            <Ionicons name="barbell-outline" size={14} color="#30D158" />
                            <Text style={styles.bentoLabel}>SESSIONS</Text>
                        </View>
                        <Text style={styles.bentoValue}>{total}</Text>
                        <Text style={styles.bentoSub}>total completed</Text>
                    </TouchableOpacity>

                    {/* Rank Card */}
                    <TouchableOpacity
                        style={styles.bentoCard}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate("Rank");
                        }}
                    >
                        <View style={styles.bentoTop}>
                            <Ionicons name="trophy-outline" size={14} color={currentRank.color} />
                            <Text style={styles.bentoLabel}>TIER</Text>
                        </View>
                        <Text style={[styles.bentoValue, { color: currentRank.color, fontSize: 16 }]} numberOfLines={1}>
                            {currentRank.title}
                        </Text>
                        <Text style={styles.bentoSub}>tier level</Text>
                    </TouchableOpacity>
                </View>

                {/* ── 3. Athlete Personal Details ── */}
                <SectionHeader title="ATHLETE PROFILE" icon="person-outline" />
                <ProfileCard>
                    <ActionRow
                        icon="person-outline"
                        label="Full Name"
                        value={displayName}
                        onPress={() => openEdit("fullName", "Edit Full Name", displayName)}
                    />

                    <ActionRow
                        icon="mail-outline"
                        label="Email Address"
                        value={email}
                        rightElement={
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.verifiedBadge, {
                                    backgroundColor: user?.emailVerified ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 149, 0, 0.12)',
                                    borderColor: user?.emailVerified ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 149, 0, 0.3)'
                                }]}>
                                    <Animated.View style={[
                                        styles.verifiedDot,
                                        {
                                            backgroundColor: user?.emailVerified ? '#30D158' : '#FF9500',
                                            opacity: user?.emailVerified ? 1 : liveDotOpacity
                                        }
                                    ]} />
                                    <Text style={[styles.verifiedText, { color: user?.emailVerified ? '#30D158' : '#FF9500' }]}>
                                        {user?.emailVerified ? "VERIFIED" : "UNVERIFIED"}
                                    </Text>
                                </View>

                                {!user?.emailVerified && (
                                    <TouchableOpacity onPress={handleVerifyEmail} style={styles.miniActionBtn} activeOpacity={0.7}>
                                        <Text style={styles.miniActionBtnText}>VERIFY</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    onPress={() => openEdit("email", "Change Email", email, "email")}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="pencil-outline" size={14} color={COLORS.textSub} />
                                </TouchableOpacity>
                            </View>
                        }
                    />

                    <ActionRow
                        icon="calendar-outline"
                        label="Date of Birth"
                        value={profile?.dateOfBirth || "Not Specified"}
                        onPress={() => openEdit("dateOfBirth", "Edit Birth Date", profile?.dateOfBirth, "date")}
                    />

                    <ActionRow
                        icon="male-female-outline"
                        label="Gender"
                        value={profile?.gender || "Not Specified"}
                        onPress={() => openEdit("gender", "Select Gender", profile?.gender, "choice")}
                        last
                    />
                </ProfileCard>

                {/* ── 4. Connected Services & Ecosystem ── */}
                <SectionHeader title="INTEGRATIONS & SYNC" icon="sync-outline" />
                <ProfileCard>
                    {/* Google Fit / Health Connect */}
                    <View style={[styles.serviceRow, styles.rowBorder]}>
                        <View style={[styles.serviceIconWrap, healthStatus === "active" && styles.serviceIconActive]}>
                            <Ionicons
                                name={healthStatus === "active" ? "heart" : "heart-outline"}
                                size={18}
                                color={healthStatus === "active" ? "#FF2D55" : COLORS.textSub}
                            />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={styles.serviceTitle}>Health Connect</Text>
                                {healthStatus === "active" && (
                                    <View style={styles.liveBadgeMini}>
                                        <Animated.View style={[styles.liveDotMini, { opacity: liveDotOpacity }]} />
                                        <Text style={styles.liveBadgeTextMini}>SYNCED</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.serviceSub} numberOfLines={1}>
                                {healthStatus === "active" ? "Linked to Google Fit" : "Sync steps, activity & calories"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.serviceAction, healthStatus === "active" && styles.serviceActionConnected]}
                            onPress={handleSyncNow}
                            activeOpacity={0.7}
                        >
                            {syncing ? (
                                <ActivityIndicator size="small" color={COLORS.text} />
                            ) : (
                                <Text style={[styles.serviceActionText, healthStatus === "active" && { color: COLORS.textSub }]}>
                                    {healthStatus === "active" ? "DISCONNECT" : "CONNECT"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Firebase Cloud Sync */}
                    <View style={styles.serviceRow}>
                        <View style={[styles.serviceIconWrap, styles.serviceIconActive]}>
                            <Ionicons name="cloud-done" size={18} color="#30D158" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.serviceTitle}>Firebase Cloud Backup</Text>
                            <Text style={styles.serviceSub}>Encrypted real-time synchronization</Text>
                        </View>
                        <View style={styles.liveBadge}>
                            <Animated.View style={[styles.liveDot, { opacity: liveDotOpacity }]} />
                            <Text style={styles.liveBadgeText}>ACTIVE</Text>
                        </View>
                    </View>
                </ProfileCard>

                {/* ── 5. Security, Privacy & Data ── */}
                <SectionHeader title="SECURITY & PRIVACY" icon="shield-checkmark-outline" />
                <ProfileCard>
                    <ActionRow
                        icon="lock-closed-outline"
                        label="Change Password"
                        sublabel={pwLoading ? "Sending reset link..." : "Receive password reset link via email"}
                        onPress={handleChangePassword}
                    />

                    <ActionRow
                        icon="shield-outline"
                        label="Data Governance & Privacy"
                        sublabel="End-to-end encrypted storage policy"
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            showDialog({
                                title: "DATA & PRIVACY",
                                message: "Your workout logs and athlete statistics are stored securely on Firebase with end-to-end encrypted infrastructure.\n\n• Zero data selling or third-party sharing\n• Automated cloud recovery\n• Complete account deletion on request\n\nContact support@conquer-one.app for privacy requests.",
                                confirmText: "CLOSE",
                                singleButton: true,
                                isDestructive: false
                            });
                        }}
                    />

                    <ActionRow
                        icon="trash-outline"
                        label="Delete Account & Data"
                        sublabel="Permanently wipe all logs and metrics"
                        isDestructive
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            showDialog({
                                title: "DELETE ACCOUNT?",
                                message: "This will permanently wipe your account, history, personal records, and streaks. This action cannot be reversed.",
                                confirmText: "DELETE",
                                cancelText: "CANCEL",
                                isDestructive: true,
                                singleButton: false,
                                onConfirm: () => {
                                    showDialog({
                                        title: "CONTACT SUPPORT",
                                        message: "Please contact support@conquer-one.app to finalize immediate account deletion.",
                                        confirmText: "CLOSE",
                                        singleButton: true,
                                        isDestructive: false
                                    });
                                }
                            });
                        }}
                        last
                    />
                </ProfileCard>

                {/* ── 6. Compact Brand Footer ── */}
                <View style={styles.footerSection}>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerBrand}>CONQUER ONE · {APP_VERSION}</Text>
                    <Text style={styles.footerAuthor}>
                        BUILT FOR PERFORMANCE BY <Text style={{ color: COLORS.primary, fontFamily: FAMILY.bold }}>VIVASWAN SHETTY</Text>
                    </Text>
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

    /* Header */
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: RADIUS.md,
        backgroundColor: "rgba(255,255,255,0.03)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    headerTitleWrap: { alignItems: "center" },
    headerTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.2,
    },
    headerSubtitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginTop: 2,
    },

    scroll: { paddingBottom: 16 },

    /* Hero Card */
    heroCard: {
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 14,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
    },

    /* Breathing Avatar Rings */
    avatarWrap: {
        width: 104,
        height: 104,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        marginBottom: 14,
    },
    avatarHaloRing: {
        position: "absolute",
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 1.5,
    },
    avatarRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.12)",
        backgroundColor: COLORS.bgCard,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarBg: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarImg: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: "#000",
    },
    avatarProgressOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 46,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarProgressText: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: "#fff",
    },
    initials: { fontSize: 28, fontFamily: FAMILY.bold, color: COLORS.textMuted },
    cameraBtn: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: COLORS.bgCard,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },

    heroName: {
        fontSize: 22,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: -0.5,
        marginBottom: 2,
        textAlign: "center",
    },
    heroEmail: {
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginBottom: 14,
        textAlign: "center",
    },
    heroBadgesRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    rankBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
    },
    rankBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.8,
    },
    dateBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    dateBadgeText: {
        fontSize: 8.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },

    /* Performance Bento Grid */
    statsBento: {
        flexDirection: "row",
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 8,
    },
    bentoCard: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        justifyContent: "space-between",
        minHeight: 88,
    },
    bentoCardActive: {
        borderColor: "rgba(255,255,255,0.12)",
    },
    bentoTop: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 6,
    },
    bentoLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    bentoValue: {
        fontSize: 20,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    bentoSub: {
        fontSize: 8,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginTop: 2,
    },

    /* Section Headers */
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        gap: 6,
    },
    sectionAccentLine: {
        width: 3,
        height: 12,
        borderRadius: 1.5,
        backgroundColor: COLORS.primary,
    },
    sectionTitle: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1.2,
    },

    /* Profile Cards */
    card: {
        marginHorizontal: 20,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },

    /* Action Rows */
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.04)",
    },
    rowIconWrap: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.03)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    destructiveIconWrap: {
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        borderColor: "rgba(227, 30, 36, 0.2)",
    },
    rowContent: {
        flex: 1,
        marginRight: 8,
    },
    rowLabel: {
        fontSize: 12.5,
        fontFamily: FAMILY.medium,
        color: COLORS.text,
    },
    destructiveText: {
        color: COLORS.primary,
        fontFamily: FAMILY.semibold,
    },
    rowValue: {
        fontSize: 11,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
        marginTop: 2,
    },
    rowSublabel: {
        fontSize: 10,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginTop: 2,
    },

    /* Verified Status Badge */
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
    },
    verifiedDot: { width: 4, height: 4, borderRadius: 2 },
    verifiedText: { fontSize: 8, fontFamily: FAMILY.bold, letterSpacing: 0.5 },

    miniActionBtn: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    miniActionBtnText: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },

    /* Services Rows */
    serviceRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    serviceIconWrap: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: "rgba(255,255,255,0.02)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    serviceIconActive: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
    },
    serviceTitle: {
        fontSize: 13,
        fontFamily: FAMILY.medium,
        color: COLORS.text,
    },
    serviceSub: {
        fontSize: 10,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    serviceAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    serviceActionConnected: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.05)",
    },
    serviceActionText: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.8,
    },

    liveBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(48, 209, 88, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.25)",
    },
    liveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#30D158",
    },
    liveBadgeText: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.8,
    },

    liveBadgeMini: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(48, 209, 88, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.2)",
    },
    liveDotMini: {
        width: 3.5,
        height: 3.5,
        borderRadius: 2,
        backgroundColor: "#30D158",
    },
    liveBadgeTextMini: {
        fontSize: 7.5,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.5,
    },

    /* Footer */
    footerSection: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 10,
        gap: 4,
    },
    footerDivider: {
        width: 28,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginBottom: 6,
    },
    footerBrand: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 1.2,
    },
    footerAuthor: {
        fontSize: 8.5,
        fontFamily: FAMILY.medium,
        color: COLORS.textMuted,
        letterSpacing: 0.4,
    },

    /* Modal */
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.85)" },
    modalSheet: {
        backgroundColor: "rgba(22, 22, 26, 0.95)",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 26,
        paddingBottom: 40,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.14)",
        borderBottomWidth: 0,
        overflow: "hidden",
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignSelf: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
        marginBottom: 20,
    },
    modalInputWrap: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 24,
        flexDirection: "row",
        alignItems: "center",
    },
    modalInput: {
        color: COLORS.text,
        fontFamily: FAMILY.regular,
        fontSize: 15,
        flex: 1,
    },
    inputIcon: { marginRight: 10 },
    choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
    choiceBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    choiceBtnActive: {
        backgroundColor: "rgba(227, 30, 36, 0.14)",
        borderColor: "rgba(227, 30, 36, 0.45)",
    },
    choiceBtnText: {
        fontSize: 9.5,
        fontFamily: FAMILY.medium,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    choiceBtnTextActive: { color: COLORS.text, fontFamily: FAMILY.bold },
    modalBtns: { flexDirection: "row", gap: 12 },
    modalCancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    modalCancelText: { fontSize: 11, fontFamily: FAMILY.semibold, color: COLORS.textSub, letterSpacing: 1 },
    modalSaveBtn: {
        flex: 2,
        height: 46,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    modalSaveText: { fontSize: 11.5, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 1 },
});
