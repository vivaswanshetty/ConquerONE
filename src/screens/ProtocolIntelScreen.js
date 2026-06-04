import React, { useState, useRef, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Animated, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FAMILY } from "../utils/theme";
import {
    PLAN_SCIENCE, PLAN_RULES, PROGRESSION_SYSTEM, RESULTS_TIMELINE, PLAN_SECRET
} from "../data/workoutData";

const { width } = Dimensions.get("window");

export default function ProtocolIntelScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(0); // 0: Science, 1: Rules, 2: Progression, 3: Timeline
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const TABS = ["SCIENCE", "RULES", "SYSTEM", "TIMELINE"];

    const switchTab = (index) => {
        if (index === activeTab) return;
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
        ]).start();
        setTimeout(() => setActiveTab(index), 100);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Glowing red accent light top right */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <LinearGradient
                    colors={["rgba(227,30,36,0.06)", "transparent"]}
                    style={{ height: width * 0.8, width: width, position: "absolute", top: -width * 0.1, right: -width * 0.1 }}
                />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerLabel}>ELITE PROTOCOL</Text>
                    <Text style={styles.headerTitle}>HANDBOOK</Text>
                </View>
                <View style={{ width: 48 }} />
            </View>

            {/* Premium Segmented Tab Bar */}
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                    {TABS.map((tab, idx) => {
                        const active = idx === activeTab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabBtn, active && styles.tabBtnActive]}
                                onPress={() => switchTab(idx)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
                                {active && <View style={styles.activeTabIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Content Scroll View */}
            <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
                <Animated.View style={[styles.contentAnim, { opacity: fadeAnim }]}>
                    {activeTab === 0 && <ScienceTab />}
                    {activeTab === 1 && <RulesTab />}
                    {activeTab === 2 && <ProgressionTab />}
                    {activeTab === 3 && <TimelineTab />}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

/* ────────────── SCIENCE TAB ────────────── */
function ScienceTab() {
    return (
        <View style={styles.tabContent}>
            <Text style={styles.tabHeaderTitle}>WHY THIS SPLIT WORKS</Text>
            <Text style={styles.tabHeaderDesc}>The scientific reasoning behind the exercise ordering and scheduling variables.</Text>
            
            {PLAN_SCIENCE.map((item, idx) => (
                <View key={idx} style={styles.premiumCard}>
                    <LinearGradient
                        colors={["rgba(255,255,255,0.03)", "transparent"]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardHeader}>
                        <View style={styles.accentBadge}>
                            <Text style={styles.accentBadgeText}>0{idx + 1}</Text>
                        </View>
                        <Text style={styles.cardTitle}>{item.principle.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.cardBody}>{item.meaning}</Text>
                </View>
            ))}
        </View>
    );
}

/* ────────────── RULES TAB ────────────── */
function RulesTab() {
    const ICONS = ["trending-up", "clipboard", "shield-checkmark", "timer", "eye", "fitness"];
    return (
        <View style={styles.tabContent}>
            <Text style={styles.tabHeaderTitle}>THE NON-NEGOTIABLE RULES</Text>
            <Text style={styles.tabHeaderDesc}>These rules dictate muscle hypertrophy. Compromise here is a compromise on gains.</Text>

            {PLAN_RULES.map((item, idx) => (
                <View key={idx} style={styles.premiumCard}>
                    <LinearGradient
                        colors={["rgba(227,30,36,0.02)", "transparent"]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardHeader}>
                        <View style={[styles.accentBadge, { backgroundColor: "rgba(227,30,36,0.1)", borderColor: "rgba(227,30,36,0.2)" }]}>
                            <Ionicons name={ICONS[idx] || "checkmark"} size={14} color={COLORS.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: COLORS.text }]}>{item.rule}</Text>
                    </View>
                    <Text style={styles.cardBody}>{item.desc}</Text>
                </View>
            ))}
        </View>
    );
}

/* ────────────── PROGRESSION TAB ────────────── */
function ProgressionTab() {
    return (
        <View style={styles.tabContent}>
            <Text style={styles.tabHeaderTitle}>12-WEEK SYSTEM</Text>
            <Text style={styles.tabHeaderDesc}>Adjusting sets and reps systematically to push past plateaus.</Text>

            {PROGRESSION_SYSTEM.map((item, idx) => (
                <View key={idx} style={styles.premiumCard}>
                    <LinearGradient
                        colors={["rgba(255,255,255,0.03)", "transparent"]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardRow}>
                        <View style={styles.progressionMeta}>
                            <Text style={styles.progressionWeek}>{item.week}</Text>
                            <Text style={styles.progressionReps}>{item.setsReps}</Text>
                            <Text style={styles.progressionIso}>{item.isoReps}</Text>
                        </View>
                        <View style={styles.dividerVertical} />
                        <View style={{ flex: 1, paddingLeft: 16 }}>
                            <Text style={styles.progressionLabel}>PHASE OBJECTIVE</Text>
                            <Text style={styles.progressionDesc}>{item.focus}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );
}

/* ────────────── TIMELINE TAB ────────────── */
function TimelineTab() {
    return (
        <View style={styles.tabContent}>
            <Text style={styles.tabHeaderTitle}>TIMELINE & SECRETS</Text>
            <Text style={styles.tabHeaderDesc}>What to expect realistically from Month 1 to Month 12.</Text>

            {RESULTS_TIMELINE.map((item, idx) => (
                <View key={idx} style={styles.timelineRow}>
                    <View style={styles.timelinePoint}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineLine} />
                    </View>
                    <View style={[styles.premiumCard, { flex: 1, marginTop: 0, marginBottom: 12 }]}>
                        <LinearGradient
                            colors={["rgba(255,255,255,0.03)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.timelineTime}>{item.time.toUpperCase()}</Text>
                        <Text style={styles.timelineResult}>{item.result}</Text>
                    </View>
                </View>
            ))}

            {/* The Only Secret */}
            <View style={[styles.premiumCard, { borderColor: COLORS.primary, borderWidth: 1, marginTop: 24, backgroundColor: "rgba(227,30,36,0.02)" }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.accentBadge, { backgroundColor: "rgba(227,30,36,0.15)", borderColor: COLORS.primary }]}>
                        <Ionicons name="key" size={14} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: COLORS.primary }]}>{PLAN_SECRET.title}</Text>
                </View>
                <Text style={[styles.cardBody, { color: COLORS.text }]}>{PLAN_SECRET.content}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000000" },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 16, paddingTop: 12,
    },
    backBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    headerTitleWrap: { alignItems: "center" },
    headerLabel: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 3 },
    headerTitle: { fontSize: 22, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.5, marginTop: 2 },
    
    // Tab bar
    tabContainer: {
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
        height: 54, marginBottom: 20
    },
    tabScroll: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
    tabBtn: {
        paddingHorizontal: 16, height: 38, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
    },
    tabBtnActive: {
        backgroundColor: "rgba(227,30,36,0.08)",
        borderColor: "rgba(227,30,36,0.2)"
    },
    tabText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 1.5 },
    tabTextActive: { color: COLORS.primary },
    activeTabIndicator: {
        position: "absolute", bottom: -8, width: 4, height: 4,
        borderRadius: 2, backgroundColor: COLORS.primary
    },

    // Content layouts
    contentAnim: { flex: 1 },
    tabContent: { paddingHorizontal: 20 },
    tabHeaderTitle: { fontSize: 26, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -1, marginBottom: 8 },
    tabHeaderDesc: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 18, marginBottom: 24, opacity: 0.8 },

    // Premium Card
    premiumCard: {
        backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 24,
        padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 16, overflow: "hidden"
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
    accentBadge: {
        width: 30, height: 30, borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        alignItems: "center", justifyContent: "center"
    },
    accentBadgeText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub },
    cardTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 1, flex: 1 },
    cardBody: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 20 },

    // Progression layout
    cardRow: { flexDirection: "row", alignItems: "center" },
    progressionMeta: { width: 84, gap: 4 },
    progressionWeek: { fontSize: 18, fontFamily: FAMILY.display, color: COLORS.primary, letterSpacing: -0.5 },
    progressionReps: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 0.5 },
    progressionIso: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textSub, opacity: 0.7 },
    dividerVertical: { width: 1, height: 60, backgroundColor: "rgba(255,255,255,0.06)" },
    progressionLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
    progressionDesc: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 18 },

    // Timeline layout
    timelineRow: { flexDirection: "row", gap: 16 },
    timelinePoint: { alignItems: "center", width: 16 },
    timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 24, zIndex: 2 },
    timelineLine: { width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.05)" },
    timelineTime: { fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 1, marginBottom: 6 },
    timelineResult: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 18 }
});
