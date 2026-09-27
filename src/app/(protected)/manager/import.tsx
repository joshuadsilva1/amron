import React from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import spacing from "@/theme/spacing";
import { ExcelImportCard, ImportModuleId } from "@/components/import/ExcelImport";

// Every Excel import in one place. The same cards also open from the
// screen each one belongs to (Items, Recipes, Purchase Orders, Racks) via
// their "Import Excel" button — this page is just the full set.
const ALL_MODULES: ImportModuleId[] = ["items", "recipes", "purchase-orders", "racks", "rack-stock"];

export default function ImportExcelPage() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Import from Excel</Text>
      <Text style={styles.subtitle}>
        Templates have headers only — fill them in and upload. The same imports are on each screen's "Import Excel" button.
      </Text>
      <View style={styles.grid}>
        {ALL_MODULES.map((id) => (
          <View key={id} style={{ width: wide ? "48.5%" : "100%" }}>
            <ExcelImportCard moduleId={id} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: spacing.xl },
  title: { fontSize: 30, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
