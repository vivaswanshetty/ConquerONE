import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View, Text, StyleSheet, StatusBar, TextInput, Modal,
    KeyboardAvoidingView, Platform, Dimensions, Animated,
    ScrollView, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY, getMuscleColor } from "../utils/theme";
import { WORKOUT_PLAN, getSuggestedWeight } from "../data/workoutData";
import { getPRRecords } from "../utils/storage";
import { fsSaveCustomWorkout, fsGetCustomWorkouts, fsDeleteCustomWorkout } from "../utils/firestore";
import { useNotification } from "../context/NotificationContext";

const FAVORITES_KEY = "@custom_workout_favorites_v2";
const ROUTINES_KEY = "@custom_workout_routines_v2";

// ── Curated "Most Effective" Compound Kings (High Hypertrophy ROI) ──
const MOST_EFFECTIVE_NAMES = new Set([
    "Barbell Bench Press",
    "Barbell Squat",
    "Barbell Squats",
    "Deadlift",
    "Deadlifts",
    "Pull-ups",
    "Overhead Press",
    "Overhead Press (OHP)",
    "Barbell Overhead Press (OHP)",
    "Barbell Rows",
    "Incline Dumbbell Press",
    "Romanian Deadlift",
    "Romanian Deadlifts",
    "Dips",
    "Bulgarian Split Squat",
    "Bulgarian Split Squats",
]);

// ── Curated "High Volume / Max Reps / Burnout" Isolations ──
const MAX_REPS_NAMES = new Set([
    "Cable Crossover — High to Low",
    "Cable Fly — Low to High",
    "Lateral Raises",
    "Dumbbell Lateral Raise",
    "Dumbbell Lateral Raises",
    "Cable Lateral Raise",
    "Cable Lateral Raises",
    "Tricep Rope Pushdown",
    "Cable Tricep Pushdown — Rope",
    "Incline Dumbbell Curl",
    "Hammer Curls",
    "Leg Extensions",
    "Seated Leg Curls",
    "Standing Calf Raises",
    "Face Pulls",
    "Hanging Leg Raise",
    "Hanging Leg Raises",
    "Cable Woodchoppers",
]);

// ── Accurate Exercise Muscle Category Classifier ──
function getExerciseMuscleGroup(ex) {
    const pt = (ex.primaryTarget || "").toUpperCase();
    const tag = (ex.tag || "").toUpperCase();
    const name = (ex.name || "").toUpperCase();
    const combined = `${name} ${pt} ${tag}`;

    if (combined.includes("CHEST") || combined.includes("BENCH") || combined.includes("PECTORAL") || combined.includes("DIPS")) return "CHEST";
    if (combined.includes("LAT") || combined.includes("BACK") || combined.includes("ROW") || combined.includes("PULL-UP") || combined.includes("DEADLIFT") || combined.includes("PULLDOWN")) return "BACK";
    if (combined.includes("QUAD") || combined.includes("SQUAT") || combined.includes("HAMSTRING") || combined.includes("CALF") || combined.includes("CALVES") || combined.includes("LEG") || combined.includes("GLUTE") || combined.includes("RDL")) return "LEGS";
    if (combined.includes("SHOULDER") || combined.includes("DELT") || combined.includes("OVERHEAD PRESS") || combined.includes("OHP") || combined.includes("LATERAL RAISE") || combined.includes("FACE PULL")) return "SHOULDERS";
    if (combined.includes("BICEP") || combined.includes("TRICEP") || combined.includes("CURL") || combined.includes("PUSHDOWN") || combined.includes("SKULL CRUSHER") || combined.includes("FOREARM") || combined.includes("BRACHIALIS") || combined.includes("WRIST")) return "ARMS";
    if (combined.includes("ABS") || combined.includes("ABDOMINAL") || combined.includes("CORE") || combined.includes("OBLIQUE") || combined.includes("PLANK") || combined.includes("CRUNCH") || combined.includes("LEG RAISE")) return "CORE";

    return "CHEST";
}

// ── Flattened Exercise Catalog with Unique Identifiers & Accurate Targets ──
const ALL_EXERCISES = (() => {
    const map = new Map();
    WORKOUT_PLAN.forEach((day) => {
        day.exercises.forEach((ex) => {
            if (!map.has(ex.name)) {
                const isCompound = MOST_EFFECTIVE_NAMES.has(ex.name);
                const isMaxReps = MAX_REPS_NAMES.has(ex.name);
                const muscleGroup = getExerciseMuscleGroup(ex);
                let tierTag = "HYPERTROPHY";
                if (isCompound) tierTag = "COMPOUND KING";
                else if (isMaxReps) tierTag = "MAX PUMP / REPS";

                map.set(ex.name, {
                    ...ex,
                    dayTarget: day.target,
                    dayNum: day.day,
                    muscleGroup,
                    isCompound,
                    isMaxReps,
                    tierTag,
                });
            }
        });
    });
    return Array.from(map.values());
})();

