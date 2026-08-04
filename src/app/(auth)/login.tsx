import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import Alert from "@/utils/alert";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { auth, firebaseConfig } from "@/services/firebaseConfig";
// Import RecaptchaVerifier for the Web
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

import { PhoneForm, phoneSchema } from "@/utils/validation";
import PhoneInput from "@/components/auth/PhoneInput";
import AppButton from "@/components/common/AppButton";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  
  // Ref for Mobile
  const recaptchaVerifierModal = useRef(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    mode: "onChange",
    defaultValues: {
      phone: "",
    },
  });

  const onSubmit = async (data: PhoneForm) => {
    setLoading(true);
    try {
      const digitsOnly = data.phone.replace(/\D/g, '');
      const formattedPhone = digitsOnly.length === 10 ? `+91${digitsOnly}` : `+${digitsOnly}`;

      console.log("EXACT STRING SENT TO FIREBASE:", formattedPhone);

      let verifier;

      // 1. Check which platform we are on
      if (Platform.OS === "web") {
        // Use the official Firebase Web reCAPTCHA
        verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      } else {
        // Use the Expo Modal for Mobile
        verifier = recaptchaVerifierModal.current;
      }

      // 2. Send the OTP
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      
      router.push({
        pathname: "/(auth)/otp",
        params: {
          phone: formattedPhone, 
          verificationId: confirmation.verificationId, 
        },
      });
    } catch (error: any) {
      console.error("Auth Error:", error);
      Alert.alert("Authentication Error", error?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 
        This empty view has a nativeID. On the web, it becomes a <div> with id="recaptcha-container". 
        Firebase requires this to attach its invisible Web reCAPTCHA. 
      */}
      {Platform.OS === "web" && (
        <View nativeID="recaptcha-container" />
      )}

      {/* This only renders on Mobile */}
      {Platform.OS !== "web" && (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifierModal}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification={true}
        />
      )}

      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in with your mobile number</Text>

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneInput
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        {!!errors.phone && (
          <Text style={styles.error}>
            {errors.phone.message}
          </Text>
        )}

        <View style={styles.buttonWrapper}>
          <AppButton
            title={loading ? "Sending..." : "Continue"}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || loading}
            loading={loading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, 
    justifyContent: "center",
  },
  formContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.secondary,
    marginBottom: spacing.xxl,
  },
  error: {
    color: colors.error,
    fontSize: typography.small,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonWrapper: {
    marginTop: spacing.lg,
  }
});