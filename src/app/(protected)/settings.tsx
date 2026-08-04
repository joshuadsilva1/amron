import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Switch, Modal, FlatList } from "react-native";
import Alert from "@/utils/alert";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AppButton from "@/components/common/AppButton";
import useAuthStore from "@/store/authStore";
import { clearSession } from "@/utils/storage";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";
import { PUSH_REMINDERS_KEY, SCANNER_MODE_KEY } from "@/constants/settingsKeys";

const SCANNER_MODES: { label: string; value: "SINGLE" | "MULTIPLE" }[] = [
  { label: "Single item", value: "SINGLE" },
  { label: "Multiple items", value: "MULTIPLE" },
];

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [pushRemindersEnabled, setPushRemindersEnabled] = useState(true);
  const [scannerMode, setScannerMode] = useState<"SINGLE" | "MULTIPLE">("SINGLE");
  const [modePickerVisible, setModePickerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedReminders, storedMode] = await Promise.all([
        AsyncStorage.getItem(PUSH_REMINDERS_KEY),
        AsyncStorage.getItem(SCANNER_MODE_KEY),
      ]);
      if (storedReminders !== null) setPushRemindersEnabled(storedReminders === "true");
      if (storedMode === "SINGLE" || storedMode === "MULTIPLE") setScannerMode(storedMode);
    })();
  }, []);

  const togglePushReminders = async (value: boolean) => {
    setPushRemindersEnabled(value);
    await AsyncStorage.setItem(PUSH_REMINDERS_KEY, String(value));
  };

  const selectScannerMode = async (mode: "SINGLE" | "MULTIPLE") => {
    setScannerMode(mode);
    setModePickerVisible(false);
    await AsyncStorage.setItem(SCANNER_MODE_KEY, mode);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of Factory Co-Pilot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings & Profile</Text>
      </View>

      <View style={styles.content}>
        {/* User Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <SymbolView name="person.circle.fill" size={48} tintColor={colors.primary} />
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.profileName}>{user?.name || "Factory Operator"}</Text>
              <Text style={styles.profilePhone}>{user?.phone}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Role ID:</Text>
            <Text style={styles.metaValue}>{user?.role ?? "Unassigned"}</Text>
          </View>
        </View>

        {/* Action Options */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>System Preferences</Text>
          
          <View style={styles.optionRow}>
            <SymbolView name="bell" size={20} tintColor={colors.navy} />
            <Text style={styles.optionText}>Push Notifications (2-hour Reminders)</Text>
            <Switch value={pushRemindersEnabled} onValueChange={togglePushReminders} />
          </View>

          <Pressable style={styles.optionRow} onPress={() => setModePickerVisible(true)}>
            <SymbolView name="qrcode" size={20} tintColor={colors.navy} />
            <Text style={styles.optionText}>Default Scanner Camera Mode</Text>
            <Text style={styles.optionValue}>
              {SCANNER_MODES.find((m) => m.value === scannerMode)?.label}
            </Text>
            <SymbolView name="chevron.right" size={14} tintColor={colors.secondary} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <AppButton title="Sign Out" onPress={handleLogout} />
        </View>
      </View>

      <Modal visible={modePickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModePickerVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Default Scanner Camera Mode</Text>
            <FlatList
              data={SCANNER_MODES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable style={styles.modalOption} onPress={() => selectScannerMode(item.value)}>
                  <Text style={[styles.modalOptionText, scannerMode === item.value && { color: colors.primary, fontWeight: "700" }]}>
                    {item.label}
                  </Text>
                  {scannerMode === item.value && <SymbolView name="checkmark" size={16} tintColor={colors.primary} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy },
  
  content: { padding: spacing.lg },
  
  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.background },
  profileName: { fontSize: 18, fontWeight: "700", color: colors.navy },
  profilePhone: { fontSize: 14, color: colors.secondary },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 13, color: colors.secondary, fontWeight: "600" },
  metaValue: { fontSize: 13, color: colors.navy, fontWeight: "700" },

  section: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xxl },
  sectionHeader: { fontSize: 14, fontWeight: "700", color: colors.secondary, marginBottom: spacing.md, textTransform: "uppercase" },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.background },
  optionText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.navy, marginLeft: spacing.md },
  optionValue: { fontSize: 14, color: colors.secondary, marginRight: spacing.sm },

  footer: { marginTop: spacing.lg },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, overflow: "hidden" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.navy, padding: spacing.lg, borderBottomWidth: 1, borderColor: colors.background },
  modalOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderColor: colors.background },
  modalOptionText: { fontSize: 15, color: colors.navy },
});