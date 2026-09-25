import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, Modal, FlatList, ActivityIndicator } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import RecipeService from "@/services/recipeService";
import DepartmentPoService from "@/services/departmentPoService";

// --- Reusable Dropdown Component ---
const SelectInput = ({ label, placeholder, value, options, onSelect, hasRecipeIds, disabled }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOption = options?.find((o: any) => o.id === value);

  const closeModal = () => {
    setModalVisible(false);
    setQuery("");
  };

  // Matches on name or item code, so "F1 1001" and "switch base" both work.
  const q = query.trim().toLowerCase();
  const visibleOptions = (options || []).filter((o: any) =>
    !q || `${o.name || ""} ${o.item_code || ""}`.toLowerCase().includes(q)
  );

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={[styles.inputBox, disabled && { opacity: 0.5 }]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.inputText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
          {selectedOption ? selectedOption.name : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.dropdownModal} onPress={() => {}}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <View style={styles.searchRow}>
              <Feather name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={visibleOptions}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.noMatchText}>No matches</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.dropdownOption}
                  onPress={() => { onSelect(item.id); closeModal(); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item.id && { color: "#8B5CF6", fontWeight: "700" }]}>
                    {item.name} {item.item_code ? `(${item.item_code})` : ""}
                    {hasRecipeIds?.has(item.id) ? " · has its own recipe" : ""}
                  </Text>
                  {value === item.id && <Feather name="check" size={18} color="#8B5CF6" />}
                </Pressable>
              )}
            />
          </Pressable>
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
  // Rank of the top department level — items in those departments are
  // finished goods, which can be built here but never used as a component.
  const [finalRank, setFinalRank] = useState<number | null>(null);

  // Form State
  const [selectedFG, setSelectedFG] = useState("");
  const [fgDepartment, setFgDepartment] = useState("");
  const [components, setComponents] = useState<{ id: string, department: string, itemId: string, qty: string, lazerNeeded: boolean, colourNeeded: boolean }[]>([]);
  const [notes, setNotes] = useState("");
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [hasRecipeIds, setHasRecipeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptsRes, rmRes, recipesRes, levelsRes] = await Promise.all([
          api.get('/departments'),
          // Any item can be "what you're building" now, not just a
          // FINAL-level finished good — that's what lets a component
          // (e.g. an RTC Assembly) have its own recipe, which is what
          // makes multi-level BOMs possible.
          api.get('/items'),
          RecipeService.getRecipes().catch(() => []),
          api.get('/departments/levels').catch(() => null),
        ]);

        const finalLevel = (levelsRes?.data?.data || []).find((l: any) => l.is_final);
        setFinalRank(finalLevel ? finalLevel.rank : null);

        const depts = deptsRes.data?.data || [];
        const materials = rmRes.data?.data || [];
        setDepartments(depts);
        setFinishedGoods(materials);
        setRawMaterials(materials);
        setHasRecipeIds(new Set(recipesRes.map((r) => r.finished_good_id)));

        if (editingFinishedGoodId) {
          setSelectedFG(editingFinishedGoodId);
          setFgDepartment(materials.find((m: any) => m.id === editingFinishedGoodId)?.department_id || "");
          const { components: existing, version } = await RecipeService.getRecipe(editingFinishedGoodId);
          setCurrentVersion(version);
          setComponents(existing.map((c) => {
            const material = materials.find((m: any) => m.id === c.component_id);
            return {
              id: c.id,
              department: material?.department_id || "",
              itemId: c.component_id,
              qty: String(c.quantity_required),
              lazerNeeded: !!c.lazer_needed,
              colourNeeded: !!c.colour_needed,
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
      { id: Date.now().toString(), department: "", itemId: "", qty: "1", lazerNeeded: false, colourNeeded: false }
    ]);
  };

  const updateComponent = (id: string, field: string, value: string | boolean) => {
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

    const whiteButColoured = components.find((c) => {
      if (!c.colourNeeded) return false;
      const material = rawMaterials.find((m: any) => m.id === c.itemId);
      return material?.powder_colour === "White";
    });
    if (whiteButColoured) {
      Alert.alert(
        "Invalid routing",
        "A White moulded part can't be routed to Colour. Only Black/Grey parts may set Colour needed."
      );
      return;
    }

    try {
      setSubmitting(true);
      const result = await RecipeService.createRecipe({
        output_item_id: selectedFG,
        ingredients: components.map((c) => ({
          input_item_id: c.itemId,
          quantity_required: parseFloat(c.qty) || 0,
          lazer_needed: c.lazerNeeded,
          colour_needed: c.colourNeeded,
        })),
        notes: notes.trim() || undefined,
      });
      const saved = `Saved as version ${result.version}. The previous version is kept in history, not overwritten.`;
      const unsent = result.unsent_po_ids || [];
      if (unsent.length > 0) {
        // Orders for this item that couldn't go to departments earlier
        // because it had no recipe — offer to send them right now.
        Alert.alert(
          "Recipe saved",
          `${saved}\n\n${unsent.length} customer order${unsent.length === 1 ? " is" : "s are"} waiting on this recipe. Send ${unsent.length === 1 ? "it" : "them"} to departments now?`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "Send now",
              onPress: async () => {
                try {
                  const sent = await DepartmentPoService.generateFromPOs(unsent);
                  Alert.alert("Sent", sent.message);
                } catch (error: any) {
                  Alert.alert("Not sent", error?.response?.data?.error || "Failed to send to departments.");
                }
              },
            },
          ]
        );
      } else {
        Alert.alert("Success", saved);
      }
      if (isEditing) {
        router.back();
      } else {
        setSelectedFG("");
        setFgDepartment("");
        setComponents([]);
        setNotes("");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to save recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFinalDept = (d: any) => finalRank !== null && d.level === finalRank;
  const finalDeptIds = new Set(departments.filter(isFinalDept).map((d: any) => d.id));
  // "What are you building" — finished-goods department(s) first.
  const buildDepartments = [...departments].sort((a, b) => Number(isFinalDept(b)) - Number(isFinalDept(a)));
  // Components — never a finished-goods department.
  const componentDepartments = departments.filter((d: any) => !isFinalDept(d));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {isEditing ? "Edit Recipe" : "Recipe (BOM) Builder"}
            {isEditing && currentVersion ? ` — v${currentVersion}` : ""}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? "Saving creates a new version — the current one is kept in history, not overwritten."
              : "Define the components required to build this item. Works for finished goods and for intermediate components/subassemblies alike — building a component's own recipe here is what enables multi-level BOMs."}
          </Text>
        </View>

        {loadingExisting && <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />}

        {!loadingExisting && <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. What are you building?</Text>
          <View style={styles.inputSplit}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <SelectInput
                placeholder="Department..."
                value={fgDepartment}
                options={buildDepartments}
                onSelect={(val: string) => {
                  setFgDepartment(val);
                  setSelectedFG(""); // Reset item when dept changes
                }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <SelectInput
                placeholder={fgDepartment ? "Select the item to build..." : "Select a department first"}
                value={selectedFG}
                options={
                  fgDepartment
                    ? finishedGoods.filter((fg: any) => fg.department_id === fgDepartment)
                    : finishedGoods.filter((fg: any) => fg.id === selectedFG)
                }
                onSelect={setSelectedFG}
                hasRecipeIds={hasRecipeIds}
                disabled={!fgDepartment}
              />
            </View>
          </View>
          {finishedGoods.length === 0 && (
            <Text style={styles.helperText}>
              No items yet — add one under Items & QR first.
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
              // Only offer parts that belong to this row's department — with
              // no department picked there's nothing to choose from yet. (A
              // row loaded from an older recipe whose part has no department
              // still shows that one part so it doesn't appear blank.)
              const filteredMaterials = comp.department
                ? rawMaterials.filter((rm: any) => rm.department_id === comp.department && !finalDeptIds.has(rm.department_id))
                : rawMaterials.filter((rm: any) => rm.id === comp.itemId);

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
                          options={componentDepartments} 
                          onSelect={(val: string) => {
                            updateComponent(comp.id, 'department', val);
                            updateComponent(comp.id, 'itemId', ''); // Reset item when dept changes
                          }} 
                        />
                      </View>
                      <View style={{ flex: 2 }}>
                        <SelectInput
                          placeholder={comp.department ? "Select specific part..." : "Select a department first"}
                          value={comp.itemId}
                          options={filteredMaterials}
                          disabled={!comp.department}
                          onSelect={(val: string) => {
                            updateComponent(comp.id, 'itemId', val);
                            // A White moulded part can never be routed to
                            // Colour — clear a stale flag from switching
                            // away from a Black/Grey part.
                            const material = rawMaterials.find((rm: any) => rm.id === val);
                            if (material?.powder_colour === "White") {
                              updateComponent(comp.id, 'colourNeeded', false);
                            }
                          }}
                          hasRecipeIds={hasRecipeIds}
                        />
                      </View>
                    </View>
                    
                    {(() => {
                      // Spelled out in real units so e.g. powder reads
                      // "0.012 kg per 1 pcs of Switch Cap".
                      const material = rawMaterials.find((rm: any) => rm.id === comp.itemId);
                      const built = finishedGoods.find((fg: any) => fg.id === selectedFG);
                      return (
                        <View style={styles.qtyRow}>
                          <Text style={styles.label}>Needs</Text>
                          <TextInput
                            style={styles.qtyInput}
                            value={comp.qty}
                            onChangeText={(val) => updateComponent(comp.id, 'qty', val.replace(/[^0-9.]/g, ""))}
                            keyboardType="decimal-pad"
                          />
                          <Text style={[styles.label, { marginLeft: 8 }]}>
                            {material?.unit_of_measure || "units"} per 1 {built?.unit_of_measure || "pcs"}
                            {built ? ` of ${built.name}` : ""}
                          </Text>
                        </View>
                      );
                    })()}

                    {(() => {
                      const material = rawMaterials.find((rm: any) => rm.id === comp.itemId);
                      const isWhite = material?.powder_colour === "White";
                      return (
                        <View style={styles.routingRow}>
                          <Pressable
                            style={[styles.routingChip, comp.lazerNeeded && styles.routingChipActive]}
                            onPress={() => updateComponent(comp.id, 'lazerNeeded', !comp.lazerNeeded)}
                          >
                            <Feather name="zap" size={13} color={comp.lazerNeeded ? colors.white : "#374151"} style={{ marginRight: 4 }} />
                            <Text style={[styles.routingChipText, comp.lazerNeeded && styles.routingChipTextActive]}>Laser needed</Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.routingChip,
                              comp.colourNeeded && styles.routingChipActive,
                              isWhite && styles.routingChipDisabled,
                            ]}
                            disabled={isWhite}
                            onPress={() => updateComponent(comp.id, 'colourNeeded', !comp.colourNeeded)}
                          >
                            <Feather name="droplet" size={13} color={comp.colourNeeded ? colors.white : "#374151"} style={{ marginRight: 4 }} />
                            <Text style={[styles.routingChipText, comp.colourNeeded && styles.routingChipTextActive]}>Colour needed</Text>
                          </Pressable>
                          {material?.powder_colour && (
                            <View style={[styles.colourBadge, isWhite && styles.colourBadgeWarn]}>
                              <Text style={[styles.colourBadgeText, isWhite && styles.colourBadgeWarnText]}>
                                {material.powder_colour}
                                {isWhite ? " · can't route to Colour" : ""}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>

                  <Pressable style={styles.deleteBtn} onPress={() => removeComponent(comp.id)}>
                    <Feather name="trash-2" size={20} color="#EF4444" />
                  </Pressable>
                </View>
              );
            })
          )}

          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.label}>Revision notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Engineering change: brass supplier switched"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          <Pressable
            style={[styles.saveBtn, (components.length === 0 || submitting) && styles.saveBtnDisabled]}
            onPress={handleSaveRecipe}
            disabled={components.length === 0 || submitting}
          >
            <Feather name="save" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>{submitting ? "Saving..." : isEditing ? "Save as New Version" : "Save Recipe"}</Text>
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
  
  qtyRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  qtyInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, width: 90, height: 40, paddingHorizontal: 12, fontSize: 15, textAlign: "center", marginLeft: 8 },

  routingRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 },
  routingChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  routingChipActive: { backgroundColor: "#111111", borderColor: "#111111" },
  routingChipDisabled: { opacity: 0.4 },
  routingChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  routingChipTextActive: { color: colors.white },
  colourBadge: { backgroundColor: "#F3F4F6", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  colourBadgeWarn: { backgroundColor: "#FEF2F2" },
  colourBadgeText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  colourBadgeWarnText: { color: "#DC2626" },
  notesInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, minHeight: 60, padding: 12, fontSize: 14, textAlignVertical: "top" },
  
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  searchInput: { flex: 1, fontSize: 15, color: "#111111", paddingVertical: 4 },
  noMatchText: { padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 14 },
  dropdownTitle: { fontSize: 16, fontWeight: "700", color: "#111111", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  dropdownOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownOptionText: { fontSize: 15, color: "#374151" }
});