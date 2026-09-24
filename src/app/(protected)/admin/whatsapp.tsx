import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import WhatsAppService, { WhatsAppConfig, WhatsAppProvider } from "@/services/whatsappService";

export default function WhatsAppSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);

  // CallMeBot = free, messages only the owner's own number. Gupshup = paid
  // business API that can message anyone (needs approved templates for
  // anything outside a 24-hour window).
  const [provider, setProvider] = useState<WhatsAppProvider>("callmebot");
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
        setProvider(data.provider === "gupshup" ? "gupshup" : "callmebot");
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
      Alert.alert("Error", provider === "callmebot" ? "API key and your WhatsApp number are required." : "API key and sender number are required.");
      return;
    }
    try {
      setSaving(true);
      await WhatsAppService.saveConfig({
        provider,
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
        <Text style={styles.sectionTitle}>WhatsApp sending</Text>

        <View style={styles.providerRow}>
          <Pressable style={[styles.providerBtn, provider === "callmebot" && styles.providerBtnActive]} onPress={() => setProvider("callmebot")}>
            <Text style={[styles.providerText, provider === "callmebot" && styles.providerTextActive]}>CallMeBot (free)</Text>
          </Pressable>
          <Pressable style={[styles.providerBtn, provider === "gupshup" && styles.providerBtnActive]} onPress={() => setProvider("gupshup")}>
            <Text style={[styles.providerText, provider === "gupshup" && styles.providerTextActive]}>Gupshup (paid)</Text>
          </Pressable>
        </View>

        {provider === "callmebot" ? (
          <View style={styles.stepsBox}>
            <Text style={styles.stepsTitle}>One-time setup (about 2 minutes)</Text>
            <Text style={styles.stepText}>1. On the owner's phone, save this contact: +34 623 91 22 04</Text>
            <Text style={styles.stepText}>2. In WhatsApp, send that contact exactly: I allow callmebot to send me messages</Text>
            <Text style={styles.stepText}>3. It replies with an API key. Enter the key and the same phone's number below.</Text>
            <Text style={styles.stepNote}>
              Free and personal-use only: it can only message the number that activated it, so every daily report
              must be sent to that one number.
            </Text>
          </View>
        ) : (
          <Text style={styles.helperText}>
            Get these from your Gupshup dashboard after signup: the API key, your app name, and the WhatsApp
            Business number you've linked there.
          </Text>
        )}

        {config && (
          <View style={styles.statusBox}>
            <Feather name={config.is_active ? "check-circle" : "alert-triangle"} size={16} color={config.is_active ? "#10B981" : "#D97706"} />
            <Text style={styles.statusText}>
              {config.is_active
                ? `Configured (${config.provider === "callmebot" ? "CallMeBot" : "Gupshup"}) — ${config.provider === "callmebot" ? "number" : "sender"} ${config.sender_number}, key ending ${config.api_key_last4}`
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
            placeholder={config ? "Enter a new key to replace the saved one" : provider === "callmebot" ? "The key CallMeBot sent you" : "Your Gupshup API key"}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
          />
        </View>

        {provider === "gupshup" && (
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
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>{provider === "callmebot" ? "Your WhatsApp number (the one that activated it)" : "Sender (WhatsApp Business) Number"}</Text>
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
            <Text style={styles.label}>{config.provider === "callmebot" ? "Send the test to (your activated number)" : "Test recipient number"}</Text>
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

  providerRow: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 16 },
  providerBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  providerBtnActive: { backgroundColor: "#111111" },
  providerText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  providerTextActive: { color: "#FFFFFF" },
  stepsBox: { backgroundColor: "#F5F3FF", borderRadius: 12, padding: 16, marginBottom: 16, gap: 6 },
  stepsTitle: { fontSize: 14, fontWeight: "700", color: "#5B21B6", marginBottom: 2 },
  stepText: { fontSize: 13, color: "#374151", lineHeight: 19 },
  stepNote: { fontSize: 12, color: "#6B7280", lineHeight: 18, marginTop: 4 },
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
