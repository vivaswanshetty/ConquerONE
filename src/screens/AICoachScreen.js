import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Keyboard, Animated, Dimensions,
    Modal, FlatList,
} from "react-native";
import { useNotification } from "../context/NotificationContext";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FAMILY, SPACING } from "../utils/theme";
import { getGeminiCoachResponse } from "../utils/gemini";
import * as Speech from "expo-speech";
import { getSettings } from "../utils/settings";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const CHAT_HISTORY_KEY = "@ai_coach_sessions";
const SELECTED_VOICE_KEY = "@ai_coach_selected_voice";
const VOICE_PITCH_KEY = "@ai_coach_voice_pitch";
const VOICE_RATE_KEY = "@ai_coach_voice_rate";
const MAX_SESSIONS = 20;

const ACTION_CHIPS = [
    "Give me a motivation quote",
    "How is my streak doing?",
    "Suggest a workout tip",
    "How should I recover?",
    "Best post-workout meal?",
    "How to avoid burnout?",
];

const WELCOME_MSG = {
    id: "welcome",
    role: "assistant",
    content: "Hey Athlete! I'm your CONQUER ONE coach. I've been keeping an eye on your progress—you're doing great. What can I help you with today?",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

/* ── Markdown renderer ─────────────────────────────────── */
function MarkDownText({ content, style }) {
    if (!content) return null;
    const items = content.split('\n').filter(line => line.trim().length > 0);
    return (
        <View style={{ gap: 8 }}>
            {items.map((line, idx) => {
                let cur = line.trim();
                const isBullet = cur.startsWith('- ') || cur.startsWith('* ') || cur.startsWith('• ');
                if (isBullet) cur = cur.slice(2);
                const parts = cur.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <Text key={pIdx} style={[style, { fontFamily: FAMILY.bold, color: '#fff' }]}>{part.slice(2, -2)}</Text>;
                    }
                    return part;
                });
                if (isBullet) return (
                    <View key={idx} style={{ flexDirection: 'row', paddingLeft: 4, gap: 8 }}>
                        <Text style={[style, { color: COLORS.textSub }]}>•</Text>
                        <View style={{ flex: 1 }}><Text style={style}>{parts}</Text></View>
                    </View>
                );
                return <Text key={idx} style={style}>{parts}</Text>;
            })}
        </View>
    );
}

/* ── Typing indicator ──────────────────────────────────── */
function TypingDots() {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        dots.forEach((dot, i) => Animated.loop(Animated.sequence([
            Animated.delay(i * 200),
            Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(400),
        ])).start());
    }, []);
    return (
        <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
            {dots.map((d, i) => (
                <Animated.View key={i} style={{
                    width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted,
                    opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                    transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
                }} />
            ))}
        </View>
    );
}

