import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, StatusBar,
    Animated, Dimensions, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getStreak, getTotalWorkouts, getPRRecordsLocal, getLatestUserBodyweight } from "../utils/storage";
import { evaluateStrengthProfile, TIERS, COMPOUND_CATEGORIES } from "../utils/strengthStandards";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

export const RANKS = [
    { level: 1, title: "RECRUIT", icon: "shield-outline", min: 0, max: 4, color: "#8E8E93", desc: "Every legend starts with a single rep. Welcome to the arena." },
    { level: 2, title: "ROOKIE", icon: "star-outline", min: 5, max: 9, color: "#30B0C7", desc: "You've proven you're serious. Keep building momentum." },
    { level: 3, title: "CHADLITE", icon: "trending-up", min: 10, max: 24, color: "#30D158", desc: "Others are taking notice. Your consistency is paying off." },
    { level: 4, title: "WARRIOR", icon: "fitness", min: 25, max: 49, color: "#FF9500", desc: "Battle-tested and relentless. You're in the top tier now." },
    { level: 5, title: "TITAN", icon: "diamond-outline", min: 50, max: 99, color: "#FF5E3A", desc: "An unstoppable force. Very few reach this stage." },
    { level: 6, title: "LEGEND", icon: "trophy-outline", min: 100, max: 999, color: "#E31E24", desc: "The pinnacle. You've conquered everything. Pure excellence." },
];

export function getRankData(total) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (total >= RANKS[i].min) return { ...RANKS[i], index: i };
    }
    return { ...RANKS[0], index: 0 };
}

