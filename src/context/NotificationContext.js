import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FAMILY, RADIUS } from "../utils/theme";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const insets = useSafeAreaInsets();
    
    // Toast State
    const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
    const toastTimer = useRef(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastSlide = useRef(new Animated.Value(-15)).current;
    const [toastRendered, setToastRendered] = useState(false);

    // Dialog State
    const [dialog, setDialog] = useState({
        visible: false,
        title: "",
        message: "",
        confirmText: "CONFIRM",
        cancelText: "CANCEL",
        onConfirm: null,
        onCancel: null,
        isDestructive: false,
        singleButton: false
    });

    const showToast = (message, type = "success") => {
        clearTimeout(toastTimer.current);
        setToast({ visible: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const showDialog = (options) => {
        setDialog({
            visible: true,
            title: options.title || "ALERT",
            message: options.message || "",
            confirmText: options.confirmText || "OK",
            cancelText: options.cancelText || "CANCEL",
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            isDestructive: options.isDestructive || false,
            singleButton: options.singleButton || false
        });
    };

    const hideDialog = () => {
        setDialog(prev => ({ ...prev, visible: false }));
        if (dialog.onCancel) {
            dialog.onCancel();
        }
    };

    // Toast Animation Lifecycle
    useEffect(() => {
        if (toast.visible) {
            setToastRendered(true);
            Animated.parallel([
                Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.timing(toastSlide, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start();

            toastTimer.current = setTimeout(() => {
                hideToast();
            }, 3000);
        } else {
            Animated.parallel([
                Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(toastSlide, { toValue: -15, duration: 200, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished) setToastRendered(false);
            });
        }
        return () => clearTimeout(toastTimer.current);
    }, [toast.visible]);

    const isError = toast.type === "error";
    const accentColor = isError ? COLORS.primary : "#22c55e";
    const iconName = isError ? "alert-circle-outline" : "checkmark-circle-outline";

    return (
        <NotificationContext.Provider value={{ showToast, showDialog }}>
            {children}

            {/* Global Custom Toast */}
            {toastRendered && (
                <Animated.View style={[
                    styles.customToast,
                    {
                        top: insets.top + 60,
                        opacity: toastOpacity,
                        transform: [{ translateY: toastSlide }],
                        borderColor: `${accentColor}40`,
                    }
                ]}>
                    <LinearGradient
                        colors={["rgba(15, 15, 15, 0.98)", "rgba(5, 5, 5, 0.99)"]}
                        style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name={iconName} size={16} color={accentColor} />
                    <Text style={styles.customToastText}>{toast.message.toUpperCase()}</Text>
                </Animated.View>
            )}

            {/* Global Custom Dialog Modal */}
            <Modal visible={dialog.visible} transparent animationType="fade" onRequestClose={hideDialog}>
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.dialogTitle}>{dialog.title.toUpperCase()}</Text>
                        <Text style={styles.dialogMessage}>{dialog.message}</Text>
                        <View style={styles.modalBtns}>
                            {!dialog.singleButton && (
                                <TouchableOpacity 
                                    style={styles.modalCancelBtn} 
                                    onPress={hideDialog} 
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalCancelText}>
                                        {(dialog.cancelText || "CANCEL").toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[
                                    styles.modalSaveBtn,
                                    dialog.isDestructive ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.text }
                                ]}
                                onPress={() => {
                                    setDialog(prev => ({ ...prev, visible: false }));
                                    if (dialog.onConfirm) dialog.onConfirm();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.modalSaveText,
                                    dialog.isDestructive ? { color: "#fff" } : { color: "#000" }
                                ]}>
                                    {(dialog.confirmText || "CONFIRM").toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider");
    }
    return context;
}

const styles = StyleSheet.create({
    customToast: {
        position: "absolute",
        left: 20,
        right: 20,
        backgroundColor: "rgba(10, 10, 10, 0.95)",
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        zIndex: 99999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 10,
        overflow: "hidden",
    },
    customToastText: {
        fontFamily: FAMILY.medium,
        fontSize: 9,
        color: COLORS.textSub,
        flex: 1,
        letterSpacing: 0.5,
    },
    dialogOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
    },
    dialogSheet: {
        width: "86%",
        backgroundColor: "#0A0A0A",
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 20,
    },
    modalHandle: { 
        width: 36, 
        height: 4, 
        borderRadius: 2, 
        backgroundColor: "rgba(255,255,255,0.1)", 
        alignSelf: "center", 
        marginBottom: 24 
    },
    dialogTitle: {
        fontSize: 14,
        fontFamily: FAMILY.header,
        color: COLORS.text,
        letterSpacing: 1.5,
        marginBottom: 12,
        textAlign: "center",
    },
    dialogMessage: {
        fontSize: 12,
        fontFamily: FAMILY.regular,
        color: COLORS.textSub,
        lineHeight: 18,
        marginBottom: 28,
        textAlign: "center",
    },
    modalBtns: { 
        flexDirection: "row", 
        gap: 12 
    },
    modalCancelBtn: { 
        flex: 1, 
        paddingVertical: 16, 
        borderRadius: RADIUS.md, 
        backgroundColor: "rgba(255,255,255,0.03)", 
        alignItems: "center", 
        borderWidth: 1, 
        borderColor: "rgba(255,255,255,0.05)" 
    },
    modalCancelText: { 
        fontSize: 12, 
        fontFamily: FAMILY.semibold, 
        color: COLORS.textMuted, 
        letterSpacing: 1 
    },
    modalSaveBtn: { 
        flex: 2, 
        paddingVertical: 16, 
        borderRadius: RADIUS.md, 
        backgroundColor: COLORS.primary, 
        alignItems: "center" 
    },
    modalSaveText: { 
        fontSize: 12, 
        fontFamily: FAMILY.bold, 
        color: "#fff", 
        letterSpacing: 1 
    },
});
