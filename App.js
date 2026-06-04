import 'react-native-url-polyfill/auto'; // Required for Firebase + React Native
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Text, View, InteractionManager } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import * as Updates from "expo-updates";

// ── Font assets (these are pre-resolved require() calls to .ttf files) ──
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { Syne_700Bold } from "@expo-google-fonts/syne";
import { Arimo_400Regular, Arimo_700Bold } from "@expo-google-fonts/arimo";
import { Urbanist_900Black } from "@expo-google-fonts/urbanist";
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold
} from "@expo-google-fonts/montserrat";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import OnboardingScreen, { ONBOARDING_KEY } from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import WorkoutDetailScreen from "./src/screens/WorkoutDetailScreen";
import ActiveWorkoutScreen from "./src/screens/ActiveWorkoutScreen";
import WorkoutCompleteScreen from "./src/screens/WorkoutCompleteScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import CustomWorkoutScreen from "./src/screens/CustomWorkoutScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import RestDayScreen from "./src/screens/RestDayScreen";
import UpdateScreen from "./src/screens/UpdateScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AICoachScreen from "./src/screens/AICoachScreen";
import RankScreen from "./src/screens/RankScreen";
import ProtocolIntelScreen from "./src/screens/ProtocolIntelScreen";
import NetworkBanner from "./src/components/NetworkBanner";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { NotificationProvider } from "./src/context/NotificationContext";

SplashScreen.preventAutoHideAsync().catch(() => { });

const Stack = createStackNavigator();

const transition = ({ current }) => ({
  cardStyle: {
    opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{
      translateY: current.progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
    }],
  },
});

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: "#000000" },
  gestureEnabled: true,
  cardStyleInterpolator: transition,
};

/* ─── Auth stack (unauthenticated users) ─────────────────────── */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

/* ─── App stack (authenticated users) ───────────────────────── */
function AppStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Main" component={HomeScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="WorkoutComplete" component={WorkoutCompleteScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CustomWorkout" component={CustomWorkoutScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="RestDay" component={RestDayScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AICoach" component={AICoachScreen} />
      <Stack.Screen name="Rank" component={RankScreen} />
      <Stack.Screen name="ProtocolIntel" component={ProtocolIntelScreen} />
    </Stack.Navigator>
  );
}

/* Root navigator — switches between stacks based on auth */
function RootNavigator({ fontsLoaded }) {
  const { user, loading } = useAuth();

  if (loading || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  return user ? <AppStack /> : <AuthStack />;
}

/*
 * ─── Font Loading Strategy ─────────────────────────────────────
 *
 * CRITICAL fonts (block splash): Only the 3 fonts used on the first
 * visible screen (HomeScreen / OnboardingScreen). This cuts boot time
 * because we load 3 fonts instead of 8 before showing the first frame.
 *
 * DEFERRED fonts: Loaded silently in the background after the splash
 * hides and the app is already interactive. These are only needed on
 * secondary screens (WorkoutDetail, WorkoutComplete, Rank, etc.)
 */
const CRITICAL_FONTS = {
  Arimo_400Regular,
  Arimo_700Bold,
  Outfit_400Regular,
};

const DEFERRED_FONTS = {
  Outfit_300Light,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Urbanist_900Black,
  Syne_700Bold,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
};

/* Main App */
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const splashHidden = useRef(false);

  // ── Step 1: Load only the 3 critical fonts (blocks splash) ──
  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync(CRITICAL_FONTS);
      } catch (e) {
        console.warn("Critical font load failed", e);
      } finally {
        setFontsLoaded(true);
      }
    })();
  }, []);

  // ── Step 2: Deferred font loading ──
  useEffect(() => {
    if (!fontsLoaded) return;
    // Tiny delay to ensure first frame render is prioritized
    const timer = setTimeout(() => {
      Font.loadAsync(DEFERRED_FONTS).catch(() => { });
    }, 100);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  // ── Step 4: OTA update check (delayed to prioritize app launch) ──
  useEffect(() => {
    let cancelled = false;
    const checkUpdate = async () => {
      if (__DEV__ || cancelled) return;

      // Auto-fail after 15s to prevent being stuck on the UpdateScreen forever
      const updateTimeout = setTimeout(() => {
        if (!cancelled) setIsDownloadingUpdate(false);
      }, 15000);

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          if (cancelled) return;
          setIsDownloadingUpdate(true);
          await Updates.fetchUpdateAsync();
          if (!cancelled) {
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        console.warn("Update check failed", e);
        if (!cancelled) setIsDownloadingUpdate(false);
      } finally {
        clearTimeout(updateTimeout);
      }
    };

    // Run after initial interactions so OTA work doesn't compete with first-screen rendering.
    const timer = setTimeout(() => {
      const task = InteractionManager.runAfterInteractions(checkUpdate);
      if (cancelled) task.cancel();
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ── Step 5: Emergency splash screen fallback ──
  useEffect(() => {
    if (fontsLoaded) {
      const timer = setTimeout(async () => {
        if (!splashHidden.current) {
          splashHidden.current = true;
          try { await SplashScreen.hideAsync(); } catch (_) { }
        }
      }, 500); // Quick safety net — onLayout normally handles this faster
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !splashHidden.current) {
      splashHidden.current = true;
      try {
        await SplashScreen.hideAsync();
      } catch (e) { }
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Keep splash screen visible until critical fonts are ready
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <NotificationProvider>
          <StatusBar style="light" />
          <AuthProvider>
            <NetworkBanner />
            {isDownloadingUpdate ? (
              <UpdateScreen />
            ) : (
              <NavigationContainer>
                <RootNavigator fontsLoaded={fontsLoaded} />
              </NavigationContainer>
            )}
          </AuthProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
