// Elite Version - Fixed Interactivity and Layout
import React, { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, StatusBar, ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FAMILY, SPACING } from "../utils/theme";

const { width, height } = Dimensions.get("window");

const RECOVERY_TIPS = [
    {
        title: "ACTIVE RECOVERY",
        desc: "A light 20-minute walk or dynamic stretching to keep blood flowing to recovering tissues.",
        icon: "walk-outline"
    },
    {
        title: "HYDRATION FOCUS",
        desc: "Increase water intake by 500ml today to assist in flushing out metabolic waste.",
        icon: "water-outline"
    },
    {
        title: "NUTRIENT RELOAD",
        desc: "Prioritize protein and complex carbs to replenish glycogen stores for tomorrow's session.",
        icon: "leaf-outline"
    },
    {
        title: "SLEEP HYGIENE",
        desc: "Aim for 8-9 hours of quality sleep. No screens 45 minutes before bed.",
        icon: "moon-outline"
    }
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
                    colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.85)", "#000"]}
                    style={StyleSheet.absoluteFill}
                />
            </ImageBackground>

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingBottom: 180 }}
            >
                <View style={styles.hero}>
                    <Text style={styles.eyebrow}>SUNDAY RECOVERY</Text>
                    <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2}>PEAK{"\n"}RESTORATION</Text>
                    <Text style={styles.subtitle}>
                        Today is about rebuilding. Your results don't happen in the gym; they happen while you rest.
                    </Text>
                </View>

                <View style={styles.zentabs}>
                    <TouchableOpacity
                        style={[styles.zentab, activeTab === 0 && styles.zentabActive]}
                        onPress={() => setActiveTab(0)}
                    >
                        <Text style={[styles.zentabText, activeTab !== 0 && { color: COLORS.textMuted }]}>PROTOCOL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.zentab, activeTab === 1 && styles.zentabActive]}
                        onPress={() => setActiveTab(1)}
                    >
                        <Text style={[styles.zentabText, activeTab !== 1 && { color: COLORS.textMuted }]}>MINDFULNESS</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 0 ? (
                    <View style={styles.tipsGrid}>
                        {RECOVERY_TIPS.map((tip, i) => (
                            <View key={i} style={styles.tipCard}>
                                <LinearGradient
                                    colors={["rgba(255,255,255,0.06)", "transparent"]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <View style={styles.tipIconWrap}>
                                    <Ionicons name={tip.icon} size={20} color={COLORS.primary} />
                                </View>
                                <Text style={styles.tipTitle}>{tip.title}</Text>
                                <Text style={tip.desc.length > 80 ? styles.tipDescSmall : styles.tipDesc}>
                                    {tip.desc}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.tipsGrid}>
                        <View style={styles.tipCard}>
                            <LinearGradient
                                colors={["rgba(255,255,255,0.06)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.tipIconWrap}>
                                <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.tipTitle}>BODY SCAN</Text>
                            <Text style={styles.tipDesc}>Spend 5 minutes mentally scanning your muscles from feet to head. Acknowledge tightness without judgment.</Text>
                        </View>
                        <View style={styles.tipCard}>
                            <LinearGradient
                                colors={["rgba(255,255,255,0.06)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.tipIconWrap}>
                                <Ionicons name="journal-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.tipTitle}>INTENTION SETTING</Text>
                            <Text style={styles.tipDesc}>Briefly visualize your goals for the upcoming week. What is the one big lift you want to dominate?</Text>
                        </View>
                        <View style={styles.tipCard}>
                            <LinearGradient
                                colors={["rgba(255,255,255,0.06)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.tipIconWrap}>
                                <Ionicons name="sunny-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.tipTitle}>GRATITUDE</Text>
                            <Text style={styles.tipDesc}>Recall three physical accomplishments from this week. Truly feel the pride of your progress.</Text>
                        </View>
                    </View>
                )}

                {/* Meditation Promo */}
                <TouchableOpacity style={styles.meditationCard} activeOpacity={0.9}>
                    <LinearGradient
                        colors={["rgba(227,30,36,0.15)", "rgba(0,0,0,0.3)"]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />
                    <View style={styles.meditationContent}>
                        <Text style={styles.medHeader}>ZEN SESSIONS</Text>
                        <Text style={styles.medTitle}>Guided Breathwork</Text>
                        <Text style={styles.medSub}>8 MIN · CALM PHASE</Text>
                    </View>
                    <View style={styles.medIcon}>
                        <Ionicons name="play-circle" size={42} color={COLORS.text} />
                    </View>
                </TouchableOpacity>

            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)", "#000"]}
                    style={styles.footerBg}
                />
                <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.doneBtnText}>ACKNOWLEDGE PROTOCOL</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    header: {
        paddingHorizontal: 24,
        zIndex: 10,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    hero: {
        paddingHorizontal: 24,
        marginTop: 40,
        marginBottom: 40,
    },
    eyebrow: {
        fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.primary,
        letterSpacing: 4, marginBottom: 16,
    },
    title: {
        fontSize: 48, fontFamily: FAMILY.display, color: COLORS.text,
        lineHeight: 52, letterSpacing: -1,
    },
    subtitle: {
        fontSize: 14, fontFamily: FAMILY.regular, color: COLORS.textSub,
        lineHeight: 22, marginTop: 24, opacity: 0.8,
    },
    zentabs: {
        flexDirection: "row", paddingHorizontal: 24, gap: 32, marginBottom: 32,
    },
    zentabActive: {
        paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary,
    },
    zentab: { paddingBottom: 8 },
    zentabText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },

    tipsGrid: { paddingHorizontal: 24, gap: 16 },
    tipCard: {
        borderRadius: 24, padding: 24,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
    },
    tipIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(227,30,36,0.1)",
        alignItems: "center", justifyContent: "center",
        marginBottom: 20,
    },
    tipTitle: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2, marginBottom: 10 },
    tipDesc: { fontSize: 14, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 22 },
    tipDescSmall: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, lineHeight: 20 },

    meditationCard: {
        marginHorizontal: 24, marginTop: 32, borderRadius: 28,
        height: 120, overflow: "hidden", flexDirection: "row",
        alignItems: "center", paddingHorizontal: 28,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    meditationContent: { flex: 1 },
    medHeader: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 2, marginBottom: 8 },
    medTitle: { fontSize: 20, fontFamily: FAMILY.display, color: COLORS.text, marginBottom: 4 },
    medSub: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },
    medIcon: { marginLeft: 16 },

    footer: {
        paddingHorizontal: 24, position: "absolute", bottom: 0, left: 0, right: 0,
        paddingTop: 40,
    },
    footerBg: {
        position: "absolute", bottom: 0, left: 0, right: 0, top: 0,
    },
    doneBtn: {
        backgroundColor: COLORS.text, height: 60, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    doneBtnText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#000", letterSpacing: 2 },
});
