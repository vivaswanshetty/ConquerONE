import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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

    handleRecover = () => {
        this.setState({ hasError: false, error: null });
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
                    <TouchableOpacity style={styles.button} onPress={this.handleRecover}>
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
        marginBottom: 32,
    },
    button: {
        backgroundColor: "#E31E24",
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
        letterSpacing: 1,
    },
});
