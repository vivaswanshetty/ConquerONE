import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
    apiKey: "AIzaSyDXfVFemHWjaCQBNnha58gto1JvoCj7hwg",
    authDomain: "conquerone.firebaseapp.com",
    projectId: "conquerone",
    storageBucket: "conquerone.firebasestorage.app",
    messagingSenderId: "100815258954",
    appId: "1:100815258954:web:bb4ba682eb51cd0b7d6db3",
    measurementId: "G-3Z2V1YGEYN",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Auth — persists login across app restarts using AsyncStorage
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore — the main cloud database
export const db = getFirestore(app);

// Storage — for image uploads (avatars)
export const storage = getStorage(app);

export default app;
