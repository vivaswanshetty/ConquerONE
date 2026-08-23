import React, { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, StatusBar, ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, SPACING, RADIUS } from "../utils/theme";

const { width } = Dimensions.get("window");

const RECOVERY_TIPS = [
    {
        num: "01",
        title: "ACTIVE RECOVERY",
        metric: "20 MIN",
        desc: "A light 20-minute walk or dynamic mobility work to keep nutrient-rich blood flowing to repairing muscle tissues.",
        icon: "walk-outline",
    },
    {
        num: "02",
        title: "HYDRATION FOCUS",
        metric: "3.5 L",
        desc: "Increase baseline water intake by 500ml today with essential electrolytes to accelerate metabolic waste clearance.",
        icon: "water-outline",
    },
    {
        num: "03",
        title: "NUTRIENT RELOAD",
        metric: "2.0 G/KG",
        desc: "Prioritize complete proteins and complex carbohydrates to replenish depleted muscle glycogen stores for tomorrow.",
        icon: "nutrition-outline",
    },
    {
        num: "04",
        title: "SLEEP HYGIENE",
        metric: "8-9 HRS",
        desc: "Target 8-9 hours of restorative sleep. Eliminate blue light screens 45 minutes prior to bed to maximize growth hormone.",
        icon: "moon-outline",
    },
];

const MINDFULNESS_TIPS = [
    {
        num: "01",
        title: "NEURAL BODY SCAN",
        metric: "5 MIN",
        desc: "Spend 5 minutes mentally scanning muscle groups from feet to shoulders. Acknowledge residual tension without judgment.",
        icon: "eye-outline",
    },
    {
        num: "02",
        title: "INTENTION CALIBRATION",
        metric: "1 GOAL",
        desc: "Visualize your upcoming week's split. Identify the singular key lift you intend to dominate in tomorrow's workout.",
        icon: "journal-outline",
    },
    {
        num: "03",
        title: "GRATITUDE & TRIUMPH",
        metric: "3 WINS",
        desc: "Recall three tangible physical accomplishments from this week. Anchor the pride of progressive overload.",
        icon: "sunny-outline",
    },
];

