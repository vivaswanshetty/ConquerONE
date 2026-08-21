import React, { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, StatusBar, ActivityIndicator,
    KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../utils/firebase";
import { useNotification } from "../context/NotificationContext";

export default function LoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { signIn, signInWithGoogle, signInWithApple } = useAuth();
    const { showDialog } = useNotification();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await signIn({ email: email.trim(), password });
            // Navigation handled by App.js via auth state change
        } catch (e) {
            const msg = e.code === "auth/invalid-credential"
                ? "Invalid email or password."
                : e.code === "auth/user-not-found"
                    ? "No account found with this email."
                    : e.code === "auth/wrong-password"
                        ? "Incorrect password."
                        : "Login failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithGoogle();
        } catch (e) {
            setError("Google sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            await signInWithApple();
        } catch (e) {
            setError("Apple sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError("Please enter your email above first.");
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            showDialog({
                title: "RESET LINK SENT",
                message: `We have sent a password reset link to ${email.trim()}. Please check your inbox and spam folder.`,
                confirmText: "UNDERSTOOD",
                singleButton: true
            });
        } catch (e) {
            setError(e.message);
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
                    contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.eyebrow}>WELCOME BACK</Text>
                        <Text style={styles.title}>SIGN IN</Text>
                        <Text style={styles.subtitle}>Continue your conquest</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
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
                                    autoComplete="email"
                                />
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
                                    placeholder="••••••••"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={handleForgotPassword}
                                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                            >
                                <Text style={{ fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1 }}>FORGOT PASSWORD?</Text>
                            </TouchableOpacity>
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
                            onPress={handleLogin}
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
                                    : <Text style={styles.ctaText}>SIGN IN</Text>
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
                            <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin} activeOpacity={0.7}>
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
                        <Text style={styles.footerText}>Don't have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                            <Text style={styles.footerLink}> CREATE ONE</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Developer Signature */}
                    <View style={styles.signatureWrap}>
                        <Text style={styles.signatureText}>
                            BUILT FOR POWER BY <Text style={styles.signatureHighlight}>VIVASWAN SHETTY</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingHorizontal: SPACING.base, flexGrow: 1, justifyContent: "center" },

    header: { marginBottom: 48 },
    eyebrow: { fontSize: 10, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 4, marginBottom: 12 },
    title: { fontSize: 52, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: -2, lineHeight: 52, marginBottom: 10 },
    subtitle: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textMuted },

    form: { gap: 20, marginBottom: 40 },

    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 9, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 2 },
    inputWrap: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: RADIUS.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 16, height: 52,
    },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1, color: COLORS.text, fontFamily: FAMILY.regular, fontSize: 14,
    },
    eyeBtn: { padding: 4 },

    errorBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "rgba(227,30,36,0.08)", borderRadius: RADIUS.sm,
        padding: 12, borderWidth: 1, borderColor: "rgba(227,30,36,0.2)",
    },
    errorText: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.primary, flex: 1 },

    ctaBtn: { borderRadius: RADIUS.lg, overflow: "hidden", marginTop: 8 },
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

    signatureWrap: { marginTop: 60, alignItems: "center", opacity: 0.25 },
    signatureText: { fontSize: 7, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 3 },
    signatureHighlight: { color: COLORS.accent },
});
