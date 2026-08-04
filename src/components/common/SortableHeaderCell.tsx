import React from "react";
import { Pressable, Text, View, StyleProp, TextStyle, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { SortDirection } from "@/utils/useSortable";

interface SortableHeaderCellProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onPress: () => void;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

// Drop-in replacement for a plain <Text style={styles.columnHeader}>LABEL</Text>
// table header cell — same label, same passed-in text style, adds a tap
// target and a direction indicator. Doesn't touch any existing visual style.
export default function SortableHeaderCell({
  label,
  active,
  direction,
  onPress,
  textStyle,
  containerStyle,
}: SortableHeaderCellProps) {
  return (
    <Pressable onPress={onPress} style={[{ flexDirection: "row", alignItems: "center" }, containerStyle]}>
      <Text style={textStyle}>{label}</Text>
      <Feather
        name={active ? (direction === "asc" ? "arrow-up" : "arrow-down") : "chevrons-down"}
        size={11}
        color={active ? "#8B5CF6" : "#D1D5DB"}
        style={{ marginLeft: 4 }}
      />
    </Pressable>
  );
}
