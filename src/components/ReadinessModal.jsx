import React, { useState, useEffect } from "react";
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    Dimensions, ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, RADIUS, FAMILY, SPACING } from "../utils/theme";
import { saveDailyReadiness, getTodayReadiness } from "../utils/storage";

const { width } = Dimensions.get("window");

const READINESS_METRICS = [
    {
        key: "energy",
        label: "ENERGY LEVEL",
        icon: "flash-outline",
        desc: "Physical energy & alertness",
        options: [
            { val: 1, label: "Drained" },
            { val: 2, label: "Low" },
            { val: 3, label: "Moderate" },
            { val: 4, label: "High" },
            { val: 5, label: "Peak" },
        ],
    },
    {
        key: "sleep",
        label: "SLEEP QUALITY",
        icon: "moon-outline",
        desc: "Restfulness & duration",
        options: [
            { val: 1, label: "Poor" },
            { val: 2, label: "Subpar" },
            { val: 3, label: "Fair" },
            { val: 4, label: "Good" },
            { val: 5, label: "Optimal" },
        ],
    },
    {
        key: "soreness",
        label: "MUSCLE RECOVERY",
        icon: "body-outline",
        desc: "Absence of acute soreness",
        options: [
            { val: 1, label: "Severe" },
            { val: 2, label: "Moderate" },
            { val: 3, label: "Mild" },
            { val: 4, label: "Minimal" },
            { val: 5, label: "Fresh" },
        ],
    },
    {
        key: "motivation",
        label: "TRAINING DRIVE",
        icon: "flame-outline",
        desc: "Mental focus & drive",
        options: [
            { val: 1, label: "None" },
            { val: 2, label: "Low" },
            { val: 3, label: "Steady" },
            { val: 4, label: "High" },
            { val: 5, label: "Hyped" },
        ],
    },
];

export default function ReadinessModal({ visible, onClose, onSaved }) {
    const [ratings, setRatings] = useState({
        energy: 4,
        sleep: 4,
        soreness: 4,
        motivation: 4,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            (async () => {
                const todayLog = await getTodayReadiness();
                if (todayLog) {
                    setRatings({
                        energy: todayLog.energy || 4,
                        sleep: todayLog.sleep || 4,
                        soreness: todayLog.soreness || 4,
                        motivation: todayLog.motivation || 4,
                    });
                }
            })();
        }
    }, [visible]);

    const handleSelectRating = (key, val) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRatings(prev => ({ ...prev, [key]: val }));
    };

    const overallScore = Math.round(
        ((ratings.energy + ratings.sleep + ratings.soreness + ratings.motivation) / 20) * 100
    );

    const getScoreColor = (score) => {
        if (score >= 80) return "#00C853";
        if (score >= 60) return "#30B0C7";
        if (score >= 40) return "#FF9500";
        return "#FF5E3A";
    };

    const handleSave = async () => {
        setSaving(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated = await saveDailyReadiness(ratings);
        setSaving(false);
        if (onSaved) onSaved(updated);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={["#161618", "#0E0E10"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View>
                            <View style={styles.tagRow}>
                                <View style={styles.tagDot} />
                                <Text style={styles.tagText}>SUBJECTIVE READINESS</Text>
                            </View>
                            <Text style={styles.title}>DAILY RECOVERY LOG</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={18} color={COLORS.textSub} />
                        </TouchableOpacity>
                    </View>

                    {/* Overall Score Badge Banner */}
                    <View style={styles.scoreBanner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.scoreLabel}>SELF-REPORTED READINESS SCORE</Text>
                            <Text style={[styles.scoreValue, { color: getScoreColor(overallScore) }]}>
                                {overallScore}%
                            </Text>
                            <Text style={styles.scoreSub}>
                                {overallScore >= 80
                                    ? "Peak recovery reported · Full capacity for heavy loading."
                                    : overallScore >= 60
                                    ? "Good training capacity · Proceed with scheduled session."
                                    : overallScore >= 40
                                    ? "Moderate fatigue noted · Warm up thoroughly."
                                    : "High fatigue · Consider reduced accessory volume today."}
                            </Text>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.metricsScroll}>
                        {READINESS_METRICS.map((metric) => {
                            const currentVal = ratings[metric.key];
                            return (
                                <View key={metric.key} style={styles.metricBlock}>
                                    <View style={styles.metricHeader}>
                                        <Ionicons name={metric.icon} size={14} color={COLORS.primary} />
                                        <Text style={styles.metricLabel}>{metric.label}</Text>
                                        <Text style={styles.metricDesc}>· {metric.desc}</Text>
                                    </View>

                                    <View style={styles.ratingRow}>
                                        {metric.options.map((opt) => {
                                            const isSelected = currentVal === opt.val;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.val}
                                                    style={[
                                                        styles.ratingBtn,
                                                        isSelected && styles.ratingBtnActive,
                                                    ]}
                                                    onPress={() => handleSelectRating(metric.key, opt.val)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.ratingNum,
                                                            isSelected && styles.ratingNumActive,
                                                        ]}
                                                    >
                                                        {opt.val}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.ratingText,
                                                            isSelected && styles.ratingTextActive,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                        <View style={{ height: 16 }} />
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#A31015"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <Text style={styles.saveBtnText}>
                                {saving ? "SAVING..." : "CONFIRM READINESS"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        width: "100%",
        maxHeight: "85%",
        backgroundColor: "#161618",
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingTop: 20,
        paddingHorizontal: SPACING.base,
        paddingBottom: 30,
        overflow: "hidden",
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    tagRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 2,
    },
    tagDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    tagText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 1.2,
    },
    title: {
        fontSize: 20,
        fontFamily: FAMILY.accent2,
        color: COLORS.text,
        letterSpacing: 0.5,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
    },
    scoreBanner: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: RADIUS.md,
        padding: 14,
        marginBottom: 16,
    },
    scoreLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: 28,
        fontFamily: FAMILY.monoBold,
        marginVertical: 2,
    },
    scoreSub: {
        fontSize: 11,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 15,
    },
    metricsScroll: {
        maxHeight: 340,
    },
    metricBlock: {
        marginBottom: 16,
    },
    metricHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    metricLabel: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.text,
        letterSpacing: 0.8,
    },
    metricDesc: {
        fontSize: 10.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
    },
    ratingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
    },
    ratingBtn: {
        flex: 1,
        backgroundColor: COLORS.bgCard,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.sm,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    ratingBtnActive: {
        backgroundColor: "rgba(227, 30, 36, 0.15)",
        borderColor: COLORS.primary,
    },
    ratingNum: {
        fontSize: 14,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSub,
    },
    ratingNumActive: {
        color: COLORS.primary,
    },
    ratingText: {
        fontSize: 8.5,
        fontFamily: FAMILY.regular,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    ratingTextActive: {
        color: COLORS.text,
        fontFamily: FAMILY.bold,
    },
    footer: {
        marginTop: 10,
    },
    saveBtn: {
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    saveBtnText: {
        fontSize: 13,
        fontFamily: FAMILY.bold,
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },
});
