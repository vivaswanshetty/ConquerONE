import React, { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, StatusBar, ActivityIndicator,
    KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";
import { ONBOARDING_KEY } from "./OnboardingScreen";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export default function SignupScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { signUp, verifyEmail, signInWithGoogle, signInWithApple } = useAuth();
    const { showDialog } = useNotification();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [gender, setGender] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const validate = () => {
        if (!fullName.trim()) return "Full name is required.";
        if (!email.trim()) return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
        if (password.length < 6) return "Password must be at least 6 characters.";
        if (password !== confirmPassword) return "Passwords do not match.";
        return null;
    };

    const handleSignup = async () => {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setLoading(true);
        setError("");
        try {
            await signUp({
                email: email.trim(),
                password,
                fullName: fullName.trim(),
                gender,
                dateOfBirth: dateOfBirth ? (() => {
                    const y = dateOfBirth.getFullYear();
                    const m = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
                    const d = String(dateOfBirth.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                })() : null
            });
            // Mark onboarding done — user came through signup flow
            await AsyncStorage.setItem(ONBOARDING_KEY, "1");
            // Send verification email
            await verifyEmail();
            showDialog({
                title: "ACCOUNT CREATED",
                message: "Please check your inbox to verify your email address.",
                confirmText: "UNDERSTOOD",
                singleButton: true
            });
            // Auth state change in App.js will navigate to Main
        } catch (e) {
            console.error("[Signup] Error:", e.code, e.message);
            const msg = e.code === "auth/email-already-in-use"
                ? "An account with this email already exists."
                : e.code === "auth/invalid-email"
                    ? "Please enter a valid email."
                    : e.code === "auth/weak-password"
                        ? "Password is too weak (min 6 characters)."
                        : e.code === "auth/network-request-failed"
                            ? "Network error. Check your internet connection."
                            : `Error: ${e.code || e.message}`;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithGoogle();
            await AsyncStorage.setItem(ONBOARDING_KEY, "1");
        } catch (e) {
            setError("Google sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignup = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithApple();
            await AsyncStorage.setItem(ONBOARDING_KEY, "1");
        } catch (e) {
            setError("Apple sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
            <LinearGradient
                colors={["rgba(227,30,36,0.08)", "transparent"]}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.eyebrow}>BEGIN YOUR JOURNEY</Text>
                        <Text style={styles.title}>CREATE{"\n"}ACCOUNT</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>FULL NAME</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="John Carter"
                                    placeholderTextColor={COLORS.textMuted}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>EMAIL</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="your@email.com"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Date of Birth */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>DATE OF BIRTH <Text style={styles.optional}>(OPTIONAL)</Text></Text>
                            <TouchableOpacity
                                style={styles.inputWrap}
                                onPress={() => setShowDatePicker(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                                <Text style={[styles.input, !dateOfBirth && { color: COLORS.textMuted }]}>
                                    {dateOfBirth ? dateOfBirth.toLocaleDateString() : "Select date"}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateOfBirth || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    maximumDate={new Date()}
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) setDateOfBirth(selectedDate);
                                    }}
                                />
                            )}
                        </View>

                        {/* Gender */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>GENDER <Text style={styles.optional}>(OPTIONAL)</Text></Text>
                            <View style={styles.genderRow}>
                                {GENDER_OPTIONS.map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                                        onPress={() => setGender(gender === g ? "" : g)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                                            {g.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>PASSWORD</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Min 6 characters"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                            <View style={[styles.inputWrap, confirmPassword && password !== confirmPassword && styles.inputError]}>
                                <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Repeat password"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                        </View>

                        {/* Error */}
                        {!!error && (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.ctaBtn, loading && { opacity: 0.6 }]}
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#C0392B"]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" size="small" />
                                    : <Text style={styles.ctaText}>CREATE ACCOUNT</Text>
                                }
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                            <View style={styles.line} />
                        </View>

                        {/* Social Row */}
                        <View style={styles.socialRow}>
                            <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignup} activeOpacity={0.7}>
                                <Ionicons name="logo-google" size={18} color="#fff" />
                                <Text style={styles.socialBtnText}>GOOGLE</Text>
                            </TouchableOpacity>

                            {Platform.OS === 'ios' && (
                                <TouchableOpacity style={[styles.socialBtn, { opacity: 0.5 }]} onPress={() => showDialog({
                                    title: "COMING SOON",
                                    message: "Apple Sign-In will be available once we enroll in the Apple Developer Program.",
                                    confirmText: "CLOSE",
                                    singleButton: true
                                })} activeOpacity={0.7}>
                                    <Ionicons name="logo-apple" size={18} color="#fff" />
                                    <Text style={styles.socialBtnText}>COMING SOON</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={styles.footerLink}> SIGN IN</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingHorizontal: SPACING.base, flexGrow: 1 },

    header: { marginBottom: 40 },
    eyebrow: { fontSize: 10, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 4, marginBottom: 12 },
    title: { fontSize: 48, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: -2, lineHeight: 48 },

    form: { gap: 18, marginBottom: 32 },

    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 2 },
    optional: { color: "rgba(255,255,255,0.2)", fontFamily: FAMILY.regular },

    inputWrap: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 16, height: 52,
    },
    inputError: { borderColor: "rgba(227,30,36,0.4)" },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: COLORS.text, fontFamily: FAMILY.regular, fontSize: 14 },
    eyeBtn: { padding: 4 },

    genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    genderBtn: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.03)",
    },
    genderBtnActive: {
        borderColor: COLORS.accent,
        backgroundColor: "rgba(237,234,227,0.08)",
    },
    genderBtnText: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1 },
    genderBtnTextActive: { color: COLORS.text },

    errorBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "rgba(227,30,36,0.08)", borderRadius: RADIUS.sm,
        padding: 12, borderWidth: 1, borderColor: "rgba(227,30,36,0.2)",
    },
    errorText: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.primary, flex: 1 },

    ctaBtn: { borderRadius: RADIUS.lg, overflow: "hidden", marginTop: 4 },
    ctaGradient: { paddingVertical: 18, alignItems: "center" },
    ctaText: { fontSize: 13, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },

    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
    footerText: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textMuted },
    footerLink: { fontSize: 13, fontFamily: FAMILY.semibold, color: COLORS.accent, letterSpacing: 1 },

    divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
    line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
    dividerText: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 2 },

    socialRow: { flexDirection: "row", gap: 12 },
    socialBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: RADIUS.md,
        paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)"
    },
    socialBtnText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.text, letterSpacing: 1 },
});
