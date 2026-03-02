import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FAMILY, SPACING } from '../utils/theme';

/**
 * A sleek, high-end "No Internet" banner.
 * It uses a simple heartbeat (fetching a small resource) to check connectivity
 * since we avoid heavy external libraries for now.
 */
export default function NetworkBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        const checkConnectivity = async () => {
            try {
                // Try to reach a reliable endpoint
                const response = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
                if (response) setIsOffline(false);
            } catch (e) {
                setIsOffline(true);
            }
        };

        const interval = setInterval(checkConnectivity, 10000); // Check every 10s
        checkConnectivity();

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isOffline ? 0 : -100,
            useNativeDriver: true,
            tension: 20,
            friction: 7
        }).start();
    }, [isOffline]);

    if (!isOffline) return null;

    return (
        <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
            <Text style={styles.text}>OFFLINE MODE · DATA WILL SYNC LATER</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.primary, // Red/Rose
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: SPACING.base,
        zIndex: 9999,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontFamily: FAMILY.bold,
        letterSpacing: 1.5,
    },
});
