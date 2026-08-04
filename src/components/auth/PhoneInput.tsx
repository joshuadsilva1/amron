import React from "react";
import { View, TextInput, Text, StyleSheet, TextInputProps } from "react-native";

// By extending TextInputProps, this component will seamlessly 
// accept anything react-hook-form throws at it!

export default function PhoneInput(props: TextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.prefix}>+91</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        {...props} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: "#fff",
  },
  prefix: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 10,
    color: "#333",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
});