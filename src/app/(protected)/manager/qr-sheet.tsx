// import React, { useState, useEffect } from "react";
// import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Alert } from "react-native";
// import { Feather } from "@expo/vector-icons";

// import colors from "@/theme/colors";
// import spacing from "@/theme/spacing";
// import ItemService, { MasterItem } from "@/services/itemService";

// interface SelectedItem {
//   product: MasterItem;
//   quantity: number;
// }

// export default function QRCodeSheetPage() {
//   const [loading, setLoading] = useState(true);
//   const [products, setProducts] = useState<MasterItem[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

//   useEffect(() => {
//     fetchProducts();
//   }, []);

//   const fetchProducts = async () => {
//     try {
//       setLoading(true);
//       const data = await ItemService.getItems().catch(() => []);
      
//       // Fallback dummy data if API is empty for UI testing
//       if (data.length === 0) {
//         setProducts([{
//           id: "1",
//           item_code: "P101",
//           name: "ROCKER 10A 1 WAY KNOB",
//           type: "Moulding",
//           category: "WHITE MOULDNIG",
//           unit_of_measure: "pcs",
//           pcs_per_scan: 1000,
//           master_qr_string: "ITM-MRDDLGYU-WDPYAA"
//         }]);
//       } else {
//         setProducts(data);
//       }
//     } catch (error) {
//       console.error("Failed to load items", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredProducts = products.filter(p => 
//     p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
//     p.item_code.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const handleAddProduct = (product: MasterItem) => {
//     const alreadySelected = selectedItems.find(item => item.product.id === product.id);
//     if (!alreadySelected) {
//       setSelectedItems([...selectedItems, { product, quantity: 1 }]);
//     }
//   };

//   const handleRemoveProduct = (productId: string) => {
//     setSelectedItems(selectedItems.filter(item => item.product.id !== productId));
//   };

//   const handleUpdateQuantity = (productId: string, rawValue: string) => {
//     const val = parseInt(rawValue.replace(/[^0-9]/g, "")) || 0;
//     setSelectedItems(selectedItems.map(item => 
//       item.product.id === productId ? { ...item, quantity: val } : item
//     ));
//   };

//   const incrementQuantity = (productId: string) => {
//     setSelectedItems(selectedItems.map(item => 
//       item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
//     ));
//   };

//   const decrementQuantity = (productId: string) => {
//     setSelectedItems(selectedItems.map(item => 
//       item.product.id === productId && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
//     ));
//   };

//   const handleAutoFill35 = () => {
//     if (selectedItems.length === 0) {
//       Alert.alert("Notice", "Please select at least one product first.");
//       return;
//     }
    
//     const currentTotal = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
    
//     if (currentTotal >= 35) {
//       Alert.alert("Notice", "You already have 35 or more labels selected.");
//       return;
//     }

//     const difference = 35 - currentTotal;
    
//     // Add the difference to the first item in the list
//     const updatedItems = [...selectedItems];
//     updatedItems[0].quantity += difference;
//     setSelectedItems(updatedItems);
//   };

//   const handlePrint = () => {
//     if (selectedItems.length === 0) {
//       Alert.alert("Error", "No products selected to print.");
//       return;
//     }
//     Alert.alert("Success", `Sent ${totalLabels} labels to the printer.`);
//   };

//   const totalLabels = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
//   const totalSheets = Math.ceil(totalLabels / 35);

//   return (
//     <View style={styles.container}>
//       <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
//         {/* Header Section */}
//         <View style={styles.headerRow}>
//           <View style={styles.headerIconBox}>
//             <Feather name="grid" size={24} color="#8B5CF6" />
//           </View>
//           <View style={styles.headerTextWrapper}>
//             <Text style={styles.title}>QR Code Sheet</Text>
//             <Text style={styles.subtitle}>
//               Pick products, set how many of each, and print one combined label sheet (35 per A4).
//             </Text>
//           </View>
//         </View>

//         {/* Workspace Layout */}
//         <View style={styles.workspaceRow}>
          
//           {/* Left Column: Search & Add */}
//           <View style={styles.leftColumn}>
//             <View style={styles.card}>
              
