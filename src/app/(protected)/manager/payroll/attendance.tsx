import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import Alert from "@/utils/alert";
import { SymbolView } from "expo-symbols";

import PayrollService, { AttendanceRecord } from "@/services/payrollService";
import DatePickerInput from "@/components/common/DatePickerInput";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function AttendanceScreen() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  async function fetchAttendance() {
    setLoading(true);
    try {
      const data = await PayrollService.getAttendance(selectedDate);
      setAttendance(data || []);
    } catch (error) {
      console.log("Error fetching attendance data", error);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Present" ? "Absent" : "Present";
    try {
      await PayrollService.markAttendance({
        user_id: userId,
        date: selectedDate,
        status: nextStatus,
      });
      fetchAttendance();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update attendance.");
    }
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.card}>
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{item.worker_name}</Text>
        <Text style={styles.checkInText}>Check-in: {item.check_in_time || "N/A"}</Text>
      </View>

      <Pressable
        style={[
          styles.statusBadge,
          item.status === "Present" ? styles.badgePresent : styles.badgeAbsent,
        ]}
        onPress={() => handleStatusToggle(item.user_id, item.status)}
      >
        <Text style={[styles.statusText, item.status === "Present" ? styles.textPresent : styles.textAbsent]}>
          {item.status}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Attendance</Text>
        <View style={{ width: 160 }}>
          <DatePickerInput value={selectedDate} onChange={(iso) => iso && setSelectedDate(iso)} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : attendance.length === 0 ? (
        <View style={styles.emptyState}>
          <SymbolView name="calendar" size={48} tintColor={colors.border} />
          <Text style={styles.emptyText}>No attendance records found for this date.</Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: typography.h2, fontWeight: "700", color: colors.navy },
  dateLabel: { fontSize: 14, fontWeight: "600", color: colors.secondary },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.secondary, marginTop: spacing.md, fontSize: 16 },

  listContent: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  
  workerInfo: { flex: 1 },
  workerName: { fontSize: 16, fontWeight: "700", color: colors.navy, marginBottom: 4 },
  checkInText: { fontSize: 13, color: colors.secondary },

  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  badgePresent: { backgroundColor: "#DCFCE7" },
  badgeAbsent: { backgroundColor: "#FEE2E2" },
  
  statusText: { fontSize: 14, fontWeight: "700" },
  textPresent: { color: colors.success },
  textAbsent: { color: colors.error },
});