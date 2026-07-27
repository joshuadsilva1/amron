import React from "react";
import {
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import colors from "@/theme/colors";

interface Props {
  value: string;
  onChangeText(text: string): void;

  placeholder?: string;

  keyboardType?: any;

  maxLength?: number;
}

export default function AppTextInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 16,

    backgroundColor: "white",

    paddingHorizontal: 18,

    height: 58,

    justifyContent: "center",
  },

  input: {
    fontSize: 18,
  },
});