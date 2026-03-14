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
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, GRADIENTS, APP_VERSION } from "../utils/theme";
import {
    getStreak, getTotalWorkouts, getLastWorkoutDate,
    getLastFreezeDate, withdrawStreakFreeze
} from "../utils/storage";
import MaskedView from "@react-native-masked-view/masked-view";
import * as SplashScreen from "expo-splash-screen";
import * as Haptics from "expo-haptics";
import { getDailyStats, checkHealthConnectStatus } from "../utils/health";


// Auth
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function totalTime(day) {
    let s = 0;
    day.exercises.forEach((ex) => {
        const setDuration = ex.type === 'reps' ? 45 : ex.activeTimeSec;
        s += ex.sets * setDuration + (ex.sets - 1) * ex.restTimeSec;
        if (ex.unilateral) s += ex.sets * setDuration;
    });
    return Math.ceil(s / 60);
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

export default function HomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user, profile = null } = useAuth();
    const [streak, setStreak] = useState(0);
    const [total, setTotal] = useState(0);
    const [todayDay, setTodayDay] = useState(1);
    const [greeting, setGreeting] = useState("COMMANDER");
    const [isFrozen, setIsFrozen] = useState(false);
    const [freezeModal, setFreezeModal] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const displayName = profile?.fullName?.split(" ")[0] || user?.displayName?.split(" ")[0] || "ATHLETE";

    useFocusEffect(useCallback(() => {
        loadStats();
    }, []));

    useEffect(() => {
        const h = new Date().getHours();
        let g = "Good morning";
        if (h >= 12 && h < 17) g = "Good afternoon";
        else if (h >= 17) g = "Good evening";
        setGreeting(g);

        const d = new Date().getDay();
        setTodayDay(d === 0 ? 7 : d);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const loadStats = async () => {
        setStreak(await getStreak());
        setTotal(await getTotalWorkouts());
        const lastFreeze = await getLastFreezeDate();
        setIsFrozen(lastFreeze === new Date().toISOString().split("T")[0]);

        // Fetch Health Stats if available
        const isHealthReady = await checkHealthConnectStatus();
        if (isHealthReady) {
            const hStats = await getDailyStats();
            // We can use these stats to update UI elements like step counters if you add them!
        }
    };

    const handleUnfreeze = async () => {
        const success = await withdrawStreakFreeze();
        if (success) {
            setIsFrozen(false);
            setFreezeModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
    };

    const todayWorkout = todayDay <= 6 ? WORKOUT_PLAN[todayDay - 1] : null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* Ambient Ambient Glow */}
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    colors={["rgba(227,30,36,0.12)", "transparent", "transparent"]}
                    style={{ height: width * 1.2, width: width, position: "absolute", top: -width * 0.2 }}
                />
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                contentContainerStyle={{ paddingTop: insets.top + SPACING.base, paddingBottom: 48 }}
            >
                {/* ── Header ── */}
                <View style={styles.headerRow}>
                    <View style={styles.headerTop}>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={styles.greeting}>{greeting.toUpperCase()},</Text>
                            <GradientText
                                text={displayName.toUpperCase()}
                                style={styles.name}
                                colors={GRADIENTS.diamond}
                                height={42}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.profileCircle}
                            onPress={() => navigation.navigate("Profile")}
                            activeOpacity={0.8}
                        >
                            {profile?.photoURL ? (
                                <Image source={{ uri: profile.photoURL }} style={styles.headerAvatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{displayName[0]}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.levelProgressRow}>
                        <View style={styles.levelContainer}>
                            <View style={styles.levelBar}>
                                <LinearGradient
                                    colors={[COLORS.primary, '#FF4D4D']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[styles.levelFill, { width: `${total === 0 ? 0 : total % 10 === 0 ? 100 : ((total % 10) / 10) * 100}%` }]}
                                />
                            </View>
                            <Text style={styles.levelText}>
                                LVL {String(Math.min(Math.floor(total / 10) + 1, 99)).padStart(2, '0')} · {
                                    total >= 100 ? 'LEGEND' :
                                        total >= 50 ? 'TITAN' :
                                            total >= 25 ? 'WARRIOR' :
                                                total >= 10 ? 'PRO ATHLETE' :
                                                    total >= 5 ? 'RISING STAR' : 'RECRUIT'
                                }
                            </Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <View style={styles.headerSmallActions}>
                            {isFrozen && (
                                <TouchableOpacity
                                    style={[styles.iconBtnSm, { backgroundColor: 'rgba(96,165,250,0.15)', borderColor: 'rgba(96,165,250,0.3)', marginRight: 4 }]}
                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setFreezeModal(true); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="snow" size={14} color="#60A5FA" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.iconBtnSm} onPress={() => navigation.navigate("AICoach")} activeOpacity={0.7}>
                                <Ionicons name="flash" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconBtnSm, { marginLeft: 8 }]} onPress={() => navigation.navigate("History")} activeOpacity={0.7}>
                                <Ionicons name="time-outline" size={16} color={COLORS.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconBtnSm, { marginLeft: 8 }]} onPress={() => navigation.navigate("Settings")} activeOpacity={0.7}>
                                <Ionicons name="settings-outline" size={16} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Stats: Asymmetric Grid ── */}
                <View style={styles.statsRow}>
                    <View style={styles.statsLeft}>
                        <View style={styles.statSmall}>
                            <LinearGradient
                                colors={["rgba(255,255,255,0.03)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.statSmallTop}>
                                <View style={styles.statIconWrap}>
                                    <Ionicons name="flame" size={12} color={COLORS.primary} />
                                </View>
                                <Text style={styles.statLabelSmall}>STREAK</Text>
                            </View>
                            <Text style={styles.statValueSmall}>{streak} <Text style={{ fontSize: 9 }}>DAYS</Text></Text>
                        </View>
                        <View style={styles.statSmall}>
                            <LinearGradient
                                colors={["rgba(255,255,255,0.03)", "transparent"]}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.statSmallTop}>
                                <View style={styles.statIconWrap}>
                                    <Ionicons name="fitness" size={12} color={COLORS.textSub} />
                                </View>
                                <Text style={styles.statLabelSmall}>TOTAL</Text>
                            </View>
                            <Text style={styles.statValueSmall}>{total} <Text style={{ fontSize: 9 }}>SESSIONS</Text></Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.statLarge} activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate("Rank"); }}>
                        <LinearGradient
                            colors={["rgba(255,255,255,0.05)", "rgba(227,30,36,0.01)", "transparent"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.statLargeTop}>
                            <View>
                                <Text style={styles.statLabelSmall}>YOUR RANK</Text>
                                <Text style={styles.statValueLarge}>{
                                    total >= 100 ? 'LEGEND' :
                                        total >= 50 ? 'TITAN' :
                                            total >= 25 ? 'WARRIOR' :
                                                total >= 10 ? 'PRO' :
                                                    total >= 5 ? 'RISING' : 'RECRUIT'
                                }</Text>
                            </View>
                            <View style={styles.intensityBadge}>
                                <Ionicons name="trending-up" size={14} color={COLORS.primary} />
                            </View>
                        </View>
                        <View style={styles.sparklineContainer}>
                            {[4, 6, 3, 8, 5, 9, 7].map((h, i) => (
                                <View key={i} style={[styles.sparklineBar, { height: h * 2, opacity: 0.3 + (i * 0.1) }]} />
                            ))}
                        </View>
                        <Text style={styles.statSubText}>TAP TO VIEW DETAILS →</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Moments (Highlights) ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>MOMENTS</Text>
                </View>
                <MomentsGallery streak={streak} total={total} profile={profile} />

                {/* ── Today's Workout ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>TODAY'S WORKOUT</Text>
                </View>

                {todayWorkout ? (
                    <TouchableOpacity
                        style={styles.heroCard}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate("WorkoutDetail", { day: todayWorkout })}
                    >
                        <ImageBackground
                            source={require("../../assets/home_hero_bg.png")}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                        >
                            <LinearGradient
                                colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.92)", "#000"]}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.heroContent}>
                                <View style={styles.heroHeader}>
                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeText}>ACTIVE PLAN</Text>
                                    </View>
                                    <Text style={styles.heroTitle} numberOfLines={2} adjustsFontSizeToFit>
                                        {todayWorkout.target.toUpperCase()}
                                    </Text>
                                    <Text style={styles.heroSub}>READY FOR SESSION</Text>
                                </View>

                                <View style={styles.heroFooter}>
                                    <View style={{ flexDirection: "row", gap: 24 }}>
                                        <View style={styles.heroMeta}>
                                            <Text style={styles.heroMetaLabel}>VOLUME</Text>
                                            <Text style={styles.heroMetaValue}>{todayWorkout.exercises.length} EX</Text>
                                        </View>
                                        <View style={styles.heroMeta}>
                                            <Text style={styles.heroMetaLabel}>TIME</Text>
                                            <Text style={styles.heroMetaValue}>{totalTime(todayWorkout)} MIN</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.heroCta}
                                        activeOpacity={0.8}
                                        onPress={() => navigation.navigate("WorkoutDetail", { day: todayWorkout })}
                                    >
                                        <Text style={styles.heroCtaText}>START</Text>
                                        <Ionicons name="play" size={12} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ImageBackground>
                    </TouchableOpacity>
                ) : (
                    <RestDayCard navigation={navigation} />
                )}

                {/* ── Weekly Plan ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>WEEKLY PLAN</Text>
                </View>
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
                                onPress={() => navigation.navigate("WorkoutDetail", { day })}
                                activeOpacity={0.75}
                            >
                                {isToday && (
                                    <LinearGradient
                                        colors={["rgba(255,255,255,0.08)", "transparent"]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <Text style={[styles.weekDay, isToday && styles.weekDayActive]}>{DAY_LABELS[i].toUpperCase()}</Text>
                                <Text style={styles.weekTarget} numberOfLines={1}>{day.target.toUpperCase()}</Text>
                                {isToday && <View style={styles.activeIndicator} />}
                            </GestureTouchableOpacity>
                        );
                    })}
                    <GestureTouchableOpacity
                        style={styles.weekCell}
                        onPress={() => navigation.navigate("RestDay")}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.weekDay}>SUN</Text>
                        <Text style={styles.weekTarget}>REST</Text>
                    </GestureTouchableOpacity>
                </GestureScrollView>

                {/* ── Workout Library ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>WORKOUT LIBRARY</Text>
                </View>
                <View style={styles.dayList}>
                    {WORKOUT_PLAN.map((day) => (
                        <TouchableOpacity
                            key={day.day}
                            style={styles.dayRow}
                            onPress={() => navigation.navigate("WorkoutDetail", { day })}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={["rgba(255,255,255,0.03)", "transparent"]}
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

                {/* ── Custom Workout ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>CUSTOM WORKOUT</Text>
                </View>
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

                <View style={[styles.footer, { paddingBottom: insets.bottom + 40 }]}>
                    <View style={styles.footerDivider} />
                    <Text style={styles.footerVersion}>CONQUER ONE PROTOCOL · {APP_VERSION}</Text>
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
            color: '#5856D6',
            show: total >= 10
        },
        {
            id: 'titan',
            title: 'TITAN REACH',
            sub: '50 SESSIONS LOGGED',
            desc: "Halfway to a century. You've moved weights, crushed sets, and evolved. You've proven that you have the endurance for the long game. You are becoming a Titan of the arena.",
            icon: 'medal',
            color: '#AF52DE',
            show: total >= 50
        },
        {
            id: 'century',
            title: 'IRON CENTURY',
            sub: '100 SESSIONS OF POWER',
            desc: "One hundred sessions. A monumental feat of human willpower. You have reconstructed yourself through pure iron and sweat. You are part of the elite 1% who never quit. Legend status.",
            icon: 'trending-up',
            color: '#FF2D55',
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
            color: '#AF52DE',
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
                color: '#FF2D55',
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
        marginBottom: 32,
    },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    profileCircle: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
        overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center", justifyContent: "center",
    },
    headerAvatar: { width: "100%", height: "100%" },
    avatarPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.textSub },

    greeting: { fontSize: 10, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 4, marginBottom: 4 },
    name: {
        fontSize: 34,
        color: COLORS.text,
        fontFamily: FAMILY.bold,
        letterSpacing: -0.8,
        lineHeight: 38,
    },

    levelContainer: { flex: 1, marginRight: 12 },
    levelProgressRow: { flexDirection: "row", alignItems: "center", marginTop: 24, gap: 12 },
    levelBar: { height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, width: '100%', maxWidth: 120, marginBottom: 8, overflow: 'hidden' },
    levelFill: { height: "100%", borderRadius: 2 },
    levelText: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5, opacity: 0.8 },

    headerSmallActions: { flexDirection: "row", alignItems: "center" },
    iconBtnSm: {
        width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)"
    },

    // Asymmetric Stats Grid
    statsRow: {
        flexDirection: "row", marginHorizontal: SPACING.base, marginBottom: 48,
        height: 124, gap: 12,
    },
    statsLeft: { flex: 1, gap: 12 },
    statSmall: {
        flex: 1, padding: 18,
        backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 20,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
        justifyContent: "center", overflow: "hidden",
    },
    statSmallTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    statIconWrap: { width: 22, height: 22, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
    statLabelSmall: { fontSize: 7, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 2 },
    statValueSmall: { fontSize: 16, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.5 },

    statLarge: {
        flex: 1.4, padding: 22,
        backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 24,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        justifyContent: "space-between", overflow: "hidden",
    },
    statLargeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    statValueLarge: { fontSize: 26, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -1, marginTop: 4 },
    intensityBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(227,30,36,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(227,30,36,0.2)" },
    sparklineContainer: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 24, marginBottom: 4 },
    sparklineBar: { width: 4, borderRadius: 2, backgroundColor: COLORS.primary },
    statSubText: { fontSize: 8, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 1.5 },

    // Section headers
    sectionHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
        paddingHorizontal: SPACING.base, marginBottom: 16, marginTop: 32,
    },
    sectionLabel: {
        fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3,
    },

    // Hero - Aesthetic
    heroCard: {
        marginHorizontal: SPACING.base, height: 340, borderRadius: 28,
        overflow: "hidden", backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    heroContent: { flex: 1, padding: 28, justifyContent: "space-between" },
    heroHeader: { flex: 1 },
    heroBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 4, marginBottom: 16,
        borderWidth: 0.5, borderColor: "rgba(255,255,255,0.2)",
    },
    heroBadgeText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },
    heroTitle: { fontSize: 42, fontFamily: FAMILY.bold, color: COLORS.text, lineHeight: 46, letterSpacing: -1 },
    heroSub: { fontSize: 13, fontFamily: FAMILY.regular, color: COLORS.textSub, marginTop: 12, letterSpacing: 1 },

    heroFooter: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 24,
    },
    heroMeta: { gap: 4 },
    heroMetaLabel: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    heroMetaValue: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.text },

    heroCta: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 14,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    heroCtaText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },

    // Rest - Sophisticated
    restCard: {
        marginHorizontal: SPACING.base, borderRadius: 28, overflow: "hidden",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", minHeight: 340, backgroundColor: COLORS.bgCard,
    },
    restContent: { padding: 32, paddingBottom: 40, flex: 1 },
    restEyebrow: {
        fontSize: 10, fontFamily: FAMILY.bold,
        color: COLORS.primary, letterSpacing: 3, marginBottom: 16,
    },
    restTitle: {
        fontSize: 44, fontFamily: FAMILY.bold,
        color: COLORS.text, lineHeight: 48, marginBottom: 32, letterSpacing: -1,
    },
    restTimeline: { gap: 14 },
    restPoint: {
        flexDirection: "row", alignItems: "center", gap: 16,
    },
    restDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.2)" },
    restPointText: { fontSize: 11, fontFamily: FAMILY.medium, color: COLORS.textSub, flex: 1, letterSpacing: 0.5 },

    // Week Grid
    weekCell: {
        width: 108, paddingVertical: 24, paddingHorizontal: 12,
        borderRadius: 22, backgroundColor: COLORS.bgCard,
        borderWidth: 1, borderColor: "transparent", alignItems: "center", gap: 8,
        overflow: "hidden",
    },
    weekCellActive: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.12)",
    },
    weekDay: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    weekDayActive: { color: COLORS.text },
    weekTarget: { fontSize: 11, color: COLORS.text, fontFamily: FAMILY.bold, textAlign: "center", width: "100%", marginTop: 4 },
    activeIndicator: {
        position: "absolute", bottom: 12, width: 4, height: 4,
        borderRadius: 2, backgroundColor: COLORS.primary
    },

    // Item List
    dayList: {
        marginHorizontal: SPACING.base, gap: 14,
    },
    dayRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 28, paddingVertical: 26, backgroundColor: COLORS.bgCard,
        borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
        minHeight: 112,
    },
    dayRowLeft: { flex: 1 },
    dayNumRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    dayNum: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 2 },
    dayDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.15)" },
    muscleBadge: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    muscleBadgeText: { fontSize: 7, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },
    dayTargetTitle: { fontSize: 24, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.5 },
    dayMeta: { fontSize: 10, color: COLORS.textMuted, marginTop: 10, fontFamily: FAMILY.bold, letterSpacing: 1 },
    dayRowRight: { opacity: 0.4 },

    customCard: {
        marginHorizontal: SPACING.base, backgroundColor: COLORS.bgCard, borderRadius: 28,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
        padding: 32, overflow: "hidden",
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    customTitle: { fontSize: 24, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 1 },
    customSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 8, fontFamily: FAMILY.bold, letterSpacing: 1.5 },
    customIconWrap: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: "rgba(227,30,36,0.12)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(227,30,36,0.2)",
    },

    // Moments
    momentCard: {
        width: 200, height: 120, padding: 20, borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        justifyContent: "space-between", overflow: "hidden"
    },
    momentIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    momentTitle: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6 },
    momentSub: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -0.2 },

    // Moment Detail
    momentDetailBlur: { flex: 1, justifyContent: "center", alignItems: "center" },
    momentDetailContent: { width: '90%', maxWidth: 400 },
    momentDetailCard: { borderRadius: 40, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#0B0B0B" },
    closeMomentBtn: { position: "absolute", top: 24, right: 24, padding: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20 },
    momentDetailIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center", marginBottom: 32 },
    momentDetailTitle: { fontSize: 12, fontFamily: FAMILY.bold, letterSpacing: 4, marginBottom: 12 },
    momentDetailSub: { fontSize: 24, fontFamily: FAMILY.display, color: "#fff", textAlign: "center", marginBottom: 24, lineHeight: 30 },
    momentDetailDesc: { fontSize: 14, fontFamily: FAMILY.medium, color: COLORS.textSub, textAlign: "center", lineHeight: 22, opacity: 0.8, marginBottom: 40 },
    momentActionBtn: { width: '100%', height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    momentActionText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },
    momentShareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, paddingVertical: 10 },
    momentShareText: { fontSize: 9, fontFamily: FAMILY.bold, color: "rgba(255,255,255,0.4)", letterSpacing: 2 },

    // Freeze Modal
    freezeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    freezeModalContent: {
        width: '100%', borderRadius: 32, padding: 32, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', overflow: 'hidden',
    },
    iceEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(96,165,250,0.05)', opacity: 0.5 },
    freezeModalHeader: { alignItems: 'center', marginBottom: 24 },
    snowCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(96,165,250,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)',
    },
    freezeStatus: { fontSize: 9, fontFamily: FAMILY.bold, color: '#60A5FA', letterSpacing: 3, marginBottom: 8 },
    freezeTitle: { fontSize: 22, fontFamily: FAMILY.bold, color: '#fff', textAlign: 'center', lineHeight: 28 },
    freezeDesc: {
        fontSize: 14, fontFamily: FAMILY.regular, color: COLORS.textSub,
        textAlign: 'center', lineHeight: 22, marginBottom: 32, opacity: 0.8
    },
    protectionBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(96,165,250,0.1)', paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 12, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)'
    },
    protectionText: { fontSize: 9, fontFamily: FAMILY.bold, color: '#60A5FA', letterSpacing: 1 },
    freezeCloseBtn: {
        width: '100%', height: 60, borderRadius: 18, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center'
    },
    freezeCloseText: { fontSize: 13, fontFamily: FAMILY.bold, color: '#000', letterSpacing: 2 },
    unfreezeLink: { marginTop: 24, paddingVertical: 8 },
    unfreezeLinkText: { fontSize: 10, fontFamily: FAMILY.bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
    // Footer
    footer: { alignItems: "center", marginTop: 64, paddingHorizontal: SPACING.base },
    footerDivider: { width: 40, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 24 },
    footerVersion: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 8 },
    footerAuthor: { fontSize: 7, fontFamily: FAMILY.medium, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5 },
});
