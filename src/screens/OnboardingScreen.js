import React, { useRef, useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet,
    Dimensions, StatusBar, Animated, ScrollView, ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";

const { width, height } = Dimensions.get("window");
export const ONBOARDING_KEY = "onboarding_complete";

const SLIDES = [
    {
        eyebrow: "WELCOME",
        title: "BUILT FOR\nPROGRESS.",
        body: "CONQUERONE IS A 6-DAY DUMBBELL PROGRAM DESIGNED AROUND YOUR BODY. EVERY REP, EVERY REST, EVERY DAY — TRACKED AUTOMATICALLY.",
    },
    {
        eyebrow: "YOUR PLAN",
        title: "SIX DAYS.\nSIX FOCUSES.",
        body: "CHEST · BACK · ARMS · ABS · SHOULDERS · LEGS. SCIENCE-BACKED SPLITS WITH BUILT-IN RECOVERY SO YOU NEVER PLATEAU.",
    },
    {
        eyebrow: "READY",
        title: "LET'S START\nTHE WORK.",
        body: "YOUR STREAK BEGINS TODAY. EVERY SESSION IS LOGGED, EVERY MILESTONE TRACKED. NO EXCUSES, NO SHORTCUTS.",
    },
];

export default function OnboardingScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [page, setPage] = useState(0);
    const scrollRef = useRef(null);
    const dotAnim = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

    const goTo = (idx) => {
        scrollRef.current?.scrollTo({ x: idx * width, animated: true });
        setPage(idx);
        SLIDES.forEach((_, i) => {
            Animated.timing(dotAnim[i], {
                toValue: i === idx ? 1 : 0,
                duration: 250,
                useNativeDriver: false,
            }).start();
        });
    };

    const finish = async () => {
        navigation.navigate("Login");
    };

    const slide = SLIDES[page];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            <ImageBackground
                source={require("../../assets/onboarding_bg.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.95)", "#000"]}
                    locations={[0, 0.7, 1]}
                    style={StyleSheet.absoluteFill}
                />

                {/* Slides */}
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    style={StyleSheet.absoluteFill}
                    contentContainerStyle={{ width: width * SLIDES.length }}
                    scrollEventThrottle={16}
                >
                    {SLIDES.map((s, i) => (
                        <View key={i} style={[styles.slide, { width }]}>
                            <View style={[styles.slideContent, { paddingTop: insets.top + 60 }]}>
                                <Text style={styles.eyebrow}>{s.eyebrow}</Text>
                                <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2}>{s.title}</Text>
                                <Text style={styles.body}>{s.body}</Text>

                                {/* Accent line */}
                                <View style={styles.accentLine} />
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Bottom controls */}
                <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.lg }]}>
                    {/* Dots */}
                    <View style={styles.dots}>
                        {SLIDES.map((_, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: dotAnim[i].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [COLORS.borderLight, COLORS.primary],
                                        }),
                                        width: dotAnim[i].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [6, 22],
                                        }),
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* CTA */}
                    {page < SLIDES.length - 1 ? (
                        <View style={styles.btnRow}>
                            <TouchableOpacity onPress={finish} activeOpacity={0.6}>
                                <Text style={styles.skipText}>SKIP</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.nextBtn, { backgroundColor: COLORS.primary }]}
                                onPress={() => goTo(page + 1)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.nextBtnText, { color: "#fff" }]}>NEXT</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: COLORS.primary }]} onPress={finish} activeOpacity={0.85}>
                            <Text style={[styles.startBtnText, { color: "#fff" }]}>GET STARTED</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    slide: { flex: 1 },
    slideContent: {
        paddingHorizontal: 40,
        flex: 1,
        justifyContent: "center",
    },
    eyebrow: {
        fontSize: 10, fontFamily: FAMILY.bold,
        color: COLORS.primary,
        letterSpacing: 4, marginBottom: 20,
    },
    title: {
        fontSize: 72, fontFamily: FAMILY.display,
        color: "#fff", letterSpacing: -3, lineHeight: 68,
        marginBottom: 28,
    },
    body: {
        fontSize: 14, fontFamily: FAMILY.regular,
        color: "rgba(255,255,255,0.45)", lineHeight: 24,
        maxWidth: 320, letterSpacing: 0.5,
    },
    accentLine: {
        width: 48, height: 2, borderRadius: 1,
        backgroundColor: COLORS.primary,
        marginTop: 40,
        opacity: 0.5,
    },

    bottom: {
        position: "absolute", left: 0, right: 0, bottom: 0,
        paddingHorizontal: 40,
    },
    dots: {
        flexDirection: "row", gap: 8,
        alignItems: "center", marginBottom: 36,
    },
    dot: { height: 2, borderRadius: 1 },

    btnRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between",
    },
    skipText: {
        fontSize: 12, fontFamily: FAMILY.bold,
        color: "rgba(255,255,255,0.3)", letterSpacing: 2,
    },
    nextBtn: {
        paddingHorizontal: 36, paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: "#fff",
    },
    nextBtnText: {
        fontSize: 12, fontFamily: FAMILY.bold,
        color: "#000", letterSpacing: 1.5,
    },
    startBtn: {
        backgroundColor: "#fff",
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: "center",
    },
    startBtnText: {
        fontSize: 14, fontFamily: FAMILY.bold,
        color: "#000", letterSpacing: 2.5,
    },
});
