// src/firebase.js
// All Firebase logic lives here — init, auth, read, write
// We use anonymous auth so users never have to sign up
// Each user gets a silent Firebase session automatically

import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";

// ── Firebase config from .env ─────────────────────────────────────────────────
// These are PUBLIC values (safe to expose in frontend code)
// They only control WHICH Firebase project to connect to
// Your Firestore rules control WHO can read/write
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Initialize Firebase (runs once when this file is first imported) ──────────
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── PUBLIC: getOrCreateAnonymousUser ─────────────────────────────────────────
// Signs in silently. If already signed in (e.g. returning user same browser),
// Firebase reuses the existing session automatically.
// Returns the Firebase User object with a uid (unique ID string).
export async function getOrCreateAnonymousUser() {
    // Check if already signed in
    if (auth.currentUser) return auth.currentUser;

    // Wait for auth to initialize (handles page refresh case)
    const user = await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (u) => {
            unsub(); // stop listening after first event
            resolve(u);
        });
    });

    // Already has a session (returning user)
    if (user) return user;

    // First time — create anonymous account silently
    const credential = await signInAnonymously(auth);
    return credential.user;
}

// ── PUBLIC: saveResume ────────────────────────────────────────────────────────
// Saves the parsed resume JSON to Firestore.
// Returns a shareId — a short random string used in the shareable URL.
// Structure in Firestore:
//   resumes/{shareId} → { ownerId, resumeData, createdAt, shareId }
export async function saveResume(resumeData) {
    // Make sure we have an anonymous user first
    const user = await getOrCreateAnonymousUser();

    // Generate a short random ID for the shareable URL
    // e.g. "xK9mP2" — 6 chars, URL-safe
    const shareId = generateShareId();

    const docRef = doc(db, "resumes", shareId);

    await setDoc(docRef, {
        shareId,
        ownerId: user.uid,          // who owns this (for write rules)
        resumeData,                 // the full parsed JSON
        createdAt: serverTimestamp(), // Firestore server time
        views: 0,                   // track how many times it's been viewed
    });

    return shareId;
}

// ── PUBLIC: loadResume ────────────────────────────────────────────────────────
// Loads a resume by its shareId.
// Used when someone visits /r/xK9mP2 — no auth needed to read.
// Returns the resumeData object, or null if not found.
export async function loadResume(shareId) {
    const docRef = doc(db, "resumes", shareId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    const data = snap.data();
    return data.resumeData;
}

// ── PUBLIC: isCurrentUserOwner ────────────────────────────────────────────────
// Check if the currently signed-in anonymous user owns a given resume.
// Used to show/hide the "Edit" and "Delete" buttons.
export async function isCurrentUserOwner(shareId) {
    const user = auth.currentUser;
    if (!user) return false;

    const docRef = doc(db, "resumes", shareId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;

    return snap.data().ownerId === user.uid;
}

// ── PRIVATE: generateShareId ──────────────────────────────────────────────────
// Generates a short, URL-safe random ID like "xK9mP2"
// Not cryptographically secure — fine for resume sharing
function generateShareId(length = 6) {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    // ^ removed confusable chars: 0/O, 1/l/I
    let id = "";
    for (let i = 0; i < length; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}