//               {/* Search Bar */}
//               <View style={styles.searchBox}>
//                 <Feather name="search" size={16} color="#9CA3AF" style={{ marginRight: 10 }} />
//                 <TextInput 
//                   style={styles.searchInput}
//                   placeholder="Search by code or name..."
//                   placeholderTextColor="#9CA3AF"
//                   value={searchQuery}
//                   onChangeText={setSearchQuery}
//                 />
//               </View>

//               {/* Product List */}
//               {loading ? (
//                 <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 40 }} />
//               ) : (
//                 <View style={styles.productList}>
//                   {filteredProducts.map((product) => {
//                     const isSelected = selectedItems.some(item => item.product.id === product.id);
                    
//                     return (
//                       <View key={product.id} style={[styles.productRow, isSelected && styles.productRowDisabled]}>
//                         <View style={styles.productInfoLeft}>
//                           <Text style={[styles.productCode, isSelected && styles.textDisabled]}>{product.item_code}</Text>
//                           <Text style={[styles.productName, isSelected && styles.textDisabled]} numberOfLines={1}>
//                             {product.name}
//                           </Text>
//                         </View>
                        
//                         <View style={styles.productInfoRight}>
//                           <View style={styles.typeBadge}>
//                             <Text style={styles.typeBadgeText}>{product.type || "Moulding"}</Text>
//                           </View>
                          
//                           <Pressable 
//                             style={styles.addBtn} 
//                             onPress={() => handleAddProduct(product)}
//                             disabled={isSelected}
//                           >
//                             <Feather name={isSelected ? "check" : "plus"} size={16} color={isSelected ? "#10B981" : "#9CA3AF"} />
//                           </Pressable>
//                         </View>
//                       </View>
//                     );
//                   })}
//                   {filteredProducts.length === 0 && !loading && (
//                     <Text style={styles.noResultsText}>No products found.</Text>
//                   )}
//                 </View>
//               )}
//             </View>
//           </View>

//           {/* Right Column: Selected & Print */}
//           <View style={styles.rightColumn}>
//             <View style={styles.card}>
              
//               {/* Right Header */}
//               <View style={styles.selectedHeader}>
//                 <Text style={styles.cardTitle}>Selected products</Text>
//                 <Pressable style={styles.autoFillBtn} onPress={handleAutoFill35}>
//                   <Text style={styles.autoFillText}>Auto-fill 35</Text>
//                 </Pressable>
//               </View>

//               {/* Selected Items List */}
//               <View style={styles.selectedList}>
//                 {selectedItems.length === 0 ? (
//                   <Text style={styles.emptyCartText}>No products selected yet.</Text>
//                 ) : (
//                   selectedItems.map((item) => (
//                     <View key={item.product.id} style={styles.selectedRow}>
//                       <View style={styles.selectedInfo}>
//                         <Text style={styles.selectedName} numberOfLines={1}>{item.product.name}</Text>
//                         <Text style={styles.selectedCode}>{item.product.item_code}</Text>
//                       </View>
                      
//                       <View style={styles.selectedControls}>
//                         {/* Number Input Box with Up/Down Arrows */}
//                         <View style={styles.qtyBox}>
//                           <TextInput 
//                             style={styles.qtyInput}
//                             value={String(item.quantity).padStart(3, '0')}
//                             onChangeText={(val) => handleUpdateQuantity(item.product.id, val)}
//                             keyboardType="number-pad"
//                           />
//                           <View style={styles.qtyArrows}>
//                             <Pressable style={styles.arrowTop} onPress={() => incrementQuantity(item.product.id)}>
//                               <Feather name="chevron-up" size={12} color="#4B5563" />
//                             </Pressable>
//                             <Pressable style={styles.arrowBottom} onPress={() => decrementQuantity(item.product.id)}>
//                               <Feather name="chevron-down" size={12} color="#4B5563" />
//                             </Pressable>
//                           </View>
//                         </View>
                        
//                         <Pressable style={styles.trashBtn} onPress={() => handleRemoveProduct(item.product.id)}>
//                           <Feather name="trash-2" size={18} color="#4B5563" />
//                         </Pressable>
//                       </View>
//                     </View>
//                   ))
//                 )}
//               </View>

