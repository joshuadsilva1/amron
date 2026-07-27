import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";

import colors from "@/theme/colors";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function AppButton({
  title,
  onPress,
  loading,
  disabled,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,

    justifyContent: "center",
    alignItems: "center",
  },

  disabled: {
    opacity: 0.5,
  },

  pressed: {
    transform: [{ scale: 0.98 }],
  },

  text: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});