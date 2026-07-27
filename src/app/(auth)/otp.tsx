import React from "react";

import {
  View,
  Text,
  StyleSheet,
  Alert,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { saveSession } from "@/utils/storage";
import OTPInput from "@/components/auth/OTPInput";
import AppButton from "@/components/common/AppButton";
import ResendTimer from "@/components/auth/ResendTimer";
import AuthService from "@/services/auth";
import { backendLogin } from "@/services/backendAuth";

import useAuthStore from "@/store/authStore";

import colors from "@/theme/colors";

export default function OTPScreen() {
  const { phone } = useLocalSearchParams<{
    phone: string;
  }>();

  const login = useAuthStore((state) => state.login);
const [verifying, setVerifying] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [otp, setOTP] = React.useState("");
const [seconds, setSeconds] = React.useState(30);
  const [confirmation, setConfirmation] =
    React.useState<any>(null);

  React.useEffect(() => {
    sendOTP();
  }, []);

  React.useEffect(() => {
  if (otp.length === 6 && !verifying) {
    verify();
  }
}, [otp]);

  React.useEffect(() => {
  if (seconds === 0) return;

  const timer = setTimeout(() => {
    setSeconds((s) => s - 1);
  }, 1000);

  return () => clearTimeout(timer);
}, [seconds]);

 async function sendOTP() {
  if (seconds > 0 && confirmation) return;

  try {
    setLoading(true);

    const confirmationResult =
      await AuthService.sendOTP(`+91${phone}`);

    setConfirmation(confirmationResult);

    setSeconds(30);
  } catch (error: any) {
    Alert.alert(
      "Unable to send OTP",
      error?.message ?? "Please try again."
    );
  } finally {
    setLoading(false);
  }
}

  async function verify() {
    if (!confirmation) {
      Alert.alert(
        "Error",
        "Please request an OTP first."
      );
      return;
    }

    if (otp.length !== 6) {
      Alert.alert(
        "Invalid OTP",
        "Please enter the 6-digit verification code."
      );
      return;
    }

    try {
      setVerifying(true);

      // Firebase verification
      const firebase =
        await AuthService.verifyOTP(
          confirmation,
          otp
        );

      // Login to Flask backend
      const backend =
        await backendLogin(firebase.token);
console.log("Backend response:", backend);
console.log("access_token:", backend.access_token, typeof backend.access_token);
console.log("user:", backend.user, typeof backend.user);
      // Store JWT securely
      await saveSession(
  backend.access_token,
  backend.user
);

login(
  backend.user,
  backend.access_token
);

      // Navigate
      router.replace(
        "/(protected)/dashboard"
      );
    } catch (error: any) {
      console.log(error);

      Alert.alert(
        "Verification Failed",
        error?.message ??
          "Incorrect OTP."
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Verify Phone
      </Text>

      <Text style={styles.subtitle}>
        We've sent a 6-digit verification code to
      </Text>

      <Text style={styles.phone}>
    +91 {phone}
</Text>

      <OTPInput
    value={otp}
    onChange={setOTP}
    editable={!verifying}
/>

      {
  verifying && (
    <Text style={styles.verifying}>
      Verifying...
    </Text>
  )
}

      <ResendTimer
    seconds={seconds}
    onResend={sendOTP}
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
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