import React, { useState, useCallback, useRef, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, StatusBar, Dimensions, Animated, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Svg, { Polyline, Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONTS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import { getBodyStats, saveBodyStat, getPRRecords } from "../utils/storage";
import { getSettings, displayWeight } from "../utils/settings";

const { width } = Dimensions.get("window");
const CHART_W = width - 48;
const CHART_H = 120;

/* ── Mini Line Chart ──────────────────────────────────────────── */
function MiniChart({ data, color = COLORS.accent, label }) {
    if (!data || data.length < 2) {
        return (
            <View style={mc.empty}>
                <Ionicons name="bar-chart-outline" size={20} color="rgba(255,255,255,0.1)" style={{ marginBottom: 12 }} />
                <Text style={mc.emptyText}>Track workouts to generate analytics</Text>
            </View>
        );
    }
    const values = data.map(d => d.value);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal || 1;

    const pts = data.map((d, i) => ({
        x: (i / (data.length - 1)) * CHART_W,
        y: CHART_H - ((d.value - minVal) / range) * CHART_H * 0.7,
        ...d,
    }));

    const polyPoints = pts.map(p => `${p.x},${p.y}`).join(" ");
    const areaPath =
        `M${pts[0].x},${CHART_H} ` +
        pts.map(p => `L${p.x},${p.y}`).join(" ") +
        ` L${pts[pts.length - 1].x},${CHART_H} Z`;

    const trend = values[values.length - 1] - values[0];

    return (
        <View style={mc.wrap}>
            <View style={mc.header}>
                <View style={mc.labelBox}>
                    <View style={[mc.indicator, { backgroundColor: color }]} />
                    <Text style={mc.label}>{label?.toUpperCase()}</Text>
                </View>
                <View style={[mc.trendBadge, { backgroundColor: "rgba(255,255,255,0.03)" }]}>
                    <Text style={[mc.trendText, { color: trend >= 0 ? "#A0A0A0" : COLORS.accent }]}>
                        {trend >= 0 ? "+" : ""}{trend.toFixed(1)}
                    </Text>
                </View>
            </View>
            <Svg width={CHART_W} height={CHART_H + 20}>
                <Defs>
                    <SvgGradient id={`grad_${label}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.15" />
                        <Stop offset="1" stopColor={color} stopOpacity="0.0" />
                    </SvgGradient>
                </Defs>
                <Path d={areaPath} fill={`url(#grad_${label})`} />
                <Polyline
                    points={polyPoints}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={color} />
            </Svg>
        </View>
    );
}

const mc = StyleSheet.create({
    wrap: { paddingTop: 4 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    labelBox: { flexDirection: "row", alignItems: "center", gap: 10 },
    indicator: { width: 3, height: 14, borderRadius: 1.5 },
    label: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 2 },
    trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    trendText: { fontSize: 10, fontFamily: FAMILY.bold, letterSpacing: 0.5 },
    empty: { height: 100, alignItems: "center", justifyContent: "center" },
    emptyText: { fontSize: 11, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 1 },
});

/* ── Input Row ─────────────────────────────────────────────────── */
function StatInput({ label, unit, value, onChangeText }) {
    return (
        <View style={si.row}>
            <Text style={si.label}>{label.toUpperCase()}</Text>
            <View style={si.inputWrap}>
                <TextInput
                    style={si.input}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor="rgba(255,255,255,0.1)"
                    returnKeyType="done"
                />
                <Text style={si.unit}>{unit.toUpperCase()}</Text>
            </View>
        </View>
    );
}

const si = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)",
    },
    label: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
    input: {
        fontSize: 14, fontFamily: FAMILY.bold, color: COLORS.text,
        textAlign: "right", padding: 0, minWidth: 40
    },
    unit: { fontSize: 8, color: COLORS.textMuted, fontFamily: FAMILY.bold, letterSpacing: 1, width: 20 },
});

/* ── PR Card ────────────────────────────────────────────────────── */
function PRRow({ name, record, weightUnit }) {
    const date = new Date(record.date);
    const dateStr = date.toLocaleDateString("en-US", { day: "numeric", month: "short" }).toUpperCase();
    return (
        <View style={pr.row}>
            <View style={pr.indicator} />
            <View style={pr.info}>
                <Text style={pr.name} numberOfLines={1}>{name.toUpperCase()}</Text>
                <Text style={pr.date}>{dateStr}</Text>
            </View>
            <View style={pr.valWrap}>
                <Text style={pr.val}>{displayWeight(record.weightKg, weightUnit)}</Text>
                {record.reps > 0 && (
                    <Text style={pr.repVal}>{record.reps} REPS</Text>
                )}
            </View>
        </View>
    );
}

