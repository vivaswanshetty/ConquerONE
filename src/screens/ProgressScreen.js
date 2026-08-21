import React, { useState, useCallback, useRef, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    TextInput, StatusBar, Dimensions, Animated, KeyboardAvoidingView, Platform,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
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
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    labelBox: { flexDirection: "row", alignItems: "center", gap: 8 },
    indicator: { width: 3, height: 12, borderRadius: 1.5 },
    label: { fontSize: 11, fontFamily: FAMILY.semibold, color: COLORS.textSub },
    trendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg },
    trendText: { fontSize: 10, fontFamily: FAMILY.monoBold },
    empty: { height: 90, alignItems: "center", justifyContent: "center" },
    emptyText: { fontSize: 11, color: COLORS.textMuted, fontFamily: FAMILY.regular },
});

/* ── Input Row ─────────────────────────────────────────────────── */
function StatInput({ label, unit, value, onChangeText }) {
    return (
        <View style={si.row}>
            <Text style={si.label}>{label}</Text>
            <View style={si.inputWrap}>
                <TextInput
                    style={si.input}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={COLORS.textMuted}
                    returnKeyType="done"
                />
                <Text style={si.unit}>{unit}</Text>
            </View>
        </View>
    );
}

const si = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    label: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textSub },
    inputWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    input: {
        fontSize: 14, fontFamily: FAMILY.monoBold, color: COLORS.text,
        textAlign: "right", padding: 0, minWidth: 40
    },
    unit: { fontSize: 10, color: COLORS.textMuted, fontFamily: FAMILY.mono, width: 24 },
});

/* ── PR Card ────────────────────────────────────────────────────── */
function PRRow({ name, record, weightUnit }) {
    const date = new Date(record.date);
    const dateStr = date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return (
        <View style={pr.row}>
            <View style={pr.indicator} />
            <View style={pr.info}>
                <Text style={pr.name} numberOfLines={1}>{name}</Text>
                <Text style={pr.date}>{dateStr}</Text>
            </View>
            <View style={pr.valWrap}>
                <Text style={pr.val}>{displayWeight(record.weightKg, weightUnit)}</Text>
                {record.reps > 0 && (
                    <Text style={pr.repVal}>{record.reps} reps</Text>
                )}
            </View>
        </View>
    );
}

const pr = StyleSheet.create({
    row: {
        flexDirection: "row", alignItems: "center",
        paddingVertical: 14, paddingHorizontal: 18,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
        gap: 12,
    },
    indicator: { width: 3, height: 20, borderRadius: 1.5, backgroundColor: COLORS.accent },
    info: { flex: 1 },
    name: { fontSize: 13, fontFamily: FAMILY.semibold, color: COLORS.text },
    date: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontFamily: FAMILY.mono },
    valWrap: { alignItems: "flex-end" },
    val: { fontSize: 15, fontFamily: FAMILY.monoBold, color: COLORS.text },
    repVal: { fontSize: 10, fontFamily: FAMILY.mono, color: COLORS.textSub, marginTop: 2 },
});

