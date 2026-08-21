import React, { useEffect, useRef, useState } from "react";
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

import { getSettings } from "../utils/settings";
import { Platform } from "react-native";
import { checkHealthConnectStatus } from "../utils/health";
import { insertRecords } from 'react-native-health-connect';

const { width, height } = Dimensions.get("window");

/* ── Main screen ──────────────────────────────────────────── */
export default function WorkoutCompleteScreen({ navigation, route }) {
    const { day, durationSec, streak, total, newPRs = [], caloriesBurned = 0, showCalories = true, xpGained = 0, totalXP = 0 } = route.params;
    const insets = useSafeAreaInsets();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const prAnim = useRef(new Animated.Value(0)).current;
    const checkAnim = useRef(new Animated.Value(0)).current;
    const streakAnim = useRef(new Animated.Value(0)).current;
    const rankAnim = useRef(new Animated.Value(0)).current;
    const xpAnim = useRef(new Animated.Value(0)).current;
    const [rankUp, setRankUp] = useState(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1.0,
                    duration: 2500,
                    useNativeDriver: true,
                })
            ])
        ).start();

        setTimeout(() => {
            Animated.spring(checkAnim, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }).start();
        }, 200);

        if (streak > 1) {
            setTimeout(() => {
                Animated.spring(streakAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
            }, 400);
        }

        setTimeout(() => {
            Animated.spring(xpAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
        }, 500);

        if (newPRs.length > 0) {
            setTimeout(() => {
                Animated.spring(prAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
            }, 700);
        }

        // Milestone Recognition
        checkMilestones();

        // Archive to Google Fit
        archiveWorkoutToHealth();
    }, []);

    const archiveWorkoutToHealth = async () => {
        try {
            const isReady = await checkHealthConnectStatus();
            if (!isReady) return;

            const now = new Date();
            const start = new Date(now.getTime() - (durationSec * 1000));

            await insertRecords([
                {
                    recordType: 'ActiveCaloriesBurned',
                    startTime: start.toISOString(),
                    endTime: now.toISOString(),
                    energy: { value: caloriesBurned || 150, unit: 'kilocalories' },
                }
            ]);
            console.log("Workout archived to Health Connect");
        } catch (e) {
            console.log("Health archive failed:", e);
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

        // Rank-up detection
        const RANK_THRESHOLDS = [
            { min: 100, title: "LEGEND", icon: "trophy-outline", color: "#EF4444", desc: "The pinnacle. Pure excellence." },
            { min: 50, title: "TITAN", icon: "diamond-outline", color: "#F97316", desc: "An unstoppable force." },
            { min: 25, title: "WARRIOR", icon: "fitness", color: "#FBBF24", desc: "Battle-tested and relentless." },
            { min: 10, title: "CHADLITE", icon: "trending-up", color: "#34D399", desc: "Your consistency is paying off." },
            { min: 5, title: "ROOKIE", icon: "star-outline", color: "#60A5FA", desc: "You've proven you're serious." },
        ];
        for (const t of RANK_THRESHOLDS) {
            if (total === t.min) {
                setRankUp(t);
                sendMilestoneNotif(`RANK UP: ${t.title}`, t.desc);
                setTimeout(() => {
                    Animated.spring(rankAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
                }, 900);
                break;
            }
        }
    };

    const prScale = prAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
    const checkScale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

    const scaleHalo1 = pulseAnim;
    const scaleHalo2 = pulseAnim.interpolate({
        inputRange: [1, 1.15],
        outputRange: [1, 1.08]
    });
    const opacityHalo1 = pulseAnim.interpolate({
        inputRange: [1, 1.15],
        outputRange: [0.15, 0.0]
    });
    const opacityHalo2 = pulseAnim.interpolate({
        inputRange: [1, 1.15],
        outputRange: [0.25, 0.05]
    });

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

                    <View style={styles.checkmarkContainer}>
                        {/* Breathing Halo 1: Crimson */}
                        <Animated.View style={[
                            styles.haloCircle,
                            {
                                borderColor: COLORS.primary,
                                opacity: opacityHalo1,
                                transform: [{ scale: scaleHalo1 }]
                            }
                        ]} />
                        {/* Breathing Halo 2: Silver */}
                        <Animated.View style={[
                            styles.haloCircle,
                            {
                                borderColor: COLORS.accent,
                                opacity: opacityHalo2,
                                transform: [{ scale: scaleHalo2 }]
                            }
                        ]} />
                        <Animated.View style={[styles.iconRingWrap, { transform: [{ scale: checkScale }] }]}>
                            <View style={styles.iconRingInner}>
                                <Ionicons name="checkmark-done" size={54} color={COLORS.text} />
                            </View>
                            <LinearGradient
                                colors={["rgba(237,234,227,0.06)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>

                    {(() => {
                        let multiplierText = "1.0x";
                        if (xpGained === 20) {
                            multiplierText = "2.0x";
                        } else if (xpGained === 15) {
                            multiplierText = "1.5x";
                        } else if (xpGained === 12) {
                            multiplierText = "1.2x";
                        }

                        if (xpGained > 0) {
                            return (
                                <Animated.View style={[
                                    styles.xpAwardBanner,
                                    {
                                        opacity: xpAnim,
                                        transform: [
                                            { scale: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                                            { translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }
                                        ]
                                    }
                                ]}>
                                    <Ionicons name="sparkles" size={12} color={COLORS.textSub} />
                                    <Text style={styles.xpAwardText}>
                                        <Text style={{ fontFamily: FAMILY.monoBold, color: COLORS.text }}>+{xpGained} XP</Text>
                                        <Text style={{ color: COLORS.textSub }}> · {multiplierText} multiplier</Text>
                                    </Text>
                                </Animated.View>
                            );
                        }
                        return null;
                    })()}

                    <Text style={styles.completedLabel}>SESSION COMPLETE</Text>
                    <Text style={styles.completedTitle} numberOfLines={2} adjustsFontSizeToFit>{day.target}</Text>

                    {/* Symmetric Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>DURATION</Text>
                            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatDuration(durationSec)}</Text>
                        </View>
                        <View style={[styles.statBox, styles.statBoxCenter]}>
                            <Text style={styles.statLabel}>STREAK</Text>
                            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{streak}d</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>{showCalories ? "CALORIES" : "SESSIONS"}</Text>
                            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                                {showCalories ? `${caloriesBurned}` : total}
                            </Text>
                        </View>
                    </View>

                    {streak > 1 && (
                        <Animated.View style={[styles.streakRow, {
                            opacity: streakAnim,
                            transform: [{ translateY: streakAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                        }]}>
                            <Ionicons name="flame" size={16} color={COLORS.text} />
                            <Text style={styles.streakText}>{streak}-day streak active</Text>
                        </Animated.View>
                    )}

                    {rankUp && (
                        <Animated.View style={[styles.rankUpCard, {
                            opacity: rankAnim,
                            transform: [{ scale: rankAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                        }]}>
                            <View style={[styles.rankUpIcon, { borderColor: COLORS.border }]}>
                                <Ionicons name={rankUp.icon} size={24} color={rankUp.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rankUpLabel}>RANK PROMOTION</Text>
                                <Text style={[styles.rankUpTitle, { color: rankUp.color }]}>{rankUp.title}</Text>
                                <Text style={styles.rankUpDesc}>{rankUp.desc}</Text>
                            </View>
                        </Animated.View>
                    )}

                    {newPRs.length > 0 && (
                        <Animated.View style={[styles.prCard, { opacity: prAnim, transform: [{ scale: prScale }] }]}>
                            <View style={styles.prHeader}>
                                <Ionicons name="trophy" size={14} color={COLORS.textSub} />
                                <Text style={styles.prTitle}>New Personal Records</Text>
                            </View>
                            <View style={styles.prList}>
                                {newPRs.map((pr, i) => (
                                    <View key={i} style={styles.prRow}>
                                        <Text style={styles.prName} numberOfLines={1}>{pr.name}</Text>
                                        <View style={styles.prValBox}>
                                            <Text style={styles.prVal}>
                                                {pr.weightKg > 0 ? `${pr.weightKg}kg` : ""}
                                                {pr.weightKg > 0 && pr.reps > 0 ? " · " : ""}
                                                {pr.reps > 0 ? `${pr.reps} reps` : ""}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </Animated.View>
                    )}

                    <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate("Main")} activeOpacity={0.85}>
                        <Text style={styles.homeBtnText}>Done</Text>
                    </TouchableOpacity>

                    <View style={styles.linkRow}>
                        <TouchableOpacity style={styles.histLink} onPress={() => navigation.navigate("History")} activeOpacity={0.7}>
                            <Text style={styles.histLinkText}>History</Text>
                        </TouchableOpacity>
                        <View style={styles.linkDiv} />
                        <TouchableOpacity style={styles.histLink} onPress={() => navigation.navigate("Progress")} activeOpacity={0.7}>
                            <Text style={styles.histLinkText}>Progress</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scrollContent: { flexGrow: 1, justifyContent: "center" },
    content: { alignItems: "center", paddingHorizontal: 20 },

    iconRingWrap: {
        width: 100, height: 100, borderRadius: 50,
        alignItems: "center", justifyContent: "center",
        backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: COLORS.border,
        overflow: "hidden",
    },
    iconRingInner: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.bg,
        alignItems: "center", justifyContent: "center",
        zIndex: 2,
    },
    checkmarkContainer: {
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    haloCircle: {
        position: "absolute",
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
    },

    completedLabel: { fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
    completedTitle: { fontSize: 30, fontFamily: FAMILY.display, color: COLORS.text, textAlign: "center", letterSpacing: -0.5, lineHeight: 34, width: "100%", marginBottom: 28 },

    statsRow: {
        flexDirection: "row", width: "100%",
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border,
        paddingVertical: 18, marginBottom: 24,
    },
    statBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
    statBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
    statLabel: { fontSize: 8, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 2 },
    statValue: { fontSize: 20, fontFamily: FAMILY.monoBold, color: COLORS.text, letterSpacing: -0.5 },

    streakRow: {
        width: "100%", paddingVertical: 12, paddingHorizontal: 16,
        marginBottom: 16, backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: COLORS.border,
        borderRadius: RADIUS.card, flexDirection: "row", alignItems: "center", gap: 10,
    },
    streakText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textSub, flex: 1 },

    prCard: {
        width: "100%", borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard, marginBottom: 16, overflow: "hidden",
    },
    prHeader: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bg,
    },
    prTitle: { fontSize: 12, fontFamily: FAMILY.semibold, color: COLORS.text },
    prList: { paddingHorizontal: 16, paddingVertical: 12 },
    prRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
    prName: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.text, flex: 1, paddingRight: 8 },
    prValBox: { backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
    prVal: { fontSize: 11, fontFamily: FAMILY.mono, color: COLORS.textSub },

    homeBtn: {
        width: "100%", backgroundColor: COLORS.primary, height: 56,
        borderRadius: RADIUS.card, alignItems: "center", justifyContent: "center", marginTop: 24, marginBottom: 20,
    },
    homeBtnText: { fontSize: 14, fontFamily: FAMILY.semibold, color: COLORS.text, letterSpacing: 0.5 },

    linkRow: { flexDirection: "row", alignItems: "center", gap: 32 },
    histLink: { paddingVertical: 8 },
    histLinkText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textSub },
    linkDiv: { width: 1, height: 12, backgroundColor: COLORS.border },

    // Rank Up Card
    rankUpCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        width: "100%", padding: 16, borderRadius: RADIUS.card, marginTop: 16,
        borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard, overflow: "hidden",
    },
    rankUpIcon: {
        width: 44, height: 44, borderRadius: RADIUS.pill, borderWidth: 1,
        alignItems: "center", justifyContent: "center",
        backgroundColor: COLORS.bg,
    },
    rankUpLabel: { fontSize: 8, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5 },
    rankUpTitle: { fontSize: 16, fontFamily: FAMILY.display, letterSpacing: -0.2, marginTop: 2 },
    rankUpDesc: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    xpAwardBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        marginBottom: 16,
    },
    xpAwardText: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
    },
});


