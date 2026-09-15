import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
                    <View style={styles.dragPill} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="refresh-circle" size={22} color="#FF9F0A" />
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
                                <Text style={[styles.matrixVal, { color: "#FF9F0A" }]}>-40%</Text>
                                <Text style={styles.matrixSub}>Working sets per movement</Text>
                            </View>
                            <View style={styles.matrixDivider} />
                            <View style={styles.matrixCol}>
                                <Text style={styles.matrixLabel}>LOAD INTENSITY</Text>
                                <Text style={[styles.matrixVal, { color: "#30D158" }]}>85–90%</Text>
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
                            <Ionicons name="checkmark-circle" size={16} color="#000000" style={{ marginRight: 6 }} />
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
        backgroundColor: "#161619",
        borderTopLeftRadius: RADIUS.lg,
        borderTopRightRadius: RADIUS.lg,
        borderTopWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingHorizontal: SPACING.base,
        paddingBottom: 40,
        paddingTop: 12,
        maxHeight: "85%",
        overflow: "hidden",
    },
    dragPill: {
        width: 32,
        height: 3.5,
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
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        backgroundColor: "rgba(255, 159, 10, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(255, 159, 10, 0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    subtitle: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        padding: 6,
    },
    matrixCard: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.sm,
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
        color: "#FF9F0A",
        letterSpacing: 0.5,
    },
    dayTarget: {
        fontSize: 11,
        fontFamily: FAMILY.chakraBold,
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
        fontFamily: FAMILY.body,
        color: COLORS.textSecondary,
        flex: 1,
        marginRight: 8,
    },
    exSets: {
        fontSize: 9.5,
        fontFamily: FAMILY.monoBold,
        color: "#FF9F0A",
    },
    actionsRow: {
        flexDirection: "row",
        gap: 10,
    },
    btn: {
        paddingVertical: 12,
        borderRadius: RADIUS.sm,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    acceptBtn: {
        flex: 2,
        backgroundColor: "#FF9F0A",
    },
    acceptBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.chakraBold,
        color: "#000000",
        letterSpacing: 0.8,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.12)",
    },
    cancelBtnText: {
        fontSize: 11,
        fontFamily: FAMILY.monoBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
});
