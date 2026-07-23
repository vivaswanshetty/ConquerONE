import React, { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendEmailVerification,
    verifyBeforeUpdateEmail,
    GoogleAuthProvider,
    AppleAuthProvider,
    signInWithCredential,
} from "firebase/auth";
import * as AppleAuthentication from 'expo-apple-authentication';
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../utils/firebase";
import { migrateLocalDataToCloud } from "../utils/firestore";
import { getWorkoutHistory, getStreak, getTotalWorkouts, getXP, getPRRecords, getBodyStats } from "../utils/storage";

let GoogleSignin = null;
try {
    const googleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule?.GoogleSignin || null;
    if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
        GoogleSignin.configure({
            webClientId: '100815258954-9tbcs233f7uqiech80asjbjktrtng8rs.apps.googleusercontent.com',
        });
    }
} catch (e) {
    console.warn("[Auth] Native GoogleSignin module unavailable in current environment.");
}

const AuthContext = createContext(null);

const syncCloudToLocal = async () => {
    try {
        await Promise.all([
            getWorkoutHistory(),
            getStreak(),
            getTotalWorkouts(),
            getXP(),
            getPRRecords(),
            getBodyStats()
        ]);
        console.log("[Sync] Local AsyncStorage hydrated successfully with cloud data.");
    } catch (e) {
        console.warn("[Sync] Initial cloud-to-local sync failed", e);
    }
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);       // Firebase auth user
    const [profile, setProfile] = useState(null); // Firestore user profile
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes (login / logout / app restart)
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Attempt to load cached profile from local storage for instant render
                try {
                    const cached = await AsyncStorage.getItem("cached_user_profile");
                    if (cached) {
                        setProfile(JSON.parse(cached));
                    }
                } catch (e) {
                    console.warn("[Auth] Failed to read cached profile", e);
                }
                setLoading(false); // Unblock UI immediately
                await loadProfile(firebaseUser.uid);
                syncCloudToLocal();
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
                try {
                    await AsyncStorage.removeItem("cached_user_profile");
                } catch (e) {}
            }
        });
        return unsub;
    }, []);

    const loadProfile = async (uid) => {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
                const data = snap.data();
                setProfile(data);
                await AsyncStorage.setItem("cached_user_profile", JSON.stringify(data));
            }
        } catch (e) {
            console.error("[Auth] Failed to load profile", e);
        }
    };

    /**
     * Sign up a new user with email, password, and profile data.
     * Creates the Firestore user document on success.
     */
    const signUp = async ({ email, password, fullName, dateOfBirth, gender }) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: fullName });

        const profileData = {
            uid: cred.user.uid,
            email,
            fullName,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            createdAt: serverTimestamp(),
            streak: 0,
            totalWorkouts: 0,
            lastWorkoutDate: null,
            settings: {},
        };

        // Write profile to Firestore — non-blocking so signup succeeds even if DB write is slow
        try {
            await setDoc(doc(db, "users", cred.user.uid), profileData);
            setProfile(profileData);
        } catch (dbErr) {
            console.warn("[Auth] Firestore profile write failed (rules not set?):", dbErr.code, dbErr.message);
            setProfile({ ...profileData, createdAt: new Date().toISOString() });
        }

        // Push local offline data to Firestore after successful signup
        await migrateLocalDataToCloud(cred.user.uid);

        return cred.user;
    };

    /**
     * Sign in an existing user.
     */
    const signIn = async ({ email, password }) => {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await loadProfile(cred.user.uid);
        // Also try migration on sign-in (it only runs once due to internal flag)
        await migrateLocalDataToCloud(cred.user.uid);
        return cred.user;
    };

    /**
     * Sign out the current user.
     */
    const signOutUser = async () => {
        await signOut(auth);
    };

    /**
     * Update a field in the user's Firestore profile.
     */
    const updateUserProfile = async (updates) => {
        if (!user) return;
        const ref = doc(db, "users", user.uid);
        await setDoc(ref, updates, { merge: true });

        // Sync with Firebase Auth Profile (skip data URIs — Auth has a URL length limit)
        const authUpdates = {};
        if (updates.fullName) authUpdates.displayName = updates.fullName;
        if (updates.photoURL && !updates.photoURL.startsWith('data:')) {
            authUpdates.photoURL = updates.photoURL;
        }

        if (Object.keys(authUpdates).length > 0) {
            try {
                await updateProfile(user, authUpdates);
            } catch (e) {
                console.warn("[Auth] Failed to sync Auth profile:", e.message);
            }
        }

        setProfile((prev) => ({ ...prev, ...updates }));
    };

    /**
     * Send email verification link.
     */
    const verifyEmail = async () => {
        if (!user) return;
        await sendEmailVerification(user);
    };

    /**
     * Securely change email address.
     * Firebase sends a verification email to the NEW address.
     * The update only finishes once the new email is verified.
     */
    const changeEmail = async (newEmail) => {
        if (!user) return;
        await verifyBeforeUpdateEmail(user, newEmail);
        // Also update the email in our Firestore profile
        await updateUserProfile({ email: newEmail });
    };

    /**
     * Helper to ensure Firestore profile exists for social logins
     */
    const ensureSocialProfile = async (firebaseUser) => {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!snap.exists()) {
            const profileData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                fullName: firebaseUser.displayName || "ATHLETE",
                photoURL: firebaseUser.photoURL || null,
                createdAt: serverTimestamp(),
                streak: 0,
                totalWorkouts: 0,
                lastWorkoutDate: null,
                settings: {},
            };
            await setDoc(doc(db, "users", firebaseUser.uid), profileData);
            setProfile(profileData);
        } else {
            setProfile(snap.data());
        }
    };

    /**
     * Sign in with Google (Native)
     */
    const signInWithGoogle = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const { data } = await GoogleSignin.signIn();
            const googleCredential = GoogleAuthProvider.credential(data.idToken);
            const res = await signInWithCredential(auth, googleCredential);
            await ensureSocialProfile(res.user);
            await migrateLocalDataToCloud(res.user.uid);
            return res.user;
        } catch (error) {
            console.error("[Auth] Google Sign-In Error:", error);
            throw error;
        }
    };

    /**
     * Sign in with Apple (Native)
     */
    const signInWithApple = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            const { identityToken } = credential;
            const appleCredential = AppleAuthProvider.credential(identityToken);
            const res = await signInWithCredential(auth, appleCredential);
            await ensureSocialProfile(res.user);
            await migrateLocalDataToCloud(res.user.uid);
            return res.user;
        } catch (error) {
            console.error("[Auth] Apple Sign-In Error:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                signUp,
                signIn,
                signInWithGoogle,
                signInWithApple,
                signOut: signOutUser,
                updateUserProfile,
                verifyEmail,
                changeEmail,
                reloadProfile: () => loadProfile(user?.uid),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
