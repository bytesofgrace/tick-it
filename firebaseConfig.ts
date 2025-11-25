import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAro5mLnHG-RTAJQztbG2fxmt6huGR_wcc",
  authDomain: "tick-it-67ff9.firebaseapp.com",
  projectId: "tick-it-67ff9",
  storageBucket: "tick-it-67ff9.firebasestorage.app",
  messagingSenderId: "37564284985",
  appId: "1:37564284985:web:9a3f47086fc2c1a0ed0de8",
  measurementId: "G-NEN4VLPHVZ"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
// Note: Auth persistence is handled in AuthContext.tsx using AsyncStorage
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };