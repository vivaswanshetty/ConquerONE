import React, { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../utils/firebase";
import { migrateLocalDataToCloud } from "../utils/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);       // Firebase auth user
    const [profile, setProfile] = useState(null); // Firestore user profile
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes (login / logout / app restart)
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                await loadProfile(firebaseUser.uid);
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const loadProfile = async (uid) => {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) setProfile(snap.data());
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
        setProfile((prev) => ({ ...prev, ...updates }));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                signUp,
                signIn,
                signOut: signOutUser,
                updateUserProfile,
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
