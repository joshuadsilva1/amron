import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import api from "@/services/api";

interface SettingRow {
  key: string;
  value: string;
  description: string;
  updated_at: string | null;
  updated_by: string | null;
}

export default function SystemSettingsScreen() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/settings");
      const data: SettingRow[] = res.data?.data || [];
      setSettings(data);
      setDrafts(Object.fromEntries(data.map((s) => [s.key, s.value])));
    } catch (error) {
      Alert.alert("Error", "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    try {
      setSavingKey(key);
      await api.put(`/admin/settings/${key}`, { value: drafts[key] });
      Alert.alert("Saved", "Setting updated.");
      fetchSettings();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to save setting.");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageDesc}>
        Factory-wide defaults. These apply wherever nobody has set a more specific value themselves.
      </Text>

      {settings.map((s) => {
        const isDirty = drafts[s.key] !== s.value;
        return (
          <View key={s.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="sliders" size={18} color="#8B5CF6" style={{ marginRight: 10 }} />
              <Text style={styles.settingName}>{s.key.replace(/_/g, " ")}</Text>
            </View>
            <Text style={styles.description}>{s.description}</Text>

            <View style={styles.row}>
              <TextInput
                style={styles.input}
                value={drafts[s.key] ?? ""}
                onChangeText={(v) => setDrafts((prev) => ({ ...prev, [s.key]: v }))}
                keyboardType="numeric"
              />
              <Pressable
                style={[styles.saveBtn, (!isDirty || savingKey === s.key) && styles.saveBtnDisabled]}
                onPress={() => handleSave(s.key)}
                disabled={!isDirty || savingKey === s.key}
              >
                <Text style={styles.saveBtnText}>{savingKey === s.key ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>

            {s.updated_at && (
              <Text style={styles.meta}>
                Last updated {new Date(s.updated_at).toLocaleString()}
                {s.updated_by ? ` by ${s.updated_by}` : ""}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingBottom: 60 },
  pageDesc: { fontSize: 14, color: "#6B7280", marginBottom: 20, lineHeight: 20 },

  card: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  settingName: { fontSize: 16, fontWeight: "700", color: "#111111", textTransform: "capitalize" },
  description: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 16 },

  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  input: { flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 15, color: "#111111" },
  saveBtn: { backgroundColor: "#111111", paddingHorizontal: 20, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saveBtnDisabled: { backgroundColor: "#D1D5DB" },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  meta: { fontSize: 11, color: "#9CA3AF", marginTop: 10 },
});
