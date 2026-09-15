import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import * as Haptics from "expo-haptics";

export default function MissedWorkoutModal({
    visible = false,
    advisory = null,
    onSelectOption = null,
    onClose = null,
}) {
    if (!visible || !advisory || !advisory.hasMissedWorkout) return null;

    const { missedDay, missedTarget, scheduledTodayDay, scheduledTodayTarget, options = [] } = advisory;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <View style={styles.sheet}>
                    <LinearGradient
                        colors={["#1C1C1E", "#121214"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Drag indicator */}
                    <View style={styles.dragPill} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="calendar-outline" size={20} color="#FF9500" />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>MISSED WORKOUT DETECTED</Text>
                            <Text style={styles.subtitle}>
                                Day 0{missedDay} ({missedTarget}) was scheduled earlier this week.
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Schedule Context Box */}
                    <View style={styles.contextBox}>
                        <View style={styles.contextItem}>
                            <Text style={styles.contextLabel}>MISSED SESSION</Text>
                            <Text style={styles.contextVal} numberOfLines={1}>Day 0{missedDay} • {missedTarget}</Text>
                        </View>
                        <View style={styles.contextDivider} />
                        <View style={styles.contextItem}>
                            <Text style={styles.contextLabel}>TODAY'S SCHEDULE</Text>
                            <Text style={[styles.contextVal, { color: COLORS.primary }]} numberOfLines={1}>
                                {scheduledTodayDay ? `Day 0${scheduledTodayDay} • ${scheduledTodayTarget}` : scheduledTodayTarget}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.optionsPrompt}>SELECT RECOVERY STRATEGY</Text>

                    {/* Options List */}
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsList}>
                        {options.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={styles.optionCard}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (onSelectOption) onSelectOption(opt);
                                }}
                                activeOpacity={0.8}
                            >
                                <View style={styles.optionHeader}>
                                    <View style={[styles.badge, { backgroundColor: `${opt.badgeColor}26`, borderColor: `${opt.badgeColor}4D` }]}>
                                        <Text style={[styles.badgeText, { color: opt.badgeColor }]}>{opt.badge}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.4)" />
                                </View>
                                <Text style={styles.optionTitle}>{opt.title}</Text>
                                <Text style={styles.optionReason}>{opt.reason}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
    backdrop: {
        flex: 1,
    },
    sheet: {
        backgroundColor: "#18181B",
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderTopWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingHorizontal: SPACING.base,
        paddingBottom: 40,
        paddingTop: 12,
        maxHeight: "85%",
        overflow: "hidden",
    },
    dragPill: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignSelf: "center",
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.base,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255, 149, 0, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(255, 149, 0, 0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontFamily: FAMILY.display,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 11,
        fontFamily: FAMILY.sans,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        padding: 6,
    },
    contextBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.md,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.06)",
        marginBottom: SPACING.base,
    },
    contextItem: {
        flex: 1,
    },
    contextDivider: {
        width: 1,
        height: 24,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        marginHorizontal: 10,
    },
    contextLabel: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    contextVal: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    optionsPrompt: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
    optionsList: {
        maxHeight: 320,
    },
    optionCard: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 14,
        marginBottom: 10,
    },
    optionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    badge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: FAMILY.monoBold,
        letterSpacing: 0.5,
    },
    optionTitle: {
        fontSize: 13.5,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        marginBottom: 4,
    },
    optionReason: {
        fontSize: 11,
        fontFamily: FAMILY.sans,
        color: COLORS.textMuted,
        lineHeight: 16,
    },
});
