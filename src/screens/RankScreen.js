import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, StatusBar,
    Animated, Dimensions, TouchableOpacity,
} from "react-native";
import Svg, { Polygon, Line } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getStreak, getTotalWorkouts } from "../utils/storage";
import { COLORS, FAMILY, SPACING, RADIUS, getMuscleColor } from "../utils/theme";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

const RANKS = [
    { level: 1, tierCode: "01", title: "Tier 01 · 0+ Sessions", icon: "shield-outline", min: 0, max: 4, target: "PUSH", desc: "The foundation of your training habit begins with your initial workouts." },
    { level: 2, tierCode: "02", title: "Tier 02 · 5+ Sessions", icon: "star-outline", min: 5, max: 9, target: "PULL", desc: "Consistent routine established. Building steady momentum across the weekly split." },
    { level: 3, tierCode: "03", title: "Tier 03 · 10+ Sessions", icon: "trending-up", min: 10, max: 24, target: "SHOULDERS", desc: "Double-digit consistency. Progressive adaptation and habit formation taking hold." },
    { level: 4, tierCode: "04", title: "Tier 04 · 25+ Sessions", icon: "fitness", min: 25, max: 49, target: "LEGS", desc: "Established workout cadence. High consistency and measurable volume gains." },
    { level: 5, tierCode: "05", title: "Tier 05 · 50+ Sessions", icon: "diamond-outline", min: 50, max: 99, target: "PULL", desc: "Major training milestone. Over fifty structured workouts completed." },
    { level: 6, tierCode: "06", title: "Tier 06 · 100+ Sessions", icon: "trophy-outline", min: 100, max: 999, target: "PUSH", desc: "Century milestone achieved. 100+ workouts logged in your training history." },
];

function getRankData(total) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (total >= RANKS[i].min) return { ...RANKS[i], index: i };
    }
    return { ...RANKS[0], index: 0 };
}

