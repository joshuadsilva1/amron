import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import RecipeService, { RecipeSummary } from "@/services/recipeService";

export default function RecipesListPage() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Recipes (BOM)</Text>
            <Text style={styles.subtitle}>Bills of material for every finished good you've defined.</Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => router.push("/(protected)/manager/recipes/new")}>
            <Feather name="plus" size={16} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>New recipe</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 60 }} />
        ) : recipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recipes defined yet. Tap "New recipe" to build one.</Text>
          </View>
        ) : (
          recipes.map((recipe) => {
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
                      {recipe.finished_good_code || "No code"} · {recipe.component_count} component{recipe.component_count === 1 ? "" : "s"}
                    </Text>
                  </View>

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
                        <Text style={styles.componentName}>{c.component_name || "Unknown component"}</Text>
                        <Text style={styles.componentMeta}>
                          {c.component_code || "N/A"} · {c.quantity_required} per unit{c.lazer_needed ? " · Lazer needed" : ""}
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
  editBtn: { padding: 8 },

  componentsList: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingHorizontal: 20, paddingVertical: 12 },
  componentRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  componentName: { fontSize: 14, fontWeight: "600", color: "#111111", marginBottom: 2 },
  componentMeta: { fontSize: 12, color: "#6B7280" },
});
