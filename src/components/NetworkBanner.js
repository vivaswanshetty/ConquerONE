import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FAMILY, SPACING } from '../utils/theme';

/**
 * A sleek, high-end "No Internet" banner.
 * Shows briefly on app launch if no connection, then vanishes.
 * Only appears again when manually triggered (e.g. from Sync button).
 */
export default function NetworkBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-160)).current;
    const insets = useSafeAreaInsets();
    const hideTimer = useRef(null);

    const showBanner = async () => {
        try {
            const response = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
            if (response) {
                setIsVisible(false);
            }
        } catch (e) {
            // No internet
            setIsVisible(true);

            // Clear existing timer if any
            if (hideTimer.current) clearTimeout(hideTimer.current);

            // Auto hide after 5 seconds
            hideTimer.current = setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        }
    };

    useEffect(() => {
        // Initial check on mount
        showBanner();

        // Listen for manual trigger events
        const subscription = DeviceEventEmitter.addListener('showNetworkBanner', showBanner);

        return () => {
            subscription.remove();
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, []);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isVisible ? 0 : -160,
            useNativeDriver: true,
            tension: 20,
            friction: 7
        }).start();
    }, [isVisible]);

    // Keep it in the DOM but hidden via translateY to avoid layout jumps and support animations
    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    paddingTop: (insets.top > 0 ? insets.top : 24) + 6,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <Ionicons name="wifi-outline" size={14} color="#fff" />
            <Text style={styles.text}>NO INTERNET · DATA WILL SYNC LATER</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: SPACING.base,
        zIndex: 9999,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontFamily: FAMILY.bold,
        letterSpacing: 1.5,
    },
});
