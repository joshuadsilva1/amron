import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, Modal, FlatList, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import RecipeService from "@/services/recipeService";

// --- Reusable Dropdown Component ---
const SelectInput = ({ label, placeholder, value, options, onSelect }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options?.find((o: any) => o.id === value);

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
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
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(item.id); setModalVisible(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                    {item.name} {item.item_code ? `(${item.item_code})` : ""}
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

export default function RecipeBuilderPage() {
  const { finished_good_id: editingFinishedGoodId } = useLocalSearchParams<{ finished_good_id?: string }>();
  const isEditing = !!editingFinishedGoodId;

  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);

  // Data lists
  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Form State
  const [selectedFG, setSelectedFG] = useState("");
  const [components, setComponents] = useState<{ id: string, department: string, itemId: string, qty: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptsRes, fgRes, rmRes] = await Promise.all([
          api.get('/departments'),
          // A finished good is an item currently sitting in a FINAL-level
          // department (Dispatch) — not a category/type flag.
          api.get('/items?department_level=FINAL'),
          api.get('/items'),
        ]);

        const depts = deptsRes.data?.data || [];
        const materials = rmRes.data?.data || [];
        setDepartments(depts);
        setFinishedGoods(fgRes.data?.data || []);
        setRawMaterials(materials);

        if (editingFinishedGoodId) {
          setSelectedFG(editingFinishedGoodId);
          const { components: existing } = await RecipeService.getRecipe(editingFinishedGoodId);
          setComponents(existing.map((c) => {
            const material = materials.find((m: any) => m.id === c.component_id);
            return {
              id: c.id,
              department: material?.department_id || "",
              itemId: c.component_id,
              qty: String(c.quantity_required),
            };
          }));
          setLoadingExisting(false);
        }
      } catch (error) {
        console.warn("Failed to fetch data for recipe builder", error);
        setLoadingExisting(false);
      }
    };
    fetchData();
  }, [editingFinishedGoodId]);

  const addComponentRow = () => {
    setComponents([
      ...components,
      { id: Date.now().toString(), department: "", itemId: "", qty: "1" }
    ]);
  };

  const updateComponent = (id: string, field: string, value: string) => {
    // Functional updater — the department onSelect handler fires two of
    // these back-to-back in the same tick (department, then itemId reset).
    // Without this, the second call closes over the pre-update `components`
    // and clobbers the first call's change when React batches them.
    setComponents((prev) => prev.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const removeComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id));
  };

  const handleSaveRecipe = async () => {
    if (!selectedFG) {
      Alert.alert("Error", "Please select a Finished Good.");
      return;
    }
    if (components.length === 0 || components.some(c => !c.itemId || !c.qty)) {
      Alert.alert("Error", "Please complete all component details.");
      return;
    }

    try {
      setSubmitting(true);
      await RecipeService.createRecipe({
        output_item_id: selectedFG,
        ingredients: components.map((c) => ({
          input_item_id: c.itemId,
          quantity_required: parseFloat(c.qty) || 0,
        })),
      });
      Alert.alert("Success", "Recipe (BOM) saved successfully! Auto-deductions are now active for this product.");
      if (isEditing) {
        router.back();
      } else {
        setSelectedFG("");
        setComponents([]);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to save recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>{isEditing ? "Edit Recipe" : "Recipe (BOM) Builder"}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? "Update the raw materials required to assemble this finished good." : "Define the raw materials required to assemble a finished good."}
          </Text>
        </View>

        {loadingExisting && <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />}

        {!loadingExisting && <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Select Finished Good</Text>
          <SelectInput
            placeholder="Select a finished product..."
            value={selectedFG}
            options={finishedGoods}
            onSelect={setSelectedFG}
          />
          {finishedGoods.length === 0 && (
            <Text style={styles.helperText}>
              No finished goods yet — an item only shows up here once it's in the Dispatch department.
            </Text>
          )}
        </View>

        <View style={[styles.card, { marginTop: spacing.xl }]}>
          <View style={styles.componentHeader}>
            <Text style={styles.cardTitle}>2. Required Components</Text>
            <Pressable style={styles.addBtn} onPress={addComponentRow}>
              <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.addBtnText}>Add Material</Text>
            </Pressable>
          </View>

          {components.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No materials added yet. Click "Add Material" to build the recipe.</Text>
            </View>
          ) : (
            components.map((comp, index) => {
              // Filter raw materials based on the selected department for this specific row
              const filteredMaterials = comp.department
                ? rawMaterials.filter((rm: any) => rm.department_id === comp.department)
                : rawMaterials;

              return (
                <View key={comp.id} style={styles.componentRow}>
                  <View style={styles.rowNumber}>
                    <Text style={styles.rowNumberText}>{index + 1}</Text>
                  </View>
                  
                  <View style={styles.componentInputs}>
                    <View style={styles.inputSplit}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <SelectInput 
                          placeholder="Department..." 
                          value={comp.department} 
                          options={departments} 
                          onSelect={(val: string) => {
                            updateComponent(comp.id, 'department', val);
                            updateComponent(comp.id, 'itemId', ''); // Reset item when dept changes
                          }} 
                        />
                      </View>
                      <View style={{ flex: 2 }}>
                        <SelectInput 
                          placeholder="Select specific part..." 
                          value={comp.itemId} 
                          options={filteredMaterials} 
                          onSelect={(val: string) => updateComponent(comp.id, 'itemId', val)} 
                        />
                      </View>
                    </View>
                    
                    <View style={styles.qtyRow}>
                      <Text style={styles.label}>Qty required per unit:</Text>
                      <TextInput 
                        style={styles.qtyInput}
                        value={comp.qty}
                        onChangeText={(val) => updateComponent(comp.id, 'qty', val)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Pressable style={styles.deleteBtn} onPress={() => removeComponent(comp.id)}>
                    <Feather name="trash-2" size={20} color="#EF4444" />
                  </Pressable>
                </View>
              );
            })
          )}

          <Pressable 
            style={[styles.saveBtn, (components.length === 0 || submitting) && styles.saveBtnDisabled]} 
            onPress={handleSaveRecipe}
            disabled={components.length === 0 || submitting}
          >
            <Feather name="save" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>{submitting ? "Saving..." : "Save Recipe"}</Text>
          </Pressable>
        </View>
        </>}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  headerRow: { marginBottom: spacing.xl },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },
  
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111111", marginBottom: 16 },
  
  componentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },
  
  emptyState: { paddingVertical: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed" },
  emptyText: { fontSize: 14, color: "#6B7280" },
  helperText: { fontSize: 13, color: "#9CA3AF", marginTop: 8 },
  
  componentRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#F9FAFB", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 16 },
  rowNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center", marginRight: 16, marginTop: 10 },
  rowNumberText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  
  componentInputs: { flex: 1 },
  inputSplit: { flexDirection: Platform.OS === "web" ? "row" : "column", marginBottom: 12 },
  
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  qtyInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, width: 80, height: 40, paddingHorizontal: 12, fontSize: 15, textAlign: "center", marginLeft: 12 },
  
  deleteBtn: { padding: 12, marginLeft: 12, marginTop: 2 },
  
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 16, borderRadius: 12, marginTop: 24 },
  saveBtnDisabled: { backgroundColor: "#D1D5DB" },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  // Shared inputs
  inputGroup: { flex: 1, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 },
  inputBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, height: 48 },
  inputText: { fontSize: 15, color: "#111111", flex: 1 },
  placeholderText: { color: "#9CA3AF" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  dropdownModal: { width: "100%", maxWidth: 400, backgroundColor: colors.white, borderRadius: 16, maxHeight: "60%", overflow: "hidden" },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" }
});