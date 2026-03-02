import 'react-native-url-polyfill/auto'; // Required for Firebase + React Native
import React, { useState, useEffect, useCallback } from "react";
import { Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { Syne_400Regular, Syne_700Bold } from "@expo-google-fonts/syne";
import { Arimo_400Regular, Arimo_700Bold } from "@expo-google-fonts/arimo";
import { Urbanist_700Bold, Urbanist_800ExtraBold, Urbanist_900Black } from "@expo-google-fonts/urbanist";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
import NetworkBanner from "./src/components/NetworkBanner";

// Auth
import { AuthProvider, useAuth } from "./src/context/AuthContext";

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
    </Stack.Navigator>
  );
}

/* ─── Root navigator — switches between stacks based on auth ─── */
function RootNavigator() {
  const { user, loading } = useAuth();

  // While Firebase checks persisted session, show nothing (splash is still visible)
  if (loading) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  return user ? <AppStack /> : <AuthStack />;
}

/* ─── Main App ───────────────────────────────────────────────── */
export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
    Urbanist_900Black,
    Syne_700Bold,
    Arimo_400Regular,
    Arimo_700Bold,
  });

  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);

  if (fontsLoaded) {
    Text.defaultProps = Text.defaultProps ?? {};
    Text.defaultProps.style = { fontFamily: "Outfit_400Regular" };
  }

  useEffect(() => {
    // OTA update check (silent)
    setTimeout(async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setIsDownloadingUpdate(true);
          await Updates.fetchUpdateAsync();
          setTimeout(async () => { await Updates.reloadAsync(); }, 2000);
        }
      } catch (_) {
        console.log("[App] Auto-sync skipped");
      }
    }, 1000);
  }, []);

  // Safety timeout to always hide splash
  useEffect(() => {
    const timer = setTimeout(async () => {
      try { await SplashScreen.hideAsync(); } catch (e) { }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      try { await SplashScreen.hideAsync(); } catch (e) { }
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} onLayout={onLayoutRootView} />;
  }

  if (isDownloadingUpdate) {
    return <UpdateScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <NetworkBanner />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
