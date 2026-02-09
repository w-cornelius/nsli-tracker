import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIQcSPpjMwtvIGZNkKwAf8m1j2eZOV5Hs",
  authDomain: "nsli-tracker.firebaseapp.com",
  projectId: "nsli-tracker",
  storageBucket: "nsli-tracker.firebasestorage.app",
  messagingSenderId: "258275906593",
  appId: "1:258275906593:web:4f03fb3ad2ece1c81b7f60",
  measurementId: "G-8PLMCJNB29"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize and export Auth and Database
export const auth = getAuth(app);
export const db = getFirestore(app);