/* ── TABS ─────────────────────────────────────────────────────── */
const TABS = ["Body Stats", "Performance"];
const STAT_FIELDS = [
    { key: "weightKg", label: "Body Weight", unit: "kg", color: COLORS.accent },
    { key: "chest", label: "Chest", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "waist", label: "Waist", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "hips", label: "Hips", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "arms", label: "Arms", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
    { key: "thighs", label: "Thighs", unit: "cm", color: "rgba(237, 234, 227, 0.4)" },
];

/* ── MAIN ──────────────────────────────────────────────────────── */
export default function ProgressScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
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
            const latest = stats[0];
            setForm({
                weightKg: latest.weightKg != null ? String(latest.weightKg) : "",
                chest: latest.chest != null ? String(latest.chest) : "",
                waist: latest.waist != null ? String(latest.waist) : "",
                hips: latest.hips != null ? String(latest.hips) : "",
                arms: latest.arms != null ? String(latest.arms) : "",
                thighs: latest.thighs != null ? String(latest.thighs) : "",
            });
        }
    };

    const handleSave = async () => {
        const parsed = {};
        let hasAny = false;
        Object.entries(form).forEach(([k, v]) => {
            const num = parseFloat(v);
            if (!isNaN(num)) {
                parsed[k] = num;
                hasAny = true;
            }
        });
        if (!hasAny) {
            showDialog("Input Required", "Please enter at least one metric to save.");
            return;
        }
        setSaving(true);
        await saveBodyStat(parsed);
        setSaving(false);
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]).start();
        load();
    };

    const chartData = (key) =>
        [...bodyStats]
            .reverse()
            .filter(s => s[key] != null)
            .map(s => ({ date: s.date, value: s[key] }));

    const prList = Object.entries(prRecords);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Progress</Text>
                    <Animated.View style={[styles.savedBadge, { opacity: flashAnim }]}>
                        <Text style={styles.savedText}>SAVED</Text>
                    </Animated.View>
                </View>

                {/* ── Tabs ── */}
                <View style={styles.tabs}>
                    {TABS.map((t, i) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.tab, tab === i && styles.tabActive]}
                            onPress={() => setTab(i)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {tab === 0 ? (
                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode="never" contentContainerStyle={{ paddingBottom: 60 }}>
                        {/* Weight chart */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionLabel}>WEIGHT TREND</Text>
                        </View>
                        <View style={styles.card}>
                            <MiniChart
                                data={chartData("weightKg")}
                                color={COLORS.accent}
                                label="Weight"
                            />
                        </View>

                        {/* Measurements entry */}
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
                                style={styles.saveBtn}
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Today's Stats"}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* History table */}
                        {bodyStats.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionLabel}>RECENT LOGS</Text>
                                </View>
                                <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
                                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                        <Text style={[styles.tableCell, styles.tableHeader, { flex: 1.4, textAlign: "left" }]}>DATE</Text>
                                        {STAT_FIELDS.slice(0, 3).map(f => (
                                            <Text key={f.key} style={[styles.tableCell, styles.tableHeader]}>{f.label.split(" ")[0]}</Text>
                                        ))}
                                    </View>
                                    {bodyStats.slice(0, 10).map((s, i) => (
                                        <View key={i} style={[styles.tableRow, i < bodyStats.length - 1 && styles.tableBorder]}>
                                            <Text style={[styles.tableCell, styles.tableDateCell]}>
                                                {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" })}
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
                                    <Ionicons name="trophy-outline" size={32} color={COLORS.textMuted} />
                                </View>
                                <Text style={styles.emptyTitle}>No Records Yet</Text>
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
        paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.bgCard,
        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border,
    },
    headerTitle: { fontSize: 24, fontFamily: FAMILY.display, color: COLORS.text, letterSpacing: -0.5 },
    savedBadge: { backgroundColor: "rgba(237, 234, 227, 0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
    savedText: { fontSize: 9, fontFamily: FAMILY.monoBold, color: COLORS.text },

    tabs: {
        flexDirection: "row", paddingHorizontal: 20,
        gap: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    tab: { paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.text },
    tabText: { fontSize: 12, fontFamily: FAMILY.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.text, fontFamily: FAMILY.semibold },

    sectionHeader: { paddingHorizontal: 20, marginTop: 32, marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontFamily: FAMILY.semibold, color: COLORS.textMuted, letterSpacing: 1.5 },
    card: {
        marginHorizontal: 20, backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLORS.border,
        padding: 18,
    },
    saveBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.card,
        paddingVertical: 14, alignItems: "center", marginTop: 20,
    },
    saveBtnText: { fontSize: 13, fontFamily: FAMILY.semibold, color: COLORS.text, letterSpacing: 0.5 },

    tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12 },
    tableHeaderRow: { backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tableCell: { flex: 1, textAlign: "center" },
    tableHeader: { fontSize: 10, fontFamily: FAMILY.semibold, color: COLORS.textMuted },
    tableDateCell: { flex: 1.4, color: COLORS.textSub, fontFamily: FAMILY.mono, fontSize: 10 },
    tableValueCell: { flex: 1, fontSize: 12, fontFamily: FAMILY.monoBold, color: COLORS.text, textAlign: "center" },

    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
    emptyIcon: { width: 64, height: 64, borderRadius: RADIUS.pill, backgroundColor: COLORS.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    emptyTitle: { fontSize: 14, fontFamily: FAMILY.semibold, color: COLORS.text, marginBottom: 6 },
    emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: "center", lineHeight: 18, fontFamily: FAMILY.regular },
});
