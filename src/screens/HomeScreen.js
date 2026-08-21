import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, StatusBar, Animated, ImageBackground, Image, Modal, Share,
} from "react-native";
import { ScrollView as GestureScrollView, TouchableOpacity as GestureTouchableOpacity } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WORKOUT_PLAN } from "../data/workoutData";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, GRADIENTS, TRACKING, APP_VERSION } from "../utils/theme";
import {
    getStreak, getTotalWorkouts, getLastWorkoutDate,
    getLastFreezeDate, withdrawStreakFreeze, checkAndCleanStreak,
    getStreakLocal, getTotalWorkoutsLocal, applyStreakFreeze,
    getXP, getXPLocal, getRecordStreak, getRecordStreakLocal,
    getWorkoutHistory, getWorkoutHistoryLocal, getPreviousFreezeDate,
    getActiveWorkoutSession, clearActiveWorkoutSession
} from "../utils/storage";
import MaskedView from "@react-native-masked-view/masked-view";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";
import WorkoutCalendar from "../components/WorkoutCalendar";
import {
    Card, SectionHeader, Pill, StatTile, ProgressDots,
    AnimatedNumber, PrimaryButton, SecondaryButton, Reveal, withAlpha,
} from "../components/ui";


// Auth
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RANK_FOR = (total) =>
    total >= 100 ? "Legend"
        : total >= 50 ? "Titan"
            : total >= 25 ? "Warrior"
                : total >= 10 ? "Chadlite"
                    : total >= 5 ? "Rookie" : "Recruit";

/** Sentence case for copy that arrives as ALL CAPS from the data layer. */
const sentence = (s = "") =>
    String(s)
        .toLowerCase()
        .replace(/(^|[\s/&·-])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());

function totalTime(day) {
    let s = 0;
    day.exercises.forEach((ex) => {
        const setDuration = ex.type === 'reps' ? 45 : ex.activeTimeSec;
        s += ex.sets * setDuration + (ex.sets - 1) * ex.restTimeSec;
        if (ex.unilateral) s += ex.sets * setDuration;
    });
    return Math.ceil(s / 60);
}

function getMuscleColor(target) {
    const t = target.toUpperCase();
    if (t.includes("CHEST") || t.includes("TRICEPS") || t.includes("PUSH")) return COLORS.softMove;
    if (t.includes("BACK") || t.includes("BICEPS") || t.includes("PULL")) return COLORS.softEnergy;
    if (t.includes("LEGS") || t.includes("QUADS") || t.includes("LOWER")) return COLORS.softViolet;
    if (t.includes("SHOULDERS") || t.includes("CORE") || t.includes("ARMS")) return COLORS.softSky;
    return COLORS.softFocus;
}

function getMuscleIcon(target) {
    const t = target.toUpperCase();
    if (t.includes("CHEST") || t.includes("TRICEPS") || t.includes("PUSH")) return "body-outline";
    if (t.includes("BACK") || t.includes("BICEPS") || t.includes("PULL")) return "barbell-outline";
    if (t.includes("LEGS") || t.includes("QUADS") || t.includes("LOWER")) return "walk-outline";
    if (t.includes("SHOULDERS") || t.includes("CORE") || t.includes("ARMS")) return "fitness-outline";
    return "flash-outline";
}

function GradientText({ text, style, colors = GRADIENTS.diamond, height = 50 }) {
    return (
        <MaskedView
            style={{ height, width: '100%' }}
            maskElement={
                <Text style={style} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            }
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            >
                <Text style={[style, { opacity: 0 }]} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            </LinearGradient>
        </MaskedView>
    );
}

function MetallicText({ text, style, height = 50 }) {
    return (
        <MaskedView
            style={{ height, width: '100%' }}
            maskElement={
                <Text style={style} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            }
        >
            <LinearGradient
                colors={["#FFFFFF", "#F5F5F7", "#B0B0B5", "#FFFFFF", "#8E8E93"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.8 }}
                style={StyleSheet.absoluteFill}
            >
                <Text style={[style, { opacity: 0 }]} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            </LinearGradient>
        </MaskedView>
    );
}

const getWeekStats = (history, lastFreezeDate) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const completedDays = [];
    const freezeDays = [];

    if (history && Array.isArray(history)) {
        history.forEach(item => {
            if (!item.date) return;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            const diffTime = itemDate - monday;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 6) {
                const dayOfWeek = diffDays + 1; // 1 = Mon, 7 = Sun
                if (!completedDays.includes(dayOfWeek)) {
                    completedDays.push(dayOfWeek);
                }
            }
        });
    }

    if (lastFreezeDate) {
        const freezeDate = new Date(lastFreezeDate);
        freezeDate.setHours(0, 0, 0, 0);
        const diffTime = freezeDate - monday;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 6) {
            const dayOfWeek = diffDays + 1;
            freezeDays.push(dayOfWeek);
        }
    }

    return { completedDays, freezeDays };
};

const getWeeklyHistoryData = (history) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weeklyCounts = [0, 0, 0, 0]; // Index 0: 3 weeks ago, Index 1: 2 weeks ago, ...

    const oneDay = 24 * 60 * 60 * 1000;

    if (history && Array.isArray(history)) {
        history.forEach(item => {
            if (!item.date) return;
            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((today - itemDate) / oneDay);
            if (diffDays >= 0 && diffDays < 28) {
                const weekIndex = 3 - Math.floor(diffDays / 7);
                if (weekIndex >= 0 && weekIndex <= 3) {
                    weeklyCounts[weekIndex]++;
                }
            }
        });
    }

    return weeklyCounts;
};

const getStreakTierInfo = (streak) => {
    if (streak >= 10) {
        return {
            name: "Titan",
            multiplier: "2.0x",
            color: COLORS.softViolet,
            badge: "Tier IV",
            desc: "Titan Multiplier active. You reward 20 XP per session.",
            range: "10+ Days"
        };
    } else if (streak >= 5) {
        return {
            name: "Overload",
            multiplier: "1.5x",
            color: COLORS.softGold,
            badge: "Tier III",
            desc: "Overload Multiplier active. You reward 15 XP per session.",
            range: "5–9 Days"
        };
    } else if (streak >= 3) {
        return {
            name: "Ignition",
            multiplier: "1.2x",
            color: COLORS.softEnergy,
            badge: "Tier II",
            desc: "Ignition Multiplier active. You reward 12 XP per session.",
            range: "3–4 Days"
        };
    } else {
        return {
            name: "Spark",
            multiplier: "1.0x",
            color: streak > 0 ? COLORS.softMove : COLORS.softTextSub,
            badge: "Tier I",
            desc: "Spark Multiplier active. You reward 10 XP per session.",
            range: "1–2 Days"
        };
    }
};

