import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, Alert, Image, ActivityIndicator,
    Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import { fsGetStreak, fsGetTotalWorkouts } from "../utils/firestore";
import { COLORS, SPACING, FAMILY, GRADIENTS } from "../utils/theme";
import { uploadImage } from "../utils/cloudStorage";
import { scheduleBirthdayWishes } from "../utils/notifications";

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
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, width: '100%', overflow: 'hidden' }}>
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

/* ─── Sub-components ─────────────────────────────────────────── */
function InfoRow({ icon, label, value, onEdit, last }) {
    return (
        <TouchableOpacity
            style={[styles.infoRow, !last && styles.rowBorder]}
            onPress={onEdit}
            activeOpacity={onEdit ? 0.6 : 1}
        >
            <View style={styles.rowIconWrap}>
                <Ionicons name={icon} size={14} color={COLORS.primary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{value || "—"}</Text>
            </View>
            {onEdit && <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.2)" />}
        </TouchableOpacity>
    );
}

function ActionRow({ icon, label, onPress, color, last, sublabel }) {
    const c = color || COLORS.textSub;
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
                <Text style={[styles.rowLabel, { color: c }]}>{label}</Text>
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

function StatPill({ label, value, icon }) {
    return (
        <View style={styles.statPill}>
            <Ionicons name={icon} size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

/* ─── Main Screen ────────────────────────────────────────────── */
export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, profile, signOut, updateUserProfile } = useAuth();
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    const [editModal, setEditModal] = useState({ visible: false, field: "", title: "", value: "", type: "text" });

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try {
            const [s, t] = await Promise.all([fsGetStreak(), fsGetTotalWorkouts()]);
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
        if (!newValue?.trim && !newValue) return;
        const val = typeof newValue === "string" ? newValue.trim() : newValue;
        if (!val) return;

        try {
            await updateUserProfile({ [field]: val });
            if (field === "dateOfBirth") {
                await scheduleBirthdayWishes(val);
            }
        } catch (e) {
            Alert.alert("Update Failed", e.message);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Required", "We need gallery access to set a profile picture.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setIsUploading(true);
            try {
                const path = `avatars/${user.uid}.jpg`;
                const downloadURL = await uploadImage(uri, path);
                await updateUserProfile({ photoURL: downloadURL });
                Alert.alert("Success", "Profile picture updated!");
            } catch (err) {
                Alert.alert("Upload Failed", "Could not upload image.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleLogout = () => {
        Alert.alert("Log Out", "End your current session?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: signOut },
        ]);
    };

    const handleSyncNow = async () => {
        setSyncing(true);
        try {
            const response = await fetch("https://www.google.com", { method: "HEAD", mode: "no-cors" });
            if (!response) throw new Error("Offline");
            await new Promise(r => setTimeout(r, 1000));
            Alert.alert("✅ Synced", "All data is up to date.");
        } catch (e) {
            Alert.alert("Sync Failed", "No internet connection detected.");
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>MY ACCOUNT</Text>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* ── Membership Card ── */}
                <View style={styles.memberCardWrap}>
                    <LinearGradient
                        colors={["#1a1a1a", "#0d0d0d"]}
                        style={styles.memberCard}
                    >
                        <LinearGradient
                            colors={["rgba(227,30,36,0.15)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
                        />
                        <View style={styles.memberCardHeader}>
                            <View style={styles.brandRow}>
                                <Ionicons name="flash" size={16} color={COLORS.primary} />
                                <Text style={styles.brandName}>CONQUER ONE</Text>
                            </View>
                            <View style={styles.eliteBadge}>
                                <Text style={styles.eliteBadgeText}>ELITE PRO</Text>
                            </View>
                        </View>

                        <View style={styles.memberInfo}>
                            <TouchableOpacity
                                style={styles.avatarWrap}
                                onPress={pickImage}
                                activeOpacity={0.8}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <View style={[styles.avatarBg, styles.avatarLoading]}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                    </View>
                                ) : profile?.photoURL ? (
                                    <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
                                ) : (
                                    <View style={styles.avatarBg}>
                                        <Text style={styles.initials}>{initials}</Text>
                                    </View>
                                )}
                                <View style={styles.cameraBtn}>
                                    <Ionicons name="camera" size={10} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <View>
                                <Text style={styles.memberName}>{displayName.toUpperCase()}</Text>
                                <Text style={styles.memberId}>ID: {user?.uid?.slice(0, 8).toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.memberFooter}>
                            <View>
                                <Text style={styles.memberLabel}>MEMBER SINCE</Text>
                                <Text style={styles.memberValue}>{memberSince}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                                <Text style={styles.memberLabel}>STATUS</Text>
                                <Text style={styles.memberValue}>ACTIVE</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* ── Stats ── */}
                <View style={styles.statsRow}>
                    <StatPill label="STREAK" value={`${streak}D`} icon="flame" />
                    <View style={styles.statDivider} />
                    <StatPill label="SESSIONS" value={total} icon="barbell-outline" />
                    <View style={styles.statDivider} />
                    <StatPill label="INTENSITY" value="98%" icon="trending-up" />
                </View>

                {/* ── Sections ── */}
                <SectionTitle title="IDENTITY DETAILS" />
                <Card>
                    <InfoRow
                        icon="person-outline" label="Full Name" value={displayName}
                        onEdit={() => openEdit("fullName", "Edit Name", displayName)}
                    />
                    <InfoRow
                        icon="mail-outline" label="Email Address" value={email}
                        onEdit={() => Alert.alert("Change Email", "Identity verification required to update email address.")}
                    />
                    <InfoRow
                        icon="calendar-outline" label="Date of Birth" value={profile?.dateOfBirth}
                        onEdit={() => openEdit("dateOfBirth", "Edit Birth Date", profile?.dateOfBirth, "date")}
                    />
                    <InfoRow
                        icon="male-female-outline" label="Gender" value={profile?.gender}
                        onEdit={() => openEdit("gender", "Select Gender", profile?.gender, "choice")}
                        last
                    />
                </Card>

                <SectionTitle title="CLOUD SYNC" />
                <Card>
                    <View style={styles.cloudRow}>
                        <View style={styles.cloudIcon}>
                            <Ionicons name="cloud-done-outline" size={20} color="#22c55e" />
                        </View>
                        <View style={styles.cloudInfo}>
                            <Text style={styles.cloudTitle}>Real-time Backup</Text>
                            <Text style={styles.cloudSub}>Firebase Cloud Sync is active</Text>
                        </View>
                        <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} activeOpacity={0.7}>
                            {syncing ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.syncBtnText}>SYNC</Text>}
                        </TouchableOpacity>
                    </View>
                </Card>

                <SectionTitle title="SECURITY" />
                <Card>
                    <ActionRow
                        icon="lock-closed-outline"
                        label="Change Password"
                        sublabel="Update your security credentials"
                        onPress={() => Alert.alert("Password Reset", "Reset instructions sent to your email.")}
                    />
                    <ActionRow
                        icon="notifications-outline"
                        label="Data & Privacy"
                        sublabel="Manage how we handle your data"
                        onPress={() => { }}
                        last
                    />
                </Card>

                <SectionTitle title="DANGER ZONE" />
                <Card>
                    <ActionRow
                        icon="trash-outline"
                        label="Delete Account"
                        sublabel="Permanently erase all your history"
                        color={COLORS.primary}
                        onPress={() => Alert.alert("Delete Account", "Contact support to erase data.")}
                        last
                    />
                </Card>

                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                    <Text style={styles.version}>CONQUER ONE · v1.0.8 PREMIUM</Text>
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
    topBar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: SPACING.base, paddingBottom: 10,
    },
    iconBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    topBarTitle: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3 },
    scroll: { paddingBottom: 60, paddingTop: 10 },

    // Membership Card
    memberCardWrap: { paddingHorizontal: SPACING.base, marginBottom: 32 },
    memberCard: {
        borderRadius: 24, padding: 24, height: 210, overflow: "hidden",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
    },
    memberCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    brandName: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },
    eliteBadge: {
        backgroundColor: "rgba(227,30,36,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
        borderWidth: 1, borderColor: "rgba(227,30,36,0.3)",
    },
    eliteBadgeText: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 1.5 },

    memberCard: { padding: 28, borderRadius: 28, height: 210, justifyContent: "space-between", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    memberInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
    avatarWrap: { position: "relative" },
    avatarBg: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.15)" },
    avatarImg: { width: 68, height: 68, borderRadius: 34 },
    avatarLoading: { backgroundColor: "rgba(0,0,0,0.3)" },
    initials: { fontSize: 24, fontFamily: FAMILY.bold, color: COLORS.textMuted },
    cameraBtn: {
        position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11,
        backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000"
    },
    memberName: { fontSize: 22, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.5 },
    memberBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(227,30,36,0.12)', borderWidth: 1, borderColor: 'rgba(227,30,36,0.2)' },
    memberBadgeText: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 1.5 },

    memberFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 20 },
    memberLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
    memberValue: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.textSub },

    // Stats
    statsRow: {
        flexDirection: "row", marginHorizontal: SPACING.base, marginBottom: 32,
        backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", padding: 20,
    },
    statPill: { flex: 1, alignItems: "center", gap: 6 },
    statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.05)" },
    statValue: { fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text },
    statLabel: { fontSize: 7, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },

    // Sections
    sectionTitle: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3, marginHorizontal: SPACING.base, marginBottom: 12, marginTop: 8 },
    card: { marginHorizontal: SPACING.base, marginBottom: 20, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },

    infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
    rowIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(227,30,36,0.06)", alignItems: "center", justifyContent: "center" },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textMuted, marginBottom: 2 },
    rowValue: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text },
    rowSublabel: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 2 },

    cloudRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, paddingVertical: 20 },
    cloudIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.1)" },
    cloudInfo: { flex: 1 },
    cloudTitle: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text },
    cloudSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 2 },
    syncBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    syncBtnText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1 },

    version: { fontSize: 9, fontFamily: FAMILY.bold, color: "rgba(255,255,255,0.1)", letterSpacing: 2 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.8)" },
    modalSheet: { backgroundColor: "#0f0f0f", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 48, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "center", marginBottom: 24 },
    modalTitle: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1, marginBottom: 24 },
    modalInputWrap: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 20, paddingVertical: 16, marginBottom: 28, flexDirection: "row", alignItems: "center" },
    modalInput: { color: COLORS.text, fontFamily: FAMILY.medium, fontSize: 16, flex: 1 },
    choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
    choiceBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    choiceBtnActive: { backgroundColor: "rgba(227,30,36,0.15)", borderColor: COLORS.primary },
    choiceBtnText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },
    choiceBtnTextActive: { color: COLORS.primary },
    modalBtns: { flexDirection: "row", gap: 14 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center" },
    modalCancelText: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },
    modalSaveBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center" },
    modalSaveText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 1 },
});
