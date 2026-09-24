import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

import api from "@/services/api";
import { buildDestinations, searchDestinations } from "@/utils/navSearch";

const EXAMPLES = ["send order to departments", "salary", "excel upload", "shortage", "who is absent"];

// Home-page "where do I go?" box. Type a page name OR what you want to do
// ("add a new item", "print qr labels") — see utils/navSearch.ts.
export default function SmartSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [departments, setDepartments] = useState<{ id: string | number; name: string }[]>([]);

  useEffect(() => {
    api.get("/departments")
      .then((res) => setDepartments(res.data?.data || res.data || []))
      .catch(() => setDepartments([]));
  }, []);

  const destinations = useMemo(() => buildDestinations(departments), [departments]);
  const hits = useMemo(() => searchDestinations(query, destinations, 8), [query, destinations]);

  useEffect(() => setActive(0), [query]);

  const go = (route: string) => {
    setQuery("");
    setFocused(false);
    router.push(route as any);
  };

  const onKeyPress = (e: any) => {
    const key = e?.nativeEvent?.key;
    if (key === "ArrowDown") setActive((i) => Math.min(i + 1, hits.length - 1));
    else if (key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (key === "Escape") { setQuery(""); setFocused(false); }
  };

  const searching = query.trim().length > 0;
  const showPanel = focused || searching;

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, focused && styles.boxFocused]}>
        <Feather name="search" size={18} color="#8B5CF6" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          // Delay so a tap on a result registers before the panel unmounts.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyPress={onKeyPress}
          onSubmitEditing={() => hits[active] && go(hits[active].route)}
          placeholder="Where do you want to go?  e.g. “add a new item”, “salary”, “lazer handoff”"
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="go"
        />
        {searching && (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Feather name="x" size={18} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {showPanel && (
        <View style={styles.panel}>
          {!searching ? (
            <View>
              <Text style={styles.hint}>Try asking for a page in your own words:</Text>
              <View style={styles.chips}>
                {EXAMPLES.map((ex) => (
                  <Pressable key={ex} style={styles.chip} onPress={() => setQuery(ex)}>
                    <Text style={styles.chipText}>{ex}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : hits.length === 0 ? (
            <Text style={styles.hint}>
              No page matches “{query}”. Try a simpler word — like “stock”, “order”, “supplier” or “salary”.
            </Text>
          ) : (
            hits.map((hit, i) => (
              <Pressable
                key={hit.route}
                style={[styles.row, i === active && styles.rowActive]}
                onPress={() => go(hit.route)}
              >
                <Feather name={hit.icon as any} size={16} color={i === active ? "#8B5CF6" : "#9CA3AF"} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{hit.title}</Text>
                  <Text style={styles.rowSection} numberOfLines={1}>{hit.section}</Text>
                </View>
                {i === 0 && <Text style={styles.best}>Best match</Text>}
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24, zIndex: 20 },
  box: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 16, height: 52,
  },
  boxFocused: { borderColor: "#8B5CF6" },
  input: { flex: 1, fontSize: 15, color: "#111111", paddingVertical: 0 },
  panel: {
    marginTop: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14,
    padding: 8, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  hint: { fontSize: 13, color: "#6B7280", padding: 10, lineHeight: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 10, paddingBottom: 8 },
  chip: { backgroundColor: "#F3E8FF", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 13, color: "#6D28D9", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 10 },
  rowActive: { backgroundColor: "#F5F3FF" },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111111" },
  rowSection: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  best: { fontSize: 11, fontWeight: "700", color: "#8B5CF6" },
});