export default function RankScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { profile } = useAuth();
    const [total, setTotal] = useState(0);
    const [streak, setStreak] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    const displayName = profile?.fullName?.split(" ")[0] || "ATHLETE";
    const loadStats = useCallback(async () => {
        const [t, s] = await Promise.all([getTotalWorkouts(), getStreak()]);
        setTotal(t);
        setStreak(s);
    }, []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

    const current = getRankData(total);
    const nextRank = current.index < RANKS.length - 1 ? RANKS[current.index + 1] : null;
    const progressInRank = nextRank
        ? Math.min((total - current.min) / (nextRank.min - current.min), 1)
        : 1;
    const sessionsToNext = nextRank ? nextRank.min - total : 0;
    const activeRankColor = getMuscleColor(current.target) || COLORS.primary;

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Milestones</Text>
                <View style={{ width: 36 }} />
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            >
                {/* ── Hero Card ── */}
                <Animated.View style={[s.heroCard, { borderColor: `${activeRankColor}4D`, transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                        colors={[`${activeRankColor}18`, "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />

                    <View style={s.heroBadgeRow}>
                        <Text style={s.heroEyebrow}>CURRENT MILESTONE</Text>
                        <View style={[s.levelPill, { backgroundColor: `${activeRankColor}1F`, borderColor: `${activeRankColor}4D` }]}>
                            <Text style={[s.levelPillText, { color: activeRankColor }]}>{total} SESSIONS</Text>
                        </View>
                    </View>

                    <View style={s.heroIconRow}>
                        <View style={[s.heroIconCircle, { borderColor: `${activeRankColor}66` }]}>
                            <Ionicons name={current.icon} size={32} color={activeRankColor} />
                        </View>
                    </View>

                    <Text style={s.heroTitle}>{current.title.toUpperCase()}</Text>
                    <Text style={s.heroName}>{displayName}</Text>
                    <Text style={s.heroDesc}>{current.desc}</Text>

                    {/* Progress bar to next rank */}
                    {nextRank && (
                        <View style={s.progressSection}>
                            <View style={s.progressBarBg}>
                                <View style={[s.progressBarFill, { width: `${progressInRank * 100}%`, backgroundColor: COLORS.primary }]} />
                            </View>
                            <View style={s.progressLabels}>
                                <Text style={s.progressText}>{total} / {nextRank.min} SESSIONS</Text>
                                <Text style={[s.progressPercentText, { color: COLORS.primary }]}>{Math.round(progressInRank * 100)}%</Text>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* ── Stats Row ── */}
                <View style={s.statsRow}>
                    <View style={s.statBox}>
                        <Ionicons name="barbell-outline" size={16} color={COLORS.textSub} />
                        <Text style={s.statVal}>{total}</Text>
                        <Text style={s.statLbl}>SESSIONS</Text>
                    </View>
                    <View style={[s.statBox, s.statBoxMid]}>
                        <Ionicons name="flame" size={16} color="#FF9500" />
                        <Text style={[s.statVal, { color: "#FF9500" }]}>{streak}d</Text>
                        <Text style={s.statLbl}>STREAK</Text>
                    </View>
                    <View style={s.statBox}>
                        <Ionicons name="flash" size={16} color={COLORS.primary} />
                        <Text style={[s.statVal, { color: COLORS.primary }]}>{sessionsToNext || "MAX"}</Text>
                        <Text style={s.statLbl}>{nextRank ? "TO NEXT" : "REACHED"}</Text>
                    </View>
                </View>

                {/* ── Next Rank Preview ── */}
                {nextRank && (
                    <View style={s.nextSection}>
                        <Text style={s.sectionTitle}>NEXT MILESTONE</Text>
                        <View style={s.nextCard}>
                            <View style={s.nextIcon}>
                                <Ionicons name={nextRank.icon} size={20} color={COLORS.text} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.nextTitle}>{nextRank.title}</Text>
                                <Text style={s.nextSub}>{sessionsToNext} more sessions to unlock</Text>
                            </View>
                            <View style={s.nextBadge}>
                                <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
                            </View>
                        </View>
                    </View>
                )}

                {/* ── Milestone Ladder ── */}
                <View style={s.ladderSection}>
                    <Text style={s.sectionTitle}>MILESTONE TIERS</Text>
                    {RANKS.map((rank) => {
                        const isAchieved = total >= rank.min;
                        const isCurrent = rank.title === current.title;
                        const rankColor = getMuscleColor(rank.target);

                        return (
                            <View
                                key={rank.title}
                                style={[
                                    s.ladderRow,
                                    isCurrent && { borderColor: `${COLORS.primary}80`, backgroundColor: `${COLORS.primary}0D` },
                                ]}
                            >
                                {isCurrent && (
                                    <View style={[s.ladderLeftSpine, { backgroundColor: COLORS.primary }]} />
                                )}
                                <View style={[s.ladderIcon, isCurrent && { borderColor: `${COLORS.primary}66` }]}>
                                    <Ionicons
                                        name={isAchieved ? rank.icon : "lock-closed-outline"}
                                        size={16}
                                        color={isCurrent ? COLORS.primary : isAchieved ? rankColor : COLORS.textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[s.ladderTitle, { color: isAchieved ? COLORS.text : COLORS.textMuted }]}>{rank.title}</Text>
                                        {isCurrent && (
                                            <View style={[s.currentBadge, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                                                <Text style={s.currentBadgeText}>YOU</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[s.ladderSub, !isAchieved && { opacity: 0.5 }]}>
                                        {rank.min}+ sessions · {rank.desc.split('.')[0]}
                                    </Text>
                                </View>
                                {isAchieved && !isCurrent && (
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* ── Primary CTA Button with Signature Angular Cut ── */}
                <View style={s.ctaContainer}>
                    <TouchableOpacity
                        style={s.primaryCta}
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.goBack();
                        }}
                    >
                        <Svg width="100%" height={48} style={StyleSheet.absoluteFillObject}>
                            <Polygon points="12,0 1000,0 1000,48 0,48" fill={COLORS.primary} />
                        </Svg>
                        <Text style={s.primaryCtaText}>CONTINUE TRAINING ›</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Footer ── */}
                <View style={s.footer}>
                    <Text style={s.footerText}>
                        {nextRank
                            ? `${sessionsToNext} sessions until ${nextRank.title}.`
                            : `All milestones completed. Keep building consistency.`
                        }
                    </Text>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.base, paddingBottom: 16, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    headerTitle: { fontSize: 24, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: -0.5 },

    // Hero Card
    heroCard: {
        marginHorizontal: SPACING.base, marginBottom: 16, borderRadius: RADIUS.lg, padding: 22,
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
        alignItems: 'center', overflow: 'hidden', position: 'relative',
    },
    heroBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 16 },
    heroEyebrow: { fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5 },
    levelPill: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm,
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    levelPillText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text },

    heroIconRow: { marginBottom: 14 },
    heroIconCircle: {
        width: 72, height: 72, borderRadius: RADIUS.pill,
        borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.bg,
    },
    heroTitle: { fontSize: 26, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: -0.5, marginBottom: 2 },
    heroName: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, marginBottom: 10 },
    heroDesc: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textSub, textAlign: 'center', lineHeight: 18, marginBottom: 18, paddingHorizontal: 10 },

    progressSection: { width: '100%' },
    progressBarBg: {
        height: 5, borderRadius: RADIUS.xs, backgroundColor: COLORS.bg,
        overflow: 'hidden', borderWidth: 0.5, borderColor: COLORS.border,
    },
    progressBarFill: { height: '100%', borderRadius: RADIUS.xs, backgroundColor: COLORS.primary },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressText: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub },
    progressPercentText: { fontSize: 10, fontFamily: FAMILY.monoBold },

    // Stats
    statsRow: {
        flexDirection: 'row', marginHorizontal: SPACING.base, marginBottom: 20,
        borderRadius: RADIUS.md, overflow: 'hidden',
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
    },
    statBox: {
        flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4,
    },
    statBoxMid: {
        borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border,
    },
    statVal: { fontSize: 17, fontFamily: FAMILY.monoBold, color: COLORS.text },
    statLbl: { fontSize: 8, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1 },

    // Next Rank
    nextSection: { marginHorizontal: SPACING.base, marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10 },
    nextCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: RADIUS.md, padding: 14,
        borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
    },
    nextIcon: {
        width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.bg,
    },
    nextTitle: { fontSize: 14, fontFamily: FAMILY.semibold, color: COLORS.text },
    nextSub: { fontSize: 11, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    nextBadge: {
        width: 32, height: 32, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.bg,
    },

    // Rank Ladder
    ladderSection: { marginHorizontal: SPACING.base, marginBottom: 20 },
    ladderRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6,
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
        position: 'relative', overflow: 'hidden',
    },
    ladderLeftSpine: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5,
    },
    ladderIcon: {
        width: 34, height: 34, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg,
    },
    ladderTitle: { fontSize: 13, fontFamily: FAMILY.semibold },
    ladderSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    currentBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1,
    },
    currentBadgeText: { fontSize: 8, fontFamily: FAMILY.monoBold, color: "#FFFFFF" },

    // Primary CTA Button
    ctaContainer: { marginHorizontal: SPACING.base, marginTop: 10, marginBottom: 8 },
    primaryCta: {
        height: 48, justifyContent: 'center', alignItems: 'center',
        borderRadius: RADIUS.sm, overflow: 'hidden',
    },
    primaryCtaText: {
        fontSize: 13, fontFamily: FAMILY.bold, color: '#FFFFFF', letterSpacing: 0.5,
    },

    // Footer
    footer: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 36 },
    footerText: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
