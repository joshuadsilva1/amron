import React from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import colors from "@/theme/colors";

interface Props {
  value: string;
  onChangeText(text: string): void;

  placeholder?: string;

  keyboardType?: any;

  maxLength?: number;

  // Optional escape hatches — e.g. `style={{ flex: 1 }}` to sit next to a
  // button in a row, or `onSubmitEditing` so pressing Enter/Go on the
  // keyboard submits a manual code entry instead of requiring a tap.
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export default function AppTextInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  style,
  onSubmitEditing,
  autoCapitalize,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={onSubmitEditing ? "go" : undefined}
        autoCapitalize={autoCapitalize}
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