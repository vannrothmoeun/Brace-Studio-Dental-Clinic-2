import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import config from "../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: config.apiKey || "AIzaSyDEMIxNfeG-l5pfyqN4aSImtJ32rpQdY2o",
  authDomain: config.authDomain || "brace-studio-dental-clinic.firebaseapp.com",
  projectId: config.projectId || "brace-studio-dental-clinic",
  storageBucket: config.storageBucket || "brace-studio-dental-clinic.firebasestorage.app",
  messagingSenderId: config.messagingSenderId || "964642352992",
  appId: config.appId || "1:964642352992:web:f2fee32282e6da8a7df805",
  measurementId: config.measurementId || "G-Y7RB5MYERD",
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with Database ID from config or default
// Initialize Firestore directly with the AI Studio Database ID
export const db = getFirestore(app, "ai-studio-16681b43-f991-4fe4-ab00-e423a7c60c65");
