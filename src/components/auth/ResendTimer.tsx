import React from "react";

import {
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

import colors from "@/theme/colors";

interface Props {
  seconds: number;
  onResend(): void;
}

export default function ResendTimer({
  seconds,
  onResend,
}: Props) {
  if (seconds > 0) {
    return (
      <Text style={styles.timer}>
        Resend code in {seconds}s
      </Text>
    );
  }

  return (
    <Pressable onPress={onResend}>
      <Text style={styles.resend}>
        Resend Code
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timer: {
    marginTop: 28,
    textAlign: "center",
    color: colors.secondary,
    fontSize: 15,
  },

  resend: {
    marginTop: 28,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
});