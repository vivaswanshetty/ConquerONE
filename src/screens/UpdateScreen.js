import React, { useEffect, useState } from "react";
import {
    View, Text, StyleSheet, Animated, Easing,
    StatusBar, Dimensions, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FAMILY } from "../utils/theme";

const { width, height } = Dimensions.get("window");

export default function UpdateScreen() {
    const [progress] = useState(new Animated.Value(0));
    const [spin] = useState(new Animated.Value(0));
    const [fade] = useState(new Animated.Value(0));

    useEffect(() => {
        // Entrance animation
        Animated.timing(fade, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        // Progress simulation (since fetchUpdateAsync is black-box)
        Animated.timing(progress, {
            toValue: 1,
            duration: 8000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();

        // Infinite rotation for the ring
        Animated.loop(
            Animated.timing(spin, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const rotate = spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <Animated.View style={[styles.content, { opacity: fade }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>UPDATING{"\n"}PROTOCOLS</Text>
                    <Text style={styles.subtitle}>SYSTEM SYNC IN PROGRESS</Text>
                </View>

                {/* Progress Ring */}
                <View style={styles.ringContainer}>
                    <View style={styles.ringBase} />
                    <Animated.View style={[styles.ringRunner, { transform: [{ rotate }] }]}>
                        <LinearGradient
                            colors={[COLORS.primary, "transparent"]}
                            style={styles.gradient}
                            start={{ x: 1, y: 0 }}
                            end={{ x: 0, y: 1 }}
                        />
                    </Animated.View>
                    <View style={styles.centerHole} />
                </View>

                {/* Glass Cards */}
                <View style={styles.footer}>
                    <View style={styles.glassCard}>
                        <LinearGradient
                            colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.cardText}>RESTORING ZEN SESSIONS</Text>
                    </View>

                    <View style={[styles.glassCard, { marginTop: 12 }]}>
                        <LinearGradient
                            colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.cardText}>OPTIMIZING PERFORMANCE DATA</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Ambient Background Glow */}
            <View style={styles.glow} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        width: "100%",
        alignItems: "center",
        zIndex: 10,
    },
    header: {
        alignItems: "center",
        marginBottom: 80,
    },
    title: {
        fontSize: 32,
        fontFamily: FAMILY.display,
        color: COLORS.text,
        textAlign: "center",
        letterSpacing: 2,
        lineHeight: 42,
    },
    subtitle: {
        fontSize: 10,
        fontFamily: FAMILY.bold,
        color: COLORS.textSub,
        letterSpacing: 4,
        marginTop: 16,
    },
    ringContainer: {
        width: 220,
        height: 220,
        alignItems: "center",
        justifyContent: "center",
    },
    ringBase: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        position: "absolute",
    },
    ringRunner: {
        width: 205,
        height: 205,
        borderRadius: 102.5,
        overflow: "hidden",
    },
    gradient: {
        width: "100%",
        height: "50%",
    },
    centerHole: {
        width: 198,
        height: 198,
        borderRadius: 99,
        backgroundColor: "#000",
        position: "absolute",
    },
    footer: {
        marginTop: 100,
        width: "100%",
        paddingHorizontal: 40,
    },
    glassCard: {
        height: 60,
        borderRadius: 16,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    cardText: {
        fontSize: 11,
        fontFamily: FAMILY.bold,
        color: COLORS.text,
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    glow: {
        position: "absolute",
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width,
        backgroundColor: COLORS.primary,
        opacity: 0.03,
        zIndex: 1,
    }
});