// ── Curated Quick Express Workout Routine Packs ──
const CURATED_PRESET_PACKS = [
    {
        id: "preset_upper_express",
        title: "30-MIN UPPER EXPRESS",
        subtitle: "High-density chest, back, shoulders & arms protocol",
        durationMin: 30,
        calories: 260,
        tag: "UPPER BODY",
        exerciseNames: ["Barbell Bench Press", "Barbell Rows", "Barbell Overhead Press (OHP)", "Incline Dumbbell Curl"],
    },
    {
        id: "preset_lower_power",
        title: "30-MIN LOWER POWER",
        subtitle: "Quads, posterior chain & calves strength builder",
        durationMin: 30,
        calories: 280,
        tag: "LEGS & GLUTES",
        exerciseNames: ["Barbell Squat", "Romanian Deadlift", "Bulgarian Split Squat", "Standing Calf Raises"],
    },
    {
        id: "preset_arm_annihilation",
        title: "ARM ANNIHILATION PUMP",
        subtitle: "Max hypertrophy superset routine for peak arms",
        durationMin: 25,
        calories: 210,
        tag: "ARMS FOCUSED",
        exerciseNames: ["Incline Dumbbell Curl", "Skull Crushers", "Hammer Curls", "Cable Tricep Pushdown — Rope"],
    },
    {
        id: "preset_push_powerhouse",
        title: "45-MIN PUSH POWERHOUSE",
        subtitle: "Heavy pressing + shoulder & tricep isolation",
        durationMin: 45,
        calories: 390,
        tag: "PUSH FOCUS",
        exerciseNames: ["Barbell Bench Press", "Incline Dumbbell Press", "Barbell Overhead Press (OHP)", "Dumbbell Lateral Raise", "Dips"],
    },
    {
        id: "preset_pull_hypertrophy",
        title: "45-MIN PULL HYPERTROPHY",
        subtitle: "Maximum lat width, upper back thickness & bicep mass",
        durationMin: 45,
        calories: 410,
        tag: "PULL FOCUS",
        exerciseNames: ["Deadlift", "Pull-ups", "Barbell Rows", "Incline Dumbbell Curl", "Face Pulls"],
    },
];

