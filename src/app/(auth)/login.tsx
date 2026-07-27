import React from "react";

import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { router } from "expo-router";

import {
  useForm,
  Controller,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  PhoneForm,
  phoneSchema,
} from "@/utils/validation";

import PhoneInput from "@/components/auth/PhoneInput";

import AppButton from "@/components/common/AppButton";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function LoginScreen() {
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

  const onSubmit = (data: PhoneForm) => {
    router.push({
      pathname: "/(auth)/otp",

      params: {
        phone: data.phone,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View>
        <Text style={styles.title}>
          Welcome Back
        </Text>

        <Text style={styles.subtitle}>
          Sign in with your mobile number
        </Text>

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneInput
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {!!errors.phone && (
          <Text style={styles.error}>
            {errors.phone.message}
          </Text>
        )}

        <AppButton
          title="Continue"
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    justifyContent: "center",

    padding: spacing.lg,

    backgroundColor: colors.background,
  },

  title: {
    fontSize: typography.h1,

    fontWeight: "700",

    color: colors.navy,

    marginBottom: 8,
  },

  subtitle: {
    fontSize: typography.body,

    color: colors.secondary,

    marginBottom: spacing.xl,
  },

  error: {
    color: colors.error,

    marginTop: 10,

    marginBottom: 15,
  },
});