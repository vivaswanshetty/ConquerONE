import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, StyleSheet, ScrollView, StatusBar,
    Animated, Dimensions, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FAMILY, SPACING } from "../utils/theme";
import { useAuth } from "../context/AuthContext";
import { fsGetStreak, fsGetTotalWorkouts } from "../utils/firestore";

const { width } = Dimensions.get("window");

const RANKS = [
    { level: 1, title: "RECRUIT", icon: "shield-outline", min: 0, max: 4, color: "#6B7280", desc: "Every legend starts with a single rep. Welcome to the arena." },
    { level: 2, title: "ROOKIE", icon: "star-outline", min: 5, max: 9, color: "#60A5FA", desc: "You've proven you're serious. Keep building momentum." },
    { level: 3, title: "RISING STAR", icon: "trending-up", min: 10, max: 24, color: "#34D399", desc: "Others are taking notice. Your consistency is paying off." },
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

    useEffect(() => {
        (async () => {
            const [t, s] = await Promise.all([fsGetTotalWorkouts(), fsGetStreak()]);
            setTotal(t);
            setStreak(s);
        })();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        ]).start();
    }, []);

    const current = getRankData(total);
    const nextRank = current.index < RANKS.length - 1 ? RANKS[current.index + 1] : null;
    const levelNum = Math.min(Math.floor(total / 10) + 1, 99);
    const progressInRank = nextRank
        ? Math.min((total - current.min) / (nextRank.min - current.min), 1)
        : 1;
    const sessionsToNext = nextRank ? nextRank.min - total : 0;

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Ambient glow */}
            <LinearGradient
                colors={[`${current.color}20`, "transparent"]}
                style={[StyleSheet.absoluteFill, { height: width }]}
            />

            <View style={[s.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>RANK & LEVEL</Text>
                <View style={{ width: 40 }} />
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            >
                {/* ── Hero Card ── */}
                <Animated.View style={[s.heroCard, { transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                        colors={[`${current.color}15`, 'rgba(0,0,0,0.3)']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    />
                    <View style={s.heroBadgeRow}>
                        <Text style={s.heroEyebrow}>CURRENT RANK</Text>
                        <View style={[s.levelPill, { backgroundColor: `${current.color}20`, borderColor: `${current.color}40` }]}>
                            <Text style={[s.levelPillText, { color: current.color }]}>LVL {String(levelNum).padStart(2, '0')}</Text>
                        </View>
                    </View>

                    <View style={s.heroIconRow}>
                        <View style={[s.heroIconCircle, { borderColor: `${current.color}50` }]}>
                            <Ionicons name={current.icon} size={40} color={current.color} />
                        </View>
                    </View>

                    <Text style={[s.heroTitle, { color: current.color }]}>{current.title}</Text>
                    <Text style={s.heroName}>{displayName.toUpperCase()}</Text>
                    <Text style={s.heroDesc}>{current.desc}</Text>

                    {/* Progress bar to next rank */}
                    {nextRank && (
                        <View style={s.progressSection}>
                            <View style={s.progressBarBg}>
                                <LinearGradient
                                    colors={[current.color, `${current.color}80`]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[s.progressBarFill, { width: `${progressInRank * 100}%` }]}
                                />
                            </View>
                            <View style={s.progressLabels}>
                                <Text style={s.progressText}>{total} / {nextRank.min} sessions</Text>
                                <Text style={[s.progressText, { color: current.color }]}>{Math.round(progressInRank * 100)}%</Text>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* ── Stats Row ── */}
                <View style={s.statsRow}>
                    <View style={s.statBox}>
                        <Ionicons name="barbell-outline" size={18} color={COLORS.primary} />
                        <Text style={s.statVal}>{total}</Text>
                        <Text style={s.statLbl}>SESSIONS</Text>
                    </View>
                    <View style={[s.statBox, s.statBoxMid]}>
                        <Ionicons name="flame" size={18} color="#FBBF24" />
                        <Text style={s.statVal}>{streak}D</Text>
                        <Text style={s.statLbl}>STREAK</Text>
                    </View>
                    <View style={s.statBox}>
                        <Ionicons name="flash" size={18} color="#34D399" />
                        <Text style={s.statVal}>{sessionsToNext || "MAX"}</Text>
                        <Text style={s.statLbl}>{nextRank ? "TO NEXT" : "REACHED"}</Text>
                    </View>
                </View>

                {/* ── Next Rank Preview ── */}
                {nextRank && (
                    <View style={s.nextSection}>
                        <Text style={s.sectionTitle}>NEXT MILESTONE</Text>
                        <View style={s.nextCard}>
                            <LinearGradient
                                colors={[`${nextRank.color}08`, 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={[s.nextIcon, { borderColor: `${nextRank.color}30` }]}>
                                <Ionicons name={nextRank.icon} size={22} color={nextRank.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.nextTitle, { color: nextRank.color }]}>{nextRank.title}</Text>
                                <Text style={s.nextSub}>{sessionsToNext} more sessions to unlock</Text>
                            </View>
                            <View style={[s.nextBadge, { borderColor: `${nextRank.color}30` }]}>
                                <Ionicons name="lock-closed" size={14} color={nextRank.color} />
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
                            <View key={rank.title} style={[s.ladderRow, isCurrent && { borderColor: `${rank.color}40`, backgroundColor: `${rank.color}08` }]}>
                                <View style={[s.ladderIcon, { borderColor: isAchieved ? `${rank.color}50` : 'rgba(255,255,255,0.06)' }]}>
                                    <Ionicons
                                        name={isAchieved ? rank.icon : "lock-closed-outline"}
                                        size={18}
                                        color={isAchieved ? rank.color : 'rgba(255,255,255,0.15)'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[s.ladderTitle, { color: isAchieved ? rank.color : 'rgba(255,255,255,0.2)' }]}>{rank.title}</Text>
                                        {isCurrent && (
                                            <View style={[s.currentBadge, { backgroundColor: `${rank.color}20`, borderColor: `${rank.color}40` }]}>
                                                <Text style={[s.currentBadgeText, { color: rank.color }]}>YOU</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[s.ladderSub, !isAchieved && { opacity: 0.3 }]}>{rank.min}+ sessions · {rank.desc.split('.')[0]}</Text>
                                </View>
                                {isAchieved && !isCurrent && (
                                    <Ionicons name="checkmark-circle" size={18} color={rank.color} style={{ opacity: 0.6 }} />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* ── Motivational Footer ── */}
                <View style={s.footer}>
                    <Ionicons name="heart" size={16} color={COLORS.primary} style={{ marginBottom: 10, opacity: 0.6 }} />
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
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.base, paddingBottom: 10,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    headerTitle: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3 },

    // Hero Card
    heroCard: {
        margin: SPACING.base, borderRadius: 28, padding: 28,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', alignItems: 'center',
    },
    heroBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 24 },
    heroEyebrow: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3 },
    levelPill: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
        borderWidth: 1,
    },
    levelPillText: { fontSize: 9, fontFamily: FAMILY.bold, letterSpacing: 1.5 },

    heroIconRow: { marginBottom: 20 },
    heroIconCircle: {
        width: 90, height: 90, borderRadius: 45,
        borderWidth: 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    heroTitle: { fontSize: 32, fontFamily: FAMILY.display, letterSpacing: 2, marginBottom: 4 },
    heroName: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 16 },
    heroDesc: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },

    progressSection: { width: '100%' },
    progressBarBg: {
        height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    progressText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 0.5 },

    // Stats
    statsRow: {
        flexDirection: 'row', marginHorizontal: SPACING.base, marginBottom: 28,
        borderRadius: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    statBox: {
        flex: 1, alignItems: 'center', paddingVertical: 20, gap: 6,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    statBoxMid: {
        borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    statVal: { fontSize: 20, fontFamily: FAMILY.bold, color: COLORS.text },
    statLbl: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },

    // Next Rank
    nextSection: { marginHorizontal: SPACING.base, marginBottom: 28 },
    sectionTitle: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 14 },
    nextCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        borderRadius: 20, padding: 18, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    nextIcon: {
        width: 44, height: 44, borderRadius: 14, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    nextTitle: { fontSize: 14, fontFamily: FAMILY.bold, letterSpacing: 1 },
    nextSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 3 },
    nextBadge: {
        width: 36, height: 36, borderRadius: 10, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },

    // Rank Ladder
    ladderSection: { marginHorizontal: SPACING.base, marginBottom: 28 },
    ladderRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8,
        borderRadius: 16, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        backgroundColor: 'rgba(255,255,255,0.01)',
    },
    ladderIcon: {
        width: 40, height: 40, borderRadius: 12, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    ladderTitle: { fontSize: 12, fontFamily: FAMILY.bold, letterSpacing: 1.5 },
    ladderSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textMuted, marginTop: 3 },
    currentBadge: {
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1,
    },
    currentBadgeText: { fontSize: 7, fontFamily: FAMILY.bold, letterSpacing: 1 },

    // Footer
    footer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 },
    footerText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
