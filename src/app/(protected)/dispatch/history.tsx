import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";

import TransactionService from "@/services/transactionService";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";

export default function ChallanHistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const data = await TransactionService.getChallanHistory();
      setHistory(data);
    } catch (error) {
      console.log("Error fetching challan history", error);
    } finally {
      setLoading(false);
    }
  }

  const renderChallan = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.challanNumber}>{item.challan_number}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.movement_type}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <Text style={styles.routeText}>{item.origin}</Text>
        <Text style={styles.arrow}> ➔ </Text>
        <Text style={styles.routeText}>{item.destination}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={styles.metaText}>By: {item.created_by}</Text>
      </View>

      <View style={styles.itemsContainer}>
        {item.items.map((i: any, index: number) => (
          <View key={index} style={styles.lineItem}>
            <Text style={styles.itemName}>{i.quantity}x {i.item_name}</Text>
            <Text style={styles.itemCode}>{i.item_code}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Challan History</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.challan_number}
          renderItem={renderChallan}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { fontSize: typography.h2, fontWeight: "800", color: colors.navy, marginBottom: spacing.xl },
  listContent: { gap: spacing.md, paddingBottom: spacing.xxl },
  
  card: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  challanNumber: { fontSize: 16, fontWeight: "800", color: colors.navy },
  typeBadge: { backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: "700", color: colors.secondary, textTransform: "uppercase" },
  
  routeRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  routeText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  arrow: { fontSize: 14, color: colors.secondary, marginHorizontal: 4 },
  
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.background },
  metaText: { fontSize: 12, color: colors.secondary },
  
  itemsContainer: { paddingTop: spacing.md },
  lineItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemName: { fontSize: 14, color: colors.navy, fontWeight: "500" },
  itemCode: { fontSize: 12, color: colors.secondary },
});