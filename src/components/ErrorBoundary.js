import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Updates from "expo-updates";
import { RADIUS } from "../utils/theme";

/**
 * Global error boundary that catches unhandled JS errors and renders
 * a recovery screen instead of crashing the app.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary] Caught:", error, errorInfo);
    }

    handleRecover = async () => {
        try {
            this.setState({ hasError: false, error: null });
            if (Updates && Updates.reloadAsync && !__DEV__) {
                await Updates.reloadAsync().catch(() => {});
            }
        } catch (_) {
            this.setState({ hasError: false, error: null });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.icon}>⚠️</Text>
                    <Text style={styles.title}>SOMETHING WENT WRONG</Text>
                    <Text style={styles.message}>
                        The app encountered an unexpected error.{"\n"}
                        Your workout data is safe.
                    </Text>
                    {this.state.error?.message ? (
                        <Text style={styles.errorText} numberOfLines={2}>
                            {String(this.state.error.message)}
                        </Text>
                    ) : null}
                    <TouchableOpacity style={styles.button} onPress={this.handleRecover} activeOpacity={0.8}>
                        <Text style={styles.buttonText}>TAP TO RECOVER</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    icon: { fontSize: 48, marginBottom: 16 },
    title: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 2,
        marginBottom: 12,
    },
    message: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 14,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 20,
    },
    errorText: {
        color: "rgba(227, 30, 36, 0.8)",
        fontSize: 11,
        textAlign: "center",
        fontFamily: "monospace",
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    button: {
        backgroundColor: "#E31E24",
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
        letterSpacing: 1,
    },
});
