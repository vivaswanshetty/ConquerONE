import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import * as Haptics from "expo-haptics";

export default function DeloadProposalModal({
    visible = false,
    deloadPlan = null,
    onAccept = null,
    onClose = null,
}) {
    if (!visible || !deloadPlan) return null;

    const {
        programName = "Vivaswan Elite (Deload Protocol)",
        notes = "7-day structured deload protocol",
        days = [],
        expiresAt,
    } = deloadPlan;

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

                    <View style={styles.dragPill} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="refresh-circle" size={24} color="#FF9500" />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>STRUCTURED DELOAD PROTOCOL</Text>
                            <Text style={styles.subtitle}>7-day active recovery cycle to facilitate systemic adaptation</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Protocol Specifications Matrix */}
                    <View style={styles.matrixCard}>
                        <View style={styles.matrixRow}>
                            <View style={styles.matrixCol}>
                                <Text style={styles.matrixLabel}>VOLUME REDUCTION</Text>
                                <Text style={[styles.matrixVal, { color: "#FF9500" }]}>-40%</Text>
                                <Text style={styles.matrixSub}>Working sets per movement</Text>
                            </View>
                            <View style={styles.matrixDivider} />
                            <View style={styles.matrixCol}>
                                <Text style={styles.matrixLabel}>LOAD INTENSITY</Text>
                                <Text style={[styles.matrixVal, { color: "#00C853" }]}>85–90%</Text>
                                <Text style={styles.matrixSub}>Of regular working load</Text>
                            </View>
                            <View style={styles.matrixDivider} />
                            <View style={styles.matrixCol}>
                                <Text style={styles.matrixLabel}>DURATION</Text>
                                <Text style={styles.matrixVal}>7 DAYS</Text>
                                <Text style={styles.matrixSub}>Auto-restores to source</Text>
                            </View>
                        </View>
                    </View>

                    {/* Day Previews */}
                    <Text style={styles.sectionHeader}>PLANNED ROUTINE ADJUSTMENTS</Text>
                    <ScrollView style={styles.daysScroll} showsVerticalScrollIndicator={false}>
                        {days.map((day) => (
                            <View key={day.day} style={styles.dayCard}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayNumber}>DAY 0{day.day}</Text>
                                    <Text style={styles.dayTarget}>{day.target}</Text>
                                </View>
                                {day.exercises && (
                                    <View style={styles.exerciseList}>
                                        {day.exercises.map((ex, idx) => (
                                            <View key={idx} style={styles.exerciseRow}>
                                                <Text style={styles.exName} numberOfLines={1}>• {ex.name}</Text>
                                                <Text style={styles.exSets}>{ex.sets} sets (Deload)</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.acceptBtn]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                if (onAccept) onAccept(deloadPlan);
                            }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.acceptBtnText}>ACTIVATE DELOAD WEEK</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.cancelBtn]}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
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
        width: 40,
        height: 40,
        borderRadius: 20,
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
        fontSize: 15,
        fontFamily: FAMILY.display,
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 10.5,
        fontFamily: FAMILY.sans,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        padding: 6,
    },
    matrixCard: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 12,
        marginBottom: SPACING.base,
    },
    matrixRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    matrixCol: {
        flex: 1,
        alignItems: "center",
    },
    matrixDivider: {
        width: 1,
        height: 32,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
    },
    matrixLabel: {
        fontSize: 8,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    matrixVal: {
        fontSize: 15,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
        marginBottom: 2,
    },
    matrixSub: {
        fontSize: 8,
        fontFamily: FAMILY.mono,
        color: "rgba(255, 255, 255, 0.4)",
        textAlign: "center",
    },
    sectionHeader: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 8,
    },
    daysScroll: {
        maxHeight: 200,
        marginBottom: SPACING.base,
    },
    dayCard: {
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
        padding: 10,
        marginBottom: 8,
    },
    dayHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    dayNumber: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: "#FF9500",
        letterSpacing: 0.5,
    },
    dayTarget: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    exerciseList: {
        gap: 3,
    },
    exerciseRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    exName: {
        fontSize: 10.5,
        fontFamily: FAMILY.sans,
        color: COLORS.textSecondary,
        flex: 1,
        marginRight: 8,
    },
    exSets: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#FF9500",
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
    },
    btn: {
        paddingVertical: 12,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    acceptBtn: {
        flex: 2,
        backgroundColor: "#FF9500",
    },
    acceptBtnText: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: "#000000",
        letterSpacing: 0.5,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    cancelBtnText: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSecondary,
    },
});
