import React, { useState, useRef, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Keyboard, Animated, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FAMILY, SPACING, GRADIENTS } from "../utils/theme";
import { getGeminiCoachResponse } from "../utils/gemini";
import MaskedView from "@react-native-masked-view/masked-view";
import * as Speech from "expo-speech";
import { getSettings } from "../utils/settings";
import { setAudioSettings } from "../utils/audio";

const { width } = Dimensions.get("window");

function GradientText({ text, style, colors = GRADIENTS.diamond }) {
    return (
        <MaskedView
            style={{ height: 40, width: '100%' }}
            maskElement={
                <Text style={style} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            }
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            >
                <Text style={[style, { opacity: 0 }]} adjustsFontSizeToFit numberOfLines={1}>{text}</Text>
            </LinearGradient>
        </MaskedView>
    );
}

export default function AICoachScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState([
        {
            id: "1",
            role: "assistant",
            content: "Hey Athlete! I'm your CONQUER ONE coach. I've been keeping an eye on your progress—you're doing great. What can I help you with today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const ACTION_CHIPS = [
        "Give me a motivation quote",
        "How is my streak doing?",
        "Suggest a workout tip",
        "How should I recover?"
    ];
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef();
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 1,
            tension: 20,
            friction: 7,
            useNativeDriver: true
        }).start();
    }, []);

    const handleSend = async (forcedText) => {
        const textToSubmit = forcedText || inputText;
        if (!textToSubmit.trim() || loading) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const userMsg = {
            id: Date.now().toString(),
            role: "user",
            content: textToSubmit.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setLoading(true);
        Keyboard.dismiss();

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const response = await getGeminiCoachResponse(userMsg.content, history);

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiMsg]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // AI Voice
            const settings = await getSettings();
            if (settings.soundEnabled) {
                setAudioSettings(settings);
                Speech.speak(response, {
                    language: "en-US",
                    pitch: 1.0,
                    rate: 0.95,
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "Sorry about that! I'm having trouble connecting right now. Let's try again in a second.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Ambient Background */}
            <LinearGradient
                colors={["rgba(227,30,36,0.1)", "transparent", "transparent"]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerSub}>PERSONAL COACH</Text>
                    <GradientText text="CONQUER AI" style={styles.headerTitle} />
                </View>
                <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>ACTIVE</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatBody}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg, index) => (
                        <Animated.View
                            key={msg.id}
                            style={[
                                styles.messageRow,
                                msg.role === "user" ? styles.userRow : styles.aiRow,
                                {
                                    opacity: slideAnim,
                                    transform: [{
                                        translateY: slideAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [20, 0]
                                        })
                                    }]
                                }
                            ]}
                        >
                            {msg.role === "assistant" && (
                                <View style={styles.aiAvatar}>
                                    <Ionicons name="flash" size={12} color={COLORS.primary} />
                                </View>
                            )}
                            <View style={[
                                styles.bubble,
                                msg.role === "user" ? styles.userBubble : styles.aiBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    msg.role === "user" ? styles.userText : styles.aiText
                                ]}>
                                    {msg.content}
                                </Text>
                                <Text style={[
                                    styles.timeText,
                                    msg.role === "user" && { color: "rgba(255,255,255,0.6)" }
                                ]}>{msg.time}</Text>
                                {msg.role === "assistant" && (
                                    <TouchableOpacity
                                        onPress={() => Speech.speak(msg.content, { rate: 0.95 })}
                                        style={{ position: 'absolute', top: 12, right: 12, opacity: 0.4 }}
                                    >
                                        <Ionicons name="volume-medium-outline" size={14} color={COLORS.text} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </Animated.View>
                    ))}
                    {loading && (
                        <View style={styles.aiRow}>
                            <View style={styles.aiAvatar}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            </View>
                            <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 12, paddingHorizontal: 20 }]}>
                                <View style={styles.loadingDots}>
                                    <ActivityIndicator size="small" color={COLORS.textMuted} />
                                    <Text style={[styles.aiText, { fontSize: 12, marginLeft: 10, fontFamily: FAMILY.medium }]}>Thinking...</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Quick Action Chips */}
                {!loading && messages.length < 4 && (
                    <View style={styles.chipScrollWrap}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                            {ACTION_CHIPS.map((chip, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.actionChip}
                                    onPress={() => handleSend(chip)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.chipText}>{chip.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ask anything..."
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !inputText.trim() && { backgroundColor: "rgba(255,255,255,0.05)" }]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || loading}
                        >
                            <Ionicons
                                name="send"
                                size={18}
                                color={inputText.trim() ? "#fff" : "rgba(255,255,255,0.15)"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 15,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)"
    },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    headerTitleWrap: { flex: 1, marginLeft: 16 },
    headerSub: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.primary, letterSpacing: 2.5, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontFamily: FAMILY.display, color: "#fff", letterSpacing: -0.5 },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.1)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
    statusText: { fontSize: 8, fontFamily: FAMILY.bold, color: "#22c55e", letterSpacing: 1 },

    chatBody: { flex: 1 },
    messageRow: { flexDirection: "row", marginBottom: 20, maxWidth: "88%" },
    userRow: { alignSelf: "flex-end", justifyContent: "flex-end" },
    aiRow: { alignSelf: "flex-start", gap: 10 },

    aiAvatar: { width: 32, height: 32, borderRadius: 12, backgroundColor: "rgba(227,30,36,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(227,30,36,0.2)", marginTop: 2 },
    bubble: { padding: 16, borderRadius: 22 },
    aiBubble: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderTopLeftRadius: 4,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    userBubble: {
        backgroundColor: COLORS.primary,
        borderTopRightRadius: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },

    messageText: { fontSize: 14, lineHeight: 22, fontFamily: FAMILY.medium },
    aiText: { color: COLORS.text, opacity: 0.95 },
    userText: { color: "#fff" },
    timeText: { fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 8, alignSelf: "flex-end", fontFamily: FAMILY.bold, letterSpacing: 0.5 },

    loadingDots: { flexDirection: "row", alignItems: "center" },

    inputContainer: { padding: 16, paddingTop: 12 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 12,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    input: { flex: 1, color: "#fff", fontFamily: FAMILY.medium, fontSize: 15, maxHeight: 120, paddingVertical: 5 },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 5,
    }
});
