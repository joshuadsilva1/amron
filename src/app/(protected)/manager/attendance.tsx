import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import AttendanceService from "@/services/attendanceService";
import { exportToExcel, exportToPDF } from "@/utils/export";
import { useSortable } from "@/utils/useSortable";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import SortableHeaderCell from "@/components/common/SortableHeaderCell";
import DatePickerInput from "@/components/common/DatePickerInput";

// Helper to format Date for the UI (DD/MM/YYYY) and Backend (YYYY-MM-DD)
const formatDateUI = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const formatDateAPI = (date: Date) => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
};

// --- Custom Dropdown Component ---
const SelectInput = ({ placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={styles.inputBox} onPress={() => setModalVisible(true)}>
        <Text style={[styles.inputText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(item.id); setModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                    {item.name}
                  </Text>
                  {value === item.id && <Feather name="check" size={18} color="#8B5CF6" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Base Data
  const [currentDate, setCurrentDate] = useState(new Date());
  const [departments, setDepartments] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ present_count: 0, total_staff: 0 });
  const search = useSearch(attendanceData);
  const { sorted: sortedAttendance, sortKey, sortDir, toggleSort } = useSortable<any>(search.filtered);
  const pagination = usePagination(sortedAttendance);

  // Modal Form State
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formSalary, setFormSalary] = useState("");

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiDate = formatDateAPI(currentDate);
      
      const [deptsData, dailyData] = await Promise.all([
        AttendanceService.getDepartments().catch(() => []),
        AttendanceService.getDailyAttendance(apiDate).catch(() => ({ data: [], summary: { present_count: 0, total_staff: 0 } }))
      ]);

      setDepartments(deptsData);
      setAttendanceData(dailyData.data || []);
      setSummary(dailyData.summary || { present_count: 0, total_staff: 0 });
    } catch (error) {
      console.error("Failed to load attendance data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!formName) {
      Alert.alert("Error", "Employee name is required");
      return;
    }

    try {
      setSubmitting(true);
      await AttendanceService.addEmployee({
        name: formName,
        phone: formPhone,
        department_id: formDept || undefined,
        base_monthly_salary: formSalary ? parseFloat(formSalary) : 0,
      });

      Alert.alert("Success", "Employee added successfully");
      setIsModalVisible(false);
      resetForm();
      fetchData(); // Refresh the list
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormDept("");
    setFormSalary("");
  };

  const getExportData = () => ({
    headers: ["Employee", "Dept", "Status", "OT Hrs"],
    rows: attendanceData.map((emp) => [
      emp.name,
      emp.department,
      emp.status || "Unmarked",
      emp.ot_hours || 0,
    ]),
  });

  const handleExportPDF = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToPDF(`Attendance — ${formatDateUI(currentDate)}`, headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate PDF.");
    }
  };

  const handleExportExcel = async () => {
    try {
      const { headers, rows } = getExportData();
      await exportToExcel("attendance", headers, rows);
    } catch (error: any) {
      Alert.alert("Export Failed", error.message || "Could not generate Excel file.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Feather name="calendar" size={24} color="#8B5CF6" />
              <View style={styles.iconBadgeCheck}>
                <Feather name="check" size={10} color={colors.white} />
              </View>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Attendance</Text>
              <Text style={styles.subtitle}>
                Mark daily attendance for every employee. Payroll is calculated from this.
              </Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <Pressable style={styles.exportBtn} onPress={handleExportPDF}>
              <Feather name="file-text" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>PDF</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExportExcel}>
              <Feather name="file" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => setIsModalVisible(true)}>
              <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Add employee</Text>
            </Pressable>
          </View>
        </View>

        {/* Date Controls Row */}
        <View style={styles.dateControlCard}>
          <View style={styles.dateControlInner}>
            <Text style={styles.dateLabel}>Date</Text>
            <Pressable
              onPress={() => setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
              hitSlop={10}
              style={{ marginRight: 8 }}
            >
              <Feather name="chevron-left" size={18} color="#6B7280" />
            </Pressable>
            <View style={{ width: 160 }}>
              <DatePickerInput
                value={formatDateAPI(currentDate)}
                onChange={(iso) => { if (iso) setCurrentDate(new Date(iso + "T00:00:00")); }}
              />
            </View>
            <Pressable
              onPress={() => setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
              hitSlop={10}
              style={{ marginHorizontal: 8 }}
            >
              <Feather name="chevron-right" size={18} color="#6B7280" />
            </Pressable>
            <Pressable onPress={() => setCurrentDate(new Date())} style={styles.todayChip}>
              <Text style={styles.todayChipText}>Today</Text>
            </Pressable>
            <Text style={styles.summaryText}>
              {summary.present_count} present · {summary.total_staff} staff
            </Text>
          </View>
        </View>

        {/* Attendance Table */}
        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search by name, department, status..."
          resultCount={search.filtered.length}
          totalCount={attendanceData.length}
        />
        <Pagination {...pagination} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrapper}>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <SortableHeaderCell label="EMPLOYEE" active={sortKey === "name"} direction={sortDir} onPress={() => toggleSort("name")} textStyle={styles.columnHeader} containerStyle={{ flex: 1, minWidth: 180 }} />
              <SortableHeaderCell label="DEPT" active={sortKey === "department"} direction={sortDir} onPress={() => toggleSort("department")} textStyle={styles.columnHeader} containerStyle={{ width: 120 }} />
              <SortableHeaderCell label="STATUS" active={sortKey === "status"} direction={sortDir} onPress={() => toggleSort("status")} textStyle={styles.columnHeader} containerStyle={{ width: 100 }} />
              <SortableHeaderCell label="OT HRS" active={sortKey === "ot_hours"} direction={sortDir} onPress={() => toggleSort("ot_hours")} textStyle={styles.columnHeader} containerStyle={{ width: 100 }} />
            </View>

            {loading ? (
               <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 60 }} />
            ) : attendanceData.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No employees yet. Add your first.</Text>
              </View>
            ) : (
              pagination.pageRows.map((emp) => (
                <View key={emp.employee_id} style={styles.tableRow}>
                  <Text style={[styles.cellText, { flex: 1, minWidth: 180, fontWeight: "600", color: "#111111" }]}>{emp.name}</Text>
                  <Text style={[styles.cellText, { width: 120 }]}>{emp.department}</Text>
                  <View style={{ width: 100 }}>
                    {/* Read-only representation for now */}
                    <Text style={[styles.cellText, !emp.status && { color: "#9CA3AF" }]}>{emp.status || "Unmarked"}</Text>
                  </View>
                  <View style={{ width: 100 }}>
                     <Text style={[styles.cellText, !emp.ot_hours && { color: "#9CA3AF" }]}>{emp.ot_hours || "0"}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

      </ScrollView>

      {/* Add Employee Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add employee</Text>
              <Pressable onPress={() => { setIsModalVisible(false); resetForm(); }} hitSlop={15}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Added ScrollView so the inputs don't overlap the footer on small screens/keyboards */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput 
                  style={[styles.textInput, formName ? styles.textInputFocused : null]} 
                  value={formName} 
                  onChangeText={setFormName} 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="+91..."
                  placeholderTextColor="#9CA3AF"
                  value={formPhone} 
                  onChangeText={setFormPhone} 
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department</Text>
                <SelectInput placeholder="Select..." value={formDept} options={departments} onSelect={setFormDept} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Base monthly salary</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={formSalary} 
                  onChangeText={setFormSalary} 
                  keyboardType="numeric" 
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable 
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
                onPress={handleAddEmployee}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>{submitting ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
            
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { flexGrow: 1, padding: spacing.xl },
  
  // --- Header ---
  headerRow: { flexDirection: Platform.OS === "web" ? "row" : "column", justifyContent: "space-between", alignItems: Platform.OS === "web" ? "center" : "flex-start", marginBottom: spacing.xl, gap: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(139, 92, 246, 0.1)", alignItems: "center", justifyContent: "center", marginRight: spacing.lg, position: 'relative' },
  iconBadgeCheck: { position: 'absolute', bottom: 12, right: 12, backgroundColor: "#8B5CF6", borderRadius: 10, width: 14, height: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(139, 92, 246, 0.1)" },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  exportBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E5E7EB", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  exportText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  primaryBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#8B5CF6", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },

  // --- Date Controls ---
  dateControlCard: { backgroundColor: colors.white, borderRadius: 16, paddingVertical: 16, paddingHorizontal: spacing.xl, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: spacing.lg, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  dateControlInner: { flexDirection: "row", alignItems: "center" },
  dateLabel: { fontSize: 15, fontWeight: "600", color: "#111111", marginRight: spacing.md },
  dateInputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginRight: spacing.lg },
  todayChip: { backgroundColor: "#F3F4F6", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginRight: spacing.lg },
  todayChipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  dateInputText: { fontSize: 14, color: "#111111", marginRight: 12 },
  summaryText: { fontSize: 15, color: "#6B7280" },

  // --- Table ---
  tableWrapper: { width: "100%" },
  tableCard: { minWidth: 600, flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 300 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F9FAFB", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  columnHeader: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cellText: { fontSize: 14, color: "#374151" },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyStateText: { fontSize: 15, color: "#6B7280" },

  // --- Modal Styles ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 450, backgroundColor: colors.white, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111111" },
  
  modalScroll: { maxHeight: 350 }, // Critical fix for small screens / keyboard overlap
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#111111", marginBottom: 8 },
  textInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: "#111111" },
  textInputFocused: { borderColor: "#8B5CF6" },
  
  inputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, height: 44 },
  inputText: { fontSize: 14, color: "#111111", flex: 1 },
  placeholderText: { color: "#9CA3AF" },
  
  // Dropdown Modal
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 14, color: "#374151" },

  // Footer
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 20 },
  submitBtn: { backgroundColor: "#BDB4FE", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: colors.white, fontWeight: "600", fontSize: 14 },
});