import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PAGE_SIZE_OPTIONS, type PaginationState } from "@/utils/usePagination";

interface Props extends PaginationState {
  style?: any;
}

// Footer for a table paged with usePagination: "1–25 of 180", rows-per-
// page picker, prev/next. Renders nothing for an empty table.
export default function Pagination({ page, pageCount, pageSize, total, setPage, setPageSize, style }: Props) {
  const [sizePickerOpen, setSizePickerOpen] = useState(false);
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <View style={[styles.bar, style]}>
      <Text style={styles.range}>{from}–{to} of {total}</Text>

      <Pressable style={styles.sizeBtn} onPress={() => setSizePickerOpen(true)}>
        <Text style={styles.sizeText}>{pageSize} / page</Text>
        <Feather name="chevron-down" size={14} color="#6B7280" />
      </Pressable>

      <View style={styles.nav}>
        <Pressable style={[styles.navBtn, !canPrev && styles.navBtnDisabled]} onPress={() => setPage(1)} disabled={!canPrev} hitSlop={6}>
          <Feather name="chevrons-left" size={16} color="#374151" />
        </Pressable>
        <Pressable style={[styles.navBtn, !canPrev && styles.navBtnDisabled]} onPress={() => setPage(page - 1)} disabled={!canPrev} hitSlop={6}>
          <Feather name="chevron-left" size={16} color="#374151" />
        </Pressable>
        <Text style={styles.pageText}>Page {page} of {pageCount}</Text>
        <Pressable style={[styles.navBtn, !canNext && styles.navBtnDisabled]} onPress={() => setPage(page + 1)} disabled={!canNext} hitSlop={6}>
          <Feather name="chevron-right" size={16} color="#374151" />
        </Pressable>
        <Pressable style={[styles.navBtn, !canNext && styles.navBtnDisabled]} onPress={() => setPage(pageCount)} disabled={!canNext} hitSlop={6}>
          <Feather name="chevrons-right" size={16} color="#374151" />
        </Pressable>
      </View>

      <Modal visible={sizePickerOpen} transparent animationType="fade" onRequestClose={() => setSizePickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setSizePickerOpen(false)}>
          <View style={styles.sizeModal}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <Pressable
                key={size}
                style={styles.sizeOption}
                onPress={() => { setPageSize(size); setSizePickerOpen(false); }}
              >
                <Text style={[styles.sizeOptionText, size === pageSize && styles.sizeOptionActive]}>{size} rows per page</Text>
                {size === pageSize && <Feather name="check" size={16} color="#8B5CF6" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  range: { fontSize: 13, color: "#6B7280", fontWeight: "600", flex: 1, minWidth: 90 },
  sizeBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  sizeText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  nav: { flexDirection: "row", alignItems: "center", gap: 4 },
  navBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  navBtnDisabled: { opacity: 0.35 },
  pageText: { fontSize: 13, color: "#374151", fontWeight: "600", marginHorizontal: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", padding: 20 },
  sizeModal: { width: "100%", maxWidth: 260, backgroundColor: "#FFFFFF", borderRadius: 14, overflow: "hidden" },
  sizeOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  sizeOptionText: { fontSize: 14, color: "#374151" },
  sizeOptionActive: { color: "#8B5CF6", fontWeight: "700" },
});