export default function CustomWorkoutScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
    const scrollRef = useRef(null);

    // ── State ──
    const [selected, setSelected] = useState(new Set());
    const [activeTab, setActiveTab] = useState("ALL"); // ALL | ROUTINES | FAVORITES | EFFECTIVE | MAX_REPS | PRESETS
    const [muscleFilter, setMuscleFilter] = useState("ALL"); // ALL | CHEST | BACK | LEGS | SHOULDERS | ARMS | CORE
    const [searchQuery, setSearchQuery] = useState("");
    const [favorites, setFavorites] = useState(new Set());
    const [routines, setRoutines] = useState([]);
    const [prRecords, setPRRecords] = useState({});
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [routineTitle, setRoutineTitle] = useState("");
    const [statusBanner, setStatusBanner] = useState(null);

    // ── Load Favorites, Routines & PRs ──
    useEffect(() => {
        (async () => {
            try {
                const favRaw = await AsyncStorage.getItem(FAVORITES_KEY);
                if (favRaw) setFavorites(new Set(JSON.parse(favRaw)));

                const rRaw = await AsyncStorage.getItem(ROUTINES_KEY);
                let localRoutines = rRaw ? JSON.parse(rRaw) : [];
                
                // Fetch cloud custom workouts
                try {
                    const cloudRoutines = await fsGetCustomWorkouts();
                    if (cloudRoutines && cloudRoutines.length > 0) {
                        const merged = [...localRoutines];
                        cloudRoutines.forEach((cr) => {
                            if (!merged.some(r => r.id === cr.id)) merged.push(cr);
                        });
                        localRoutines = merged;
                    }
                } catch { }

                setRoutines(localRoutines);

                const prs = await getPRRecords();
                setPRRecords(prs || {});
            } catch (e) {
                console.warn("[CustomWorkout] Load error", e);
            }
        })();
    }, []);

    // ── Flash Status Banner ──
    const showFlash = (msg) => {
        setStatusBanner(msg);
        setTimeout(() => setStatusBanner(null), 3000);
    };

    // ── Toggle Favorite ──
    const toggleFavorite = async (name) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFavorites((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
            return next;
        });
    };

    // ── Toggle Selection ──
    const toggleSelect = (name) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    // ── Select a full preset pack ──
    const applyPresetPack = (pack) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const next = new Set();
        pack.exerciseNames.forEach((n) => {
            const match = ALL_EXERCISES.find(ex => ex.name.toLowerCase() === n.toLowerCase());
            if (match) next.add(match.name);
        });
        setSelected(next);
        showFlash(`Loaded "${pack.title}" (${next.size} movements)`);
    };

    // ── Save Routine ──
    const handleSaveRoutine = async () => {
        const trimmed = routineTitle.trim();
        if (!trimmed) {
            showDialog({ title: "NAME REQUIRED", message: "Please enter a name for your custom routine." });
            return;
        }
        if (selected.size === 0) {
            showDialog({ title: "NO MOVEMENTS", message: "Please select at least 1 exercise for this routine." });
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newRoutine = {
            id: `routine_${Date.now()}`,
            title: trimmed.toUpperCase(),
            exerciseNames: Array.from(selected),
            createdAt: new Date().toISOString(),
            exerciseCount: selected.size,
        };

        const next = [newRoutine, ...routines];
        setRoutines(next);
        
        try {
            await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(next));
            await fsSaveCustomWorkout(newRoutine);
        } catch (e) {
            console.warn("[CustomWorkout] Save routine error", e);
        }

        setRoutineTitle("");
        setSaveModalVisible(false);
        setActiveTab("ROUTINES");
        showFlash(`Saved routine "${newRoutine.title}"!`);

        if (scrollRef.current) {
            scrollRef.current.scrollTo({ y: 0, animated: true });
        }
    };

    // ── Delete Routine ──
    const handleDeleteRoutine = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showDialog({
            title: "DELETE ROUTINE?",
            message: "This custom routine will be permanently removed from your library.",
            confirmText: "DELETE",
            cancelText: "CANCEL",
            isDestructive: true,
            onConfirm: async () => {
                const next = routines.filter(r => r.id !== id);
                setRoutines(next);
                await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(next));
                try { await fsDeleteCustomWorkout(id); } catch { }
                showFlash("Routine deleted.");
            }
        });
    };

    // ── Filtered Exercises Calculation with Precise Anatomy Search ──
    const filteredExercises = useMemo(() => {
        return ALL_EXERCISES.filter((ex) => {
            // 1. Text Search Filter (Precise token matching)
            if (searchQuery.trim().length > 0) {
                const query = searchQuery.trim().toLowerCase();
                const tokens = query.split(/\s+/).filter(Boolean);

                const name = ex.name.toLowerCase();
                const primary = (ex.primaryTarget || "").toLowerCase();
                const tag = (ex.tag || "").toLowerCase();
                const equip = (ex.equipment || "").toLowerCase();
                const muscle = ex.muscleGroup.toLowerCase();

                const matchesAllTokens = tokens.every(tok => {
                    // Precision for core / abs queries
                    if (tok === "abs" || tok === "ab" || tok === "core" || tok === "abdominal") {
                        return muscle === "core" ||
                               primary.includes("ab") ||
                               tag.includes("ab") ||
                               name.includes("ab") ||
                               name.includes("crunch") ||
                               name.includes("leg raise") ||
                               name.includes("plank") ||
                               name.includes("woodchopper");
                    }
                    // Precision for shoulders / delts
                    if (tok === "shoulder" || tok === "shoulders" || tok === "delt" || tok === "delts") {
                        return muscle === "shoulders" || primary.includes("delt") || tag.includes("delt") || name.includes("press") || name.includes("raise");
                    }
                    // General search
                    return name.includes(tok) ||
                           primary.includes(tok) ||
                           tag.includes(tok) ||
                           equip.includes(tok) ||
                           muscle.includes(tok);
                });

                if (!matchesAllTokens) return false;
            }

            // 2. Tab Filter
            if (activeTab === "FAVORITES" && !favorites.has(ex.name)) return false;
            if (activeTab === "EFFECTIVE" && !ex.isCompound) return false;
            if (activeTab === "MAX_REPS" && !ex.isMaxReps) return false;

            // 3. Muscle Group Filter
            if (muscleFilter !== "ALL") {
                if (ex.muscleGroup !== muscleFilter) return false;
            }

            return true;
        });
    }, [searchQuery, activeTab, muscleFilter, favorites]);

    // ── Selected Exercises Array ──
    const selectedExercises = useMemo(() => {
        return ALL_EXERCISES.filter(ex => selected.has(ex.name));
    }, [selected]);

    // ── Duration & Calories Calculation ──
    const estimatedDuration = useMemo(() => {
        let totalSec = 0;
        selectedExercises.forEach((ex) => {
            const setDuration = ex.type === "reps" ? 45 : ex.activeTimeSec;
            totalSec += ex.sets * setDuration + (ex.sets - 1) * ex.restTimeSec;
        });
        return Math.ceil(totalSec / 60) || (selected.size * 6);
    }, [selectedExercises, selected]);

    const estimatedKcal = useMemo(() => {
        return Math.round(5.0 * 75 * (estimatedDuration / 60));
    }, [estimatedDuration]);

    // ── Launch Active Workout ──
    const handleStartWorkout = () => {
        if (selected.size === 0) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const customDay = {
            day: 0,
            target: selected.size === 1 ? selectedExercises[0].name.toUpperCase() : "CUSTOM PROTOCOL",
            dayName: "CUSTOM SESSION",
            exercises: selectedExercises,
            headerImage: selectedExercises[0]?.image || require("../../assets/workout_detail_bg.png"),
            color: COLORS.primary,
            gradient: [COLORS.primary, "#8B0000"],
            emoji: "⚡",
        };

        navigation.replace("ActiveWorkout", { day: customDay });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            {/* ── 1. Top Navigation & Control Deck (Fixed at top so vertical scrolling below is 100% unrestricted) ── */}
            <View style={[styles.topControlDeck, { paddingTop: insets.top + 6 }]}>
                {/* Header Bar */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.goBack();
                        }}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>CUSTOM WORKOUT</Text>
                        <Text style={styles.headerSubtitle}>DYNAMIC ROUTINE BUILDER</Text>
                    </View>

                    <View style={[styles.countBadge, selected.size > 0 && styles.countBadgeActive]}>
                        <Text style={[styles.countBadgeText, selected.size > 0 && styles.countBadgeTextActive]}>
                            {selected.size} SELECTED
                        </Text>
                    </View>
                </View>

                {/* Optional Status Banner */}
                {statusBanner && (
                    <View style={styles.statusBanner}>
                        <Ionicons name="checkmark-circle" size={13} color="#30D158" style={{ marginRight: 6 }} />
                        <Text style={styles.statusBannerText}>{statusBanner}</Text>
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search movements, equipment, muscle..."
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={16} color={COLORS.textSub} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Smart Curation Tabs */}
                <View style={styles.tabsSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsContent}
                        overScrollMode="never"
                    >
                        {[
                            { key: "ALL", label: "ALL MOVEMENTS", icon: "grid-outline" },
                            { key: "ROUTINES", label: `MY ROUTINES (${routines.length})`, icon: "layers" },
                            { key: "FAVORITES", label: `FAVORITES (${favorites.size})`, icon: "star" },
                            { key: "EFFECTIVE", label: "⚡ MOST EFFECTIVE", icon: "flash-outline" },
                            { key: "MAX_REPS", label: "🔥 MAX REPS / PUMP", icon: "flame-outline" },
                            { key: "PRESETS", label: "⏱️ EXPRESS PRESETS", icon: "timer-outline" },
                        ].map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setActiveTab(tab.key);
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons
                                        name={tab.icon}
                                        size={12}
                                        color={isActive ? "#FFFFFF" : COLORS.textMuted}
                                        style={{ marginRight: 5 }}
                                    />
                                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Muscle Filter Row (When viewing exercise lists) */}
                {activeTab !== "PRESETS" && activeTab !== "ROUTINES" && (
                    <View style={styles.muscleFilterSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.muscleFilterContent}
                            overScrollMode="never"
                        >
                            {["ALL", "CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS", "CORE"].map((m) => {
                                const isSelected = muscleFilter === m;
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.muscleChip, isSelected && styles.muscleChipActive]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setMuscleFilter(m);
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[styles.muscleChipText, isSelected && styles.muscleChipTextActive]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* ── 2. Dedicated Vertical ScrollView (100% unhindered smooth vertical scrolling) ── */}
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                overScrollMode="never"
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: selected.size > 0 ? 170 : Math.max(insets.bottom, 20) + 30,
                }}
            >
                {/* ── Mode A: Express Preset Packs Tab ── */}
                {activeTab === "PRESETS" && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeaderTitle}>EXPRESS PROTOCOL PRESETS</Text>
                            <Text style={styles.sectionHeaderCount}>{CURATED_PRESET_PACKS.length} PRESETS</Text>
                        </View>
                        {CURATED_PRESET_PACKS.map((pack) => (
                            <PresetPackCard
                                key={pack.id}
                                pack={pack}
                                onApply={() => applyPresetPack(pack)}
                            />
                        ))}
                    </View>
                )}

                {/* ── Mode B: Saved User Routines Tab ── */}
                {activeTab === "ROUTINES" && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeaderTitle}>MY SAVED ROUTINES</Text>
                            <Text style={styles.sectionHeaderCount}>{routines.length} ROUTINES</Text>
                        </View>

                        {selected.size > 0 && (
                            <TouchableOpacity
                                style={styles.quickSaveRoutineBanner}
                                onPress={() => setSaveModalVisible(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add-circle" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.quickSaveRoutineText}>
                                    SAVE CURRENT {selected.size} MOVEMENTS AS NEW ROUTINE
                                </Text>
                            </TouchableOpacity>
                        )}

                        {routines.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="layers-outline" size={32} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyTitle}>NO SAVED ROUTINES YET</Text>
                                <Text style={styles.emptySub}>
                                    Select any movements in "ALL MOVEMENTS" and tap "SAVE ROUTINE" to build your custom workout library.
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyActionBtn}
                                    onPress={() => setActiveTab("ALL")}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.emptyActionBtnText}>BROWSE ALL MOVEMENTS</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            routines.map((r) => (
                                <RoutineCard
                                    key={r.id}
                                    routine={r}
                                    onApply={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        const next = new Set(r.exerciseNames);
                                        setSelected(next);
                                        showFlash(`Loaded routine "${r.title}" (${next.size} movements)`);
                                    }}
                                    onDelete={() => handleDeleteRoutine(r.id)}
                                />
                            ))
                        )}
                    </View>
                )}

                {/* ── Mode C: Standard Exercise Catalog List ── */}
                {activeTab !== "PRESETS" && activeTab !== "ROUTINES" && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeaderTitle}>
                                {activeTab === "FAVORITES" ? "BOOKMARKED FAVORITES" : activeTab === "EFFECTIVE" ? "MAXIMUM ROI MOVEMENTS" : activeTab === "MAX_REPS" ? "HIGH VOLUME & PUMP MOVEMENTS" : "EXERCISE PROTOCOL CATALOG"}
                            </Text>
                            <Text style={styles.sectionHeaderCount}>{filteredExercises.length} MOVEMENTS</Text>
                        </View>

                        {filteredExercises.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="barbell-outline" size={32} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyTitle}>NO MOVEMENTS FOUND</Text>
                                <Text style={styles.emptySub}>Try adjusting your search query or filter categories.</Text>
                            </View>
                        ) : (
                            filteredExercises.map((ex, index) => {
                                const isSelected = selected.has(ex.name);
                                const isFav = favorites.has(ex.name);
                                const pr = prRecords[ex.name];
                                const suggested = getSuggestedWeight(ex.name);
                                const muscleColor = getMuscleColor(ex.muscleGroup);

                                return (
                                    <ExerciseSelectCard
                                        key={ex.name}
                                        ex={ex}
                                        index={index}
                                        isSelected={isSelected}
                                        isFav={isFav}
                                        pr={pr}
                                        suggestedWeight={suggested}
                                        muscleColor={muscleColor}
                                        onToggleSelect={() => toggleSelect(ex.name)}
                                        onToggleFavorite={() => toggleFavorite(ex.name)}
                                    />
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* ── 3. Bottom Floating Selection Dock ── */}
            {selected.size > 0 && (
                <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) + 6 }]}>
                    <LinearGradient
                        colors={["rgba(18, 18, 24, 0.98)", "rgba(10, 10, 12, 1)"]}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Stats Summary Bar */}
                    <View style={styles.dockStatsRow}>
                        <View style={styles.dockStatItem}>
                            <Ionicons name="barbell" size={13} color={COLORS.primary} />
                            <Text style={styles.dockStatVal}>{selected.size} MOVEMENTS</Text>
                        </View>
                        <View style={styles.dockDivider} />
                        <View style={styles.dockStatItem}>
                            <Ionicons name="time-outline" size={13} color={COLORS.accent} />
                            <Text style={styles.dockStatVal}>~{estimatedDuration} MIN</Text>
                        </View>
                        <View style={styles.dockDivider} />
                        <View style={styles.dockStatItem}>
                            <Ionicons name="flame-outline" size={13} color="#FF9500" />
                            <Text style={styles.dockStatVal}>~{estimatedKcal} KCAL</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.dockClearBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelected(new Set());
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Text style={styles.dockClearText}>CLEAR</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.dockActionsRow}>
                        <TouchableOpacity
                            style={styles.dockSaveBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSaveModalVisible(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="bookmark-outline" size={15} color={COLORS.text} />
                            <Text style={styles.dockSaveBtnText}>SAVE ROUTINE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dockStartBtn}
                            onPress={handleStartWorkout}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#8B0000"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.dockStartBtnText}>START WORKOUT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ── 4. Save Custom Routine Modal ── */}
            <Modal visible={saveModalVisible} transparent animationType="slide" onRequestClose={() => setSaveModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            onPress={() => setSaveModalVisible(false)}
                            activeOpacity={1}
                        />
                        <View style={styles.modalSheet}>
                            <LinearGradient
                                colors={['rgba(28, 28, 36, 0.98)', 'rgba(14, 14, 18, 0.99)', 'rgba(8, 8, 10, 1)']}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.modalHandle} />

                            <View style={styles.modalHeaderRow}>
                                <View style={styles.modalIconBox}>
                                    <Ionicons name="bookmark" size={18} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>SAVE CUSTOM ROUTINE</Text>
                                    <Text style={styles.modalSub}>{selected.size} MOVEMENTS SELECTED</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSaveModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close" size={18} color={COLORS.textSub} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>ROUTINE NAME</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. Heavy Chest & Triceps, Arm Pump..."
                                placeholderTextColor={COLORS.textMuted}
                                value={routineTitle}
                                onChangeText={setRoutineTitle}
                                returnKeyType="done"
                                onSubmitEditing={handleSaveRoutine}
                                autoFocus
                            />

                            <TouchableOpacity
                                style={[styles.modalActionBtn, !routineTitle.trim() && { opacity: 0.5 }]}
                                onPress={handleSaveRoutine}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, "#8B0000"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.modalActionBtnText}>SAVE TO MY ROUTINES</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ── Component: Exercise Select Card ──
