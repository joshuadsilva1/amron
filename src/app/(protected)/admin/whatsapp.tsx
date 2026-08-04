import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import WhatsAppService, { WhatsAppConfig } from "@/services/whatsappService";

export default function WhatsAppSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [appName, setAppName] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const [testNumber, setTestNumber] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await WhatsAppService.getConfig();
      setConfig(data);
      if (data) {
        setAppName(data.app_name || "");
        setSenderNumber(data.sender_number || "");
      }
    } catch (error) {
      console.warn("Failed to load WhatsApp config", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !senderNumber.trim()) {
      Alert.alert("Error", "API key and sender number are required.");
      return;
    }
    try {
      setSaving(true);
      await WhatsAppService.saveConfig({
        api_key: apiKey.trim(),
        app_name: appName.trim() || undefined,
        sender_number: senderNumber.trim(),
      });
      Alert.alert("Saved", "WhatsApp settings updated.");
      setApiKey("");
      fetchConfig();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testNumber.trim()) {
      Alert.alert("Error", "Enter a phone number to test with (with country code, e.g. 91XXXXXXXXXX).");
      return;
    }
    try {
      setTesting(true);
      await WhatsAppService.sendTestMessage(testNumber.trim());
      Alert.alert("Sent", "Test message sent — check the phone for delivery.");
    } catch (error: any) {
      Alert.alert("Test Failed", error?.response?.data?.error || "Could not send the test message.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Gupshup account</Text>
        <Text style={styles.helperText}>
          Get these from your Gupshup dashboard after signup: the API key, your app name, and the WhatsApp
          Business number you've linked there.
        </Text>

        {config && (
          <View style={styles.statusBox}>
            <Feather name={config.is_active ? "check-circle" : "alert-triangle"} size={16} color={config.is_active ? "#10B981" : "#D97706"} />
            <Text style={styles.statusText}>
              {config.is_active
                ? `Configured — sender ${config.sender_number}, key ending ${config.api_key_last4}`
                : "Not configured yet"}
            </Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={config ? "Enter a new key to replace the saved one" : "Your Gupshup API key"}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>App Name</Text>
          <TextInput
            style={styles.input}
            value={appName}
            onChangeText={setAppName}
            placeholder="Your Gupshup app name"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Sender (WhatsApp Business) Number</Text>
          <TextInput
            style={styles.input}
            value={senderNumber}
            onChangeText={setSenderNumber}
            placeholder="91XXXXXXXXXX"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        <Pressable style={[styles.saveBtn, saving && styles.btnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save settings"}</Text>
        </Pressable>
      </View>

      {config?.is_active && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Send a test message</Text>
          <Text style={styles.helperText}>
            Confirms your credentials actually work end to end before anything else relies on this.
          </Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Test recipient number</Text>
            <TextInput
              style={styles.input}
              value={testNumber}
              onChangeText={setTestNumber}
              placeholder="91XXXXXXXXXX"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
          <Pressable style={[styles.testBtn, testing && styles.btnDisabled]} onPress={handleSendTest} disabled={testing}>
            <Feather name="send" size={14} color="#111111" style={{ marginRight: 8 }} />
            <Text style={styles.testBtnText}>{testing ? "Sending..." : "Send test message"}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111111", marginBottom: 8 },
  helperText: { fontSize: 13, color: "#6B7280", lineHeight: 19, marginBottom: 16 },

  statusBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  statusText: { fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 14, color: "#111111" },

  saveBtn: { backgroundColor: "#111111", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  testBtn: { flexDirection: "row", backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  testBtnText: { color: "#111111", fontSize: 14, fontWeight: "600" },
});
