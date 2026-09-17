import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, FAMILY, SPACING } from "../utils/theme";

/**
 * AthleteAlertCard
 * Renders prioritized adaptive training insights and recovery advisories.
 */
export default function AthleteAlertCard({ alert, onPress, style }) {
    if (!alert) return null;

    const {
        title,
        message,
        badge,
        color = "#E31E24",
        icon = "information-circle-outline",
    } = alert;

    const cardBgColor = "#141417";
    const borderColor = color ? `${color}40` : "#222226";

    return (
        <TouchableOpacity
            activeOpacity={onPress ? 0.85 : 1}
            onPress={onPress}
            disabled={!onPress}
            style={[styles.container, { borderColor }, style]}
        >
            <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                    <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                        <Ionicons name={icon} size={15} color={color} />
                    </View>
                    <Text style={styles.titleText} numberOfLines={1}>
                        {title}
                    </Text>
                </View>
                {badge && (
                    <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}50` }]}>
                        <Text style={[styles.badgeText, { color }]}>{badge}</Text>
                    </View>
                )}
            </View>

            <Text style={styles.messageText}>
                {message}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 4,
        backgroundColor: COLORS.bgCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.11)",
        padding: 14,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    titleWrap: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 8,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    titleText: {
        fontFamily: FAMILY.bebas,
        fontSize: 16,
        letterSpacing: 0.8,
        color: "#FFFFFF",
    },
    badge: {
        paddingHorizontal: 7,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeText: {
        fontFamily: FAMILY.monoBold,
        fontSize: 9,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        includeFontPadding: false,
        textAlignVertical: "center",
    },
    messageText: {
        fontFamily: FAMILY.body,
        fontSize: 12,
        color: "#B0B0B8",
        lineHeight: 16,
    },
});
