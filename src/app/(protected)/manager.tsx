import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";

import useAuthStore from "@/store/authStore";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import typography from "@/theme/typography";
import api from "@/services/api";
import SupplierOrderService from "@/services/supplierService";
import TransactionService from "@/services/transactionService";
import SmartSearch from "@/components/common/SmartSearch";

const QUICK_ACTIONS = [
  {
    id: "scan",
    title: "Scan In / Out",
    subtitle: "Move stock by barcode",
    icon: "qrcode.viewfinder",
    route: "/(protected)/floor-worker/scan", // Fixed path to point directly to your scanner file
    primary: true,
  },
  {
    id: "generate-qr",
    title: "Mint QR Bins",
    subtitle: "Create new bin barcodes",
    icon: "printer.fill", // Added the new QR Generator screen here
    route: "/(protected)/manager/generate-qr", 
    primary: false,
  },
  {
    id: "po",
    title: "Purchase Orders",
    subtitle: "Orders & auto-convert",
    icon: "doc.text",
    route: "/(protected)/manager/oem",
    primary: false,
  },
  {
    id: "qc",
    title: "QC Approvals",
    subtitle: "Approve pending stock",
    icon: "checkmark.seal",
    route: "/(protected)/quality",
    primary: false,
  },
  {
    id: "reports",
    title: "Reports",
    subtitle: "Live stock & exports",
    icon: "chart.bar",
    route: "/(protected)/manager/reports",
    primary: false,
  },
];

export default function ManagerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [metrics, setMetrics] = useState([
    { title: "Items in master", count: "-", icon: "cube.box", alert: false },
    { title: "Urgent order lines", count: "-", icon: "exclamationmark.triangle", alert: true },
    { title: "Scan movements", count: "-", icon: "shippingbox", alert: false },
  ]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const [itemsRes, orders, challanHistory] = await Promise.all([
        api.get("/items").catch(() => null),
        SupplierOrderService.getOrders().catch(() => []),
        TransactionService.getChallanHistory().catch(() => []),
      ]);

      const itemCount = itemsRes?.data?.data?.length ?? 0;
      const urgentLineCount = (orders || [])
        .filter((o: any) => o.is_urgent === 1)
        .reduce((sum: number, o: any) => sum + (o.items?.length || 0), 0);
      const movementCount = (challanHistory || []).length;

      setMetrics([
        { title: "Items in master", count: String(itemCount), icon: "cube.box", alert: false },
        { title: "Urgent order lines", count: String(urgentLineCount), icon: "exclamationmark.triangle", alert: true },
        { title: "Scan movements", count: String(movementCount), icon: "shippingbox", alert: false },
      ]);
    };
    fetchMetrics();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <View style={styles.headerCard}>
        <Text style={styles.headerBadge}>FACTORY CO-PILOT</Text>
        <Text style={styles.greeting}>{getGreeting()}, {user?.name || "Manager"}.</Text>
        <Text style={styles.headerSubtitle}>
          Your department — pick a task below to get started.
        </Text>
      </View>

      <SmartSearch />

      <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={[
              styles.actionCard,
              action.primary && styles.actionCardPrimary,
            ]}
            onPress={() => router.push(action.route as any)}
          >
            <View style={styles.iconContainer}>
              <SymbolView
                name={action.icon as any}
                size={24}
                tintColor={action.primary ? colors.white : colors.primary}
              />
            </View>
            <Text
              style={[
                styles.actionTitle,
                action.primary && { color: colors.white },
              ]}
            >
              {action.title}
            </Text>
            <Text
              style={[
                styles.actionSubtitle,
                action.primary && { color: "rgba(255,255,255,0.8)" },
              ]}
            >
              {action.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.metricsRow}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>{metric.title}</Text>
              <SymbolView
                name={metric.icon as any}
                size={16}
                tintColor={metric.alert ? colors.error : colors.secondary}
              />
            </View>
            <Text
              style={[
                styles.metricCount,
                metric.alert && metric.count !== "0" && { color: colors.error },
              ]}
            >
              {metric.count}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  headerCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 24,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  headerBadge: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  greeting: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    color: "#A0A0A0",
    fontSize: typography.body,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionCardPrimary: {
    backgroundColor: "#8B5CF6",
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: colors.secondary,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metricTitle: {
    fontSize: 13,
    color: colors.secondary,
    flex: 1,
  },
  metricCount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.navy,
  },
});