//               {/* Totals & Print */}
//               <View style={styles.totalsSection}>
//                 <View style={styles.totalRow}>
//                   <Text style={styles.totalLabel}>Total labels</Text>
//                   <Text style={styles.totalValue}>{totalLabels}</Text>
//                 </View>
//                 <View style={styles.totalRow}>
//                   <Text style={styles.totalLabel}>A4 sheets (35 each)</Text>
//                   <Text style={styles.totalValue}>{totalSheets}</Text>
//                 </View>

//                 <Pressable 
//                   style={[styles.printBtn, selectedItems.length === 0 && styles.printBtnDisabled]} 
//                   onPress={handlePrint}
//                 >
//                   <Feather name="printer" size={16} color={colors.white} style={{ marginRight: 8 }} />
//                   <Text style={styles.printBtnText}>Print QR sheet</Text>
//                 </Pressable>
//               </View>

//             </View>
//           </View>

//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F9FAFB" },
//   contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
//   // Header
//   headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
//   headerIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginRight: 16 },
//   headerTextWrapper: { flex: 1 },
//   title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
//   subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

//   // Layout
//   workspaceRow: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 24, alignItems: "flex-start" },
//   leftColumn: { flex: 1, width: "100%" },
//   rightColumn: { flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 500 : "100%" },
  
//   card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 300 },

//   // Left Column Styles
//   searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20 },
//   searchInput: { flex: 1, fontSize: 15, color: "#111111" },
  
//   productList: { gap: 12 },
//   productRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
//   productRowDisabled: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" },
  
//   productInfoLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 },
//   productCode: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginRight: 12, width: 45 },
//   productName: { fontSize: 14, color: "#111111", flex: 1 },
//   textDisabled: { color: "#D1D5DB" },
  
//   productInfoRight: { flexDirection: "row", alignItems: "center", gap: 12 },
//   typeBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
//   typeBadgeText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },
//   addBtn: { padding: 4 },
//   noResultsText: { textAlign: "center", color: "#9CA3AF", marginTop: 20 },

//   // Right Column Styles
//   selectedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
//   cardTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
//   autoFillBtn: { backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
//   autoFillText: { fontSize: 13, fontWeight: "600", color: "#374151" },

//   selectedList: { borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 20, marginBottom: 20, minHeight: 100 },
//   emptyCartText: { color: "#9CA3AF", fontStyle: "italic", textAlign: "center", marginTop: 30 },
  
//   selectedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, marginBottom: 12 },
//   selectedInfo: { flex: 1, marginRight: 16 },
//   selectedName: { fontSize: 15, fontWeight: "500", color: "#111111", marginBottom: 4 },
//   selectedCode: { fontSize: 13, color: "#6B7280" },

//   selectedControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  
//   qtyBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, overflow: "hidden", height: 40 },
//   qtyInput: { width: 50, height: "100%", textAlign: "center", fontSize: 15, color: "#111111", backgroundColor: colors.white },
//   qtyArrows: { borderLeftWidth: 1, borderLeftColor: "#D1D5DB", backgroundColor: "#F9FAFB", width: 24, height: "100%", justifyContent: "center" },
//   arrowTop: { flex: 1, justifyContent: "center", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
//   arrowBottom: { flex: 1, justifyContent: "center", alignItems: "center" },

//   trashBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },

//   totalsSection: { gap: 12 },
//   totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
//   totalLabel: { fontSize: 15, color: "#4B5563" },
//   totalValue: { fontSize: 16, fontWeight: "700", color: "#111111" },

//   printBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 14, borderRadius: 12, marginTop: 12 },
//   printBtnDisabled: { backgroundColor: "#D1D5DB" },
//   printBtnText: { color: colors.white, fontWeight: "600", fontSize: 15 },
// });


import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";

import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import ItemService, { MasterItem } from "@/services/itemService";
import LabelService from "@/services/labelService";
import { exportBinaryFile, exportQrLabelSheet } from "@/utils/export";

interface SelectedItem {
  product: MasterItem;
  quantity: number;
}

