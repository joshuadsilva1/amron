import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Alert from "@/utils/alert";
import { router, useLocalSearchParams } from "expo-router";

// 1. Correct Web SDK Imports
import { auth } from "@/services/firebaseConfig"; 
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth"; 

import { saveSession } from "@/utils/storage";
import OTPInput from "@/components/auth/OTPInput";
import ResendTimer from "@/components/auth/ResendTimer";
import { backendLogin } from "@/services/backendAuth";
import useAuthStore from "@/store/authStore";
import { getRouteForRole } from "@/utils/roleRouting";
import colors from "@/theme/colors";

export default function OTPScreen() {
  const { phone, verificationId } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const login = useAuthStore((state) => state.login);
  
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOTP] = useState("");
  const [seconds, setSeconds] = useState(30);
  
  const [activeVerificationId, setActiveVerificationId] = useState<string>(verificationId);

  useEffect(() => {
    if (otp.length === 6 && !verifying) {
      verify();
    }
  }, [otp]);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => {
      setSeconds((s) => s - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function sendOTP() {
    if (seconds > 0) return;
    
    // NOTE: In the Web SDK, resending an OTP requires passing the reCAPTCHA verifier again.
    // For now, we will alert the user to go back to the login screen to get a new code.
    Alert.alert("Timeout", "Please go back to the previous screen to request a new code.");
  }

  async function verify() {
    if (!activeVerificationId) {
      Alert.alert("Error", "Session lost. Please go back and request a new OTP.");
      return;
    }

    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit verification code.");
      return;
    }

    try {
      setVerifying(true);

      // 2. WEB SDK SYNTAX: Create credential using PhoneAuthProvider directly
      const credential = PhoneAuthProvider.credential(activeVerificationId, otp);
      
      // 3. WEB SDK SYNTAX: Pass the 'auth' instance into the sign-in function
      const userCredential = await signInWithCredential(auth, credential);
      
      // 4. Get Token
      const token = await userCredential.user.getIdToken();

      // Login to Flask backend
      const backend = await backendLogin(token);

      // Store JWT securely
      await saveSession(backend.access_token, backend.user);
      login(backend.user, backend.access_token);

      // Routing Logic

      const nextRoute = getRouteForRole(backend.user.role);
      router.replace(nextRoute as any);

    } catch (error: any) {
      console.log("Verify Error:", error);
      Alert.alert("Verification Failed", error?.message ?? "Incorrect OTP.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Verify Phone</Text>
      <Text style={styles.subtitle}>We've sent a 6-digit verification code to</Text>
      
      <Text style={styles.phone}>{phone}</Text> 

      <OTPInput
        value={otp}
        onChange={setOTP}
        editable={!verifying}
      />

      {verifying && (
        <Text style={styles.verifying}>Verifying...</Text>
      )}

      <ResendTimer
        seconds={seconds}
        onResend={sendOTP}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background, 
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.navy,
  },
  subtitle: {
    marginTop: 12,
    color: colors.secondary,
    fontSize: 16,
  },
  phone: {
    marginTop: 8,
    marginBottom: 30,
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  resend: {
    marginTop: 28,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  verifying: {
    marginTop: 30,
    textAlign: "center",
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});