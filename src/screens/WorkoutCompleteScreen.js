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
                                <Ionicons name="checkmark-done" size={54} color={COLORS.primary} />
                            </View>
                            <LinearGradient
                                colors={["rgba(227,30,36,0.15)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>

                    {(() => {
                        let multiplierText = "Tier I Multiplier (1.0x)";
                        let badgeColor = "#EF4444";
                        if (xpGained === 20) {
                            multiplierText = "Tier IV Multiplier (2.0x)";
                            badgeColor = "#A855F7";
                        } else if (xpGained === 15) {
                            multiplierText = "Tier III Multiplier (1.5x)";
                            badgeColor = "#EAB308";
                        } else if (xpGained === 12) {
                            multiplierText = "Tier II Multiplier (1.2x)";
                            badgeColor = "#F97316";
                        }

                        if (xpGained > 0) {
                            return (
                                <Animated.View style={[
                                    styles.xpAwardBanner,
                                    {
                                        borderColor: `${badgeColor}40`,
                                        opacity: xpAnim,
                                        transform: [
                                            { scale: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                                            { translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }
                                        ]
                                    }
                                ]}>
                                    <LinearGradient
                                        colors={[`${badgeColor}15`, "rgba(0, 0, 0, 0.4)"]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Ionicons name="sparkles" size={12} color={badgeColor} />
                                    <Text style={styles.xpAwardText}>
                                        <Text style={{ fontFamily: FAMILY.bold, color: "#FFFFFF" }}>+{xpGained} XP GAINED</Text>
                                        <Text style={{ color: COLORS.textMuted }}> · {multiplierText} active</Text>
                                    </Text>
                                </Animated.View>
                            );
                        }
                        return null;
                    })()}

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

                    {rankUp && (
                        <Animated.View style={[styles.rankUpCard, {
                            opacity: rankAnim,
                            transform: [{ scale: rankAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                        }]}>
                            <LinearGradient
                                colors={[`${rankUp.color}20`, 'transparent']}
                                style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                            />
                            <View style={[styles.rankUpIcon, { borderColor: `${rankUp.color}50` }]}>
                                <Ionicons name={rankUp.icon} size={28} color={rankUp.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rankUpLabel}>RANK UP!</Text>
                                <Text style={[styles.rankUpTitle, { color: rankUp.color }]}>{rankUp.title}</Text>
                                <Text style={styles.rankUpDesc}>{rankUp.desc}</Text>
                            </View>
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
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
    },
    iconRingInner: {
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center",
        zIndex: 2,
    },
    checkmarkContainer: {
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: 180,
        height: 180,
        marginBottom: 20,
    },
    haloCircle: {
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
    },

    completedLabel: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 4, marginBottom: 16 },
    completedTitle: { fontSize: 38, fontFamily: FAMILY.header, color: COLORS.text, textAlign: "center", letterSpacing: -1, lineHeight: 42, width: "100%", marginBottom: 40 },

    statsRow: {
        flexDirection: "row", width: "100%",
        backgroundColor: COLORS.glassBg,
        borderRadius: 24, borderWidth: 1, borderColor: COLORS.glassBorder,
        paddingVertical: 24, marginBottom: 40,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2, shadowRadius: 20,
    },
    statBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
    statBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.glassBorder },
    statLabel: { fontSize: 7, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
    statValue: { fontSize: 22, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -0.5 },
    statIcon: { position: "absolute", bottom: -12, opacity: 0.2 },

    streakRow: {
        width: "100%", paddingVertical: 18, paddingHorizontal: 20,
        marginBottom: 20, backgroundColor: COLORS.glassBg,
        borderWidth: 1, borderColor: "rgba(227, 30, 36, 0.25)",
        borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 16,
    },
    streakText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub, flex: 1, letterSpacing: 1 },

    prCard: {
        width: "100%", borderRadius: 24, borderWidth: 1, borderColor: COLORS.glassBorder,
        backgroundColor: COLORS.glassBg, marginBottom: 20, overflow: "hidden",
    },
    prHeader: {
        flexDirection: "row", alignItems: "center", gap: 12,
        paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder,
        backgroundColor: "rgba(255,255,255,0.01)",
    },
    prTitle: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 2 },
    prList: { paddingHorizontal: 24, paddingVertical: 16 },
    prRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
    prName: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.textSub, flex: 1, paddingRight: 8 },
    prValBox: { backgroundColor: "rgba(255,255,255,0.03)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.glassBorder },
    prVal: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },

    homeBtn: {
        width: "100%", backgroundColor: COLORS.primary, height: 64,
        borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 40, marginBottom: 32,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 15,
        elevation: 5,
    },
    homeBtnText: { fontSize: 13, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },

    linkRow: { flexDirection: "row", alignItems: "center", gap: 40 },
    histLink: { paddingVertical: 10 },
    histLinkText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    linkDiv: { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.1)" },

    // Rank Up Card
    rankUpCard: {
        flexDirection: "row", alignItems: "center", gap: 16,
        width: "100%", padding: 18, borderRadius: 20, marginTop: 20,
        borderWidth: 1, borderColor: COLORS.glassBorder,
        backgroundColor: COLORS.glassBg, overflow: "hidden",
    },
    rankUpIcon: {
        width: 52, height: 52, borderRadius: 16, borderWidth: 2,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    rankUpLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    rankUpTitle: { fontSize: 20, fontFamily: FAMILY.bold, letterSpacing: 1, marginTop: 2 },
    rankUpDesc: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 4 },
    xpAwardBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
        overflow: "hidden",
    },
    xpAwardText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        letterSpacing: 0.5,
    },
});