const renderSvgChart = (weeklyData) => {
    const chartWidth = width - 64;
    const chartHeight = 140;
    const padding = 25;

    // Coordinates
    const points = weeklyData.map((val, i) => {
        const x = padding + (i / 3) * (chartWidth - 2 * padding);
        const y = chartHeight - padding - (Math.min(val, 7) / 7) * (chartHeight - 2 * padding);
        return { x, y, value: val };
    });

    // Create polyline / path
    let d = "";
    points.forEach((p, idx) => {
        if (idx === 0) d += `M ${p.x} ${p.y}`;
        else {
            const prev = points[idx - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp1y = prev.y;
            const cp2x = prev.x + 2 * (p.x - prev.x) / 3;
            const cp2y = p.y;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
        }
    });

    // Path for fill (under the curve)
    let fillD = d;
    if (points.length > 0) {
        fillD += ` L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;
    }

    const labels = ["3 wks ago", "2 wks ago", "1 wk ago", "This week"];

    return (
        <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Weekly consistency</Text>
            <View style={styles.svgContainer}>
                <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                        <SvgGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor={COLORS.softMove} stopOpacity="0.35" />
                            <Stop offset="100%" stopColor={COLORS.softMove} stopOpacity="0.0" />
                        </SvgGradient>
                        <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor={COLORS.softMove} />
                            <Stop offset="100%" stopColor={COLORS.softEnergy} />
                        </SvgGradient>
                    </Defs>

                    {/* Grid Lines */}
                    {[0, 1, 2, 3].map((g) => {
                        const y = padding + (g / 3) * (chartHeight - 2 * padding);
                        return (
                            <Path
                                key={g}
                                d={`M ${padding} ${y} L ${chartWidth - padding} ${y}`}
                                stroke="rgba(255, 255, 255, 0.05)"
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />
                        );
                    })}

                    {/* Gradient Fill under path */}
                    {points.length > 0 && (
                        <Path d={fillD} fill="url(#chartGlow)" />
                    )}

                    {/* Curve Line */}
                    {points.length > 0 && (
                        <Path
                            d={d}
                            fill="none"
                            stroke="url(#lineGrad)"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Data Points */}
                    {points.map((p, idx) => (
                        <React.Fragment key={idx}>
                            <Circle
                                cx={p.x}
                                cy={p.y}
                                r={9}
                                fill={COLORS.softMove}
                                fillOpacity={0.22}
                            />
                            <Circle
                                cx={p.x}
                                cy={p.y}
                                r={4}
                                fill={COLORS.softText}
                            />
                            <SvgText
                                x={p.x}
                                y={p.y - 13}
                                fill={COLORS.softText}
                                fontSize="11"
                                textAnchor="middle"
                                fontFamily={FAMILY.softBold}
                            >
                                {p.value}
                            </SvgText>
                        </React.Fragment>
                    ))}
                </Svg>
            </View>
            <View style={styles.chartLabelsRow}>
                {labels.map((lbl) => (
                    <Text key={lbl} style={styles.chartLabelText}>{lbl}</Text>
                ))}
            </View>
        </View>
    );
};

export default function HomeScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { user, profile = null } = useAuth();
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [todayDay, setTodayDay] = useState(1);
    const [greeting, setGreeting] = useState("Hello");
    const [isFrozen, setIsFrozen] = useState(false);
    const [lastFreezeDate, setLastFreezeDate] = useState(null);
    const [previousFreezeDate, setPreviousFreezeDate] = useState(null);
    const [freezeModal, setFreezeModal] = useState(false);
    const [streakResetModal, setStreakResetModal] = useState(false);
    const [prevStreak, setPrevStreak] = useState(0);
    const [xp, setXP] = useState(0);
    const [recordStreak, setRecordStreak] = useState(0);
    const [completedDays, setCompletedDays] = useState([]);
    const [freezeDays, setFreezeDays] = useState([]);
    const [history, setHistory] = useState([]);
    const [streakAnalyticsVisible, setStreakAnalyticsVisible] = useState(false);
    const [activeSession, setActiveSession] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Animations
    const avatarGlow = useRef(new Animated.Value(0.3)).current;
    const avatarScale = useRef(new Animated.Value(1)).current;
    const dotOpacity = useRef(new Animated.Value(0.4)).current;
    const sparkAnims = useRef([4, 6, 3, 8, 5, 9, 7].map(() => new Animated.Value(0))).current;

    const displayName = profile?.fullName?.split(" ")[0] || user?.displayName?.split(" ")[0] || "Athlete";

    useFocusEffect(useCallback(() => {
        loadStats(false); // Instantly load local cache on focus (0ms latency, no blocking)
        (async () => {
            const sess = await getActiveWorkoutSession();
            setActiveSession(sess);
        })();

        if (route.params?.openStreakIntelligence) {
            setStreakAnalyticsVisible(true);
            navigation.setParams({ openStreakIntelligence: false });
        }
    }, [route.params?.openStreakIntelligence]));

    useEffect(() => {
        // Run a full background cloud sync once when the component mounts
        loadStats(true);

        const h = new Date().getHours();
        let g = "Good morning";
        if (h >= 12 && h < 17) g = "Good afternoon";
        else if (h >= 17) g = "Good evening";
        setGreeting(g);

        const d = new Date().getDay();
        setTodayDay(d === 0 ? 7 : d);

        // Breathing avatar loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(avatarGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
                Animated.timing(avatarGlow, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        // Blinking indicator dot loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(dotOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(dotOpacity, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        // Animate sparkline graph
        const animations = sparkAnims.map((anim, i) => {
            const targets = [4, 6, 3, 8, 5, 9, 7];
            return Animated.timing(anim, {
                toValue: targets[i] * 2.2,
                duration: 650 + i * 90,
                useNativeDriver: false,
            });
        });

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            ...animations
        ]).start();
    }, []);

    const loadStats = async (forceCloudSync = false) => {
        // 1. Immediate local cache load
        try {
            const cachedStreak = await getStreakLocal();
            const cachedTotal = await getTotalWorkoutsLocal();
            const cachedXP = await getXPLocal();
            const cachedRecord = await getRecordStreakLocal();
            const cachedHistory = await getWorkoutHistoryLocal();
            const cachedFreeze = await getLastFreezeDate();
            const cachedPrevFreeze = await getPreviousFreezeDate();

            setStreak(cachedStreak);
            setTotal(cachedTotal);
            setXP(cachedXP);
            setRecordStreak(cachedRecord);
            setHistory(cachedHistory);
            setLastFreezeDate(cachedFreeze);
            setPreviousFreezeDate(cachedPrevFreeze);
            setIsFrozen(cachedFreeze === new Date().toISOString().split("T")[0]);

            const { completedDays: localComp, freezeDays: localFrz } = getWeekStats(cachedHistory, cachedFreeze);
            setCompletedDays(localComp);
            setFreezeDays(localFrz);
        } catch (e) {
            console.warn("Failed to load cached stats in HomeScreen", e);
        }

        // 2. checkAndCleanStreak (which resets streak if broken)
        try {
            const { wasReset, previousStreak } = await checkAndCleanStreak();
            if (wasReset) {
                setPrevStreak(previousStreak);
                setStreakResetModal(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
                setStreak(0); // update instantly to 0 in UI
            }
        } catch (e) {
            console.warn("checkAndCleanStreak failed in loadStats", e);
        }

        // 3. Background cloud sync (only on app boot or explicit actions)
        if (forceCloudSync) {
            try {
                const [nextStreak, nextTotal, lastFreeze, nextXP, nextRecord, nextHistory, nextPrevFreeze] = await Promise.all([
                    getStreak(),
                    getTotalWorkouts(),
                    getLastFreezeDate(),
                    getXP(),
                    getRecordStreak(),
                    getWorkoutHistory(),
                    getPreviousFreezeDate(),
                ]);
                setStreak(nextStreak);
                setTotal(nextTotal);
                setIsFrozen(lastFreeze === new Date().toISOString().split("T")[0]);
                setLastFreezeDate(lastFreeze);
                setPreviousFreezeDate(nextPrevFreeze);
                setXP(nextXP);
                setRecordStreak(nextRecord);
                setHistory(nextHistory);

                const { completedDays: syncComp, freezeDays: syncFrz } = getWeekStats(nextHistory, lastFreeze);
                setCompletedDays(syncComp);
                setFreezeDays(syncFrz);
            } catch (e) {
                console.warn("HomeScreen background sync failed", e);
            }
        }
    };

    const handleUnfreeze = async () => {
        const success = await withdrawStreakFreeze();
        if (success) {
            setIsFrozen(false);
            setFreezeModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadStats(true);
        }
    };

    const handleFreezeToggle = async () => {
        if (isFrozen) {
            const success = await withdrawStreakFreeze();
            if (success) {
                setIsFrozen(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
                loadStats(true);
            }
        } else {
            const success = await applyStreakFreeze();
            if (success) {
                setIsFrozen(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
                loadStats(true);
            }
        }
    };

    const handleAvatarPressIn = () => {
        Animated.spring(avatarScale, {
            toValue: 0.92,
            useNativeDriver: true,
        }).start();
    };

    const handleAvatarPressOut = () => {
        Animated.spring(avatarScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("Profile");
    };

    const handleWeekCellPress = (day) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate("WorkoutDetail", { day });
    };

    const todayWorkout = todayDay <= 6 ? WORKOUT_PLAN[todayDay - 1] : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Ambient Glow */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <LinearGradient
                    colors={GRADIENTS.ambient}
                    style={{ height: width * 1.25, width: width, position: "absolute", top: -width * 0.25 }}
                />
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingTop: insets.top + SPACING.base, paddingBottom: 28 }}
            >
                {/* ── Header ── */}
                <Reveal delay={0}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerTop}>
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text style={styles.greeting}>{greeting}</Text>
                                <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                                    {displayName}
                                </Text>
                            </View>

                            <View style={styles.avatarContainer}>
                                <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                                    <TouchableOpacity
                                        style={styles.profileCircle}
                                        onPressIn={handleAvatarPressIn}
                                        onPressOut={handleAvatarPressOut}
                                        activeOpacity={1}
                                    >
                                        {profile?.photoURL ? (
                                            <Image source={{ uri: profile.photoURL }} style={styles.headerAvatar} />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </View>

                        {/* Quick shortcuts */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.hudShortcutBar}
                            contentContainerStyle={styles.hudShortcutBarContent}
                        >
                            <Pill
                                label="Coach"
                                icon="sparkles"
                                color={COLORS.softMove}
                                bg={COLORS.softMoveDim}
                                onPress={() => navigation.navigate("AICoach")}
                            />
                            <Pill
                                label="History"
                                icon="time-outline"
                                color={COLORS.softTextSub}
                                onPress={() => navigation.navigate("History")}
                            />
                            <Pill
                                label="Settings"
                                icon="options-outline"
                                color={COLORS.softTextSub}
                                onPress={() => navigation.navigate("Settings")}
                            />
                            {isFrozen && (
                                <Pill
                                    label="Streak frozen"
                                    icon="snow"
                                    color={COLORS.softSky}
                                    bg={COLORS.softSkyDim}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setFreezeModal(true);
                                    }}
                                />
                            )}
                        </ScrollView>
                    </View>
                </Reveal>

                {/* Active Workout Resume Banner */}
                {activeSession && activeSession.day && Array.isArray(activeSession.day.exercises) && (
                    <Reveal delay={40}>
                        <Card
                            style={styles.resumeCard}
                            tint={COLORS.softMove}
                            radius={RADIUS.card}
                            padding={18}
                            onPress={() => {
                                navigation.navigate("ActiveWorkout", { day: activeSession.day, resume: true });
                            }}
                        >
                            <View style={styles.resumeInner}>
                                <View style={styles.resumeIconBox}>
                                    <Ionicons name="play" size={20} color={COLORS.softMove} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                                        <View style={styles.resumeDot} />
                                        <Text style={styles.resumeTag}>In progress</Text>
                                    </View>
                                    <Text style={styles.resumeTitle} numberOfLines={1}>
                                        {sentence(String(activeSession.day?.dayName || activeSession.day?.target || activeSession.day?.day || "Active workout"))}
                                    </Text>
                                    <Text style={styles.resumeSub}>Tap to pick up where you left off</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.resumeDiscardBtn}
                                    onPress={async () => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        await clearActiveWorkoutSession();
                                        setActiveSession(null);
                                    }}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Ionicons name="close" size={16} color={COLORS.softTextMuted} />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    </Reveal>
                )}

                {/* ── Today's Workout Hero Card (Focal Point) ── */}
                <Reveal delay={90}>
                    {todayWorkout ? (
                        <TouchableOpacity
                            style={styles.heroCard}
                            activeOpacity={0.92}
                            onPress={() => navigation.navigate("WorkoutDetail", { day: todayWorkout })}
                        >
                            <ImageBackground
                                source={todayWorkout.headerImage || require("../../assets/home_hero_bg.png")}
                                style={StyleSheet.absoluteFill}
                                resizeMode="cover"
                            >
                                <LinearGradient
                                    colors={GRADIENTS.softHero}
                                    locations={[0, 0.55, 1]}
                                    style={StyleSheet.absoluteFill}
                                />

                                <View style={styles.heroContent}>
                                    <View style={{ alignItems: "flex-start" }}>
                                        <Pill
                                            label={completedDays.includes(todayDay) ? "Completed" : "Today"}
                                            icon={completedDays.includes(todayDay) ? "checkmark-circle" : "sunny-outline"}
                                            color={completedDays.includes(todayDay) ? COLORS.softFocus : COLORS.softText}
                                            bg={completedDays.includes(todayDay) ? COLORS.softFocusDim : COLORS.softFillHi}
                                            size="sm"
                                        />
                                    </View>

                                    <View>
                                        <Text style={styles.heroTitle} numberOfLines={2}>
                                            {sentence(todayWorkout.target)}
                                        </Text>
                                        <Text style={styles.heroSub}>
                                            {todayWorkout.exercises.length} exercises · {totalTime(todayWorkout)} min
                                        </Text>

                                        <PrimaryButton
                                            label={completedDays.includes(todayDay) ? "Go again" : "Start workout"}
                                            icon={completedDays.includes(todayDay) ? "refresh" : "play"}
                                            height={54}
                                            style={{ marginTop: 18 }}
                                            onPress={() => navigation.navigate("WorkoutDetail", { day: todayWorkout })}
                                        />
                                    </View>
                                </View>
                            </ImageBackground>
                        </TouchableOpacity>
                    ) : (
                        <RestDayCard navigation={navigation} />
                    )}
                </Reveal>

                {/* ── Level / XP ── */}
                <Reveal delay={145}>
                    <Card style={styles.hudCard} padding={SPACING.airy} tint={COLORS.softMove}>
                        <Text style={styles.levelLabel}>Level {Math.min(Math.floor(xp / 100) + 1, 99)}</Text>

                        <View style={styles.levelProgressRow}>
                            <ProgressDots
                                total={10}
                                filled={Math.round((xp % 100) / 10)}
                                size={8}
                                gap={7}
                                color={COLORS.softMove}
                                animate
                            />
                            <Text style={styles.levelXpText}>{xp % 100} / 100 XP</Text>
                        </View>

                        <Text style={styles.levelRank}>{RANK_FOR(total)}</Text>
                    </Card>
                </Reveal>

                {/* ── Streak ── */}
                {(() => {
                    const tierInfo = getStreakTierInfo(streak);
                    return (
                        <Reveal delay={200}>
                            <Card
                                style={styles.streakIntelligenceCard}
                                padding={SPACING.cardPad}
                                tint={tierInfo.color}
                                onPress={() => setStreakAnalyticsVisible(true)}
                            >
                                <View style={styles.streakInner}>
                                    <View style={styles.streakIntelligenceLeft}>
                                        <View style={[styles.streakIconContainer, { backgroundColor: withAlpha(tierInfo.color, 0.14) }]}>
                                            <Ionicons name="flame" size={19} color={tierInfo.color} />
                                        </View>
                                        <Text style={styles.streakValue}>
                                            {streak}
                                            <Text style={styles.streakValueUnit}> {streak === 1 ? "day" : "days"}</Text>
                                        </Text>
                                        <Text style={[styles.streakTierName, { color: tierInfo.color }]}>
                                            {tierInfo.name}
                                        </Text>
                                        <Pill
                                            label={`${tierInfo.multiplier} XP`}
                                            color={tierInfo.color}
                                            bg={withAlpha(tierInfo.color, 0.12)}
                                            size="sm"
                                            style={{ marginTop: 10 }}
                                        />
                                    </View>

                                    <View style={styles.streakIntelligenceRight}>
                                        <Text style={styles.gridTitle}>This week</Text>
                                        <View style={styles.gridContainer}>
                                            {DAY_LABELS.map((label, index) => {
                                                const dayNum = index + 1;
                                                const isCompleted = completedDays.includes(dayNum);
                                                const isDayFrozen = freezeDays.includes(dayNum);
                                                const isToday = todayDay === dayNum;
                                                const isFuture = dayNum > todayDay;
                                                const isSunday = dayNum === 7;

                                                return (
                                                    <View key={label} style={styles.gridCellWrapper}>
                                                        <View
                                                            style={[
                                                                styles.gridCell,
                                                                isCompleted && styles.gridCellCompleted,
                                                                isDayFrozen && styles.gridCellFrozen,
                                                                isToday && !isCompleted && !isDayFrozen && styles.gridCellToday,
                                                                !isCompleted && !isDayFrozen && !isToday && dayNum < todayDay && (isSunday ? styles.gridCellRest : styles.gridCellMissed),
                                                                isFuture && styles.gridCellFuture,
                                                            ]}
                                                        >
                                                            {isCompleted ? (
                                                                <>
                                                                    <Ionicons name="checkmark" size={13} color={COLORS.softBg} />
                                                                    {isDayFrozen && (
                                                                        <Ionicons
                                                                            name="snow"
                                                                            size={8}
                                                                            color={COLORS.softSky}
                                                                            style={{ position: "absolute", bottom: -1, right: -1 }}
                                                                        />
                                                                    )}
                                                                </>
                                                            ) : isDayFrozen ? (
                                                                <Ionicons name="snow" size={12} color={COLORS.softSky} />
                                                            ) : isSunday && !isToday ? (
                                                                <Ionicons name="moon" size={10} color={COLORS.softTextMuted} />
                                                            ) : (
                                                                isToday && <View style={styles.gridCellTodayDot} />
                                                            )}
                                                        </View>
                                                        <Text style={[styles.gridCellLabel, isToday && styles.gridCellLabelToday]}>
                                                            {label[0]}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        </Reveal>
                    );
                })()}

                {/* ── Stats: Total & Rank ── */}
                <Reveal delay={255}>
                    <View style={styles.statsRow}>
                        <StatTile
                            style={{ flex: 1 }}
                            label="Total sessions"
                            value={total}
                            icon="fitness"
                            color={COLORS.softFocus}
                            countUp
                            delay={300}
                        />
                        <StatTile
                            style={{ flex: 1 }}
                            label="Current rank"
                            value={RANK_FOR(total)}
                            icon="trending-up"
                            color={COLORS.softMove}
                            onPress={() => navigation.navigate("Rank")}
                        />
                    </View>
                </Reveal>

                {/* ── Moments (Highlights) ── */}
                <SectionHeader title="Moments" subtitle="Milestones you've unlocked" />
                <MomentsGallery streak={streak} total={total} profile={profile} />

                {/* ── Weekly Plan ── */}
                <SectionHeader title="Your week" subtitle="Tap any day to preview it" />
                <GestureScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    overScrollMode="never"
                    contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 12 }}
                >
                    {WORKOUT_PLAN.map((day, i) => {
                        const isToday = todayDay === day.day;
                        return (
                            <GestureTouchableOpacity
                                key={day.day}
                                style={[styles.weekCell, isToday && styles.weekCellActive]}
                                onPress={() => handleWeekCellPress(day)}
                                activeOpacity={0.75}
                            >
                                {isToday ? (
                                    <LinearGradient
                                        colors={["rgba(227,30,36,0.12)", "transparent"]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                ) : (
                                    <LinearGradient
                                        colors={["rgba(255,255,255,0.015)", "transparent"]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <Text style={[styles.weekDay, isToday && styles.weekDayActive]}>{DAY_LABELS[i].toUpperCase()}</Text>
                                <Text style={styles.weekTarget} numberOfLines={1}>{day.target.toUpperCase()}</Text>
                                {isToday && (
                                    <Animated.View style={[styles.activeIndicator, { opacity: dotOpacity }]} />
                                )}
                            </GestureTouchableOpacity>
                        );
                    })}
                    <GestureTouchableOpacity
                        style={styles.weekCell}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate("RestDay");
                        }}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={["rgba(255,255,255,0.015)", "transparent"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.weekDay}>SUN</Text>
                        <Text style={styles.weekTarget}>REST</Text>
                    </GestureTouchableOpacity>
                </GestureScrollView>

                {/* ── Workout Library ── */}
                <SectionHeader title="Workout library" subtitle="Explore all 6 days of your split" />
                <View style={styles.dayList}>
                    {WORKOUT_PLAN.map((day) => (
                        <TouchableOpacity
                            key={day.day}
                            style={styles.dayRow}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.navigate("WorkoutDetail", { day });
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.dayRowAccent, { backgroundColor: getMuscleColor(day.target) }]} />
                            <LinearGradient
                                colors={["rgba(255,255,255,0.015)", "transparent"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.dayRowLeft}>
                                <View style={styles.dayNumRow}>
                                    <Text style={styles.dayNum}>0{day.day}</Text>
                                    <View style={styles.dayDot} />
                                    <View style={styles.muscleBadge}>
                                        <Text style={styles.muscleBadgeText}>{day.target.toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={styles.dayTargetTitle}>{day.target.toUpperCase()}</Text>
                                <Text style={styles.dayMeta}>{day.exercises.length} EX · {totalTime(day)} MIN · {day.exercises[0]?.equipment.toUpperCase()}</Text>
                            </View>
                            <View style={styles.dayRowRight}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Protocol Handbook ── */}
                <SectionHeader title="Protocol handbook" subtitle="The science, rules & 12-week progression" />
                <TouchableOpacity
                    style={styles.customCard}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate("ProtocolIntel");
                    }}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={["rgba(255,255,255,0.05)", "rgba(227,30,36,0.03)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customTitle}>PLAN INTEL</Text>
                        <Text style={styles.customSub}>THE SCIENCE · THE RULES · THE 12-WEEK SYSTEM</Text>
                    </View>
                    <View style={styles.customIconWrap}>
                        <Ionicons name="book-outline" size={20} color={COLORS.primary} />
                    </View>
                </TouchableOpacity>

                {/* ── Custom Workout ── */}
                <SectionHeader title="Custom workout" subtitle="Design and log your bespoke session" />
                <TouchableOpacity
                    style={styles.customCard}
                    onPress={() => navigation.navigate("CustomWorkout")}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={["rgba(255,255,255,0.05)", "rgba(227,30,36,0.02)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customTitle}>CRAFT SESSION</Text>
                        <Text style={styles.customSub}>DESIGN YOUR PERFECT WORKOUT</Text>
                    </View>
                    <View style={styles.customIconWrap}>
                        <Ionicons name="flash-outline" size={20} color={COLORS.primary} />
                    </View>
                </TouchableOpacity>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerVersion}>CONQUER ONE · {APP_VERSION}</Text>
                    <Text style={styles.footerAuthor}>BUILT FOR PERFORMANCE BY <Text style={{ color: COLORS.primary }}>VIVASWAN SHETTY</Text></Text>
                </View>
            </Animated.ScrollView>

            <Modal
                visible={freezeModal}
                transparent
                animationType="fade"
                onRequestClose={() => setFreezeModal(false)}
            >
                <View style={styles.freezeOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFreezeModal(false)} activeOpacity={1} />
                    <View style={styles.freezeModalContent}>
                        <LinearGradient
                            colors={['rgba(30,58,138,0.95)', 'rgba(0,0,0,0.98)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.iceEffect} />

                        <View style={styles.freezeModalHeader}>
                            <View style={styles.snowCircle}>
                                <Ionicons name="snow" size={42} color="#60A5FA" />
                            </View>
                            <Text style={styles.freezeStatus}>STREAK FROZEN</Text>
                            <Text style={styles.freezeTitle}>RECOVERY MODE ACTIVE</Text>
                        </View>

                        <Text style={styles.freezeDesc}>
                            Your {streak}-day streak is locked in. No matter what happens today, your progress remains untouchable. Rest up, Athlete.
                        </Text>

                        <View style={styles.protectionBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#60A5FA" />
                            <Text style={styles.protectionText}>SHIELD ACTIVE · 24H PROTECTED</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.freezeCloseBtn}
                            onPress={() => setFreezeModal(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.freezeCloseText}>UNDERSTOOD</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.unfreezeLink}
                            onPress={handleUnfreeze}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.unfreezeLinkText}>UNFREEZE & WORKOUT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Streak Reset Alert Modal */}
            <Modal
                visible={streakResetModal}
                transparent
                animationType="fade"
                onRequestClose={() => setStreakResetModal(false)}
            >
                <View style={styles.resetOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setStreakResetModal(false)} activeOpacity={1} />
                    <View style={styles.resetModalContent}>
                        <LinearGradient
                            colors={['rgba(13,13,13,0.95)', 'rgba(0,0,0,0.98)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.resetGlowEffect} />

                        <View style={styles.resetModalHeader}>
                            <View style={styles.brokenFlameCircle}>
                                <Ionicons name="flame" size={38} color={COLORS.primary} />
                            </View>
                            <Text style={styles.resetStatus}>STREAK RESET</Text>
                            <Text style={styles.resetTitle}>DISCIPLINE INTERRUPTED</Text>
                        </View>

                        <Text style={styles.resetDesc}>
                            Your consecutive <Text style={{ color: COLORS.primary, fontFamily: FAMILY.bold }}>{prevStreak}-day</Text> workout streak has been broken. The protocol requires daily consistency to conquer.
                        </Text>

                        <View style={styles.warningBadge}>
                            <Ionicons name="alert-circle-outline" size={14} color={COLORS.primary} />
                            <Text style={styles.warningBadgeText}>STREAK CLASSIFIED: 0 DAYS</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.resetCloseBtn}
                            onPress={() => {
                                setStreakResetModal(false);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.resetCloseText}>RECLAIM THE PROTOCOL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Streak Analytics Modal Sheet */}
            <Modal
                visible={streakAnalyticsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setStreakAnalyticsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setStreakAnalyticsVisible(false)}
                        activeOpacity={1}
                    />
                    <View style={styles.modalSheet}>
                        <LinearGradient
                            colors={["#0D0D0D", "#000000"]}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Drag Handle */}
                        <View style={styles.dragHandle} />

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderTitle}>STREAK INTELLIGENCE</Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setStreakAnalyticsVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                            {/* Summary Metrics */}
                            {(() => {
                                const tierInfo = getStreakTierInfo(streak);
                                return (
                                    <View style={styles.summaryMetricsRow}>
                                        <View style={styles.metricCard}>
                                            <Text style={styles.metricLabel}>ACTIVE STREAK</Text>
                                            <Text style={[styles.metricValue, { color: tierInfo.color }]}>
                                                {streak} <Text style={{ fontSize: 12, color: COLORS.textMuted }}>DAYS</Text>
                                            </Text>
                                            <Text style={styles.metricSub}>{tierInfo.name} TIER ACTIVE</Text>
                                        </View>
                                        <View style={styles.metricCard}>
                                            <Text style={styles.metricLabel}>ALL-TIME RECORD</Text>
                                            <Text style={[styles.metricValue, { color: "#FF9500" }]}>
                                                {recordStreak} <Text style={{ fontSize: 12, color: COLORS.textMuted }}>DAYS</Text>
                                            </Text>
                                            <Text style={styles.metricSub}>RECORD TO BEAT</Text>
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* SVG Consistency Graph */}
                            {renderSvgChart(getWeeklyHistoryData(history))}

                            {/* Monthly Progress Calendar */}
                            <View style={{ marginVertical: 12 }}>
                                <Text style={styles.modalSectionTitle}>MONTHLY PROGRESS CALENDAR</Text>
                                <WorkoutCalendar history={history} style={{ marginTop: 8 }} />
                            </View>

                            {/* Tiers Breakdown */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>STREAK TIERS & MULTIPLIERS</Text>
                                {["SPARK", "IGNITION", "OVERLOAD", "TITAN"].map((tName) => {
                                    let tierRange = "";
                                    let tierMult = "";
                                    let tierCol = "";
                                    let isActive = false;

                                    if (tName === "SPARK") {
                                        tierRange = "1–2 Days";
                                        tierMult = "1.0x XP";
                                        tierCol = streak > 0 ? "#EF4444" : "#6B7280";
                                        isActive = streak > 0 && streak <= 2;
                                    } else if (tName === "IGNITION") {
                                        tierRange = "3–4 Days";
                                        tierMult = "1.2x XP";
                                        tierCol = "#F97316";
                                        isActive = streak >= 3 && streak <= 4;
                                    } else if (tName === "OVERLOAD") {
                                        tierRange = "5–9 Days";
                                        tierMult = "1.5x XP";
                                        tierCol = "#EAB308";
                                        isActive = streak >= 5 && streak <= 9;
                                    } else if (tName === "TITAN") {
                                        tierRange = "10+ Days";
                                        tierMult = "2.0x XP";
                                        tierCol = "#A855F7";
                                        isActive = streak >= 10;
                                    }

                                    return (
                                        <View
                                            key={tName}
                                            style={[
                                                styles.tierRow,
                                                isActive && [styles.tierRowActive, { borderColor: `${tierCol}50` }]
                                            ]}
                                        >
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                                <Ionicons name="flame" size={16} color={tierCol} />
                                                <View>
                                                    <Text style={[styles.tierRowName, { color: tierCol }]}>{tName}</Text>
                                                    <Text style={styles.tierRowRange}>{tierRange}</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.tierMultiplierBadge, { backgroundColor: `${tierCol}15` }]}>
                                                <Text style={[styles.tierMultiplierText, { color: tierCol }]}>{tierMult}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Quick Streak Freeze Action */}
                            <View style={styles.freezeActionSection}>
                                <View style={styles.freezeActionTextWrap}>
                                    <Text style={styles.freezeSectionTitle}>STREAK SHIELD STATUS</Text>
                                    <Text style={styles.freezeSectionDesc}>
                                        {isFrozen
                                            ? "Today is frozen. Missing a session won't break your streak."
                                            : "Freeze today if you need a recovery or rest day. Shields active."}
                                    </Text>
                                    {(() => {
                                        const displayDate = isFrozen ? previousFreezeDate : lastFreezeDate;
                                        if (!displayDate) return null;
                                        try {
                                            const date = new Date(displayDate);
                                            const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
                                            return (
                                                <Text style={styles.previousFreezeText}>
                                                    PREVIOUS SHIELD: {formatted}
                                                </Text>
                                            );
                                        } catch {
                                            return null;
                                        }
                                    })()}
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.freezeToggleButton,
                                        isFrozen && styles.freezeToggleButtonActive
                                    ]}
                                    onPress={handleFreezeToggle}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name={isFrozen ? "snow" : "shield-half"}
                                        size={16}
                                        color={isFrozen ? "#60A5FA" : "#FFFFFF"}
                                    />
                                    <Text style={[styles.freezeToggleText, isFrozen && { color: "#60A5FA" }]}>
                                        {isFrozen ? "FROZEN (TAP TO MELT)" : "ACTIVATE SHIELD"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}


function MomentsGallery({ streak, total, profile = null }) {
    const [expandedMoment, setExpandedMoment] = useState(null);
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (expandedMoment) {
            Animated.timing(anim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            }).start();
        } else {
            anim.setValue(0);
        }
    }, [expandedMoment]);

    const MOMENTS = [
        {
            id: 'start',
            title: 'PROTOCOL INITIATED',
            sub: 'WELCOME TO CONQUER ONE',
            desc: "Your training regimen is officially live. The hard part is starting, and you've already conquered that. Focus on the next set, the next rep, and the next day. You are built for this.",
            icon: 'shield-checkmark',
            color: '#22c55e',
            show: true
        },
        {
            id: 'first_blood',
            title: 'FIRST BLOOD',
            sub: 'THE JOURNEY BEGINS',
            desc: "The first session is the most important one. You've officially broken the seal and stepped into the arena. Remember this feeling—it's the foundation of everything you will become.",
            icon: 'skull',
            color: '#FF3B30',
            show: total >= 1
        },
        {
            id: 'streak',
            title: 'STREAK MASTERY',
            sub: `${streak} DAYS OF DISCIPLINE`,
            desc: "Discipline is the bridge between goals and accomplishment. Consistent effort is what separates the elite from the average. Keep building that momentum—your future self is watching.",
            icon: 'flame',
            color: '#FF9500',
            show: streak >= 3
        },
        {
            id: 'heatwave',
            title: 'HEATWAVE',
            sub: '7 DAY STREAK UNLOCKED',
            desc: "You are officially on fire. Seven days of zero excuses. This isn't a fluke anymore—it's a habit. The momentum is now working for you. Don't let the fire go out.",
            icon: 'bonfire',
            color: '#FFCC00',
            show: streak >= 7
        },
        {
            id: 'elite',
            title: 'CONQUEROR STATUS',
            sub: `${total} SESSIONS COMPLETED`,
            desc: "The archives don't lie. You've consistently shown up and put in the work. You are no longer just 'trying'—you are an athlete in pursuit of absolute performance. Respect the grind.",
            icon: 'trophy',
            color: '#FFFFFF',
            show: total >= 10
        },
        {
            id: 'titan',
            title: 'TITAN REACH',
            sub: '50 SESSIONS LOGGED',
            desc: "Halfway to a century. You've moved weights, crushed sets, and evolved. You've proven that you have the endurance for the long game. You are becoming a Titan of the arena.",
            icon: 'medal',
            color: '#D1D1D1',
            show: total >= 50
        },
        {
            id: 'century',
            title: 'IRON CENTURY',
            sub: '100 SESSIONS OF POWER',
            desc: "One hundred sessions. A monumental feat of human willpower. You have reconstructed yourself through pure iron and sweat. You are part of the elite 1% who never quit. Legend status.",
            icon: 'trending-up',
            color: COLORS.primary,
            show: total >= 100
        },
        {
            id: 'gratitude',
            title: 'DAILY GRATITUDE',
            sub: 'CHASE PROGRESS, NOT PERFECTION',
            desc: "Take a breath and appreciate what your body is capable of today. Every session is a gift to your future self. Be proud of how far you've come while staying hungry for where you're going.",
            icon: 'heart',
            color: '#007AFF',
            show: true
        }
    ];

    const today = new Date();
    // Weekly Recap (Available on Sundays)
    if (today.getDay() === 0 || today.getDay() === 1) { // Sunday or Monday
        MOMENTS.push({
            id: 'weekly_recap',
            title: 'WEEKLY EVOLUTION',
            sub: `${streak}D STREAK · ${total} SESSIONS`,
            desc: `Your weekly briefing is in. You've maintained a ${streak}-day discipline streak and archived ${total} total sessions in the protocol. Analyzing your biometric data shows consistent evolution. Rest and recharge for the next cycle.`,
            icon: 'bar-chart',
            color: '#D1D1D1',
            show: total > 0
        });
    }

    const dob = profile?.dateOfBirth;
    if (dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        if (today.getDate() === birthDate.getDate() && today.getMonth() === birthDate.getMonth()) {
            MOMENTS.unshift({
                id: 'birthday',
                title: 'BIRTHDAY PROTOCOL',
                sub: `HAPPY BIRTHDAY, ${profile?.fullName?.split(" ")[0] || "ATHLETE"}!`,
                desc: "A new year of life means a new year of strength. Today we celebrate the discipline you bring to every facet of your life. Take this energy into your next decade of performance. Have an incredible day!",
                icon: 'gift',
                color: COLORS.primary,
                show: true
            });
        }
    }

    const activeMoments = MOMENTS.filter(m => m.show).reverse();

    return (
        <>
            <GestureScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: 14, marginBottom: 8 }}
            >
                {activeMoments.map((m, i) => (
                    <TouchableOpacity
                        key={m.id}
                        style={styles.momentCard}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setExpandedMoment(m);
                        }}
                    >
                        <LinearGradient
                            colors={[`${m.color}25`, 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={[styles.momentIconWrap, { backgroundColor: `${m.color}20` }]}>
                            <Ionicons name={m.icon} size={18} color={m.color} />
                        </View>
                        <View>
                            <Text style={styles.momentTitle}>{m.title}</Text>
                            <Text style={styles.momentSub} numberOfLines={1}>{m.sub}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </GestureScrollView>

            <Modal
                visible={!!expandedMoment}
                transparent
                animationType="none"
                onRequestClose={() => setExpandedMoment(null)}
            >
                <Animated.View style={[styles.momentDetailBlur, { opacity: anim }]}>
                    <LinearGradient
                        colors={["rgba(0,0,0,0.6)", "#000", "#000", "rgba(0,0,0,0.6)"]}
                        locations={[0, 0.2, 0.8, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setExpandedMoment(null)}
                        activeOpacity={1}
                    />
                    <Animated.View style={[
                        styles.momentDetailContent,
                        {
                            opacity: anim.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1] }),
                            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }]
                        }
                    ]}>
                        <LinearGradient
                            colors={[`${expandedMoment?.color}20`, '#0B0B0B']}
                            style={styles.momentDetailCard}
                        >
                            <TouchableOpacity
                                style={styles.closeMomentBtn}
                                onPress={() => setExpandedMoment(null)}
                            >
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.momentDetailIconWrap}>
                                <Ionicons name={expandedMoment?.icon} size={42} color={expandedMoment?.color} />
                            </View>

                            <Text style={[styles.momentDetailTitle, { color: expandedMoment?.color }]}>
                                {expandedMoment?.title}
                            </Text>
                            <Text style={styles.momentDetailSub}>
                                {expandedMoment?.sub}
                            </Text>
                            <Text style={styles.momentDetailDesc}>
                                {expandedMoment?.desc}
                            </Text>

                            <TouchableOpacity
                                style={[styles.momentActionBtn, { backgroundColor: expandedMoment?.color }]}
                                onPress={() => setExpandedMoment(null)}
                            >
                                <Text style={styles.momentActionText}>RECOGNIZED</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.momentShareBtn}
                                onPress={() => Share.share({
                                    message: `🏆 Just hit a milestone: ${expandedMoment?.title}! Training with CONQUER ONE.

Download: https://conquer-one.app`, title: expandedMoment?.title
                                })}
                            >
                                <Ionicons name="share-social-outline" size={14} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                                <Text style={styles.momentShareText}>SHARE ACHIEVEMENT</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </>
    );
}

