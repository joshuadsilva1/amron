import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';

// Replace with your actual Firebase Web config!
const firebaseConfig = {
  apiKey: "AIzaSyA7z5Avp2TG1vzWdUUjXnG7jZrpcmWIBpM",
  authDomain: "oemamron.firebaseapp.com",
  projectId: "oemamron",
  storageBucket: "oemamron.firebasestorage.app",
  messagingSenderId: "202141749117",
  appId: "1:202141749117:web:25ace335d98217b8c44614"
};

let auth: any;

try {
  console.log("Starting Firebase Initialization...");
  const app = initializeApp(firebaseConfig);

  // Firebase auth here is only used transiently during phone-OTP login
  // (send OTP -> verify -> get ID token -> exchange for our own JWT via
  // backendLogin, see otp.tsx). Our own JWT + SecureStore is what actually
  // persists the session across app restarts, so Firebase's own
  // auth-state persistence is irrelevant and doesn't need configuring —
  // which also sidesteps `getReactNativePersistence`, a helper that no
  // longer exists in this firebase package version and was crashing
  // init on native (silently, since it was caught below).
  auth = initializeAuth(app);
  console.log("Firebase Initialized Successfully!");
} catch (error) {
  console.error("🔥 FATAL FIREBASE ERROR:", error);
}

export { auth, firebaseConfig };