import React, { useRef, useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, Modal,
    Dimensions, ScrollView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { COLORS, FAMILY, RADIUS, SPACING } from "../utils/theme";
import { formatDuration } from "../utils/storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Optimal 9:16 Instagram Story dimensions for captured snapshot
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 360);
const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9.6));

export default function WorkoutStoryShareModal({
    visible,
    onClose,
    workoutData = {},
    profile = null,
    rankTitle = "WARRIOR",
}) {
    const shotRef = useRef(null);
    const [isExporting, setIsExporting] = useState(false);

    const {
        title = "Workout Session",
        target = "General Fitness",
        durationSec = 3600,
        streak = 1,
        totalVolumeKg = 0,
        totalSets = 0,
        exercises = [],
        newPRs = [],
        date = new Date().toISOString(),
    } = workoutData || {};

    const displayName = profile?.fullName || "ATHLETE";

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).toUpperCase();

    const handleShare = async () => {
        try {
            if (!shotRef.current || !shotRef.current.capture) return;
            setIsExporting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const uri = await shotRef.current.capture();
            setIsExporting(false);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: "image/png",
                    dialogTitle: `CONQUER ONE - ${target}`,
                    UTI: "public.png",
                });
            }
        } catch (e) {
            setIsExporting(false);
            console.warn("Story share failed:", e);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                <View style={styles.sheet}>
                    {/* Top Handle */}
                    <View style={styles.handleBar} />

                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>STORY SHARE CARD</Text>
                            <Text style={styles.modalSub}>Ready for Instagram Stories & WhatsApp</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={20} color={COLORS.textSub} />
                        </TouchableOpacity>
                    </View>

                    {/* Card Preview Container */}
                    <ScrollView
                        contentContainerStyle={styles.cardScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.shotWrapper}>
                            <ViewShot
                                ref={shotRef}
                                options={{ format: "png", quality: 1, result: "tmpfile" }}
                            >
                                <View style={styles.storyCard} collapsable={false}>
                                    {/* Liquid Stealth Background */}
                                    <LinearGradient
                                        colors={["#1B1B22", "#0E0E12", "#050508"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0.3, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />

                                    {/* Top Gloss Highlight */}
                                    <LinearGradient
                                        colors={["rgba(255, 255, 255, 0.16)", "rgba(255, 255, 255, 0.02)", "transparent"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.topGloss}
                                        pointerEvents="none"
                                    />

                                    {/* Card Header: Brand & Athlete */}
                                    <View style={styles.brandRow}>
                                        <View style={styles.brandBadge}>
                                            <View style={styles.brandDot} />
                                            <Text style={styles.brandText}>CONQUER ONE</Text>
                                        </View>
                                        <View style={styles.rankBadge}>
                                            <Ionicons name="shield" size={10} color="#FF9500" style={{ marginRight: 3 }} />
                                            <Text style={styles.rankText}>{rankTitle}</Text>
                                        </View>
                                    </View>

                                    {/* Athlete & Target Banner */}
                                    <View style={styles.heroTargetBox}>
                                        <Text style={styles.athleteName}>{displayName.toUpperCase()}</Text>
                                        <Text style={styles.targetName} numberOfLines={2}>
                                            {target.toUpperCase()}
                                        </Text>
                                        <Text style={styles.dateText}>{formattedDate}</Text>
                                    </View>

                                    {/* Core Metrics Grid */}
                                    <View style={styles.metricsGrid}>
                                        <View style={styles.metricCell}>
                                            <Text style={styles.metricLabel}>DURATION</Text>
                                            <Text style={styles.metricVal}>{formatDuration(durationSec)}</Text>
                                        </View>
                                        <View style={styles.metricDivider} />
                                        <View style={styles.metricCell}>
                                            <Text style={styles.metricLabel}>VOLUME</Text>
                                            <Text style={[styles.metricVal, { color: COLORS.primary }]}>
                                                {totalVolumeKg > 0 ? `${Math.round(totalVolumeKg).toLocaleString()}` : `${totalSets}`}
                                                <Text style={styles.metricUnit}>{totalVolumeKg > 0 ? " KG" : " SETS"}</Text>
                                            </Text>
                                        </View>
                                        <View style={styles.metricDivider} />
                                        <View style={styles.metricCell}>
                                            <Text style={styles.metricLabel}>STREAK</Text>
                                            <Text style={[styles.metricVal, { color: "#FF9500" }]}>
                                                {streak} <Text style={styles.metricUnit}>DAYS</Text>
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Personal Records Highlight */}
                                    {newPRs && newPRs.length > 0 ? (
                                        <View style={styles.prCallout}>
                                            <LinearGradient
                                                colors={["rgba(255, 149, 0, 0.15)", "rgba(227, 30, 36, 0.08)"]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <View style={styles.prCalloutHeader}>
                                                <Ionicons name="trophy" size={14} color="#FF9500" />
                                                <Text style={styles.prCalloutTitle}>NEW PERSONAL RECORD BROKEN</Text>
                                            </View>
                                            <Text style={styles.prCalloutItem} numberOfLines={1}>
                                                {newPRs[0].name} · {newPRs[0].weightKg}kg × {newPRs[0].reps} reps
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Highlight Lifts List */}
                                    {exercises && exercises.length > 0 ? (
                                        <View style={styles.exercisesBox}>
                                            <Text style={styles.exercisesHeader}>MOVEMENTS EXECUTED</Text>
                                            {exercises.slice(0, 4).map((ex, idx) => {
                                                const count = Array.isArray(ex.loggedSets)
                                                    ? (ex.loggedSets.filter(s => s.completed !== false).length || ex.loggedSets.length)
                                                    : (Array.isArray(ex.sets) ? ex.sets.length : (typeof ex.sets === "number" ? ex.sets : null));
                                                return (
                                                    <View key={idx} style={styles.exerciseRow}>
                                                        <Text style={styles.exerciseName} numberOfLines={1}>
                                                            {ex.name}
                                                        </Text>
                                                        <Text style={styles.exerciseSets}>
                                                            {count ? `${count} sets` : ""}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    ) : null}

                                    {/* Card Footer Watermark */}
                                    <View style={styles.cardFooter}>
                                        <View style={styles.footerLine} />
                                        <Text style={styles.footerText}>
                                            IRON PROTOCOL // NO EXCUSES
                                        </Text>
                                    </View>
                                </View>
                            </ViewShot>
                        </View>
                    </ScrollView>

                    {/* Bottom Action Buttons */}
                    <View style={styles.actionsBar}>
                        <TouchableOpacity
                            style={styles.shareActionBtn}
                            onPress={handleShare}
                            disabled={isExporting}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, "#8B0000"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.shareActionBtnText}>
                                {isExporting ? "GENERATING STORY..." : "SHARE TO INSTAGRAM / STORY"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                            <Text style={styles.cancelBtnText}>DISMISS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#0D0D10",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        maxHeight: SCREEN_HEIGHT * 0.9,
        paddingBottom: 24,
    },
    handleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignSelf: "center",
        marginTop: 10,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 10,
    },
    modalTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 14,
        color: COLORS.text,
        letterSpacing: 0.8,
    },
    modalSub: {
        fontFamily: FAMILY.regular,
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    cardScrollContent: {
        alignItems: "center",
        paddingVertical: 12,
    },
    shotWrapper: {
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
    },
    storyCard: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        padding: 22,
        justifyContent: "space-between",
    },
    topGloss: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    brandBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    brandDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: COLORS.primary,
    },
    brandText: {
        fontFamily: FAMILY.bold,
        fontSize: 12,
        color: "#FFFFFF",
        letterSpacing: 1.5,
    },
    rankBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 149, 0, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(255, 149, 0, 0.3)",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    rankText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        color: "#FF9500",
        letterSpacing: 0.6,
    },
    heroTargetBox: {
        marginVertical: 10,
    },
    athleteName: {
        fontFamily: FAMILY.monoBold,
        fontSize: 11,
        color: COLORS.textMuted,
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    targetName: {
        fontFamily: FAMILY.bold,
        fontSize: 24,
        color: "#FFFFFF",
        letterSpacing: 0.5,
        lineHeight: 28,
    },
    dateText: {
        fontFamily: FAMILY.mono,
        fontSize: 10,
        color: "rgba(255, 255, 255, 0.5)",
        marginTop: 6,
        letterSpacing: 0.8,
    },
    metricsGrid: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderRadius: RADIUS.md,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "space-around",
    },
    metricCell: {
        alignItems: "center",
        flex: 1,
    },
    metricLabel: {
        fontFamily: FAMILY.bold,
        fontSize: 8.5,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    metricVal: {
        fontFamily: FAMILY.monoBold,
        fontSize: 15,
        color: "#FFFFFF",
    },
    metricUnit: {
        fontFamily: FAMILY.mono,
        fontSize: 9,
        color: COLORS.textSub,
    },
    metricDivider: {
        width: 1,
        height: 24,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    prCallout: {
        backgroundColor: "rgba(255, 149, 0, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 149, 0, 0.3)",
        borderRadius: RADIUS.sm,
        padding: 10,
        overflow: "hidden",
    },
    prCalloutHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
    },
    prCalloutTitle: {
        fontFamily: FAMILY.bold,
        fontSize: 9,
        color: "#FF9500",
        letterSpacing: 0.8,
    },
    prCalloutItem: {
        fontFamily: FAMILY.monoBold,
        fontSize: 12,
        color: "#FFFFFF",
    },
    exercisesBox: {
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        padding: 10,
    },
    exercisesHeader: {
        fontFamily: FAMILY.bold,
        fontSize: 8.5,
        color: COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    exerciseRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 2,
    },
    exerciseName: {
        fontFamily: FAMILY.regular,
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.85)",
        flex: 1,
    },
    exerciseSets: {
        fontFamily: FAMILY.mono,
        fontSize: 10,
        color: COLORS.textMuted,
    },
    cardFooter: {
        alignItems: "center",
        marginTop: 6,
    },
    footerLine: {
        width: "100%",
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 8,
    },
    footerText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 8.5,
        color: "rgba(255, 255, 255, 0.4)",
        letterSpacing: 1.5,
    },
    actionsBar: {
        paddingHorizontal: 20,
        paddingTop: 8,
        gap: 8,
    },
    shareActionBtn: {
        height: 48,
        borderRadius: RADIUS.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    shareActionBtnText: {
        fontFamily: FAMILY.bold,
        fontSize: 13,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    cancelBtn: {
        height: 38,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelBtnText: {
        fontFamily: FAMILY.medium,
        fontSize: 12,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
});