function RestDayCard({ navigation }) {
    const RECOVERY_PLAN = [
        "10MIN MOBILITY & LIGHT STRETCHING",
        "3L WATER MINIMUM HYDRATION",
        "8H RESTORATIVE SLEEP CYCLE",
        "HIGH-PROTEIN NUTRIENT LOADING",
    ];
    return (
        <TouchableOpacity
            style={styles.restCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate("RestDay")}
        >
            <ImageBackground
                source={require("../../assets/onboarding_bg.png")}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.restContent}>
                    <Text style={styles.restEyebrow}>REST & RECOVERY</Text>
                    <Text style={styles.restTitle}>RECOVERY IS{"\n"}THE GOAL.</Text>
                    <View style={styles.restTimeline}>
                        {RECOVERY_PLAN.map((point, i) => (
                            <View key={i} style={styles.restPoint}>
                                <View style={styles.restDot} />
                                <Text style={styles.restPointText}>{point}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    headerRow: {
        paddingHorizontal: SPACING.base,
        marginBottom: 24,
    },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },

    // Avatar breathing styles
    avatarContainer: {
        width: 46,
        height: 46,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
    },
    avatarGlowRing: {
        position: "absolute",
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    profileCircle: {
        width: 38, height: 38, borderRadius: 19,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center",
    },
    headerAvatar: { width: "100%", height: "100%" },
    avatarPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub },

    greeting: { fontSize: 10, color: COLORS.primary, fontFamily: FAMILY.bold, letterSpacing: 4, marginBottom: 4 },
    name: {
        fontSize: 34,
        color: "#FFFFFF",
        fontFamily: FAMILY.bold,
        letterSpacing: -0.5,
        lineHeight: 38,
    },

    // Tactical HUD Level Card
    hudCard: {
        marginHorizontal: SPACING.base,
        marginTop: 24,
        borderRadius: 22,
        borderWidth: 1,
        height: 135,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "transparent",
        padding: 16,
        justifyContent: "center",
        overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
        elevation: 6,
    },
    cardLeftAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3.5,
    },
    cardTopAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
    },
    hudHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.06)",
        paddingBottom: 6,
        marginBottom: 8,
    },
    hudDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
    },
    hudTitle: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 2.5,
    },
    hudStatusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: "rgba(227, 30, 36, 0.08)",
        borderWidth: 0.8,
        borderColor: "rgba(227, 30, 36, 0.35)",
    },
    hudStatusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    hudStatusText: {
        fontSize: 7.5,
        fontFamily: FAMILY.mono,
        color: COLORS.primary,
        letterSpacing: 1.5,
    },
    hudBody: {
        flexDirection: "row",
    },
    hudLevelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    hudLevelLabel: {
        fontSize: 8,
        fontFamily: FAMILY.semibold,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
    },
    hudLevelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    hudLevelValue: {
        fontSize: 12,
        fontFamily: FAMILY.mono,
        color: COLORS.text,
        letterSpacing: 1,
    },
    hudFooterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 2,
    },
    hudSubText: {
        fontSize: 8,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    hudRankText: {
        fontSize: 9,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.5,
    },
    
    // Segmented HUD Bar Styles
    segmentedBarRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        height: 8,
        marginBottom: 10,
    },
    segmentContainer: {
        flex: 1,
        height: '100%',
        marginHorizontal: 1.5,
        borderRadius: 1.5,
        overflow: 'hidden',
        position: 'relative',
    },
    segmentBg: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 1.5,
    },
    segmentFill: {
        height: '100%',
        borderRadius: 1.5,
    },

    levelFill: { height: "100%", borderRadius: 3 },
    headerSmallActions: { flexDirection: "row", alignItems: "center" },
    iconBtnSm: {
        width: 36, height: 36, borderRadius: 12, backgroundColor: "#0D0D0D",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)"
    },

    // Asymmetric Stats Grid
    statsRow: {
        flexDirection: "row", marginHorizontal: SPACING.base, marginBottom: 36,
        height: 88, gap: 12, marginTop: 12,
    },
    statsLeft: { flex: 1, gap: 12 },
    statSmall: {
        flex: 1, padding: 16,
        backgroundColor: "transparent", borderRadius: 22,
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)",
        justifyContent: "center", alignItems: "center", overflow: "hidden",
    },
    statSmallWidth: {
        flex: 1, paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: "transparent", borderRadius: 22,
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)",
        justifyContent: "center", alignItems: "center", overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statSmallTop: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 },
    statIconWrap: { width: 20, height: 20, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)" },
    statLabelSmall: { fontSize: 8, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 2 },
    statValueSmall: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.5, textAlign: "center" },

    // Streak Intelligence Card Styles
    streakIntelligenceCard: {
        marginHorizontal: SPACING.base,
        marginTop: 16,
        padding: 16,
        height: 135,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "transparent",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
        elevation: 6,
    },
    streakIntelligenceLeft: {
        flex: 1.1,
        alignItems: "center",
        justifyContent: "center",
    },
    streakIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.25)",
        marginBottom: 6,
    },
    streakTierName: {
        fontFamily: FAMILY.bold,
        fontSize: 9,
        letterSpacing: 2,
        color: COLORS.primary,
        marginBottom: 2,
    },
    streakValue: {
        fontFamily: FAMILY.bold,
        fontSize: 26,
        color: COLORS.text,
        marginBottom: 4,
        textAlign: "center",
    },
    multiplierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 0.8,
        alignSelf: "center",
    },
    multiplierText: {
        fontFamily: FAMILY.mono,
        fontSize: 8,
        letterSpacing: 1,
    },
    streakIntelligenceRight: {
        flex: 1.9,
        alignItems: "flex-end",
    },
    gridTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 8,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    gridContainer: {
        flexDirection: "row",
        gap: 4,
    },
    gridCellWrapper: {
        alignItems: "center",
        gap: 4,
    },
    gridCellRing: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: "center",
        alignItems: "center",
    },
    gridCellRingToday: {
        borderWidth: 1.2,
        borderColor: "rgba(227, 30, 36, 0.5)",
    },
    gridCell: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
    },
    gridCellCompleted: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    gridCellFrozen: {
        borderColor: "#D1D1D1",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    gridCellToday: {
        borderColor: COLORS.text,
        borderWidth: 1.5,
    },
    gridCellMissed: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    gridCellRest: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    gridCellTodayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.text,
    },
    gridCellLabel: {
        fontFamily: FAMILY.mono,
        fontSize: 7,
        color: COLORS.textMuted,
    },

    // Streak Analytics Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        width: "100%",
        height: "82%",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        overflow: "hidden",
        paddingTop: 12,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignSelf: "center",
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
    },
    modalHeaderTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 12,
        color: COLORS.text,
        letterSpacing: 2,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalScrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        paddingTop: 20,
    },
    summaryMetricsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        padding: 16,
    },
    metricLabel: {
        fontFamily: FAMILY.mono,
        fontSize: 7,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
    },
    metricValue: {
        fontFamily: FAMILY.bold,
        fontSize: 22,
        marginVertical: 4,
    },
    metricSub: {
        fontFamily: FAMILY.bold,
        fontSize: 7,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    chartWrapper: {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        padding: 16,
        marginBottom: 20,
    },
    chartTitle: {
        fontFamily: FAMILY.mono,
        fontSize: 8,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    svgContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    chartLabelsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        marginTop: 8,
    },
    chartLabelText: {
        fontFamily: FAMILY.mono,
        fontSize: 7,
        color: COLORS.textMuted,
    },
    modalSection: {
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontFamily: FAMILY.mono,
        fontSize: 8,
        color: COLORS.textMuted,
        letterSpacing: 2,
        marginBottom: 12,
    },
    tierRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.03)",
        backgroundColor: "rgba(255, 255, 255, 0.01)",
        marginBottom: 8,
    },
    tierRowActive: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderWidth: 1.5,
    },
    tierRowName: {
        fontFamily: FAMILY.bold,
        fontSize: 11,
        letterSpacing: 1,
    },
    tierRowRange: {
        fontFamily: FAMILY.regular,
        fontSize: 9,
        color: COLORS.textMuted,
    },
    tierMultiplierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tierMultiplierText: {
        fontFamily: FAMILY.mono,
        fontSize: 8,
        fontWeight: "bold",
    },
    freezeActionSection: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        padding: 16,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    freezeActionTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    freezeSectionTitle: {
        fontFamily: FAMILY.mono,
        fontSize: 8,
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    freezeSectionDesc: {
        fontFamily: FAMILY.regular,
        fontSize: 8,
        color: COLORS.textMuted,
        lineHeight: 12,
    },
    previousFreezeText: {
        fontFamily: FAMILY.bold,
        fontSize: 7.5,
        color: "#60A5FA",
        letterSpacing: 0.5,
        marginTop: 6,
    },
    freezeToggleButton: {
        paddingHorizontal: 12,
        height: 38,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    freezeToggleButtonActive: {
        backgroundColor: "rgba(96, 165, 250, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(96, 165, 250, 0.3)",
    },
    freezeToggleText: {
        fontFamily: FAMILY.bold,
        fontSize: 8,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },

    statLarge: {
        flex: 1.4, padding: 20,
        backgroundColor: COLORS.glassBg, borderRadius: 24,
        borderWidth: 1, borderColor: COLORS.glassBorder,
        justifyContent: "space-between", overflow: "hidden",
    },
    statLargeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    statValueLarge: { fontSize: 24, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -1, marginTop: 4 },
    intensityBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(227,30,36,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(227,30,36,0.15)" },
    sparklineContainer: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 24, marginBottom: 4 },
    sparklineBar: { width: 4, borderRadius: 2, backgroundColor: COLORS.primary },
    statSubText: { fontSize: 8, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 1.5 },

    // Section headers
    sectionHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
        paddingHorizontal: SPACING.base, marginBottom: 16, marginTop: 24,
    },
    sectionLabel: {
        fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3,
    },

    // Hero HUD card
    heroCard: {
        width: width - (SPACING.base * 2),
        alignSelf: "center",
        height: 220, borderRadius: 24,
        overflow: "hidden", backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: "rgba(227, 30, 36, 0.22)",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    heroLeftAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    heroContent: { flex: 1, paddingVertical: 18, paddingHorizontal: 16, justifyContent: "space-between", paddingLeft: 20 },
    heroHeader: { flex: 1 },
    heroBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 4, marginBottom: 14,
        borderWidth: 0.5, borderColor: "rgba(255,255,255,0.12)",
    },
    heroBadgeText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },
    heroTitle: { fontSize: 38, fontFamily: FAMILY.bold, color: COLORS.text, lineHeight: 42, letterSpacing: -1 },
    heroSub: { fontSize: 12, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 10, letterSpacing: 1 },

    heroMetaRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        marginTop: 14,
    },
    heroMeta: { gap: 4 },
    heroMetaLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    heroMetaValue: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.text },

    heroCta: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 9,
        borderRadius: 12,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
        borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)",
    },
    heroCtaText: { fontSize: 10.5, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 1.2 },

    // Rest Card
    restCard: {
        marginHorizontal: SPACING.base, borderRadius: 24, overflow: "hidden",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", minHeight: 240, backgroundColor: COLORS.bgCard,
    },
    restContent: { paddingVertical: 18, paddingHorizontal: 22, paddingBottom: 22, flex: 1 },
    hudShortcutBar: {
        marginTop: 18,
    },
    hudShortcutBarContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingRight: 20,
    },
    hudShortcutBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0D0D0D",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    hudShortcutBtnText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 2,
    },
    restEyebrow: {
        fontSize: 10, fontFamily: FAMILY.bold,
        color: COLORS.primary, letterSpacing: 3, marginBottom: 12,
    },
    restTitle: {
        fontSize: 38, fontFamily: FAMILY.bold,
        color: COLORS.text, lineHeight: 42, marginBottom: 28, letterSpacing: -1,
    },
    restTimeline: { gap: 12 },
    restPoint: {
        flexDirection: "row", alignItems: "center", gap: 14,
    },
    restDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.2)" },
    restPointText: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, flex: 1, letterSpacing: 0.5 },

    // Week Grid
    weekCell: {
        width: 108, paddingVertical: 24, paddingHorizontal: 12,
        borderRadius: 20, backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", alignItems: "center", gap: 8,
        overflow: "hidden",
    },
    weekCellActive: {
        backgroundColor: "rgba(227,30,36,0.04)",
        borderColor: "rgba(227,30,36,0.25)",
    },
    weekDay: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    weekDayActive: { color: COLORS.text },
    weekTarget: { fontSize: 11, color: COLORS.text, fontFamily: FAMILY.bold, textAlign: "center", width: "100%", marginTop: 4 },
    activeIndicator: {
        position: "absolute", bottom: 12, width: 4, height: 4,
        borderRadius: 2, backgroundColor: COLORS.primary
    },

    // Library List Items
    dayList: {
        marginHorizontal: SPACING.base, gap: 12,
    },
    dayRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 24, paddingVertical: 22, backgroundColor: COLORS.glassBg,
        borderRadius: 22, borderWidth: 1, borderColor: COLORS.glassBorder,
        minHeight: 104, overflow: "hidden",
    },
    dayRowAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    dayRowLeft: { flex: 1, paddingLeft: 8 },
    dayNumRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
    dayNum: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 2 },
    dayDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.15)" },
    muscleBadge: { backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    muscleBadgeText: { fontSize: 7, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },
    dayTargetTitle: { fontSize: 22, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.5 },
    dayMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 8, fontFamily: FAMILY.bold, letterSpacing: 1 },
    dayRowRight: { opacity: 0.3 },

    customCard: {
        marginHorizontal: SPACING.base, backgroundColor: COLORS.glassBg, borderRadius: 24,
        borderWidth: 1, borderColor: COLORS.glassBorder,
        padding: 28, overflow: "hidden",
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    customTitle: { fontSize: 22, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1 },
    customSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 8, fontFamily: FAMILY.bold, letterSpacing: 1.5 },
    customIconWrap: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "rgba(227,30,36,0.08)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(227,30,36,0.15)",
    },

    // Moments
    momentCard: {
        width: 200, height: 120, padding: 20, borderRadius: 24,
        backgroundColor: COLORS.glassBg, borderWidth: 1, borderColor: COLORS.glassBorder,
        justifyContent: "space-between", overflow: "hidden"
    },
    momentIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    momentTitle: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
    momentSub: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.2 },

    // Moment Detail
    momentDetailBlur: { flex: 1, justifyContent: "center", alignItems: "center" },
    momentDetailContent: { width: '90%', maxWidth: 400 },
    momentDetailCard: { borderRadius: 36, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0B0B0B" },
    closeMomentBtn: { position: "absolute", top: 20, right: 20, padding: 8, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20 },
    momentDetailIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
    momentDetailTitle: { fontSize: 11, fontFamily: FAMILY.bold, letterSpacing: 4, marginBottom: 12 },
    momentDetailSub: { fontSize: 22, fontFamily: FAMILY.display, color: "#fff", textAlign: "center", marginBottom: 20, lineHeight: 28 },
    momentDetailDesc: { fontSize: 14, fontFamily: FAMILY.medium, color: COLORS.textSub, textAlign: "center", lineHeight: 22, opacity: 0.8, marginBottom: 32 },
    momentActionBtn: { width: '100%', height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    momentActionText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },
    momentShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 18, paddingVertical: 10 },
    momentShareText: { fontSize: 9, fontFamily: FAMILY.bold, color: "rgba(255,255,255,0.4)", letterSpacing: 2 },

    // Freeze Modal
    freezeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    freezeModalContent: {
        width: '100%', borderRadius: 28, padding: 28, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', overflow: 'hidden',
    },
    iceEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.03)', opacity: 0.5 },
    freezeModalHeader: { alignItems: 'center', marginBottom: 20 },
    snowCircle: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 18,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    freezeStatus: { fontSize: 9, fontFamily: FAMILY.bold, color: '#D1D1D1', letterSpacing: 3, marginBottom: 8 },
    freezeTitle: { fontSize: 20, fontFamily: FAMILY.bold, color: '#fff', textAlign: 'center', lineHeight: 26 },
    freezeDesc: {
        fontSize: 14, fontFamily: FAMILY.regular, color: COLORS.textSub,
        textAlign: 'center', lineHeight: 22, marginBottom: 28, opacity: 0.8
    },
    protectionBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.06)', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)'
    },
    protectionText: { fontSize: 9, fontFamily: FAMILY.bold, color: '#D1D1D1', letterSpacing: 1 },
    freezeCloseBtn: {
        width: '100%', height: 56, borderRadius: 16, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center'
    },
    freezeCloseText: { fontSize: 13, fontFamily: FAMILY.bold, color: '#000', letterSpacing: 2 },
    unfreezeLink: { marginTop: 20, paddingVertical: 8 },
    unfreezeLinkText: { fontSize: 10, fontFamily: FAMILY.bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
    // Footer
    footer: { alignItems: "center", marginTop: 48, paddingHorizontal: SPACING.base },
    footerDivider: { width: 40, height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 20 },
    footerVersion: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 6 },
    footerAuthor: { fontSize: 7, fontFamily: FAMILY.medium, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5 },

    // Streak Reset Modal Styles
    resetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    resetModalContent: {
        width: '100%', borderRadius: 28, padding: 28, alignItems: 'center',
        borderWidth: 1, borderColor: "rgba(227, 30, 36, 0.3)", overflow: 'hidden',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25, shadowRadius: 20,
    },
    resetGlowEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(227, 30, 36, 0.03)', opacity: 0.5 },
    resetModalHeader: { alignItems: 'center', marginBottom: 20 },
    brokenFlameCircle: {
        width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(227, 30, 36, 0.08)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 18,
        borderWidth: 1, borderColor: 'rgba(227, 30, 36, 0.25)',
    },
    resetStatus: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 3, marginBottom: 8 },
    resetTitle: { fontSize: 20, fontFamily: FAMILY.bold, color: '#fff', textAlign: 'center', lineHeight: 26 },
    resetDesc: {
        fontSize: 14, fontFamily: FAMILY.regular, color: COLORS.textSub,
        textAlign: 'center', lineHeight: 22, marginBottom: 28, opacity: 0.8
    },
    warningBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(227, 30, 36, 0.08)', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(227, 30, 36, 0.18)'
    },
    warningBadgeText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 1 },
    resetCloseBtn: {
        width: '100%', height: 56, borderRadius: 16, backgroundColor: COLORS.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 12,
        elevation: 4,
    },
    resetCloseText: { fontSize: 13, fontFamily: FAMILY.bold, color: '#fff', letterSpacing: 2 },

    // Resume Card Styles
    resumeCard: {
        width: "100%", backgroundColor: COLORS.glassBg,
        borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(227,30,36,0.4)",
        padding: 16, flexDirection: "row", alignItems: "center", gap: 14,
        marginBottom: 20, overflow: "hidden",
        elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 12,
    },
    resumeIconBox: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: "rgba(227,30,36,0.15)", borderWidth: 1, borderColor: "rgba(227,30,36,0.3)",
        alignItems: "center", justifyContent: "center",
    },
    resumeDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary,
    },
    resumeTag: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 1.5 },
    resumeTitle: { fontSize: 16, fontFamily: FAMILY.display, color: COLORS.text, marginTop: 2 },
    resumeSub: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, marginTop: 2 },
    resumeDiscardBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: COLORS.glassBorder,
        alignItems: "center", justifyContent: "center",
    },
});
