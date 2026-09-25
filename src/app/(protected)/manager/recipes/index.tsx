import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal } from "react-native";
import SearchBar from "@/components/common/SearchBar";
import { useSearch } from "@/utils/useSearch";
import { usePagination } from "@/utils/usePagination";
import Pagination from "@/components/common/Pagination";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import RecipeService, { RecipeSummary, RecipeVersion } from "@/services/recipeService";

export default function RecipesListPage() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const search = useSearch(recipes);
  const pagination = usePagination(search.filtered);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [historyFor, setHistoryFor] = useState<RecipeSummary | null>(null);
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await RecipeService.getRecipes();
      setRecipes(data);
    } catch (error) {
      console.warn("Failed to fetch recipes", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch every time this screen regains focus, so a recipe just saved
  // in the builder shows up here without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [fetchRecipes])
  );

  const openHistory = async (recipe: RecipeSummary) => {
    setHistoryFor(recipe);
    setLoadingVersions(true);
    try {
      const data = await RecipeService.getVersions(recipe.finished_good_id);
      setVersions(data);
    } catch (error) {
      console.warn("Failed to fetch recipe versions", error);
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Recipes (BOM)</Text>
            <Text style={styles.subtitle}>Bills of material — finished goods and intermediate components can each have their own recipe, so a BOM can nest multiple levels deep.</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => router.push("/(protected)/manager/recipes/new")}>
            <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>New recipe</Text>
          </Pressable>
        </View>

        <SearchBar
          value={search.query}
          onChangeText={search.setQuery}
          placeholder="Search recipes by product or component..."
          resultCount={search.filtered.length}
          totalCount={recipes.length}
        />
        <Pagination {...pagination} />
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : recipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recipes defined yet. Tap "New recipe" to build one.</Text>
          </View>
        ) : (
          pagination.pageRows.map((recipe) => {
            const isExpanded = expandedId === recipe.finished_good_id;
            return (
              <View key={recipe.finished_good_id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => setExpandedId(isExpanded ? null : recipe.finished_good_id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fgName}>{recipe.finished_good_name}</Text>
                    <Text style={styles.fgCode}>
                      {recipe.finished_good_code || "No code"} · v{recipe.version} · {recipe.component_count} component{recipe.component_count === 1 ? "" : "s"}
                    </Text>
                    {recipe.departments.length > 0 && (
                      <Text style={styles.fgDepartments}>
                        Draws from: {recipe.departments.join(" · ")}
                      </Text>
                    )}
                  </View>

                  <Pressable style={styles.historyBtn} onPress={() => openHistory(recipe)} hitSlop={10}>
                    <Feather name="clock" size={16} color="#6B7280" />
                  </Pressable>

                  <Pressable
                    style={styles.editBtn}
                    onPress={() => router.push(`/(protected)/manager/recipes/new?finished_good_id=${recipe.finished_good_id}` as any)}
                    hitSlop={10}
                  >
                    <Feather name="edit-2" size={16} color="#6B7280" />
                  </Pressable>

                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
                </Pressable>

                {isExpanded && (
                  <View style={styles.componentsList}>
                    {recipe.components.map((c) => (
                      <View key={c.id} style={styles.componentRow}>
                        <Text style={styles.componentName}>
                          {c.component_name || "Unknown component"}
                          {c.has_sub_recipe ? " ⤵" : ""}
                        </Text>
                        <Text style={styles.componentMeta}>
                          {c.component_code || "N/A"} · {c.component_department_name || "No department"} · {c.quantity_required} per unit{c.lazer_needed ? " · Lazer needed" : ""}
                          {c.has_sub_recipe ? " · has its own recipe (multi-level)" : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Version history modal */}
      <Modal visible={!!historyFor} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setHistoryFor(null)}>
          <View style={styles.historyModal}>
            <Text style={styles.historyTitle}>{historyFor?.finished_good_name} — version history</Text>
            {loadingVersions ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {versions.map((v) => (
                  <View key={v.id} style={styles.versionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.versionLabel}>
                        v{v.version}{v.is_active ? "  (active)" : ""}
                      </Text>
                      {!!v.notes && <Text style={styles.versionNotes}>{v.notes}</Text>}
                      <Text style={styles.versionMeta}>
                        {v.component_count} component{v.component_count === 1 ? "" : "s"} · {v.created_at ? new Date(v.created_at).toLocaleDateString() : ""}
                      </Text>
                    </View>
                    {v.is_active && <View style={styles.activeDot} />}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.xl, gap: spacing.md },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#111111", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontWeight: "600", color: colors.white },

  emptyCard: { backgroundColor: colors.white, borderRadius: 16, padding: 40, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 15, color: "#6B7280" },

  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, marginBottom: 16, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 20 },
  fgName: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 4 },
  fgCode: { fontSize: 13, color: "#6B7280" },
  fgDepartments: { fontSize: 12, color: "#8B5CF6", fontWeight: "600", marginTop: 4 },
  editBtn: { padding: 8 },
  historyBtn: { padding: 8 },

  componentsList: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingHorizontal: 20, paddingVertical: 12 },
  componentRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  componentName: { fontSize: 14, fontWeight: "600", color: "#111111", marginBottom: 2 },
  componentMeta: { fontSize: 12, color: "#6B7280" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  historyModal: { width: "100%", maxWidth: 420, backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  historyTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 16 },
  versionRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  versionLabel: { fontSize: 14, fontWeight: "700", color: "#111111" },
  versionNotes: { fontSize: 13, color: "#6B7280", marginTop: 4, fontStyle: "italic" },
  versionMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E", marginTop: 6 },
});
