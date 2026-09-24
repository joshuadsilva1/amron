import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // Shown on the right while searching, e.g. "3 of 120".
  resultCount?: number;
  totalCount?: number;
  style?: any;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search...", resultCount, totalCount, style }: Props) {
  const searching = value.trim().length > 0;
  return (
    <View style={[styles.wrap, style]}>
      <Feather name="search" size={16} color="#9CA3AF" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {searching && resultCount !== undefined && totalCount !== undefined && (
        <Text style={styles.count}>{resultCount} of {totalCount}</Text>
      )}
      {searching && (
        <Pressable onPress={() => onChangeText("")} hitSlop={10}>
          <Feather name="x" size={16} color="#6B7280" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
    maxWidth: 480,
  },
  input: { flex: 1, fontSize: 14, color: "#111111", paddingVertical: 0 },
  count: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
});