function ExerciseSelectCard({
    ex,
    index,
    isSelected,
    isFav,
    pr,
    suggestedWeight,
    muscleColor,
    onToggleSelect,
    onToggleFavorite,
}) {
    return (
        <TouchableOpacity
            style={[styles.exCard, isSelected && styles.exCardSelected]}
            onPress={onToggleSelect}
            activeOpacity={0.78}
        >
            {/* Checkbox / Selector Box */}
            <View style={[styles.checkboxBox, isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                {isSelected ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                    <Text style={styles.checkboxNum}>{String(index + 1).padStart(2, '0')}</Text>
                )}
            </View>

            {/* Exercise Info */}
            <View style={styles.exCardInfo}>
                <View style={styles.exCardTopRow}>
                    <View style={[styles.muscleBadge, { backgroundColor: `${muscleColor}1A`, borderColor: `${muscleColor}4D` }]}>
                        <Text style={[styles.muscleBadgeText, { color: muscleColor }]}>
                            {(ex.primaryTarget || ex.muscleGroup).toUpperCase()}
                        </Text>
                    </View>
                    {ex.isCompound && (
                        <View style={styles.tierBadgeCompound}>
                            <Text style={styles.tierBadgeTextCompound}>⚡ COMPOUND</Text>
                        </View>
                    )}
                    {ex.isMaxReps && (
                        <View style={styles.tierBadgePump}>
                            <Text style={styles.tierBadgeTextPump}>🔥 MAX REPS</Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.exCardName, isSelected && { color: "#FFFFFF" }]} numberOfLines={1}>
                    {ex.name}
                </Text>

                <View style={styles.exCardMetaRow}>
                    <Text style={styles.exCardMetaText}>
                        {ex.sets} sets · {ex.type === "reps" ? `${ex.reps || 12} reps` : `${ex.activeTimeSec}s`} · {ex.restTimeSec}s rest
                    </Text>
                </View>

                {/* PR or Suggested Load Callout */}
                <View style={styles.exCardFooterRow}>
                    {pr && pr.maxWeightKg > 0 ? (
                        <View style={styles.prBadge}>
                            <Ionicons name="trophy" size={10} color={COLORS.primary} style={{ marginRight: 4 }} />
                            <Text style={styles.prBadgeText}>
                                PR: {pr.maxWeightKg}kg × {pr.maxReps || 1} reps
                            </Text>
                        </View>
                    ) : suggestedWeight ? (
                        <View style={styles.suggestedBadge}>
                            <Ionicons name="trending-up" size={10} color={COLORS.accent} style={{ marginRight: 4 }} />
                            <Text style={styles.suggestedBadgeText}>
                                Target: {suggestedWeight}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>

            {/* Favorite Star Button */}
            <TouchableOpacity
                style={styles.favoriteBtn}
                onPress={onToggleFavorite}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons
                    name={isFav ? "star" : "star-outline"}
                    size={18}
                    color={isFav ? "#FF9500" : COLORS.textMuted}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ── Component: Preset Pack Card ──
function PresetPackCard({ pack, onApply }) {
    return (
        <View style={styles.packCard}>
            <View style={styles.packHeaderRow}>
                <View style={styles.packTagBadge}>
                    <Text style={styles.packTagBadgeText}>{pack.tag}</Text>
                </View>
                <View style={styles.packMetaBadge}>
                    <Ionicons name="time-outline" size={11} color={COLORS.textSub} style={{ marginRight: 4 }} />
                    <Text style={styles.packMetaBadgeText}>{pack.durationMin} MIN · 🔥 {pack.calories} KCAL</Text>
                </View>
            </View>

            <Text style={styles.packTitle}>{pack.title}</Text>
            <Text style={styles.packSub}>{pack.subtitle}</Text>

            <View style={styles.packExercisesList}>
                {pack.exerciseNames.map((name, i) => (
                    <View key={i} style={styles.packExItem}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.packExText}>{name}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.packApplyBtn} onPress={onApply} activeOpacity={0.85}>
                <LinearGradient
                    colors={[COLORS.primary, "#8B0000"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                <Ionicons name="flash" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.packApplyBtnText}>LOAD PROTOCOL ({pack.exerciseNames.length} MOVEMENTS)</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Component: Routine Card (Replaced Blueprint) ──
function RoutineCard({ routine, onApply, onDelete }) {
    return (
        <View style={styles.packCard}>
            <View style={styles.packHeaderRow}>
                <View style={[styles.packTagBadge, { borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.06)" }]}>
                    <Text style={[styles.packTagBadgeText, { color: "#FFFFFF" }]}>CUSTOM ROUTINE</Text>
                </View>
                <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
            </View>

            <Text style={styles.packTitle}>{routine.title}</Text>
            <Text style={styles.packSub}>{routine.exerciseCount || routine.exerciseNames.length} Custom Movements Configured</Text>

            <View style={styles.packExercisesList}>
                {routine.exerciseNames.map((name, i) => (
                    <View key={i} style={styles.packExItem}>
                        <Ionicons name="barbell-outline" size={12} color={COLORS.textSub} style={{ marginRight: 6 }} />
                        <Text style={styles.packExText}>{name}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity style={styles.packApplyBtn} onPress={onApply} activeOpacity={0.85}>
                <LinearGradient
                    colors={[COLORS.primary, "#8B0000"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.packApplyBtnText}>SELECT & LAUNCH ROUTINE</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },

    // Top Fixed Control Deck
    topControlDeck: {
        backgroundColor: COLORS.bg,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
        zIndex: 10,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerCenter: {
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 15,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginTop: 1,
    },
    countBadge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    countBadgeActive: {
        backgroundColor: "rgba(227, 30, 36, 0.15)",
        borderColor: "rgba(227, 30, 36, 0.4)",
    },
    countBadgeText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    countBadgeTextActive: {
        color: "#FFFFFF",
    },

    // Status Banner
    statusBanner: {
        marginHorizontal: 20,
        marginBottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(48, 209, 88, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(48, 209, 88, 0.3)",
        flexDirection: "row",
        alignItems: "center",
    },
    statusBannerText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: "#30D158",
        letterSpacing: 0.5,
    },

    // Search Section
    searchSection: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 38,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: "#FFFFFF",
        paddingVertical: 0,
    },

    // Smart Curation Tabs
    tabsSection: {
        marginBottom: 8,
    },
    tabsContent: {
        paddingHorizontal: 20,
        gap: 6,
    },
    tabChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    tabChipActive: {
        backgroundColor: "rgba(227, 30, 36, 0.16)",
        borderColor: "rgba(227, 30, 36, 0.45)",
    },
    tabChipText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    tabChipTextActive: {
        color: "#FFFFFF",
    },

    // Muscle Filter
    muscleFilterSection: {
        marginBottom: 8,
    },
    muscleFilterContent: {
        paddingHorizontal: 20,
        gap: 5,
    },
    muscleChip: {
        paddingHorizontal: 9,
        paddingVertical: 3.5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
    },
    muscleChipActive: {
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderColor: "rgba(255, 255, 255, 0.25)",
    },
    muscleChipText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    muscleChipTextActive: {
        color: "#FFFFFF",
    },

    // Main Section
    sectionContainer: {
        gap: 8,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    sectionHeaderTitle: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 1.2,
    },
    sectionHeaderCount: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
    },

    quickSaveRoutineBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(227, 30, 36, 0.1)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
        marginBottom: 6,
    },
    quickSaveRoutineText: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },

    // Exercise Card
    exCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(22, 22, 28, 0.8)",
        borderRadius: 16,
        padding: 13,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        gap: 12,
        marginBottom: 8,
    },
    exCardSelected: {
        borderColor: "rgba(227, 30, 36, 0.4)",
        backgroundColor: "rgba(227, 30, 36, 0.07)",
    },
    checkboxBox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    checkboxNum: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
    },
    exCardInfo: {
        flex: 1,
    },
    exCardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
    },
    muscleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        borderWidth: 0.5,
    },
    muscleBadgeText: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.5,
    },
    tierBadgeCompound: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(255, 149, 0, 0.12)",
        borderWidth: 0.5,
        borderColor: "rgba(255, 149, 0, 0.35)",
    },
    tierBadgeTextCompound: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: "#FF9500",
        letterSpacing: 0.5,
    },
    tierBadgePump: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 0.5,
        borderColor: "rgba(227, 30, 36, 0.35)",
    },
    tierBadgeTextPump: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    exCardName: {
        fontSize: 13.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: -0.2,
    },
    exCardMetaRow: {
        marginTop: 2,
    },
    exCardMetaText: {
        fontSize: 10,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
    },
    exCardFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 5,
    },
    prBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(227, 30, 36, 0.1)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        borderWidth: 0.5,
        borderColor: "rgba(227, 30, 36, 0.25)",
    },
    prBadgeText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    suggestedBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    suggestedBadgeText: {
        fontSize: 8.5,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
    favoriteBtn: {
        padding: 6,
    },

    // Preset & Routine Cards
    packCard: {
        backgroundColor: "rgba(22, 22, 28, 0.9)",
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.09)",
        marginBottom: 10,
    },
    packHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    packTagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
    },
    packTagBadgeText: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.8,
    },
    packMetaBadge: {
        flexDirection: "row",
        alignItems: "center",
    },
    packMetaBadgeText: {
        fontSize: 9,
        fontFamily: FAMILY.mono,
        color: COLORS.textSub,
    },
    packTitle: {
        fontSize: 14.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    packSub: {
        fontSize: 10.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        marginBottom: 10,
    },
    packExercisesList: {
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        borderRadius: 10,
        padding: 8,
        gap: 5,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    packExItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    packExText: {
        fontSize: 10.5,
        fontFamily: FAMILY.medium,
        color: "#C5C2BB",
    },
    packApplyBtn: {
        height: 40,
        borderRadius: RADIUS.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    packApplyBtnText: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },

    // Empty State
    emptyCard: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(22, 22, 28, 0.5)",
        borderRadius: 16,
        padding: 28,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        marginTop: 10,
    },
    emptyTitle: {
        fontSize: 12.5,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 10.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 15,
    },
    emptyActionBtn: {
        marginTop: 14,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
    },
    emptyActionBtnText: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },

    // Bottom Selection Dock
    bottomDock: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.14)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    dockStatsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    dockStatItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    dockStatVal: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    dockDivider: {
        width: 1,
        height: 12,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        marginHorizontal: 8,
    },
    dockClearBtn: {
        marginLeft: "auto",
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    dockClearText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    dockActionsRow: {
        flexDirection: "row",
        gap: 10,
    },
    dockSaveBtn: {
        flex: 1,
        height: 46,
        borderRadius: RADIUS.pill,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
    },
    dockSaveBtnText: {
        fontSize: 10.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    dockStartBtn: {
        flex: 1.4,
        height: 46,
        borderRadius: RADIUS.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    dockStartBtnText: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },

    // Save Routine Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: "#16161D",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 36,
        borderWidth: 1.2,
        borderColor: "rgba(255, 255, 255, 0.16)",
        borderBottomWidth: 0,
        overflow: "hidden",
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignSelf: "center",
        marginBottom: 16,
    },
    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 18,
    },
    modalIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(227, 30, 36, 0.15)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.35)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalTitle: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    modalSub: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    inputLabel: {
        fontSize: 9.5,
        fontFamily: FAMILY.bold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 8,
    },
    modalInput: {
        height: 46,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingHorizontal: 16,
        color: "#FFFFFF",
        fontSize: 13,
        fontFamily: FAMILY.medium,
        marginBottom: 18,
    },
    modalActionBtn: {
        height: 46,
        borderRadius: RADIUS.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        overflow: "hidden",
    },
    modalActionBtnText: {
        fontSize: 11.5,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1,
    },
});
