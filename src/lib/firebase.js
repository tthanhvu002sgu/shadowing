import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAbjRzIgtmLpgO8fcz2r9qfZZaVcx11h90",
  authDomain: "shadowing-app-9f2b.firebaseapp.com",
  projectId: "shadowing-app-9f2b",
  storageBucket: "shadowing-app-9f2b.firebasestorage.app",
  messagingSenderId: "297540115470",
  appId: "1:297540115470:web:75eb323a6a10f89296b05f"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