const pr = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 18, paddingHorizontal: 24,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)",
        gap: 16,
    },
    indicator: { width: 3, height: 24, borderRadius: 1.5, backgroundColor: COLORS.primary, opacity: 0.6 },
    info: { flex: 1 },
    name: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 0.5 },
    date: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: FAMILY.bold, letterSpacing: 1.5 },
    valWrap: { alignItems: "flex-end" },
    val: { fontSize: 18, fontFamily: FAMILY.display, color: COLORS.primary, letterSpacing: -0.5 },
    repVal: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: 4 },
});

/* ── TABS ─────────────────────────────────────────────────────── */
const TABS = ["BODY STATS", "PERFORMANCE"];
const STAT_FIELDS = [
    { key: "weightKg", label: "Body Weight", unit: "kg", color: COLORS.accent },
    { key: "chest", label: "Chest", unit: "cm", color: "rgba(255,255,255,0.4)" },
    { key: "waist", label: "Waist", unit: "cm", color: "rgba(255,255,255,0.4)" },
    { key: "hips", label: "Hips", unit: "cm", color: "rgba(255,255,255,0.4)" },
    { key: "arms", label: "Arms", unit: "cm", color: "rgba(255,255,255,0.4)" },
    { key: "thighs", label: "Thighs", unit: "cm", color: "rgba(255,255,255,0.4)" },
];