export default function RankScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState("RANKS"); // "RANKS" | "STANDARDS"
    const [total, setTotal] = useState(0);
    const [streak, setStreak] = useState(0);
    const [strengthProfile, setStrengthProfile] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    const displayName = profile?.fullName?.split(" ")[0] || "ATHLETE";
    const loadStats = useCallback(async () => {
        const [t, s, prs, bw] = await Promise.all([
            getTotalWorkouts(),
            getStreak(),
            getPRRecordsLocal(),
            getLatestUserBodyweight(),
        ]);
        setTotal(t);
        setStreak(s);
        const evalProfile = evaluateStrengthProfile(prs, bw);
        setStrengthProfile(evalProfile);
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
    const activeRankColor = current.color;

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
                <Text style={s.headerTitle}>RANK & PROGRESSION</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* ── Sub Navigation Tabs ── */}
            <View style={s.tabSelector}>
                <TouchableOpacity
                    style={[s.tabBtn, activeTab === "RANKS" && s.tabBtnActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveTab("RANKS");
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="shield-outline"
                        size={13}
                        color={activeTab === "RANKS" ? COLORS.primary : COLORS.textMuted}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[s.tabBtnText, activeTab === "RANKS" && s.tabBtnTextActive]}>
                        WARRIOR RANKS
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[s.tabBtn, activeTab === "STANDARDS" && s.tabBtnActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveTab("STANDARDS");
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="fitness-outline"
                        size={13}
                        color={activeTab === "STANDARDS" ? COLORS.primary : COLORS.textMuted}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[s.tabBtnText, activeTab === "STANDARDS" && s.tabBtnTextActive]}>
                        STRENGTH STANDARDS
                    </Text>
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
            >
                {activeTab === "RANKS" ? (
                    <>
                        {/* ── Hero Card ── */}
                        <Animated.View style={[s.heroCard, { borderColor: `${activeRankColor}4D`, transform: [{ scale: scaleAnim }] }]}>
                            <LinearGradient
                                colors={[`${activeRankColor}20`, "transparent"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                                pointerEvents="none"
                            />

                            <View style={s.heroBadgeRow}>
                                <Text style={s.heroEyebrow}>CURRENT RANK</Text>
                                <View style={[s.levelPill, { backgroundColor: `${activeRankColor}1F`, borderColor: `${activeRankColor}4D` }]}>
                                    <Text style={[s.levelPillText, { color: activeRankColor }]}>{total} SESSIONS</Text>
                                </View>
                            </View>

                            <View style={s.heroIconRow}>
                                <View style={[s.heroIconCircle, { borderColor: `${activeRankColor}66` }]}>
                                    <Ionicons name={current.icon} size={32} color={activeRankColor} />
                                </View>
                            </View>

                            <Text style={s.heroTitle}>{current.title}</Text>
                            <Text style={s.heroName}>{displayName}</Text>
                            <Text style={s.heroDesc}>{current.desc}</Text>

                            {/* Progress bar to next rank */}
                            {nextRank && (
                                <View style={s.progressSection}>
                                    <View style={s.progressBarBg}>
                                        <View style={[s.progressBarFill, { width: `${progressInRank * 100}%`, backgroundColor: activeRankColor }]} />
                                    </View>
                                    <View style={s.progressLabels}>
                                        <Text style={s.progressText}>{total} / {nextRank.min} SESSIONS</Text>
                                        <Text style={s.progressPercentText}>{Math.round(progressInRank * 100)}%</Text>
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
                                <Ionicons name="flash" size={16} color={activeRankColor} />
                                <Text style={[s.statVal, { color: activeRankColor }]}>{sessionsToNext || "MAX"}</Text>
                                <Text style={s.statLbl}>{nextRank ? "TO NEXT" : "REACHED"}</Text>
                            </View>
                        </View>

                        {/* ── Next Rank Preview ── */}
                        {nextRank && (
                            <View style={s.nextSection}>
                                <Text style={s.sectionTitle}>NEXT RANK</Text>
                                <View style={[s.nextCard, { borderColor: `${nextRank.color}33` }]}>
                                    <View style={[s.nextIcon, { borderColor: `${nextRank.color}4D`, backgroundColor: `${nextRank.color}15` }]}>
                                        <Ionicons name={nextRank.icon} size={20} color={nextRank.color} />
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
                            {RANKS.map((rank) => {
                                const isAchieved = total >= rank.min;
                                const isCurrent = rank.title === current.title;

                                return (
                                    <View
                                        key={rank.title}
                                        style={[
                                            s.ladderRow,
                                            isCurrent && { borderColor: `${rank.color}80`, backgroundColor: `${rank.color}0D` },
                                        ]}
                                    >
                                        {isCurrent && (
                                            <View style={[s.ladderLeftSpine, { backgroundColor: rank.color }]} />
                                        )}
                                        <View style={[
                                            s.ladderIcon,
                                            isCurrent && { borderColor: `${rank.color}66` },
                                            isAchieved && { backgroundColor: `${rank.color}15` },
                                        ]}>
                                            <Ionicons
                                                name={isAchieved ? rank.icon : "lock-closed-outline"}
                                                size={16}
                                                color={isAchieved ? rank.color : COLORS.textMuted}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={[s.ladderTitle, { color: isAchieved ? COLORS.text : COLORS.textMuted }]}>{rank.title}</Text>
                                                {isCurrent && (
                                                    <View style={[s.currentBadge, { backgroundColor: rank.color, borderColor: rank.color }]}>
                                                        <Text style={s.currentBadgeText}>YOU</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[s.ladderSub, !isAchieved && { opacity: 0.5 }]}>
                                                {rank.min}+ sessions · {rank.desc.split('.')[0]}
                                            </Text>
                                        </View>
                                        {isAchieved && !isCurrent && (
                                            <Ionicons name="checkmark-circle" size={16} color={rank.color} />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </>
                ) : (
                    <>
                        {/* ── Strength Standards Hero Card ── */}
                        <Animated.View style={[s.heroCard, { borderColor: `${strengthProfile?.overallTier?.color || COLORS.primary}4D`, transform: [{ scale: scaleAnim }] }]}>
                            <LinearGradient
                                colors={[`${strengthProfile?.overallTier?.color || COLORS.primary}20`, "transparent"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                                pointerEvents="none"
                            />

                            <View style={s.heroBadgeRow}>
                                <Text style={s.heroEyebrow}>RELATIVE STRENGTH</Text>
                                <View style={[s.levelPill, { backgroundColor: `${strengthProfile?.overallTier?.color || COLORS.primary}1F`, borderColor: `${strengthProfile?.overallTier?.color || COLORS.primary}4D` }]}>
                                    <Text style={[s.levelPillText, { color: strengthProfile?.overallTier?.color || COLORS.primary }]}>
                                        {(strengthProfile?.bodyweightKg || 75).toFixed(1)} KG BW
                                    </Text>
                                </View>
                            </View>

                            <View style={s.heroIconRow}>
                                <View style={[s.heroIconCircle, { borderColor: `${strengthProfile?.overallTier?.color || COLORS.primary}66` }]}>
                                    <Ionicons name="barbell" size={32} color={strengthProfile?.overallTier?.color || COLORS.primary} />
                                </View>
                            </View>

                            <Text style={s.heroTitle}>{strengthProfile?.overallTier?.label || "NOVICE"}</Text>
                            <Text style={s.heroName}>{displayName} · POUND-FOR-POUND</Text>
                            <Text style={s.heroDesc}>
                                Strength benchmarked against bodyweight multipliers across core compound movements.
                            </Text>

                            <View style={s.standardsSummaryRow}>
                                <View style={s.standardsSummaryBox}>
                                    <Text style={s.standardsSummaryVal}>{strengthProfile?.completedCount || 0}/5</Text>
                                    <Text style={s.standardsSummaryLbl}>BENCHMARKS</Text>
                                </View>
                                <View style={s.standardsSummaryDivider} />
                                <View style={s.standardsSummaryBox}>
                                    <Text style={[s.standardsSummaryVal, { color: strengthProfile?.overallTier?.color || COLORS.text }]}>
                                        {strengthProfile?.overallTier?.label || "NOVICE"}
                                    </Text>
                                    <Text style={s.standardsSummaryLbl}>TIER CLASS</Text>
                                </View>
                            </View>
                        </Animated.View>

                        {/* ── Compound Movement Standards Grid ── */}
                        <View style={s.ladderSection}>
                            <Text style={s.sectionTitle}>COMPOUND BENCHMARKS</Text>
                            {(strengthProfile?.results || []).map((item) => {
                                const catColor = item.category.color;
                                const tierColor = item.currentTier.color;

                                return (
                                    <View key={item.category.id} style={s.standardCard}>
                                        <View style={s.standardCardHeader}>
                                            <View style={[s.standardIcon, { borderColor: `${catColor}4D`, backgroundColor: `${catColor}15` }]}>
                                                <Ionicons name={item.category.icon} size={18} color={catColor} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.standardName}>{item.category.name.toUpperCase()}</Text>
                                                <Text style={s.standardTarget}>{item.category.targetGroup.toUpperCase()} COMPOUND</Text>
                                            </View>
                                            <View style={[s.tierPill, { borderColor: `${tierColor}55`, backgroundColor: `${tierColor}1A` }]}>
                                                <Text style={[s.tierPillText, { color: tierColor }]}>{item.currentTier.label}</Text>
                                            </View>
                                        </View>

                                        {item.hasData ? (
                                            <View style={s.standardDataSection}>
                                                <View style={s.standardStatsRow}>
                                                    <View>
                                                        <Text style={s.standardStatLabel}>ESTIMATED 1RM</Text>
                                                        <Text style={s.standard1RMVal}>
                                                            {item.best1RM} <Text style={s.standardUnit}>KG</Text>
                                                        </Text>
                                                    </View>
                                                    <View style={s.standardRatioBadge}>
                                                        <Text style={s.standardRatioText}>{item.ratio}× BW</Text>
                                                    </View>
                                                    {item.bestRecord && (
                                                        <View style={{ alignItems: "flex-end" }}>
                                                            <Text style={s.standardStatLabel}>BEST SET</Text>
                                                            <Text style={s.standardBestSetText}>
                                                                {item.bestRecord.weightKg}kg × {item.bestRecord.reps}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Progress Bar towards Next Tier */}
                                                <View style={s.standardProgressSection}>
                                                    <View style={s.standardProgressBarBg}>
                                                        <View
                                                            style={[
                                                                s.standardProgressBarFill,
                                                                {
                                                                    width: `${Math.round(item.progressToNext * 100)}%`,
                                                                    backgroundColor: tierColor,
                                                                },
                                                            ]}
                                                        />
                                                    </View>
                                                    <View style={s.standardProgressLabels}>
                                                        <Text style={s.standardProgressTarget}>
                                                            {item.nextTier
                                                                ? `+${item.kgNeeded} kg for ${item.nextTier.label}`
                                                                : "MAX TIER ACHIEVED"}
                                                        </Text>
                                                        <Text style={s.standardProgressPercent}>
                                                            {Math.round(item.progressToNext * 100)}%
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={s.standardEmptyBox}>
                                                <Text style={s.standardEmptyText}>
                                                    NO PR LOGGED YET · TARGET: {item.targetKgNext} KG FOR NOVICE
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>

                        {/* ── Strength Tiers Legend ── */}
                        <View style={s.tiersLegendBox}>
                            <Text style={s.tiersLegendTitle}>STRENGTH DIVISIONS</Text>
                            <View style={s.tiersLegendRow}>
                                {TIERS.map((tier) => (
                                    <View key={tier.key} style={s.tierLegendItem}>
                                        <View style={[s.tierLegendDot, { backgroundColor: tier.color }]} />
                                        <Text style={s.tierLegendText}>{tier.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {/* ── Primary CTA Button ── */}
                <View style={s.ctaContainer}>
                    <TouchableOpacity
                        style={s.primaryCta}
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.goBack();
                        }}
                    >
                        <Text style={s.primaryCtaText}>CONTINUE TRAINING ›</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Footer ── */}
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
        paddingHorizontal: SPACING.base, paddingBottom: 16, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: COLORS.border,
    },
    headerTitle: { fontSize: 18, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },

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
    heroTitle: { fontSize: 28, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: 0.5, marginBottom: 2 },
    heroName: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, marginBottom: 10 },
    heroDesc: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textSub, textAlign: 'center', lineHeight: 18, marginBottom: 18, paddingHorizontal: 10 },

    progressSection: { width: '100%' },
    progressBarBg: {
        height: 5, borderRadius: RADIUS.xs, backgroundColor: COLORS.bg,
        overflow: 'hidden', borderWidth: 0.5, borderColor: COLORS.border,
    },
    progressBarFill: { height: '100%', borderRadius: RADIUS.xs },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressText: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub },
    progressPercentText: { fontSize: 10, fontFamily: FAMILY.monoBold, color: "#FFFFFF" },

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
    nextTitle: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },
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
    ladderTitle: { fontSize: 13, fontFamily: FAMILY.bold, letterSpacing: 0.5 },
    ladderSub: { fontSize: 10, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 2 },
    currentBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1,
    },
    currentBadgeText: { fontSize: 8, fontFamily: FAMILY.monoBold, color: "#FFFFFF" },

    // Primary CTA Button
    ctaContainer: { marginHorizontal: SPACING.base, marginTop: 10, marginBottom: 8 },
    primaryCta: {
        height: 50,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryCtaText: {
        fontSize: 13, fontFamily: FAMILY.bold, color: '#FFFFFF', letterSpacing: 0.8,
    },

    // Footer
    footer: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, paddingHorizontal: 36 },
    footerText: { fontSize: 11.5, fontFamily: FAMILY.regular, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17 },

    // Tabs
    tabSelector: {
        flexDirection: 'row',
        marginHorizontal: SPACING.base,
        marginBottom: 14,
        padding: 4,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: RADIUS.sm,
    },
    tabBtnActive: {
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.4)",
    },
    tabBtnText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
    },
    tabBtnTextActive: {
        color: COLORS.text,
    },

    // Strength Standards Styles
    standardsSummaryRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    standardsSummaryBox: {
        alignItems: 'center',
        flex: 1,
    },
    standardsSummaryVal: {
        fontSize: 15,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
    },
    standardsSummaryLbl: {
        fontSize: 8.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginTop: 2,
    },
    standardsSummaryDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
    },

    standardCard: {
        padding: 14,
        marginBottom: 8,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
    },
    standardCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    standardIcon: {
        width: 34,
        height: 34,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    standardName: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    standardTarget: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    tierPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
    },
    tierPillText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.5,
    },
    standardDataSection: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    standardStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    standardStatLabel: {
        fontSize: 8,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    standard1RMVal: {
        fontSize: 15,
        fontFamily: FAMILY.monoBold,
        color: '#FFFFFF',
    },
    standardUnit: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    standardRatioBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: RADIUS.sm,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    standardRatioText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    standardBestSetText: {
        fontSize: 12,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
    standardProgressSection: {
        marginTop: 4,
    },
    standardProgressBarBg: {
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.bg,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    standardProgressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    standardProgressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    standardProgressTarget: {
        fontSize: 9,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
    },
    standardProgressPercent: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    standardEmptyBox: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    standardEmptyText: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    tiersLegendBox: {
        marginHorizontal: SPACING.base,
        marginBottom: 20,
        padding: 12,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tiersLegendTitle: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 8,
    },
    tiersLegendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 6,
    },
    tierLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    tierLegendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    tierLegendText: {
        fontSize: 8.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
});