/* ── Message bubble ────────────────────────────────────── */
function MessageBubble({ msg, onSpeak }) {
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(14)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(slide, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);
    const isUser = msg.role === "user";
    return (
        <Animated.View style={[styles.msgRow, isUser ? styles.userRow : styles.aiRow, { opacity: fade, transform: [{ translateY: slide }] }]}>
            {!isUser && <View style={styles.aiAvatar}><Ionicons name="flash" size={12} color={COLORS.accent} /></View>}
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
                <MarkDownText content={msg.content} style={[styles.msgText, isUser ? styles.userText : styles.aiText]} />
                <View style={styles.bubbleFooter}>
                    <Text style={[styles.timeText, isUser && { color: "rgba(255,255,255,0.5)" }]}>{msg.time}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

/* ── Session History Modal ─────────────────────────────── */
function HistoryModal({ visible, sessions, onClose, onRestore, onDelete, onClearAll }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={hm.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={hm.sheet}>
                    <View style={hm.handle} />
                    <View style={hm.header}>
                        <Text style={hm.title}>CHAT HISTORY</Text>
                        {sessions.length > 0 && (
                            <TouchableOpacity onPress={onClearAll} style={hm.clearBtn}>
                                <Text style={hm.clearText}>CLEAR ALL</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {sessions.length === 0 ? (
                        <View style={hm.empty}>
                            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textMuted} style={{ marginBottom: 16 }} />
                            <Text style={hm.emptyText}>No past conversations</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={sessions}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            style={{ maxHeight: 400 }}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item: session }) => (
                                <View style={hm.row}>
                                    <TouchableOpacity style={hm.rowContent} onPress={() => onRestore(session)} activeOpacity={0.7}>
                                        <View style={hm.rowIcon}>
                                            <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={hm.rowTitle} numberOfLines={1}>{session.preview || 'Chat Session'}</Text>
                                            <Text style={hm.rowDate}>{session.date} · {session.messages.length} messages</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onDelete(session.id)} style={hm.deleteBtn}>
                                        <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

/* ── Voice Settings Modal ─────────────────────────────── */
const PITCH_PRESETS = [
    { label: 'DEEP', value: 0.75, icon: 'arrow-down' },
    { label: 'NORMAL', value: 1.0, icon: 'remove' },
    { label: 'HIGH', value: 1.35, icon: 'arrow-up' },
];
const RATE_PRESETS = [
    { label: 'SLOW', value: 0.7, icon: 'play-back' },
    { label: 'NORMAL', value: 0.95, icon: 'play' },
    { label: 'FAST', value: 1.3, icon: 'play-forward' },
];

function VoiceSettingsModal({ visible, voices, selectedVoice, onSelect, onClose, isLoading, onRefresh, pitch, rate, onPitchChange, onRateChange }) {
    // If no enumerable voices, show a single "Device Default" entry
    const displayVoices = voices.length > 0 ? voices : (
        isLoading ? [] : [{ identifier: selectedVoice || 'default', name: 'Device Default Voice', language: 'en-US', quality: 'Default' }]
    );

    const handlePreview = () => {
        Speech.stop();
        const opts = { language: 'en-US', pitch: pitch || 1.0, rate: rate || 0.95 };
        if (selectedVoice && selectedVoice !== 'default') opts.voice = selectedVoice;
        Speech.speak("This is how your AI Coach will sound.", opts);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={hm.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={[hm.sheet, { maxHeight: '75%' }]}>
                    <View style={hm.handle} />
                    <View style={hm.header}>
                        <Text style={hm.title}>VOICE SETTINGS</Text>
                        {!isLoading && (
                            <TouchableOpacity onPress={onRefresh} style={hm.clearBtn}>
                                <Text style={hm.clearText}>REFRESH</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        {/* Voice Selection */}
                        <Text style={vmStyles.sectionLabel}>VOICE</Text>
                        {isLoading ? (
                            <View style={hm.empty}>
                                <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 12 }} />
                                <Text style={hm.emptyText}>Fetching voices...</Text>
                            </View>
                        ) : (
                            displayVoices.map((voice, index) => {
                                if (!voice || !voice.identifier) return null;
                                const isSelected = selectedVoice === voice.identifier ||
                                    (voice.identifier === 'default' && (!selectedVoice || selectedVoice === 'default'));
                                return (
                                    <TouchableOpacity
                                        key={voice.identifier || index}
                                        style={[hm.rowContent, { marginHorizontal: 20, marginBottom: 8 }, isSelected && { borderColor: COLORS.accent, backgroundColor: 'rgba(237,234,227,0.06)' }]}
                                        onPress={() => onSelect(voice.identifier)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[hm.rowIcon, isSelected && { backgroundColor: COLORS.accent }]}>
                                            <Ionicons name="mic-outline" size={16} color={isSelected ? "#000" : COLORS.textSub} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[hm.rowTitle, isSelected && { color: COLORS.text }]} numberOfLines={1}>{voice.name || 'Unknown Voice'}</Text>
                                            <Text style={hm.rowDate}>{(voice.language || '??').toUpperCase()} · {(voice.quality || 'Standard').toUpperCase()}</Text>
                                        </View>
                                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        {/* Pitch Control */}
                        <Text style={vmStyles.sectionLabel}>PITCH</Text>
                        <View style={vmStyles.presetRow}>
                            {PITCH_PRESETS.map(p => {
                                const isActive = Math.abs((pitch || 1.0) - p.value) < 0.05;
                                return (
                                    <TouchableOpacity
                                        key={p.label}
                                        style={[vmStyles.presetBtn, isActive && vmStyles.presetBtnActive]}
                                        onPress={() => onPitchChange(p.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={p.icon} size={14} color={isActive ? COLORS.accent : COLORS.textMuted} />
                                        <Text style={[vmStyles.presetLabel, isActive && vmStyles.presetLabelActive]}>{p.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Speed Control */}
                        <Text style={vmStyles.sectionLabel}>SPEED</Text>
                        <View style={vmStyles.presetRow}>
                            {RATE_PRESETS.map(r => {
                                const isActive = Math.abs((rate || 0.95) - r.value) < 0.05;
                                return (
                                    <TouchableOpacity
                                        key={r.label}
                                        style={[vmStyles.presetBtn, isActive && vmStyles.presetBtnActive]}
                                        onPress={() => onRateChange(r.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={r.icon} size={14} color={isActive ? COLORS.accent : COLORS.textMuted} />
                                        <Text style={[vmStyles.presetLabel, isActive && vmStyles.presetLabelActive]}>{r.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Preview Button */}
                        <TouchableOpacity style={vmStyles.previewBtn} onPress={handlePreview} activeOpacity={0.8}>
                            <Ionicons name="volume-high-outline" size={16} color="#fff" />
                            <Text style={vmStyles.previewText}>PREVIEW VOICE</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const vmStyles = StyleSheet.create({
    sectionLabel: {
        fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted,
        letterSpacing: 2.5, marginHorizontal: 24, marginTop: 24, marginBottom: 12,
    },
    presetRow: {
        flexDirection: 'row', gap: 10, marginHorizontal: 20,
    },
    presetBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    presetBtnActive: {
        backgroundColor: 'rgba(237,234,227,0.08)',
        borderColor: 'rgba(237,234,227,0.2)',
    },
    presetLabel: {
        fontSize: 10, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1,
    },
    presetLabelActive: {
        color: COLORS.text,
    },
    previewBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 20, marginTop: 28,
        paddingVertical: 16, borderRadius: 16,
        backgroundColor: COLORS.primary,
    },
    previewText: {
        fontSize: 11, fontFamily: FAMILY.bold, color: '#fff', letterSpacing: 1.5,
    },
});

const hm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#0D0D0D', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', maxHeight: '75%',
        paddingBottom: 40,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 14, marginBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 },
    title: { fontSize: 12, fontFamily: FAMILY.bold, color: COLORS.text, letterSpacing: 2 },
    clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    clearText: { fontSize: 11, fontFamily: FAMILY.bold, color: COLORS.textSub, letterSpacing: 1 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 13, fontFamily: FAMILY.medium, color: COLORS.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
    rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 13, fontFamily: FAMILY.bold, color: COLORS.text, marginBottom: 4 },
    rowDate: { fontSize: 10, fontFamily: FAMILY.medium, color: COLORS.textMuted },
    deleteBtn: { padding: 12, marginLeft: 8 },
});

/* ── Main Screen ───────────────────────────────────────── */
export default function AICoachScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { showDialog } = useNotification();
    const [messages, setMessages] = useState([{ ...WELCOME_MSG }]);
    const [inputText, setInputText] = useState("");
    const [loading, setLoading] = useState(false);
    const [showChips, setShowChips] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);

    // Auto-refresh voices when modal opens
    useEffect(() => {
        if (showVoiceSettings) {
            loadVoiceSettings(0);
        }
    }, [showVoiceSettings]);
    const [sessions, setSessions] = useState([]);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [voicePitch, setVoicePitch] = useState(1.0);
    const [voiceRate, setVoiceRate] = useState(0.95);
    const [isVoicesLoading, setIsVoicesLoading] = useState(false);
    const sessionIdRef = useRef(Date.now().toString());
    const [isMuted, setIsMuted] = useState(true);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }, []);

    // Load sessions & Warm up Speech engine (prevents lag on first use)
    useEffect(() => {
        loadSessions();

        // Warm up the TTS engine first, THEN fetch voices
        // Android's TTS engine is lazy — it needs a real speak call to initialize
        const warmUpAndLoadVoices = async () => {
            try {
                // First warm-up: trigger the TTS engine to initialize
                await new Promise((resolve) => {
                    Speech.speak(" ", {
                        volume: 0,
                        onDone: resolve,
                        onError: resolve, // Resolve even on error so we proceed
                        onStopped: resolve,
                    });
                    // Safety: resolve after 2s even if callback never fires
                    setTimeout(resolve, 2000);
                });

                // Small delay after warm-up to let the engine fully register voices
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.warn("[AICoach] TTS warm-up error (non-fatal):", e);
            }

            // Now load voices
            loadVoiceSettings(0);
        };

        warmUpAndLoadVoices();

        return () => {
            Speech.stop();
        };
    }, []);

    const MAX_VOICE_RETRIES = 4;

    const loadVoiceSettings = async (retryCount = 0) => {
        // Only show loading on the first call (or when explicitly refreshing)
        if (retryCount === 0) {
            setIsVoicesLoading(true);
            setTimeout(() => {
                setIsVoicesLoading(old => {
                    if (old) {
                        console.log("[AICoach] Force stopping voice loading spinner (safety timeout)");
                    }
                    return false;
                });
            }, 15000);
        }

        // ALWAYS load saved preferences first — even if we can't enumerate voices,
        // Samsung TTS still honors the voice identifier when passed to Speech.speak()
        const savedVoice = await AsyncStorage.getItem(SELECTED_VOICE_KEY);
        const savedPitch = await AsyncStorage.getItem(VOICE_PITCH_KEY);
        const savedRate = await AsyncStorage.getItem(VOICE_RATE_KEY);

        if (savedVoice && !selectedVoice) {
            console.log(`[AICoach] Restoring saved voice preference: ${savedVoice}`);
            setSelectedVoice(savedVoice);
        }
        if (savedPitch) setVoicePitch(parseFloat(savedPitch));
        if (savedRate) setVoiceRate(parseFloat(savedRate));

        let voices = [];
        try {
            console.log(`[AICoach] Fetching voices (attempt ${retryCount + 1}/${MAX_VOICE_RETRIES})...`);
            voices = await Speech.getAvailableVoicesAsync();
            console.log(`[AICoach] Got ${(voices || []).length} voices on attempt ${retryCount + 1}`);

            // If empty (not error), retry with backoff — engine may not be ready yet
            if ((!voices || voices.length === 0) && retryCount < MAX_VOICE_RETRIES) {
                const delay = Math.min(800 * Math.pow(2, retryCount), 5000);
                console.log(`[AICoach] No voices yet, retrying in ${delay}ms...`);

                if (retryCount === 1) {
                    console.log("[AICoach] Re-warming TTS engine...");
                    try {
                        Speech.speak(".", { volume: 0 });
                        await new Promise(r => setTimeout(r, 1000));
                    } catch (e) { /* ignore */ }
                }

                setTimeout(() => loadVoiceSettings(retryCount + 1), delay);
                return;
            }

            // Process whatever voices we got
            let filtered = (voices || []).filter(v =>
                v && v.language && (v.language.startsWith('en') || v.language.startsWith('eng'))
            );

            if (filtered.length === 0 && (voices || []).length > 0) {
                console.log("[AICoach] No English voices, showing all available.");
                filtered = voices;
            }

            setAvailableVoices(filtered);

            // Only change selectedVoice if we don't already have one (from saved pref above)
            if (!selectedVoice && !savedVoice) {
                if (filtered.length > 0) {
                    const defaultVoice = filtered.find(v => v.quality === 'Enhanced') || filtered[0];
                    setSelectedVoice(defaultVoice.identifier);
                } else {
                    console.log("[AICoach] No voices available, keeping saved preference or using default.");
                    setSelectedVoice(prev => prev || 'default');
                }
            } else if (savedVoice && filtered.length > 0 && !filtered.some(v => v.identifier === savedVoice)) {
                // Saved voice not in list — keep it anyway (Samsung may still honor it)
                console.log(`[AICoach] Saved voice '${savedVoice}' not in enumerable list, keeping it anyway.`);
            }
            setIsVoicesLoading(false);
        } catch (e) {
            const errMsg = e?.message || String(e);
            console.warn("[AICoach] Voice fetch error:", errMsg);

            const isVoiceEnumError = errMsg.includes('Unable to get voices') ||
                errMsg.includes('voices') ||
                errMsg.includes('null');

            if (isVoiceEnumError || retryCount >= MAX_VOICE_RETRIES) {
                console.log("[AICoach] Voice enumeration not supported. Keeping saved voice preference.");
                setAvailableVoices([]);
                // Keep saved voice — DON'T override to 'default' if user had a saved preference
                setSelectedVoice(prev => prev || savedVoice || 'default');
                setIsVoicesLoading(false);
            } else {
                const delay = Math.min(800 * Math.pow(2, retryCount), 5000);
                console.log(`[AICoach] Transient error, retrying in ${delay}ms...`);
                setTimeout(() => loadVoiceSettings(retryCount + 1), delay);
            }
        }
    };

    const handleVoiceSelect = async (identifier) => {
        setSelectedVoice(identifier);
        await AsyncStorage.setItem(SELECTED_VOICE_KEY, identifier);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Instant preview with current pitch/rate/language
        Speech.stop();
        const voiceOpts = { language: 'en-US', pitch: voicePitch, rate: voiceRate };
        if (identifier && identifier !== 'default') voiceOpts.voice = identifier;
        Speech.speak("I will speak with this voice from now on.", voiceOpts);
    };

    const handlePitchChange = async (val) => {
        setVoicePitch(val);
        await AsyncStorage.setItem(VOICE_PITCH_KEY, val.toString());
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRateChange = async (val) => {
        setVoiceRate(val);
        await AsyncStorage.setItem(VOICE_RATE_KEY, val.toString());
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const loadSessions = async () => {
        try {
            const data = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
            if (data) setSessions(JSON.parse(data));
        } catch { }
    };

    const saveCurrentSession = async (msgs) => {
        if (msgs.length <= 1) return; // Don't save if only welcome message
        try {
            const existing = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
            const all = existing ? JSON.parse(existing) : [];
            const userMsgs = msgs.filter(m => m.role === 'user');
            if (userMsgs.length === 0) return;

            const session = {
                id: sessionIdRef.current,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                preview: userMsgs[0]?.content?.slice(0, 60) || 'Chat Session',
                messages: msgs,
            };

            const filtered = all.filter(s => s.id !== sessionIdRef.current);
            const updated = [session, ...filtered].slice(0, MAX_SESSIONS);
            await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
            setSessions(updated);
        } catch { }
    };

    const startNewChat = () => {
        showDialog({
            title: "NEW CHAT",
            message: "Start a fresh conversation? Current chat will be saved to history.",
            confirmText: "NEW CHAT",
            cancelText: "CANCEL",
            onConfirm: () => {
                saveCurrentSession(messages);
                sessionIdRef.current = Date.now().toString(); // New session ID
                setMessages([{ ...WELCOME_MSG, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                setInputText('');
                setShowChips(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        });
    };

    const restoreSession = (session) => {
        setMessages(session.messages);
        setShowChips(false);
        setShowHistory(false);
        scrollToBottom();
    };

    const deleteSession = async (id) => {
        try {
            const updated = sessions.filter(s => s.id !== id);
            setSessions(updated);
            await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updated));
        } catch { }
    };

    const clearAllSessions = () => {
        showDialog({
            title: "CLEAR ALL HISTORY?",
            message: "This will permanently delete all past conversations.",
            confirmText: "CLEAR ALL",
            cancelText: "CANCEL",
            isDestructive: true,
            onConfirm: async () => {
                setSessions([]);
                await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
                setShowHistory(false);
            }
        });
    };

    const getSpeechOpts = useCallback(() => {
        const opts = { language: 'en-US', pitch: voicePitch, rate: voiceRate };
        // Always pass the voice identifier — even on Samsung where voices can't be
        // enumerated, the TTS engine still honors specific voice IDs passed via setVoice()
        if (selectedVoice && selectedVoice !== 'default') opts.voice = selectedVoice;
        return opts;
    }, [selectedVoice, voicePitch, voiceRate]);

    const handleSpeak = useCallback((text) => {
        if (isMuted) return;
        Speech.stop();
        Speech.speak(text, getSpeechOpts());
    }, [isMuted, getSpeechOpts]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (newMuted) {
                // Muting — stop any current speech
                Speech.stop();
            } else {
                // Unmuting — replay the last AI message
                const lastAiMsg = [...messages].reverse().find(m => m.role === "assistant");
                if (lastAiMsg) {
                    Speech.stop();
                    Speech.speak(lastAiMsg.content, getSpeechOpts());
                }
            }
            return newMuted;
        });
    }, [messages, getSpeechOpts]);

    const handleSend = useCallback(async (chipText) => {
        const textToSend = typeof chipText === 'string' ? chipText : inputText;
        if (!textToSend.trim() || loading) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Keyboard.dismiss();

        const userMsg = {
            id: Date.now().toString(),
            role: "user",
            content: textToSend.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputText("");
        setLoading(true);
        setShowChips(false);
        scrollToBottom();

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const response = await getGeminiCoachResponse(userMsg.content, history);

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            const allMsgs = [...newMessages, aiMsg];
            setMessages(allMsgs);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            scrollToBottom();

            // Auto-save session after each exchange
            saveCurrentSession(allMsgs);

            // Voice readout (only if not muted)
            if (!isMuted) {
                try {
                    const settings = await getSettings();
                    if (settings.soundEnabled) {
                        Speech.speak(response, getSpeechOpts());
                    }
                } catch {
                    // If settings can't be read, just speak
                    Speech.speak(response, getSpeechOpts());
                }
            }
        } catch (error) {
            console.warn('[AICoach] Error:', error.message);
            let errorContent = "Sorry — I hit a snag. Try again in a second!";
            if (error.message.includes("NETWORK_ERROR")) {
                errorContent = "Looks like you're offline. Check your internet and try again!";
            } else if (error.message.includes("API key") || error.message.includes("401") || error.message.includes("403")) {
                errorContent = "API key issue — please check your Gemini API key in the .env file.";
            } else if (error.message.includes("429")) {
                errorContent = "Too many requests right now. Give it 30 seconds and try again!";
            } else if (error.message.includes("400")) {
                errorContent = "Something went wrong with the request. Try sending a shorter message!";
            }
            const errMsg = {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: errorContent,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errMsg]);
            scrollToBottom();
        } finally {
            setLoading(false);
        }
    }, [inputText, loading, messages, scrollToBottom, isMuted, getSpeechOpts]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Ambient glow */}
            <LinearGradient
                colors={["rgba(227,30,36,0.1)", "transparent"]}
                style={[StyleSheet.absoluteFill, { height: 250 }]}
            />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerSub}>PERSONAL COACH</Text>
                    <Text style={styles.headerTitle}>CONQUER AI</Text>
                </View>
                <View style={styles.headerActions}>
                    {/* Voice Selection */}
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowVoiceSettings(true)} activeOpacity={0.7}>
                        <Ionicons name="settings-outline" size={19} color={COLORS.text} />
                    </TouchableOpacity>
                    {/* History */}
                    <TouchableOpacity style={styles.headerBtn} onPress={() => { loadSessions(); setShowHistory(true); }} activeOpacity={0.7}>
                        <Ionicons name="time-outline" size={19} color={COLORS.text} />
                    </TouchableOpacity>
                    {/* New Chat */}
                    <TouchableOpacity style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }]} onPress={startNewChat} activeOpacity={0.7}>
                        <Ionicons name="add" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Status row */}
            <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>AI ACTIVE · GEMINI POWERED</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.msgCount}>{messages.length - 1} MESSAGES</Text>
            </View>

            {/* ── Chat + Input ── */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Chat area */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.chatBody}
                    contentContainerStyle={styles.chatContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={scrollToBottom}
                >
                    {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onSpeak={handleSpeak} />)}
                    {loading && (
                        <View style={styles.aiRow}>
                            <View style={styles.aiAvatar}><ActivityIndicator size="small" color={COLORS.accent} /></View>
                            <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 12 }]}>
                                <TypingDots />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* ── Quick Chips ── */}
                {showChips && !loading && messages.length < 4 && (
                    <GHScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={{ flexGrow: 0, maxHeight: 52 }}
                        contentContainerStyle={styles.chipsRow}
                    >
                        {ACTION_CHIPS.map((chip, i) => (
                            <TouchableOpacity key={i} style={styles.chip} onPress={() => handleSend(chip)} activeOpacity={0.7}>
                                <Text style={styles.chipText}>{chip.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </GHScrollView>
                )}

                {/* ── Input Bar ── */}
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    {/* Mute toggle button */}
                    <View style={styles.inputRow}>
                        <TouchableOpacity
                            style={[styles.stopBtn, isMuted && styles.stopBtnActive]}
                            onPress={toggleMute}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isMuted ? "volume-mute" : "volume-high-outline"}
                                size={18}
                                color={isMuted ? COLORS.accent : COLORS.textMuted}
                            />
                        </TouchableOpacity>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                placeholder="Ask your coach..."
                                placeholderTextColor="rgba(255,255,255,0.22)"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={500}
                                onSubmitEditing={() => handleSend()}
                                returnKeyType="send"
                                blurOnSubmit={false}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnOff]}
                                onPress={() => handleSend()}
                                activeOpacity={0.8}
                                disabled={loading}
                            >
                                {loading
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Ionicons name="send" size={17} color={inputText.trim() ? "#fff" : "rgba(255,255,255,0.25)"} />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* ── History Modal ── */}
            <HistoryModal
                visible={showHistory}
                sessions={sessions}
                onClose={() => setShowHistory(false)}
                onRestore={restoreSession}
                onDelete={deleteSession}
                onClearAll={clearAllSessions}
            />

            {/* ── Voice Settings Modal ── */}
            <VoiceSettingsModal
                visible={showVoiceSettings}
                voices={availableVoices}
                selectedVoice={selectedVoice}
                onSelect={handleVoiceSelect}
                onClose={() => setShowVoiceSettings(false)}
                isLoading={isVoicesLoading}
                onRefresh={() => loadVoiceSettings(0)}
                pitch={voicePitch}
                rate={voiceRate}
                onPitchChange={handlePitchChange}
                onRateChange={handleRateChange}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },

    // Header
    header: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
        backgroundColor: "rgba(0,0,0,0.9)",
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
        gap: 12,
    },
    headerCenter: { flex: 1 },
    headerSub: { fontSize: 8, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 2.5, marginBottom: 2 },
    headerTitle: { fontSize: 20, fontFamily: FAMILY.display, color: "#fff", letterSpacing: -0.5 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: {
        width: 40, height: 40, borderRadius: 13,
        backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },

    // Status row
    statusRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    statusText: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },
    msgCount: { fontSize: 9, fontFamily: FAMILY.bold, color: COLORS.textMuted, letterSpacing: 1 },

    // Chat
    chatBody: { flex: 1 },
    chatContent: { padding: 16, paddingBottom: 20, gap: 4 },

    msgRow: { flexDirection: "row", marginBottom: 14 },
    userRow: { alignSelf: "flex-end", justifyContent: "flex-end", maxWidth: "80%" },
    aiRow: { alignSelf: "flex-start", gap: 10, maxWidth: "88%" },

    aiAvatar: {
        width: 30, height: 30, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginTop: 4, flexShrink: 0,
    },

    bubble: { borderRadius: 20, padding: 14 },
    aiBubble: {
        backgroundColor: "rgba(255,255,255,0.05)", borderTopLeftRadius: 4,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    userBubble: {
        backgroundColor: COLORS.primary, borderTopRightRadius: 4,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
    },

    msgText: { fontSize: 14, lineHeight: 22, fontFamily: FAMILY.medium },
    aiText: { color: "#e8e8e8" },
    userText: { color: "#fff" },

    bubbleFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 8, gap: 8 },
    timeText: { fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: FAMILY.bold, letterSpacing: 0.5 },
    speakBtn: { opacity: 0.6 },

    // Chips
    chipsRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: 'center' },
    chip: {
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    chipText: { fontSize: 10, color: "#8E8E93", fontFamily: FAMILY.bold, letterSpacing: 0.6 },

    // Input
    inputContainer: { paddingHorizontal: 14, paddingTop: 8 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    stopBtn: {
        width: 40, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        marginBottom: 2,
    },
    stopBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.2)',
    },
    inputWrapper: {
        flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 8,
        backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 24,
        paddingLeft: 18, paddingRight: 8, paddingVertical: 8,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    input: {
        flex: 1, color: "#fff", fontFamily: FAMILY.medium, fontSize: 15,
        maxHeight: 120, minHeight: 34, paddingVertical: 5, lineHeight: 22,
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary,
        alignItems: "center", justifyContent: "center",
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    },
    sendBtnOff: { backgroundColor: "rgba(255,255,255,0.05)", shadowOpacity: 0, elevation: 0 },
});