/* ── MAIN ──────────────────────────────────────────────────────── */
export default function ProgressScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState(0);
    const [bodyStats, setBodyStats] = useState([]);
    const [prRecords, setPRRecords] = useState({});
    const [form, setForm] = useState({ weightKg: "", chest: "", waist: "", hips: "", arms: "", thighs: "" });
    const [settings, setSettings] = useState({ weightUnit: "kg" });
    const [saving, setSaving] = useState(false);
    const flashAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(useCallback(() => { load(); }, []));

    const load = async () => {
        const [stats, prs, s] = await Promise.all([
            getBodyStats(),
            getPRRecords(),
            getSettings(),
        ]);
        setBodyStats(stats);
        setPRRecords(prs);
        setSettings(s);
        if (stats.length > 0) {
            const today = new Date().toISOString().split("T")[0];
            const todayEntry = stats.find(s => s.date === today);
            if (todayEntry) {
                setForm({
                    weightKg: todayEntry.weightKg ? String(todayEntry.weightKg) : "",
                    chest: todayEntry.chest ? String(todayEntry.chest) : "",
                    waist: todayEntry.waist ? String(todayEntry.waist) : "",
                    hips: todayEntry.hips ? String(todayEntry.hips) : "",
                    arms: todayEntry.arms ? String(todayEntry.arms) : "",
                    thighs: todayEntry.thighs ? String(todayEntry.thighs) : "",
                });
            }
        }
    };

    const handleSave = async () => {
        const hasAny = Object.values(form).some(v => v.trim() !== "");
        if (!hasAny) {
            Alert.alert("INPUT REQUIRED", "Capture at least one tactical measurement.");
            return;
        }
        setSaving(true);
        const entry = {};
        STAT_FIELDS.forEach(f => {
            const val = parseFloat(form[f.key]);
            if (!isNaN(val) && val > 0) entry[f.key] = val;
        });
        const updated = await saveBodyStat(entry);
        setBodyStats(updated);
        setSaving(false);
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(1500),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const chartDataByKey = useMemo(() => {
        const reversed = [...bodyStats].reverse();
        return STAT_FIELDS.reduce((acc, field) => {
            acc[field.key] = reversed
                .filter((entry) => entry[field.key] != null)
                .map((entry) => ({
                    value: entry[field.key],
                    shortDate: new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" }),
                }));
            return acc;
        }, {});
    }, [bodyStats]);

    const prList = useMemo(() => Object.entries(prRecords)
        .sort((a, b) => (b[1].weightKg || 0) - (a[1].weightKg || 0)), [prRecords]);

    const saveOpacity = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>PROGRESS</Text>
                    <View style={{ width: 48, alignItems: "flex-end" }}>
                        <Animated.View style={[styles.savedBadge, { opacity: saveOpacity, backgroundColor: "rgba(227,30,36,0.1)" }]}>
                            <Text style={[styles.savedText, { color: COLORS.primary }]}>RECORDED</Text>
                        </Animated.View>
                    </View>
                </View>

                <View style={styles.tabs}>
                    {TABS.map((t, i) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.tab, tab === i && styles.tabActive]}
                            onPress={() => setTab(i)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {tab === 0 ? (
                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>LOG MEASUREMENTS</Text>
                        </View>
                        <View style={styles.card}>
                            {STAT_FIELDS.map(f => (
                                <StatInput
                                    key={f.key}
                                    label={f.label}
                                    unit={f.unit}
                                    value={form[f.key]}
                                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                                />
                            ))}
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: COLORS.primary }, saving && { opacity: 0.5 }]}
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.saveBtnText}>SAVE MEASUREMENTS</Text>
                            </TouchableOpacity>
                        </View>

                        {bodyStats.length >= 2 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionLabel}>TREND ANALYTICS</Text>
                                </View>
                                {STAT_FIELDS.map(f => {
                                    const data = chartDataByKey[f.key] || [];
                                    if (data.length < 2) return null;
                                    return (
                                        <View key={f.key} style={[styles.card, { marginBottom: 16 }]}>
                                            <MiniChart data={data} color={f.color} label={`${f.label} (${f.unit})`} />
                                        </View>
                                    );
                                })}
                            </>
                        )}

                        {bodyStats.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionLabel}>STAT HISTORY</Text>
                                </View>
                                <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
                                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                        <Text style={[styles.tableCell, styles.tableHeader, { flex: 1.4, textAlign: "left" }]}>DATE</Text>
                                        {STAT_FIELDS.slice(0, 3).map(f => (
                                            <Text key={f.key} style={[styles.tableCell, styles.tableHeader]}>{f.label.split(" ")[0].toUpperCase()}</Text>
                                        ))}
                                    </View>
                                    {bodyStats.slice(0, 10).map((s, i) => (
                                        <View key={i} style={[styles.tableRow, i < bodyStats.length - 1 && styles.tableBorder]}>
                                            <Text style={[styles.tableCell, styles.tableDateCell]}>
                                                {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" }).toUpperCase()}
                                            </Text>
                                            {STAT_FIELDS.slice(0, 3).map(f => (
                                                <Text key={f.key} style={styles.tableValueCell}>
                                                    {s[f.key] != null ? s[f.key].toFixed(1) : "—"}
                                                </Text>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: 60 }}>
                        {prList.length === 0 ? (
                            <View style={styles.empty}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="trophy-outline" size={40} color="rgba(255,255,255,0.05)" />
                                </View>
                                <Text style={styles.emptyTitle}>NO RECORDS YET</Text>
                                <Text style={styles.emptySub}>
                                    Log your metrics during workouts to track your performance.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionLabel}>ALL-TIME BESTS</Text>
                                </View>
                                <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
                                    {prList.map(([name, record]) => (
                                        <PRRow key={name} name={name} record={record} weightUnit={settings.weightUnit} />
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12,
    },
    backBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    headerTitle: { fontSize: 26, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: -1.2 },
    savedBadge: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    savedText: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.accent, letterSpacing: 1 },

    tabs: {
        flexDirection: "row", paddingHorizontal: 24, paddingVertical: 8,
        gap: 20, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)",
    },
    tab: { paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
    tabText: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2 },
    tabTextActive: { color: COLORS.text },

    sectionHeader: { paddingHorizontal: 24, marginTop: 48, marginBottom: 20 },
    sectionLabel: { fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 3 },
    card: {
        marginHorizontal: 20, backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 28, borderWidth: 1, borderColor: COLORS.border,
        padding: 24,
    },
    saveBtn: {
        backgroundColor: COLORS.text, borderRadius: 16,
        paddingVertical: 18, alignItems: "center", marginTop: 32,
    },
    saveBtnText: { fontSize: 12, fontFamily: FAMILY.bold, color: "#fff", letterSpacing: 2 },

    tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 18 },
    tableHeaderRow: { backgroundColor: "rgba(255,255,255,0.02)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
    tableBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
    tableCell: { flex: 1, textAlign: "center" },
    tableHeader: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1.5 },
    tableDateCell: { flex: 1.4, color: COLORS.textSub, fontFamily: FAMILY.bold, fontSize: 11, letterSpacing: 0.5 },
    tableValueCell: { flex: 1, fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, textAlign: "center" },

    empty: { alignItems: "center", paddingTop: 100, paddingHorizontal: 48 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.02)", alignItems: "center", justifyContent: "center", marginBottom: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
    emptyTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 2, marginBottom: 16 },
    emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 22, fontFamily: FAMILY.regular, opacity: 0.6 },
});
