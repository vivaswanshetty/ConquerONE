import React, { useEffect, useRef, useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions,
    StatusBar, Animated, ScrollView, ImageBackground, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useNotification } from "../context/NotificationContext";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { formatDuration } from "../utils/storage";
import { sendMilestoneNotif } from "../utils/notifications";
import { checkHealthConnectStatus } from "../utils/health";
import { insertRecords } from 'react-native-health-connect';

const { width, height } = Dimensions.get("window");

/* ── Main screen ──────────────────────────────────────────── */
export default function WorkoutCompleteScreen({ navigation, route }) {
    const { day, durationSec, streak, total, newPRs = [], caloriesBurned = 0, showCalories = true, xpGained = 0, totalXP = 0 } = route.params;
    const insets = useSafeAreaInsets();
    const shotRef = useRef(null);
    const { showDialog } = useNotification();
    const [sharing, setSharing] = useState(false);

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

    const handleShare = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                showDialog({
                    title: "SHARING UNAVAILABLE",
                    message: "Sharing is not supported on this device.",
                    confirmText: "CLOSE",
                    singleButton: true,
                });
                return;
            }

            if (shotRef.current && shotRef.current.capture) {
                setSharing(true);
                const uri = await shotRef.current.capture();
                setSharing(false);
                await Sharing.shareAsync(uri, {
                    mimeType: "image/png",
                    dialogTitle: `CONQUER ONE - ${day?.target || "Workout Complete"}`,
                    UTI: "public.png",
                });
            }
        } catch (e) {
            setSharing(false);
            console.warn("Share session failed:", e);
            showDialog({
                title: "SHARE ERROR",
                message: "Unable to generate workout card for sharing.",
                confirmText: "CLOSE",
                singleButton: true,
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
                                    <Ionicons name="trophy-outline" size={12} color={COLORS.textSub} />
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
                    <Text style={styles.completedTitle} numberOfLines={2} adjustsFontSizeToFit>{day?.target || "Workout"}</Text>

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

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={handleShare}
                            activeOpacity={0.85}
                            disabled={sharing}
                        >
                            <Ionicons name="share-outline" size={18} color={COLORS.text} />
                            <Text style={styles.shareBtnText}>{sharing ? "GENERATING CARD..." : "SHARE SESSION"}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.homeBtn}
                            onPress={() => navigation.navigate("Main")}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.homeBtnText}>DONE</Text>
                        </TouchableOpacity>
                    </View>

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

            {/* ── Purpose-Built Branded Social Share Card (Off-Screen Captured ViewShot) ── */}
            <View style={styles.offscreenWrap} pointerEvents="none">
                <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
                    <View style={styles.shareCard} collapsable={false}>
                        {/* Background Gradient & Ambient Sheen */}
                        <LinearGradient
                            colors={["#141418", "#0A0A0C", "#040406"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.3, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <LinearGradient
                            colors={["rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.02)", "transparent"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100 }}
                        />

                        {/* Top Card Header */}
                        <View style={styles.shareCardHeader}>
                            <View style={styles.shareCardBadge}>
                                <View style={styles.shareBadgeDot} />
                                <Text style={styles.shareCardBadgeText}>SESSION COMPLETE</Text>
                            </View>
                            <Text style={styles.shareCardDate}>
                                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                            </Text>
                        </View>

                        {/* Workout Name */}
                        <View style={styles.shareCardTitleWrap}>
                            <Text style={styles.shareCardWorkoutLabel}>TODAY'S TARGET</Text>
                            <Text style={styles.shareCardWorkoutName} numberOfLines={2}>
                                {day?.target || "Workout"}
                            </Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.shareCardStatsGrid}>
                            <View style={styles.shareCardStatBox}>
                                <Text style={styles.shareCardStatLabel}>DURATION</Text>
                                <Text style={styles.shareCardStatValue}>{formatDuration(durationSec)}</Text>
                            </View>
                            <View style={[styles.shareCardStatBox, styles.shareCardStatDivider]}>
                                <Text style={styles.shareCardStatLabel}>STREAK</Text>
                                <Text style={[styles.shareCardStatValue, { color: COLORS.primary }]}>
                                    {streak} <Text style={styles.shareCardStatUnit}>DAYS</Text>
                                </Text>
                            </View>
                            <View style={styles.shareCardStatBox}>
                                <Text style={styles.shareCardStatLabel}>{showCalories ? "CALORIES" : "SESSIONS"}</Text>
                                <Text style={styles.shareCardStatValue}>
                                    {showCalories ? `${caloriesBurned}` : total}
                                    <Text style={styles.shareCardStatUnit}>{showCalories ? " KCAL" : " TOTAL"}</Text>
                                </Text>
                            </View>
                        </View>

                        {/* Personal Records Banner (if any) */}
                        {newPRs.length > 0 && (
                            <View style={styles.shareCardPRWrap}>
                                <View style={styles.shareCardPRHeader}>
                                    <Ionicons name="trophy-outline" size={13} color={COLORS.textSub} />
                                    <Text style={styles.shareCardPRTitle}>NEW PERSONAL RECORD</Text>
                                </View>
                                {newPRs.slice(0, 2).map((pr, i) => (
                                    <View key={i} style={styles.shareCardPRRow}>
                                        <Text style={styles.shareCardPRName} numberOfLines={1}>{pr.name}</Text>
                                        <Text style={styles.shareCardPRVal}>
                                            {pr.weightKg > 0 ? `${pr.weightKg}kg` : ""}
                                            {pr.weightKg > 0 && pr.reps > 0 ? " · " : ""}
                                            {pr.reps > 0 ? `${pr.reps} reps` : ""}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Card Footer Brandmark */}
                        <View style={styles.shareCardFooter}>
                            <View style={styles.shareCardFooterLeft}>
                                <Image
                                    source={require("../../assets/logo_lockup.png")}
                                    style={styles.shareCardBrandLockup}
                                    resizeMode="contain"
                                />
                                <Text style={styles.shareCardTagline}>ELITE PERFORMANCE PROTOCOL</Text>
                            </View>
                            <View style={[styles.shareCardAccentPill, { backgroundColor: "rgba(227, 30, 36, 0.15)", borderColor: "rgba(227, 30, 36, 0.4)" }]}>
                                <Text style={[styles.shareCardTargetTag, { color: COLORS.primary }]}>
                                    {day?.target ? day.target.toUpperCase() : "CONQUERED"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ViewShot>
            </View>
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

    completedLabel: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
    completedTitle: { fontSize: 26, fontFamily: FAMILY.bold, color: COLORS.text, textAlign: "center", letterSpacing: -0.5, lineHeight: 30, width: "100%", marginBottom: 28 },

    statsRow: {
        flexDirection: "row", width: "100%",
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
        paddingVertical: 18, marginBottom: 24,
    },
    statBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
    statBoxCenter: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
    statLabel: { fontSize: 8.5, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 2 },
    statValue: { fontSize: 20, fontFamily: FAMILY.monoBold, color: COLORS.text, letterSpacing: -0.5 },

    streakRow: {
        width: "100%", paddingVertical: 12, paddingHorizontal: 16,
        marginBottom: 16, backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: "rgba(255, 149, 0, 0.25)",
        borderRadius: RADIUS.lg, flexDirection: "row", alignItems: "center", gap: 10,
    },
    streakText: { fontSize: 12, fontFamily: FAMILY.monoBold, color: "#FF9500", flex: 1 },

    prCard: {
        width: "100%", borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard, marginBottom: 16, overflow: "hidden",
    },
    prHeader: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
        backgroundColor: COLORS.bg,
    },
    prTitle: { fontSize: 12.5, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },
    prList: { paddingHorizontal: 16, paddingVertical: 12 },
    prRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
    prName: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.text, flex: 1, paddingRight: 8 },
    prValBox: { backgroundColor: COLORS.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
    prVal: { fontSize: 11, fontFamily: FAMILY.monoBold, color: COLORS.textSub },

    actionButtons: {
        width: "100%",
        gap: 12,
        marginTop: 20,
        marginBottom: 20,
    },
    shareBtn: {
        width: "100%",
        height: 52,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.14)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    shareBtnText: {
        fontSize: 12,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.2,
    },
    homeBtn: {
        width: "100%",
        backgroundColor: COLORS.primary,
        height: 52,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
    },
    homeBtnText: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },

    linkRow: { flexDirection: "row", alignItems: "center", gap: 32 },
    histLink: { paddingVertical: 8 },
    histLinkText: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 0.5 },
    linkDiv: { width: 1, height: 12, backgroundColor: COLORS.border },

    // Rank Up Card
    rankUpCard: {
        flexDirection: "row", alignItems: "center", gap: 14,
        width: "100%", padding: 16, borderRadius: RADIUS.lg, marginTop: 16,
        borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard, overflow: "hidden",
    },
    rankUpIcon: {
        width: 44, height: 44, borderRadius: RADIUS.pill, borderWidth: 1,
        alignItems: "center", justifyContent: "center",
        backgroundColor: COLORS.bg,
    },
    rankUpLabel: { fontSize: 8.5, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },
    rankUpTitle: { fontSize: 16, fontFamily: FAMILY.bold, letterSpacing: 0.5, marginTop: 2 },
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

    // Purpose-Built Social Share Card
    offscreenWrap: {
        position: "absolute",
        left: -3000,
        top: 0,
        opacity: 0,
    },
    shareCard: {
        width: 360,
        minHeight: 460,
        backgroundColor: COLORS.bg,
        borderRadius: 24,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        padding: 24,
        justifyContent: "space-between",
        overflow: "hidden",
    },
    shareCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    shareCardBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.35)",
    },
    shareBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    shareCardBadgeText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.primary,
        letterSpacing: 1,
    },
    shareCardDate: {
        fontSize: 9.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    shareCardTitleWrap: {
        marginBottom: 22,
    },
    shareCardWorkoutLabel: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    shareCardWorkoutName: {
        fontSize: 24,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    shareCardStatsGrid: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        paddingVertical: 16,
        marginBottom: 16,
    },
    shareCardStatBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    shareCardStatDivider: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    shareCardStatLabel: {
        fontSize: 8,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 4,
    },
    shareCardStatValue: {
        fontSize: 18,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
        letterSpacing: -0.2,
    },
    shareCardStatUnit: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    shareCardPRWrap: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 12,
        marginBottom: 16,
    },
    shareCardPRHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    shareCardPRTitle: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1,
    },
    shareCardPRRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 3,
    },
    shareCardPRName: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
        color: COLORS.text,
        flex: 1,
    },
    shareCardPRVal: {
        fontSize: 10.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    shareCardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
    },
    shareCardFooterLeft: {
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
    },
    shareCardBrandLockup: {
        width: 140,
        height: 20,
    },
    shareCardTagline: {
        fontSize: 7,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        textAlign: "center",
    },
    shareCardAccentPill: {
        paddingHorizontal: 10,
        paddingVertical: 4.5,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
    },
    shareCardTargetTag: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.8,
    },
});


