import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, StatusBar,
    Animated, Dimensions, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStreak, getTotalWorkouts } from "../utils/storage";
import { COLORS, FAMILY, SPACING } from "../utils/theme";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

const RANKS = [
    { level: 1, title: "RECRUIT", icon: "shield-outline", min: 0, max: 4, color: "#6B7280", desc: "Every legend starts with a single rep. Welcome to the arena." },
    { level: 2, title: "ROOKIE", icon: "star-outline", min: 5, max: 9, color: "#60A5FA", desc: "You've proven you're serious. Keep building momentum." },
    { level: 3, title: "CHADLITE", icon: "trending-up", min: 10, max: 24, color: "#34D399", desc: "Others are taking notice. Your consistency is paying off." },
    { level: 4, title: "WARRIOR", icon: "fitness", min: 25, max: 49, color: "#FBBF24", desc: "Battle-tested and relentless. You're in the top tier now." },
    { level: 5, title: "TITAN", icon: "diamond-outline", min: 50, max: 99, color: "#F97316", desc: "An unstoppable force. Very few reach this stage." },
    { level: 6, title: "LEGEND", icon: "trophy-outline", min: 100, max: 999, color: "#EF4444", desc: "The pinnacle. You've conquered everything. Pure excellence." },
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
    const levelNum = Math.min(Math.floor(total / 10) + 1, 99);
    const progressInRank = nextRank
        ? Math.min((total - current.min) / (nextRank.min - current.min), 1)
        : 1;
    const sessionsToNext = nextRank ? nextRank.min - total : 0;

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            <View style={[s.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Rank & Progression</Text>
                <View style={{ width: 36 }} />
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            >
                {/* ── Hero Card ── */}
                <Animated.View style={[s.heroCard, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={s.heroBadgeRow}>
                        <Text style={s.heroEyebrow}>CURRENT RANK</Text>
                        <View style={s.levelPill}>
                            <Text style={s.levelPillText}>LVL {String(levelNum).padStart(2, '0')}</Text>
                        </View>
                    </View>

                    <View style={s.heroIconRow}>
                        <View style={s.heroIconCircle}>
                            <Ionicons name={current.icon} size={36} color={COLORS.text} />
                        </View>
                    </View>

                    <Text style={s.heroTitle}>{current.title}</Text>
                    <Text style={s.heroName}>{displayName}</Text>
                    <Text style={s.heroDesc}>{current.desc}</Text>

                    {/* Progress bar to next rank */}
                    {nextRank && (
                        <View style={s.progressSection}>
                            <View style={s.progressBarBg}>
                                <View style={[s.progressBarFill, { width: `${progressInRank * 100}%` }]} />
                            </View>
                            <View style={s.progressLabels}>
                                <Text style={s.progressText}>{total} / {nextRank.min} sessions</Text>
                                <Text style={[s.progressText, { color: COLORS.text }]}>{Math.round(progressInRank * 100)}%</Text>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* ── Stats Row ── */}
                <View style={s.statsRow}>
                    <View style={s.statBox}>
                        <Ionicons name="barbell-outline" size={16} color={COLORS.primary} />
                        <Text style={s.statVal}>{total}</Text>
                        <Text style={s.statLbl}>SESSIONS</Text>
                    </View>
                    <View style={[s.statBox, s.statBoxMid]}>
                        <Ionicons name="flame" size={16} color={COLORS.primary} />
                        <Text style={s.statVal}>{streak}d</Text>
                        <Text style={s.statLbl}>STREAK</Text>
                    </View>
                    <View style={s.statBox}>
                        <Ionicons name="flash" size={16} color={COLORS.primary} />
                        <Text style={s.statVal}>{sessionsToNext || "MAX"}</Text>
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

                {/* ── Rank Ladder ── */}
                <View style={s.ladderSection}>
                    <Text style={s.sectionTitle}>RANK LADDER</Text>
                    {RANKS.map((rank, i) => {
                        const isAchieved = total >= rank.min;
                        const isCurrent = rank.title === current.title;
                        return (
                            <View key={rank.title} style={[s.ladderRow, isCurrent && { borderColor: COLORS.primary }]}>
                                <View style={s.ladderIcon}>
                                    <Ionicons
                                        name={isAchieved ? rank.icon : "lock-closed-outline"}
                                        size={16}
                                        color={isAchieved ? COLORS.text : COLORS.textMuted}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[s.ladderTitle, { color: isAchieved ? COLORS.text : COLORS.textMuted }]}>{rank.title}</Text>
                                        {isCurrent && (
                                            <View style={s.currentBadge}>
                                                <Text style={s.currentBadgeText}>YOU</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[s.ladderSub, !isAchieved && { opacity: 0.5 }]}>{rank.min}+ sessions · {rank.desc.split('.')[0]}</Text>
                                </View>
                                {isAchieved && !isCurrent && (
                                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* ── Motivational Footer ── */}
                <View style={s.footer}>
                    <Text style={s.footerText}>
                        {nextRank
                            ? `${sessionsToNext} sessions away from ${nextRank.title}.\nEvery rep counts.`
                            : `You've reached the pinnacle.\nYou are the standard.`
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
        paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    headerTitle: { fontSize: 24, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -0.5 },

    // Hero Card
    heroCard: {
        marginHorizontal: 20, marginBottom: 16, borderRadius: RADIUS.card, padding: 22,
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
        alignItems: 'center',
    },
    heroBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 16 },
    heroEyebrow: { fontSize: 9, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5 },
    levelPill: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill,
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    levelPillText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text },

    heroIconRow: { marginBottom: 14 },
    heroIconCircle: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.bg,
    },
    heroTitle: { fontSize: 26, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -0.5, marginBottom: 2 },
    heroName: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, marginBottom: 10 },
    heroDesc: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textSub, textAlign: 'center', lineHeight: 18, marginBottom: 18, paddingHorizontal: 10 },

    progressSection: { width: '100%' },
    progressBarBg: {
        height: 4, borderRadius: 2, backgroundColor: COLORS.bg,
        overflow: 'hidden', borderWidth: 0.5, borderColor: COLORS.border,
    },
    progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressText: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub },

    // Stats
    statsRow: {
        flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
        borderRadius: RADIUS.card, overflow: 'hidden',
        borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
    },
    statBox: {
        flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4,
    },
    statBoxMid: {
        borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border,
    },
    statVal: { fontSize: 16, fontFamily: FAMILY.monoBold, color: COLORS.text },
    statLbl: { fontSize: 8, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1 },

    // Next Rank
    nextSection: { marginHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10 },
    nextCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: RADIUS.card, padding: 14,
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
    ladderSection: { marginHorizontal: 20, marginBottom: 20 },
    ladderRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6,
        borderRadius: RADIUS.card, borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
    },
    ladderIcon: {
        width: 34, height: 34, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border,
        alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg,
    },
    ladderTitle: { fontSize: 13, fontFamily: FAMILY.semibold },
    ladderSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    currentBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: COLORS.primary,
        backgroundColor: 'rgba(122, 46, 34, 0.15)',
    },
    currentBadgeText: { fontSize: 8, fontFamily: FAMILY.monoBold, color: COLORS.text },

    // Footer
    footer: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 36 },
    footerText: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
