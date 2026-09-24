import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";

// Self-contained calendar picker — no native module, so it renders
// identically on web (npm run web) and native without any install/rebuild
// step. Value/onChange are plain "YYYY-MM-DD" strings, matching what every
// date field in this app already sends the API.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseISO(value?: string): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function formatDisplay(value?: string) {
  if (!value) return null;
  const d = parseISO(value);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  value?: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  minDate?: string; // ISO, inclusive
}

export default function DatePickerInput({ value, onChange, placeholder = "Select date...", minDate }: Props) {
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState(() => parseISO(value));

  const openPicker = () => {
    setCursor(parseISO(value));
    setVisible(true);
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const minD = minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate) ? minDate : null;

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <Pressable style={styles.inputBox} onPress={openPicker}>
        <Feather name="calendar" size={16} color="#6B7280" style={{ marginRight: 8 }} />
        <Text style={[styles.inputText, !value && styles.placeholderText]} numberOfLines={1}>
          {formatDisplay(value) || placeholder}
        </Text>
        {!!value && (
          <Pressable onPress={() => onChange("")} hitSlop={10}>
            <Feather name="x" size={16} color="#9CA3AF" />
          </Pressable>
        )}
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <Pressable onPress={() => setCursor(new Date(year, month - 1, 1))} hitSlop={10}>
                <Feather name="chevron-left" size={20} color="#111111" />
              </Pressable>
              <Text style={styles.headerText}>{MONTH_NAMES[month]} {year}</Text>
              <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} hitSlop={10}>
                <Feather name="chevron-right" size={20} color="#111111" />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {DAY_LETTERS.map((d, i) => (
                <Text key={i} style={styles.weekLetter}>{d}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={idx} style={styles.cell} />;
                const iso = toISO(year, month, day);
                const isSelected = iso === value;
                const isToday = iso === todayISO;
                const isDisabled = !!minD && iso < minD;
                return (
                  <Pressable
                    key={idx}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                    disabled={isDisabled}
                    onPress={() => { onChange(iso); setVisible(false); }}
                  >
                    <Text style={[
                      styles.cellText,
                      isToday && !isSelected && styles.cellTextToday,
                      isSelected && styles.cellTextSelected,
                      isDisabled && styles.cellTextDisabled,
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.todayBtn}
              onPress={() => { const d = new Date(); setCursor(d); onChange(toISO(d.getFullYear(), d.getMonth(), d.getDate())); setVisible(false); }}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44 },
  inputText: { flex: 1, fontSize: 14, color: "#111111" },
  placeholderText: { color: "#9CA3AF" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 340, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerText: { fontSize: 15, fontWeight: "700", color: "#111111" },

  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekLetter: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#9CA3AF" },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellSelected: { backgroundColor: "#111111", borderRadius: 999 },
  cellText: { fontSize: 14, color: "#111111" },
  cellTextToday: { color: "#8B5CF6", fontWeight: "800" },
  cellTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  cellTextDisabled: { color: "#D1D5DB" },

  todayBtn: { marginTop: 16, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6" },
  todayBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
});