export default function QRCodeSheetPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MasterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [zipDownloading, setZipDownloading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await ItemService.getItems().catch(() => []);
      
      // Fallback dummy data if API is empty for UI testing
      if (data.length === 0) {
        setProducts([{
          id: "1",
          item_code: "P101",
          name: "ROCKER 10A 1 WAY KNOB",
          type: "Moulding",
          category: "WHITE MOULDNIG",
          unit_of_measure: "pcs",
          pcs_per_scan: 1000,
          master_qr_string: "ITM-MRDDLGYU-WDPYAA"
        }]);
      } else {
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to load items", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.item_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = (product: MasterItem) => {
    const alreadySelected = selectedItems.find(item => item.product.id === product.id);
    if (!alreadySelected) {
      setSelectedItems([...selectedItems, { product, quantity: 1 }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedItems(selectedItems.filter(item => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, rawValue: string) => {
    const val = parseInt(rawValue.replace(/[^0-9]/g, "")) || 0;
    setSelectedItems(selectedItems.map(item => 
      item.product.id === productId ? { ...item, quantity: val } : item
    ));
  };

  const incrementQuantity = (productId: string) => {
    setSelectedItems(selectedItems.map(item => 
      item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const decrementQuantity = (productId: string) => {
    setSelectedItems(selectedItems.map(item => 
      item.product.id === productId && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
    ));
  };

  const handleAutoFill35 = () => {
    if (selectedItems.length === 0) {
      Alert.alert("Notice", "Please select at least one product first.");
      return;
    }
    
    const currentTotal = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
    
    if (currentTotal >= 35) {
      Alert.alert("Notice", "You already have 35 or more labels selected.");
      return;
    }

    const difference = 35 - currentTotal;
    
    // Add the difference to the first item in the list
    const updatedItems = [...selectedItems];
    updatedItems[0].quantity += difference;
    setSelectedItems(updatedItems);
  };

  // Opening the OS print dialog against the live screen (the old approach)
  // just screenshots the app page on web instead of the label sheet.
  // exportQrLabelSheet builds an actual downloadable PDF instead — with a
  // real native (expo-print) and web (jsPDF) implementation, since
  // expo-print's HTML rendering only works on native. Labels already have
  // code/name baked into the PNG server-side, so this only needs to place
  // images in a grid.
  const handleDownloadPdfSheet = async () => {
    if (selectedItems.length === 0) {
      Alert.alert("Error", "No products selected to print.");
      return;
    }

    try {
      setPdfDownloading(true);
      const uniqueIds = Array.from(new Set(selectedItems.map(({ product }) => product.id)));
      const images = await LabelService.getQrImages(uniqueIds);
      const pngByItemId = new Map(images.map((img) => [img.item_id, img.png_base64]));

      // Expand into one label per requested unit (e.g. qty 3 -> 3 identical labels)
      const labelImages: string[] = [];
      selectedItems.forEach(({ product, quantity }) => {
        const png = pngByItemId.get(product.id);
        if (!png) return;
        for (let i = 0; i < quantity; i++) labelImages.push(png);
      });

      if (labelImages.length === 0) {
        Alert.alert("Error", "Could not render any of the selected labels.");
        return;
      }

      await exportQrLabelSheet(labelImages);
    } catch (error: any) {
      console.error("PDF sheet error:", error);
      Alert.alert("Download Failed", error?.response?.data?.error || error.message || "Could not generate the PDF sheet.");
    } finally {
      setPdfDownloading(false);
    }
  };

  // Renders one crisp PNG label per selected product server-side (QR +
  // code + name baked in, no third-party image API involved) and bundles
  // them into a ZIP — drop straight into BarTender to print on the TE244.
  // quantity isn't duplicated into repeat files; it travels in
  // manifest.csv inside the ZIP so you know how many of each to print.
  const handleDownloadForBarTender = async () => {
    if (selectedItems.length === 0) {
      Alert.alert("Error", "No products selected to download.");
      return;
    }

    try {
      setZipDownloading(true);
      const result = await LabelService.generateQrZip(
        selectedItems.map(({ product, quantity }) => ({ item_id: product.id, quantity }))
      );
      await exportBinaryFile(result.filename, result.base64, "application/zip", "com.pkware.zip-archive");
    } catch (error: any) {
      console.error("QR download error:", error);
      Alert.alert("Download Failed", error?.response?.data?.error || error.message || "Could not generate the QR labels.");
    } finally {
      setZipDownloading(false);
    }
  };

  const totalLabels = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalSheets = Math.ceil(totalLabels / 35);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <Feather name="grid" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.title}>QR Code Sheet</Text>
            <Text style={styles.subtitle}>
              Pick products and set how many of each. Download a combined A4 PDF sheet (35 per page), or a ZIP of individual QR labels to feed into BarTender.
            </Text>
          </View>
        </View>

        {/* Workspace Layout */}
        <View style={styles.workspaceRow}>
          
          {/* Left Column: Search & Add */}
          <View style={styles.leftColumn}>
            <View style={styles.card}>
              
              {/* Search Bar */}
              <View style={styles.searchBox}>
                <Feather name="search" size={16} color="#9CA3AF" style={{ marginRight: 10 }} />
                <TextInput 
                  style={styles.searchInput}
                  placeholder="Search by code or name..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Product List */}
              {loading ? (
                <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 40 }} />
              ) : (
                <View style={styles.productList}>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedItems.some(item => item.product.id === product.id);
                    
                    return (
                      <View key={product.id} style={[styles.productRow, isSelected && styles.productRowDisabled]}>
                        <View style={styles.productInfoLeft}>
                          <Text style={[styles.productCode, isSelected && styles.textDisabled]}>{product.item_code}</Text>
                          <Text style={[styles.productName, isSelected && styles.textDisabled]} numberOfLines={1}>
                            {product.name}
                          </Text>
                        </View>
                        
                        <View style={styles.productInfoRight}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{product.type || "Moulding"}</Text>
                          </View>
                          
                          <Pressable 
                            style={styles.addBtn} 
                            onPress={() => handleAddProduct(product)}
                            disabled={isSelected}
                          >
                            <Feather name={isSelected ? "check" : "plus"} size={16} color={isSelected ? "#10B981" : "#9CA3AF"} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                  {filteredProducts.length === 0 && !loading && (
                    <Text style={styles.noResultsText}>No products found.</Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Right Column: Selected & Print */}
          <View style={styles.rightColumn}>
            <View style={styles.card}>
              
              {/* Right Header */}
              <View style={styles.selectedHeader}>
                <Text style={styles.cardTitle}>Selected products</Text>
                <Pressable style={styles.autoFillBtn} onPress={handleAutoFill35}>
                  <Text style={styles.autoFillText}>Auto-fill 35</Text>
                </Pressable>
              </View>

              {/* Selected Items List */}
              <View style={styles.selectedList}>
                {selectedItems.length === 0 ? (
                  <Text style={styles.emptyCartText}>No products selected yet.</Text>
                ) : (
                  selectedItems.map((item) => (
                    <View key={item.product.id} style={styles.selectedRow}>
                      <View style={styles.selectedInfo}>
                        <Text style={styles.selectedName} numberOfLines={1}>{item.product.name}</Text>
                        <Text style={styles.selectedCode}>{item.product.item_code}</Text>
                      </View>
                      
                      <View style={styles.selectedControls}>
                        {/* Number Input Box with Up/Down Arrows */}
                        <View style={styles.qtyBox}>
                          <TextInput 
                            style={styles.qtyInput}
                            value={String(item.quantity).padStart(3, '0')}
                            onChangeText={(val) => handleUpdateQuantity(item.product.id, val)}
                            keyboardType="number-pad"
                          />
                          <View style={styles.qtyArrows}>
                            <Pressable style={styles.arrowTop} onPress={() => incrementQuantity(item.product.id)}>
                              <Feather name="chevron-up" size={12} color="#4B5563" />
                            </Pressable>
                            <Pressable style={styles.arrowBottom} onPress={() => decrementQuantity(item.product.id)}>
                              <Feather name="chevron-down" size={12} color="#4B5563" />
                            </Pressable>
                          </View>
                        </View>
                        
                        <Pressable style={styles.trashBtn} onPress={() => handleRemoveProduct(item.product.id)}>
                          <Feather name="trash-2" size={18} color="#4B5563" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Totals & Print */}
              <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total labels</Text>
                  <Text style={styles.totalValue}>{totalLabels}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>A4 sheets (35 each)</Text>
                  <Text style={styles.totalValue}>{totalSheets}</Text>
                </View>

                <Pressable
                  style={[styles.printBtn, (selectedItems.length === 0 || pdfDownloading) && styles.printBtnDisabled]}
                  onPress={handleDownloadPdfSheet}
                  disabled={selectedItems.length === 0 || pdfDownloading}
                >
                  {pdfDownloading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Feather name="file-text" size={16} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.printBtnText}>Download PDF sheet</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.downloadZipBtn, (selectedItems.length === 0 || zipDownloading) && styles.printBtnDisabled]}
                  onPress={handleDownloadForBarTender}
                  disabled={selectedItems.length === 0 || zipDownloading}
                >
                  {zipDownloading ? (
                    <ActivityIndicator color="#111111" size="small" />
                  ) : (
                    <>
                      <Feather name="download" size={16} color="#111111" style={{ marginRight: 8 }} />
                      <Text style={styles.downloadZipBtnText}>Download for BarTender</Text>
                    </>
                  )}
                </Pressable>
              </View>

            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  contentArea: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.sm },
  
  // Header
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
  headerIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#F3E8FF", alignItems: "center", justifyContent: "center", marginRight: 16 },
  headerTextWrapper: { flex: 1 },
  title: { fontSize: 32, fontWeight: "900", color: "#111111", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#6B7280", lineHeight: 22 },

  // Layout
  workspaceRow: { flexDirection: Platform.OS === "web" ? "row" : "column", gap: 24, alignItems: "flex-start" },
  leftColumn: { flex: 1, width: "100%" },
  rightColumn: { flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 500 : "100%" },
  
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 10, elevation: 2, minHeight: 300 },

  // Left Column Styles
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 15, color: "#111111" },
  
  productList: { gap: 12 },
  productRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  productRowDisabled: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" },
  
  productInfoLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 },
  productCode: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginRight: 12, width: 45 },
  productName: { fontSize: 14, color: "#111111", flex: 1 },
  textDisabled: { color: "#D1D5DB" },
  
  productInfoRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  typeBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },
  addBtn: { padding: 4 },
  noResultsText: { textAlign: "center", color: "#9CA3AF", marginTop: 20 },

  // Right Column Styles
  selectedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#111111" },
  autoFillBtn: { backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  autoFillText: { fontSize: 13, fontWeight: "600", color: "#374151" },

  selectedList: { borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingBottom: 20, marginBottom: 20, minHeight: 100 },
  emptyCartText: { color: "#9CA3AF", fontStyle: "italic", textAlign: "center", marginTop: 30 },
  
  selectedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, marginBottom: 12 },
  selectedInfo: { flex: 1, marginRight: 16 },
  selectedName: { fontSize: 15, fontWeight: "500", color: "#111111", marginBottom: 4 },
  selectedCode: { fontSize: 13, color: "#6B7280" },

  selectedControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  
  qtyBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, overflow: "hidden", height: 40 },
  qtyInput: { width: 50, height: "100%", textAlign: "center", fontSize: 15, color: "#111111", backgroundColor: colors.white },
  qtyArrows: { borderLeftWidth: 1, borderLeftColor: "#D1D5DB", backgroundColor: "#F9FAFB", width: 24, height: "100%", justifyContent: "center" },
  arrowTop: { flex: 1, justifyContent: "center", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  arrowBottom: { flex: 1, justifyContent: "center", alignItems: "center" },

  trashBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" },

  totalsSection: { gap: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, color: "#4B5563" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#111111" },

  printBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#8B5CF6", paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  printBtnDisabled: { backgroundColor: "#D1D5DB" },
  printBtnText: { color: colors.white, fontWeight: "600", fontSize: 15 },

  downloadZipBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  downloadZipBtnText: { color: "#111111", fontWeight: "600", fontSize: 15 },
});