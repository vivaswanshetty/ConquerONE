import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FAMILY } from "../utils/theme";
import * as Haptics from "expo-haptics";

export default function ProgramVersionBadge({
    activeProgram = null,
    versions = [],
    onSelectVersion = null,
}) {
    const [modalVisible, setModalVisible] = useState(false);

    const version = activeProgram?.version || "1.0.0";
    const isDeload = activeProgram?.isTemporaryDeload || false;

    return (
        <>
            <TouchableOpacity
                style={[styles.badge, isDeload && styles.badgeDeload]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setModalVisible(true);
                }}
                activeOpacity={0.75}
            >
                <Ionicons
                    name={isDeload ? "refresh-circle" : "git-branch-outline"}
                    size={11}
                    color={isDeload ? "#FF9F0A" : COLORS.primary}
                    style={{ marginRight: 4 }}
                />
                <Text style={[styles.badgeText, isDeload && { color: "#FF9F0A" }]}>
                    {isDeload ? `DELOAD v${version}` : `v${version}`}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={10}
                    color={isDeload ? "#FF9F0A" : COLORS.primary}
                    style={{ marginLeft: 3 }}
                />
            </TouchableOpacity>

            {/* Version History Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />

                    <View style={styles.sheet}>
                        <View style={styles.dragPill} />

                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <Ionicons name="git-branch" size={16} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetTitle}>PROGRAM VERSION HISTORY</Text>
                                <Text style={styles.sheetSubtitle}>
                                    Immutable snapshots of program adaptations
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeBtn}
                            >
                                <Ionicons name="close" size={20} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.versionList} showsVerticalScrollIndicator={false}>
                            {/* Current Active Version */}
                            <View style={[styles.versionCard, styles.versionCardActive]}>
                                <View style={styles.versionHeader}>
                                    <View style={styles.versionTagRow}>
                                        <Text style={styles.versionNumber}>v{version}</Text>
                                        <View style={styles.activeTag}>
                                            <Text style={styles.activeTagText}>CURRENT ACTIVE</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.versionDate}>
                                        {activeProgram?.createdAt
                                            ? new Date(activeProgram.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                                            : "Active"}
                                    </Text>
                                </View>
                                <Text style={styles.progNameText}>{activeProgram?.name || "Standard Routine"}</Text>
                                {activeProgram?.notes && (
                                    <Text style={styles.notesText}>{activeProgram.notes}</Text>
                                )}
                                {isDeload && (
                                    <View style={styles.deloadNotice}>
                                        <Ionicons name="information-circle" size={13} color="#FF9F0A" style={{ marginRight: 5 }} />
                                        <Text style={styles.deloadNoticeText}>
                                            Temporary 7-day deload protocol. Will revert to source version when completed.
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Past Versions */}
                            {versions
                                .filter((v) => v.id !== activeProgram?.id)
                                .map((ver) => (
                                    <View key={ver.id || ver.version} style={styles.versionCard}>
                                        <View style={styles.versionHeader}>
                                            <Text style={styles.versionNumberMuted}>v{ver.version || "1.0.0"}</Text>
                                            <Text style={styles.versionDate}>
                                                {ver.createdAt
                                                    ? new Date(ver.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                                                    : "Archived"}
                                            </Text>
                                        </View>
                                        <Text style={styles.progNameMuted}>{ver.name || "Program Snapshot"}</Text>
                                        {ver.notes && (
                                            <Text style={styles.notesText}>{ver.notes}</Text>
                                        )}
                                        {ver.changes && Array.isArray(ver.changes) && ver.changes.length > 0 && (
                                            <View style={styles.changesBox}>
                                                {ver.changes.map((chg, i) => (
                                                    <Text key={i} style={styles.changeItem}>
                                                        • {chg.description || JSON.stringify(chg)}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
    },
    badgeDeload: {
        backgroundColor: "rgba(255, 159, 10, 0.12)",
        borderColor: "rgba(255, 159, 10, 0.3)",
    },
    badgeText: {
        fontSize: 10,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
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
        maxHeight: "80%",
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
    headerIcon: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(227, 30, 36, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(227, 30, 36, 0.3)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    sheetTitle: {
        fontSize: 14,
        fontFamily: FAMILY.chakraBold,
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    sheetSubtitle: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    closeBtn: {
        padding: 6,
    },
    versionList: {
        maxHeight: 380,
    },
    versionCard: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        padding: 12,
        marginBottom: 10,
    },
    versionCardActive: {
        borderColor: "rgba(227, 30, 36, 0.4)",
        backgroundColor: "rgba(227, 30, 36, 0.06)",
    },
    versionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    versionTagRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    versionNumber: {
        fontSize: 13,
        fontFamily: FAMILY.monoBold,
        color: "#FFFFFF",
    },
    versionNumberMuted: {
        fontSize: 12,
        fontFamily: FAMILY.monoBold,
        color: "rgba(255, 255, 255, 0.7)",
    },
    activeTag: {
        backgroundColor: "rgba(227, 30, 36, 0.2)",
        borderRadius: RADIUS.xs,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    activeTagText: {
        fontSize: 8.5,
        fontFamily: FAMILY.monoBold,
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    versionDate: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
    },
    progNameText: {
        fontSize: 12,
        fontFamily: FAMILY.chakraBold,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    progNameMuted: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 11,
        fontFamily: FAMILY.body,
        color: "rgba(255, 255, 255, 0.6)",
        lineHeight: 15,
        marginTop: 2,
    },
    changesBox: {
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.06)",
    },
    changeItem: {
        fontSize: 10,
        fontFamily: FAMILY.mono,
        color: COLORS.textMuted,
        lineHeight: 14,
    },
    deloadNotice: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        padding: 8,
        borderRadius: RADIUS.xs,
        backgroundColor: "rgba(255, 159, 10, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(255, 159, 10, 0.2)",
    },
    deloadNoticeText: {
        flex: 1,
        fontSize: 10,
        fontFamily: FAMILY.body,
        color: "#FF9F0A",
        lineHeight: 14,
    },
});
