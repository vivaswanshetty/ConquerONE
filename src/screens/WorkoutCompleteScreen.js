import React, { useEffect, useRef } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions,
    StatusBar, Animated, ScrollView, ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { formatDuration } from "../utils/storage";
import { sendMilestoneNotif } from "../utils/notifications";
import { syncWorkoutToHealth } from "../utils/health";
import { getSettings } from "../utils/settings";
import { Platform } from "react-native";

const { width, height } = Dimensions.get("window");

/* ── Main screen ──────────────────────────────────────────── */
export default function WorkoutCompleteScreen({ navigation, route }) {
    const { day, durationSec, streak, total, newPRs = [], caloriesBurned = 0, showCalories = true } = route.params;
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const prAnim = useRef(new Animated.Value(0)).current;
    const checkAnim = useRef(new Animated.Value(0)).current;
    const streakAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
            Animated.spring(checkAnim, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }).start();
        }, 200);

        if (streak > 1) {
            setTimeout(() => {
                Animated.spring(streakAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
            }, 400);
        }

        if (newPRs.length > 0) {
            setTimeout(() => {
                Animated.spring(prAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
            }, 700);
        }

        // Milestone Recognition
        checkMilestones();

        // Health Sync Trigger
        handleAutoSync();
    }, []);

    const handleAutoSync = async () => {
        const settings = await getSettings();
        if (settings.healthSyncEnabled) {
            await syncWorkoutToHealth({
                title: day.target,
                durationSec,
                calories: caloriesBurned,
                totalSets: total, // Approximate or fetch actual if available
                startTime: Date.now() - (durationSec * 1000),
                endTime: Date.now()
            });
        }
    };

    const checkMilestones = () => {
        if (total === 1) {
            sendMilestoneNotif("First Blood", "Your journey has officially begun. The arena is yours.");
        } else if (total === 10) {
            sendMilestoneNotif("Conqueror Status", "10 sessions logged. You are no longer a beginner.");
        } else if (total === 50) {
            sendMilestoneNotif("Titan Reach", "50 sessions strong. Your legend is building.");
        } else if (total === 100) {
            sendMilestoneNotif("Iron Century", "100 sessions. Absolute mastery achieved.");
        }

        if (streak === 3) {
            sendMilestoneNotif("Streak Mastery", "3 days of discipline. The momentum is building.");
        } else if (streak === 7) {
            sendMilestoneNotif("Heatwave", "7-day streak! You are officially on fire.");
        }
    };

    const prScale = prAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
    const checkScale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ImageBackground
                source={require("../../assets/workout_complete_bg.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)", "#000"]}
                    style={StyleSheet.absoluteFill}
                />
            </ImageBackground>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} overScrollMode="never">
                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

                    <Animated.View style={[styles.iconRingWrap, { transform: [{ scale: checkScale }] }]}>
                        <View style={styles.iconRingInner}>
                            <Ionicons name="checkmark-done" size={54} color={COLORS.primary} />
                        </View>
                        <LinearGradient
                            colors={["rgba(227,30,36,0.15)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    <Text style={styles.completedLabel}>PROTOCOL ACHIEVED</Text>
                    <Text style={styles.completedTitle} numberOfLines={2} adjustsFontSizeToFit>{day.target.toUpperCase()}</Text>

                    {/* Symmetric Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>DURATION</Text>
                            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatDuration(durationSec)}</Text>
                            <Ionicons name="time-outline" size={14} color={COLORS.primary} style={styles.statIcon} />
                        </View>
                        <View style={[styles.statBox, styles.statBoxCenter]}>
                            <Text style={styles.statLabel}>STREAK</Text>
                            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{streak}D</Text>
                            <Ionicons name="flame-outline" size={14} color={COLORS.primary} style={styles.statIcon} />
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{showCalories ? "CALORIES" : "SESSIONS"}</Text>
                            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                                {showCalories ? `${caloriesBurned}` : total}
                            </Text>
                            <Ionicons name="medal-outline" size={14} color={COLORS.primary} style={styles.statIcon} />
                        </View>
                    </View>

                    {streak > 1 && (
                        <Animated.View style={[styles.streakRow, {
                            opacity: streakAnim,
                            transform: [{ translateY: streakAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                        }]}>
                            <Ionicons name="flame" size={18} color={COLORS.primary} />
                            <Text style={styles.streakText}>{streak}-DAY STREAK. CONSISTENCY IS KEY.</Text>
                        </Animated.View>
                    )}

                    {newPRs.length > 0 && (
                        <Animated.View style={[styles.prCard, { opacity: prAnim, transform: [{ scale: prScale }] }]}>
                            <View style={styles.prHeader}>
                                <Ionicons name="trophy" size={16} color={COLORS.primary} />
                                <Text style={styles.prTitle}>NEW RECORDS BROKEN</Text>
                            </View>
                            <View style={styles.prList}>
                                {newPRs.map((pr, i) => (
                                    <View key={i} style={styles.prRow}>
                                        <Text style={styles.prName} numberOfLines={1}>{pr.name.toUpperCase()}</Text>
                                        <View style={styles.prValBox}>
                                            <Text style={styles.prVal}>
                                                {pr.weightKg > 0 ? `${pr.weightKg}KG` : ""}
                                                {pr.weightKg > 0 && pr.reps > 0 ? " · " : ""}
                                                {pr.reps > 0 ? `${pr.reps} REPS` : ""}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Animated.View>
                    )}

                    <TouchableOpacity style={[styles.homeBtn, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate("Main")} activeOpacity={0.85}>
                        <Text style={styles.homeBtnText}>DONE</Text>
                    </TouchableOpacity>

                    <View style={styles.linkRow}>
                        <TouchableOpacity style={styles.histLink} onPress={() => navigation.navigate("History")} activeOpacity={0.7}>
                            <Text style={styles.histLinkText}>HISTORY</Text>
                        </TouchableOpacity>
                        <View style={styles.linkDiv} />
                        <TouchableOpacity style={styles.histLink} onPress={() => navigation.navigate("Progress")} activeOpacity={0.7}>
                            <Text style={styles.histLinkText}>PROGRESS</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    scrollContent: { flexGrow: 1, justifyContent: "center" },
    content: { alignItems: "center", paddingHorizontal: 24 },

    iconRingWrap: {
        width: 140, height: 140, borderRadius: 70,
        alignItems: "center", justifyContent: "center",
        marginBottom: 40, backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
    },
    iconRingInner: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center",
        zIndex: 2,
    },

    completedLabel: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 4, marginBottom: 16 },
    completedTitle: { fontSize: 38, fontFamily: FAMILY.header, color: COLORS.text, textAlign: "center", letterSpacing: -1, lineHeight: 42, width: "100%", marginBottom: 40 },

    statsRow: {
        flexDirection: "row", width: "100%",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        paddingVertical: 24, marginBottom: 40,
    },
    statBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
    statBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
    statLabel: { fontSize: 7, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
    statValue: { fontSize: 22, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -0.5 },
    statIcon: { position: "absolute", bottom: -12, opacity: 0.2 },

    streakRow: {
        width: "100%", paddingVertical: 18, paddingHorizontal: 20,
        marginBottom: 20, backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 16,
    },
    streakText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub, flex: 1, letterSpacing: 1 },

    prCard: {
        width: "100%", borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.03)", marginBottom: 20, overflow: "hidden",
    },
    prHeader: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
        backgroundColor: "rgba(255,255,255,0.02)",
    },
    prTitle: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 2 },
    prList: { paddingHorizontal: 24, paddingVertical: 16 },
    prRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
    prName: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.textSub, flex: 1, paddingRight: 8 },
    prValBox: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    prVal: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },

    homeBtn: {
        width: "100%", backgroundColor: COLORS.text, height: 68,
        borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 40, marginBottom: 32,
    },
    homeBtnText: { fontSize: 13, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },

    linkRow: { flexDirection: "row", alignItems: "center", gap: 40 },
    histLink: { paddingVertical: 10 },
    histLinkText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    linkDiv: { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.1)" },
});


