import React, { useState } from "react";
import {
    View, Text, StyleSheet, StatusBar,
} from "react-native";
import { ScrollView, TouchableOpacity, FlatList } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { WORKOUT_PLAN } from "../data/workoutData";

// Flatten ALL exercises with their day
const ALL_EXERCISES = WORKOUT_PLAN.flatMap((day) =>
    day.exercises.map((ex) => ({ ...ex, dayTarget: day.target, dayNum: day.day }))
);

export default function CustomWorkoutScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [selected, setSelected] = useState(new Set());
    const [filterDay, setFilterDay] = useState(null);

    const toggle = (name) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const filtered = filterDay
        ? ALL_EXERCISES.filter((ex) => ex.dayNum === filterDay)
        : ALL_EXERCISES;

    const selectedExercises = ALL_EXERCISES.filter((ex) => selected.has(ex.name));

    const handleStart = () => {
        if (selected.size === 0) return;
        // Build a synthetic "day" object
        const customDay = {
            day: 0,
            target: "CUSTOM SESSION",
            dayName: "CUSTOM",
            exercises: selectedExercises,
            headerImage: selectedExercises[0]?.image,
            color: COLORS.accent,
            gradient: [COLORS.accent, "#A0A0A0"],
            emoji: "⚡",
        };
        navigation.navigate("ActiveWorkout", { day: customDay });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>CUSTOM</Text>
                <View style={[styles.countBadge, { opacity: selected.size > 0 ? 1 : 0.3 }]}>
                    <Text style={styles.headerCount}>{selected.size} READY</Text>
                </View>
            </View>

            <View style={styles.filterSection}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ key: '__all__', label: 'ALL UNITS', day: null }, ...WORKOUT_PLAN.map((d) => ({ key: String(d.day), label: d.target.toUpperCase(), day: d.day }))]}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={styles.filterRow}
                    renderItem={({ item }) => (
                        <FilterChip
                            label={item.label}
                            active={item.day === null ? filterDay === null : filterDay === item.day}
                            onPress={() => setFilterDay(item.day === null ? null : (item.day === filterDay ? null : item.day))}
                        />
                    )}
                    style={{ flexGrow: 0 }}
                    overScrollMode="never"
                />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16 }}>
                <View style={styles.list}>
                    {filtered.map((ex, i) => {
                        const on = selected.has(ex.name);
                        return (
                            <TouchableOpacity
                                key={`${ex.name}-${i}`}
                                style={[styles.exRow, i < filtered.length - 1 && styles.exRowBorder, on && styles.exRowOn]}
                                onPress={() => toggle(ex.name)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.exInfo}>
                                    <Text style={[styles.exName, on && { color: COLORS.accent }]}>{ex.name.toUpperCase()}</Text>
                                    <Text style={styles.exMeta}>{ex.dayTarget.toUpperCase()} · {ex.sets} SETS · {ex.activeTimeSec}S</Text>
                                </View>
                                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                                    {on && <Ionicons name="checkmark" size={14} color="#000" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ height: 160 }} />
            </ScrollView>

            {selected.size > 0 && (
                <View style={[styles.fab, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity style={styles.fabBtn} onPress={handleStart} activeOpacity={0.9}>
                        <Text style={styles.fabText}>START {selected.size}-DAY PLAN</Text>
                        <Ionicons name="play" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function FilterChip({ label, active, onPress }) {
    return (
        <TouchableOpacity
            style={[styles.chip, active && styles.chipActive]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
    },
    backBtn: {
        width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    headerTitle: { fontSize: 34, fontFamily: FAMILY.header, color: COLORS.text, letterSpacing: -1.5 },
    countBadge: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
    headerCount: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.accent, letterSpacing: 1 },

    filterSection: {
        height: 72,
        zIndex: 10,
        backgroundColor: COLORS.bg,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.03)"
    },
    filterRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
    chip: {
        paddingHorizontal: 18, paddingVertical: 10,
        borderRadius: RADIUS.sm, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.02)",
    },
    chipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
    chipText: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted, letterSpacing: 1.5 },
    chipTextActive: { color: "#000" },

    list: {
        marginHorizontal: 20, backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden",
    },
    exRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 24, paddingVertical: 22, gap: 16,
    },
    exRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
    exRowOn: { backgroundColor: "rgba(255,255,255,0.03)" },
    exInfo: { flex: 1 },
    exName: { fontSize: 13, fontFamily: FAMILY.semibold, color: COLORS.textSub, letterSpacing: 0.5 },
    exMeta: { fontSize: 9, fontFamily: FAMILY.mono, color: COLORS.textMuted, marginTop: 4, letterSpacing: 1.5 },
    checkbox: {
        width: 26, height: 26, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)",
        alignItems: "center", justifyContent: "center",
    },
    checkboxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },

    fab: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingTop: 20,
        borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)",
    },
    fabBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
        backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: RADIUS.lg,
    },
    fabText: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },
});