export default function RestDayScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(0); // 0: Protocol, 1: Mindfulness

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ImageBackground
                source={require("../../assets/onboarding_bg.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={["rgba(10,10,11,0.65)", "rgba(10,10,11,0.92)", COLORS.bg]}
                    style={StyleSheet.absoluteFill}
                />
            </ImageBackground>

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerBadge}>
                    <View style={styles.headerBadgeDot} />
                    <Text style={styles.headerBadgeText}>RECOVERY DAY</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            >
                {/* ── Hero Section ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <Text style={styles.eyebrow}>DAY 07 · ACTIVE RESTORATION</Text>
                        <View style={styles.targetPill}>
                            <Text style={styles.targetPillText}>FULL RECHARGE</Text>
                        </View>
                    </View>
                    <Text style={styles.title}>PEAK{"\n"}RESTORATION</Text>
                    <Text style={styles.subtitle}>
                        Adaptation happens in recovery. Cellular repair, nervous system reset, and hypertrophy solidify today.
                    </Text>
                </View>

                {/* ── Segmented Tab Switcher ── */}
                <View style={styles.zentabs}>
                    <TouchableOpacity
                        style={[styles.zentab, activeTab === 0 && styles.zentabActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab(0);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="fitness-outline"
                            size={14}
                            color={activeTab === 0 ? COLORS.primary : COLORS.textMuted}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.zentabText, activeTab === 0 ? { color: COLORS.text } : { color: COLORS.textMuted }]}>
                            RECOVERY
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.zentab, activeTab === 1 && styles.zentabActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab(1);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="leaf-outline"
                            size={14}
                            color={activeTab === 1 ? COLORS.primary : COLORS.textMuted}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.zentabText, activeTab === 1 ? { color: COLORS.text } : { color: COLORS.textMuted }]}>
                            MINDFULNESS
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Cards Grid ── */}
                <View style={styles.tipsGrid}>
                    {(activeTab === 0 ? RECOVERY_TIPS : MINDFULNESS_TIPS).map((tip) => (
                        <View key={tip.num} style={styles.tipCard}>
                            <View style={styles.tipHeaderRow}>
                                <View style={styles.tipHeaderLeft}>
                                    <Text style={styles.tipNum}>{tip.num}</Text>
                                    <View style={styles.tipIconWrap}>
                                        <Ionicons name={tip.icon} size={16} color={COLORS.text} />
                                    </View>
                                </View>
                                <View style={styles.metricBadge}>
                                    <Text style={styles.metricBadgeText}>{tip.metric}</Text>
                                </View>
                            </View>

                            <Text style={styles.tipTitle}>{tip.title}</Text>
                            <Text style={styles.tipDesc}>{tip.desc}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Meditation & Breathwork Promo ── */}
                <TouchableOpacity
                    style={styles.meditationCard}
                    activeOpacity={0.85}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                    <View style={styles.meditationContent}>
                        <View style={styles.medHeaderRow}>
                            <Text style={styles.medHeader}>MINDFULNESS SESSION</Text>
                        </View>
                        <Text style={styles.medTitle}>Guided Breathwork</Text>
                        <Text style={styles.medSub}>8 MIN · CALM RECOVERY PHASE</Text>
                    </View>
                    <View style={styles.medIconWrap}>
                        <Ionicons name="play-circle" size={38} color={COLORS.text} />
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Fixed Footer CTA ── */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
                <LinearGradient
                    colors={["transparent", "rgba(10,10,11,0.85)", COLORS.bg]}
                    style={styles.footerBg}
                    pointerEvents="none"
                />
                <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.goBack();
                    }}
                    activeOpacity={0.85}
                >
                    <Text style={styles.doneBtnText}>COMPLETE REST DAY ›</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        paddingHorizontal: SPACING.base,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10,
        paddingBottom: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.bgCard,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: COLORS.border,
    },
    headerBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    headerBadgeDot: {
        width: 6, height: 6, borderRadius: RADIUS.pill,
        backgroundColor: COLORS.accent,
    },
    headerBadgeText: {
        fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.textSub, letterSpacing: 1,
    },

    hero: {
        paddingHorizontal: SPACING.base,
        marginTop: 20,
        marginBottom: 28,
    },
    eyebrowRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    eyebrow: {
        fontSize: 9.5, fontFamily: FAMILY.bold, color: COLORS.textMuted,
        letterSpacing: 2,
    },
    targetPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
    },
    targetPillText: {
        fontSize: 8.5, fontFamily: FAMILY.monoBold, color: COLORS.textSub, letterSpacing: 1,
    },
    title: {
        fontSize: 36, fontFamily: FAMILY.bold, color: COLORS.text,
        lineHeight: 40, letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub,
        lineHeight: 20, marginTop: 14,
    },

    zentabs: {
        flexDirection: "row", paddingHorizontal: SPACING.base, gap: 24, marginBottom: 20,
    },
    zentab: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    zentabActive: {
        borderBottomColor: COLORS.primary,
    },
    zentabText: {
        fontSize: 11, fontFamily: FAMILY.bold, letterSpacing: 1.5,
    },

    tipsGrid: {
        paddingHorizontal: SPACING.base,
        gap: 12,
    },
    tipCard: {
        borderRadius: RADIUS.lg,
        padding: 18,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tipHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    tipHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    tipNum: {
        fontSize: 16,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
    },
    tipIconWrap: {
        width: 30, height: 30, borderRadius: RADIUS.sm,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
    },
    metricBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    metricBadgeText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    tipTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    tipDesc: {
        fontSize: 12.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 18,
    },

    meditationCard: {
        marginHorizontal: SPACING.base,
        marginTop: 20,
        borderRadius: RADIUS.lg,
        height: 96,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bgCard,
    },
    meditationContent: { flex: 1 },
    medHeaderRow: {
        marginBottom: 4,
    },
    medHeader: {
        fontSize: 8.5, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5,
    },
    medTitle: {
        fontSize: 17, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.2, marginBottom: 2,
    },
    medSub: {
        fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textSub, letterSpacing: 0.5,
    },
    medIconWrap: {
        marginLeft: 12,
    },

    footer: {
        paddingHorizontal: SPACING.base,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 24,
    },
    footerBg: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
    },
    doneBtn: {
        height: 50,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    doneBtnText: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
});
