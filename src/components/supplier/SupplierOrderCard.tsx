import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import Alert from "@/utils/alert";
import colors from "@/theme/colors";
import SupplierOrderService from "@/services/supplierService";

const fmt = (n: number) => String(Math.round((n || 0) * 1000) / 1000);

interface QtyRow {
  product_id: string;
  label: string;
  unit: string;
  max: number;
  value: string;
}

// One supplier order as both Supplier Orders screens show it: what we
// expect back (ordered vs received), job-work material to send (planned
// vs sent, and from which department), and the actions that move stock —
// Approve/Reject, "Send material" (stock OUT of e.g. Raw Material) and
// "Receive" (stock IN to the ordering department).
export default function SupplierOrderCard({ order, canApprove, showDepartment, onChanged }: {
  order: any;
  canApprove: boolean;
  showDepartment?: boolean;
  onChanged: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "send" | "receive" | "edit">(null);
  const [rows, setRows] = useState<QtyRow[]>([]);

  const items: any[] = order.items || [];
  const materials: any[] = order.materials_to_send || [];
  const open = order.status !== "Pending" && order.status !== "Rejected" && order.status !== "Cancelled";
  // Quantity can be corrected / order cancelled until it's closed.
  const editable = !["Rejected", "Cancelled", "Received"].includes(order.status);
  const untouched = items.every((i) => !(i.received_qty > 0)) && materials.every((m) => !(m.sent_qty > 0));
  const toReceive = items.filter((i) => (i.ordered_qty || 0) - (i.received_qty || 0) > 1e-9);
  const toSend = materials.filter((m) => (m.quantity || 0) - (m.sent_qty || 0) > 1e-9);

  const run = async (fn: () => Promise<any>, fallback: string) => {
    try {
      setBusy(true);
      const res = await fn();
      if (res?.message) Alert.alert("Done", res.message);
      await onChanged();
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || fallback);
    } finally {
      setBusy(false);
    }
  };

  const openDialog = (kind: "send" | "receive") => {
    setRows(kind === "send"
      ? toSend.map((m) => {
          const left = (m.quantity || 0) - (m.sent_qty || 0);
          return { product_id: m.product_id, label: `${m.item_code ? `${m.item_code} — ` : ""}${m.name}`, unit: m.unit_of_measure || "", max: left, value: fmt(left) };
        })
      : toReceive.map((i) => {
          const left = (i.ordered_qty || 0) - (i.received_qty || 0);
          return { product_id: i.product_id, label: `${i.item_code ? `${i.item_code} — ` : ""}${i.product_name}`, unit: i.unit_of_measure || "", max: left, value: fmt(left) };
        }));
    setDialog(kind);
  };

  const openEdit = () => {
    setRows(items.map((i) => ({
      product_id: i.product_id,
      label: `${i.item_code ? `${i.item_code} — ` : ""}${i.product_name}`,
      unit: i.unit_of_measure || "",
      max: i.received_qty || 0,
      value: fmt(i.ordered_qty),
    })));
    setDialog("edit");
  };

  const confirmCancel = () => {
    Alert.alert(
      "Cancel this order?",
      `Order #${String(order.id).substring(0, 6).toUpperCase()} to ${order.supplier_name} will be cancelled.`,
      [
        { text: "Keep it", style: "cancel" },
        { text: "Cancel order", style: "destructive", onPress: () => run(() => SupplierOrderService.cancelOrder(order.id), "Failed to cancel order.") },
      ]
    );
  };

  const confirmDialog = async () => {
    if (dialog === "edit") {
      const changed = rows.filter((r) => {
        const orig = items.find((i) => i.product_id === r.product_id);
        return orig && Math.abs((parseFloat(r.value) || 0) - (orig.ordered_qty || 0)) > 1e-9;
      });
      setDialog(null);
      if (changed.length === 0) return;
      await run(async () => {
        const messages: string[] = [];
        for (const r of changed) {
          const res = await SupplierOrderService.updateOrderQuantity(order.id, r.product_id, parseFloat(r.value) || 0);
          messages.push(res.message);
        }
        return { message: messages.join("\n") };
      }, "Failed to update quantity.");
      return;
    }

    const payload = rows
      .map((r) => ({ product_id: r.product_id, quantity: parseFloat(r.value) || 0 }))
      .filter((r) => r.quantity > 0);
    if (payload.length === 0) {
      Alert.alert("Nothing entered", "Enter a quantity for at least one line.");
      return;
    }
    const kind = dialog;
    setDialog(null);
    if (kind === "send") {
      await run(() => SupplierOrderService.sendMaterial(order.id, payload), "Failed to send material.");
    } else {
      await run(() => SupplierOrderService.receiveOrder(order.id, payload), "Failed to receive.");
    }
  };

  const statusStyle: any[] =
    order.status === "Approved" ? [styles.statusBadgeApproved, styles.statusTextApproved]
    : order.status === "Rejected" ? [styles.statusBadgeRejected, styles.statusTextRejected]
    : order.status === "Received" ? [styles.statusBadgeReceived, styles.statusTextReceived]
    : order.status === "Cancelled" ? [styles.statusBadgeRejected, styles.statusTextRejected]
    : [null, null];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNumber}>
            Order #{String(order.id).substring(0, 6).toUpperCase()}
            {order.is_urgent === 1 && <Text style={styles.urgent}>  URGENT</Text>}
          </Text>
          <Text style={styles.sub}>
            {order.supplier_name}
            {showDepartment && order.department_name ? `  •  for ${order.department_name}` : ""}
            {order.order_date ? `  •  ${new Date(order.order_date).toLocaleDateString()}` : ""}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusStyle[0]]}>
          <Text style={[styles.statusText, statusStyle[1]]}>{order.status}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>EXPECTED FROM SUPPLIER</Text>
      {items.map((i, idx) => {
        const done = (i.received_qty || 0) >= (i.ordered_qty || 0) - 1e-9;
        return (
          <View key={idx} style={styles.line}>
            <Text style={styles.lineName} numberOfLines={1}>{i.item_code ? `${i.item_code} — ` : ""}{i.product_name}</Text>
            <Text style={[styles.lineQty, done && styles.lineDone]}>
              {fmt(i.received_qty)} / {fmt(i.ordered_qty)} {i.unit_of_measure || ""} received
            </Text>
          </View>
        );
      })}

      {materials.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: "#1D4ED8" }]}>MATERIAL WE SEND THE SUPPLIER</Text>
          {materials.map((m, idx) => {
            const done = (m.sent_qty || 0) >= (m.quantity || 0) - 1e-9;
            return (
              <View key={idx} style={styles.line}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {m.item_code ? `${m.item_code} — ` : ""}{m.name}
                  {m.from_department_name ? <Text style={styles.from}>  from {m.from_department_name}</Text> : null}
                </Text>
                <Text style={[styles.lineQty, done && styles.lineDone]}>
                  {fmt(m.sent_qty)} / {fmt(m.quantity)} {m.unit_of_measure || ""} sent
                </Text>
              </View>
            );
          })}
        </>
      )}

      <View style={styles.actions}>
        {editable && !busy && (
          <>
            {untouched && (
              <Pressable style={styles.linkBtn} onPress={confirmCancel}>
                <Text style={styles.linkDanger}>Cancel order</Text>
              </Pressable>
            )}
            <Pressable style={styles.linkBtn} onPress={openEdit}>
              <Feather name="edit-2" size={13} color="#6B7280" />
              <Text style={styles.linkText}>Edit qty</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
          </>
        )}
        {busy ? (
          <ActivityIndicator size="small" color="#8B5CF6" />
        ) : order.status === "Pending" ? (
          canApprove ? (
            <>
              <Pressable style={styles.rejectBtn} onPress={() => run(() => SupplierOrderService.updateOrderStatus(order.id, "Rejected"), "Failed to reject order.")}>
                <Feather name="x" size={14} color="#EF4444" />
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={() => run(() => SupplierOrderService.updateOrderStatus(order.id, "Approved"), "Failed to approve order.")}>
                <Feather name="check" size={14} color={colors.white} />
                <Text style={styles.primaryText}>Approve</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.hint}>Waiting for a manager to approve.</Text>
          )
        ) : open ? (
          <>
            {toSend.length > 0 && (
              <Pressable style={styles.sendBtn} onPress={() => openDialog("send")}>
                <Feather name="arrow-up-right" size={14} color="#1D4ED8" />
                <Text style={styles.sendText}>Send material</Text>
              </Pressable>
            )}
            {toReceive.length > 0 && (
              <Pressable style={styles.primaryBtn} onPress={() => openDialog("receive")}>
                <Feather name="arrow-down-left" size={14} color={colors.white} />
                <Text style={styles.primaryText}>Receive</Text>
              </Pressable>
            )}
          </>
        ) : null}
      </View>

      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {dialog === "send" ? "Send material to supplier" : dialog === "edit" ? "Edit order quantity" : "Receive from supplier"}
            </Text>
            <Text style={styles.modalSub}>
              {dialog === "send"
                ? `Takes this out of stock and records it as sent to ${order.supplier_name}.`
                : dialog === "edit"
                ? "Changes how much this order is for. For job work, the material to send is re-worked out from the current recipe."
                : `Adds this to ${order.department_name || "the department"}'s stock.`}
            </Text>
            {rows.map((r, idx) => (
              <View key={r.product_id} style={styles.modalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{r.label}</Text>
                  <Text style={styles.from}>
                    {dialog === "edit"
                      ? (r.max > 0 ? `${fmt(r.max)} ${r.unit} already received — can't go below that` : "Nothing received yet")
                      : `${fmt(r.max)} ${r.unit} still ${dialog === "send" ? "to send" : "expected"}`}
                  </Text>
                </View>
                <TextInput
                  style={styles.qtyInput}
                  value={r.value}
                  keyboardType="decimal-pad"
                  onChangeText={(t) => setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, value: t.replace(/[^0-9.]/g, "") } : x)))}
                />
                <Text style={styles.unit}>{r.unit}</Text>
              </View>
            ))}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setDialog(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={confirmDialog}>
                <Text style={styles.primaryText}>{dialog === "send" ? "Confirm sent" : dialog === "edit" ? "Save" : "Confirm received"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: colors.white },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 8 },
  orderNumber: { fontSize: 15, fontWeight: "800", color: "#111111" },
  urgent: { color: "#EF4444", fontSize: 12, fontWeight: "800" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  lineName: { flex: 1, fontSize: 13, color: "#374151" },
  lineQty: { fontSize: 13, fontWeight: "700", color: "#111111" },
  lineDone: { color: "#16A34A" },
  from: { fontSize: 12, color: "#9CA3AF", fontWeight: "400" },

  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  linkText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  linkDanger: { fontSize: 13, fontWeight: "600", color: "#EF4444" },
  hint: { fontSize: 12, color: "#9CA3AF" },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#8B5CF6", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  primaryText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  sendBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  sendText: { color: "#1D4ED8", fontSize: 13, fontWeight: "700" },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#FECACA", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  rejectText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },

  statusBadge: { backgroundColor: "#FEF3C7", borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  statusBadgeApproved: { backgroundColor: "#DBEAFE" },
  statusTextApproved: { color: "#1D4ED8" },
  statusBadgeRejected: { backgroundColor: "#FEE2E2" },
  statusTextRejected: { color: "#B91C1C" },
  statusBadgeReceived: { backgroundColor: "#DCFCE7" },
  statusTextReceived: { color: "#166534" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 480, backgroundColor: colors.white, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  modalSub: { fontSize: 13, color: "#6B7280", marginTop: 4, marginBottom: 12 },
  modalRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  qtyInput: { width: 90, height: 38, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 8, textAlign: "right", fontSize: 14, color: "#111111" },
  unit: { width: 40, fontSize: 13, fontWeight: "600", color: "#6B7280" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  cancelText: { fontSize: 13, fontWeight: "600", color: "#374151" },
});
