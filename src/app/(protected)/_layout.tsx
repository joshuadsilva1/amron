import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView, Platform } from "react-native";
import { Slot, usePathname, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import useAuthStore from "@/store/authStore";

const NAV_GROUPS = [
  {
    section: "Overview",
    alwaysOpen: true,
    items: [
      { title: "Control Tower", icon: "monitor", route: "/(protected)/manager/control-tower" },
      { title: "Dashboard", icon: "grid", route: "/(protected)/manager" },
      { title: "Chat", icon: "message-circle", route: "/(protected)/chat" },
      { title: "Notifications", icon: "bell", route: "/(protected)/manager/notifications" },
    ],
  },
  {
    section: "Sales",
    groupIcon: "trending-up",
    items: [
      { title: "Clients", icon: "users", route: "/(protected)/manager/clients" },
      { title: "Party Products (OEM)", icon: "box", route: "/(protected)/manager/oem" },
      { title: "Dispatch Outward", icon: "send", route: "/(protected)/dispatch" },
      { title: "Dispatch Challans", icon: "file-text", route: "/(protected)/manager/dispatch-challans" },
    ],
  },
  {
    section: "Purchasing",
    groupIcon: "shopping-cart",
    items: [
      { title: "Material Requirements", icon: "alert-triangle", route: "/(protected)/manager/mrp" },
      { title: "Suppliers", icon: "truck", route: "/(protected)/manager/suppliers" },
      { title: "Supplier Orders", icon: "truck", route: "/(protected)/manager/supplier-orders" },
    ],
  },
  {
    section: "Quality",
    items: [
      { title: "Quality Control", icon: "check-circle", route: "/(protected)/quality" },
    ],
  },
  {
    section: "Inventory",
    groupIcon: "database",
    items: [
      { title: "Items & QR", icon: "target", route: "/(protected)/manager/items" },
      { title: "QR Code Sheet", icon: "maximize", route: "/(protected)/manager/qr-sheet" },
      { title: "Stock Report", icon: "clipboard", route: "/(protected)/manager/stocks" },
      { title: "Racks", icon: "rack", route: "/(protected)/manager/racks" },
      { title: "Boxes", icon: "package", route: "/(protected)/manager/boxes" },
      { title: "Recipes (BOM)", icon: "list", route: "/(protected)/manager/recipes" },
      { title: "Transaction History", icon: "clock", route: "/(protected)/manager/transaction-history" },
      { title: "Import from Excel", icon: "download", route: "/(protected)/manager/import" },
    ],
  },
  {
    section: "Workforce",
    groupIcon: "users",
    items: [
      { title: "Attendance", icon: "calendar", route: "/(protected)/manager/attendance" },
      { title: "Payroll", icon: "credit-card", route: "/(protected)/manager/payroll" },
    ],
  },
  {
    section: "Reports",
    items: [
      { title: "Reports", icon: "bar-chart-2", route: "/(protected)/manager/reports" },
    ],
  },
  {
    section: "Admin",
    items: [
      { title: "Admin Panel", icon: "settings", route: "/(protected)/admin" },
    ],
  },
];

const SUB_MENU = [
  { title: "Suppliers", icon: "truck", routeSuffix: "suppliers" },
  { title: "Work Allotment", icon: "list", routeSuffix: "work-allotment" },
  { title: "Log Production", icon: "cpu", routeSuffix: "produce" },
  { title: "Stock vs PO", icon: "activity", routeSuffix: "stock-po" },
  { title: "Allot & Handoff", icon: "send", routeSuffix: "handoff" },
  { title: "Verify Handoffs", icon: "check-square", routeSuffix: "verify-handoff" },
  { title: "Scan In / Out", icon: "maximize", routeSuffix: "scan" },
  { title: "Rack Stock", icon: "archive", routeSuffix: "rack-stock" },
];

interface Department {
  id: string | number;
  name: string;
}

const getDeptIcon = (name: string): any => {
  const n = name.toLowerCase();
  if (n.includes("moulding")) return "settings";
  if (n.includes("brass")) return "tool";
  if (n.includes("lazer") || n.includes("laser")) return "zap";
  if (n.includes("fitting")) return "wrench";
  if (n.includes("box") || n.includes("pouch") || n.includes("label")) return "package";
  if (n.includes("finish") || n.includes("good")) return "check-circle";
  return "circle";
};

export default function ProtectedLayout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuthStore();
  // Real device insets instead of a hardcoded guess — on phones with a
  // curved/waterfall edge display or an unusual status bar height, a fixed
  // paddingTop put the hamburger button's tap target partly under the
  // status bar / curved-edge dead zone, making it hard to hit reliably.
  const insets = useSafeAreaInsets();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [expandedDept, setExpandedDept] = useState<string | number | null>(null);
  const [manuallyToggledGroups, setManuallyToggledGroups] = useState<Record<string, boolean>>({});

  const isLargeScreen = width >= 768;

  useEffect(() => {
    // Dynamically fetch departments to build the navbar
    const fetchDepartments = async () => {
      try {
        const res = await api.get("/departments");
        const data = res.data?.data || res.data || [];
        if (data.length > 0) {
          setDepartments(data);
          setExpandedDept(data[0].id); // Auto-expand first item
        } else {
          // Fallback if DB is empty
          setDepartments([
            { id: "1", name: "Moulding" },
            { id: "2", name: "Brasspart" },
            { id: "3", name: "Lazer" },
            { id: "4", name: "Fitting" },
            { id: "5", name: "Box Pouch Label" },
            { id: "6", name: "Finished Goods" },
          ]);
          setExpandedDept("1");
        }
      } catch (e) {
        console.error("Failed to fetch departments", e);
      }
    };
    fetchDepartments();
  }, []);

  const handleNavigation = (route: string) => {
    router.push(route as any);
    if (!isLargeScreen) setIsMobileMenuOpen(false);
  };

  const toggleGroup = (section: string) => {
    setManuallyToggledGroups((prev) => ({ ...prev, [section]: !isGroupOpen(section) }));
  };

  // A group is open if the user toggled it open, OR it's the group
  // containing the currently active route (so navigating somewhere never
  // hides the very item you're standing on) — whichever was toggled most
  // recently wins for groups the user has explicitly touched.
  const isGroupOpen = (section: string) => {
    if (section in manuallyToggledGroups) return manuallyToggledGroups[section];
    const group = NAV_GROUPS.find((g) => g.section === section);
    return !!group?.items.some((item) => pathname.startsWith(item.route));
  };

  const handleLogout = () => {
    if (logout) logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      {!isLargeScreen && isMobileMenuOpen && (
        <Pressable style={styles.backdrop} onPress={() => setIsMobileMenuOpen(false)} />
      )}

      {(isLargeScreen || isMobileMenuOpen) && (
        <View style={[styles.sidebar, !isLargeScreen && styles.sidebarMobile, { paddingTop: insets.top + 20 }]}>
          
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Feather name="box" size={20} color="#A78BFA" />
            </View>
            <View style={styles.brandTextWrapper}>
              <Text style={styles.brandName} numberOfLines={1}>Factory Co-Pilot</Text>
              <Text style={styles.brandRole}>Process Manager</Text>
            </View>
            {!isLargeScreen && (
              <Pressable onPress={() => setIsMobileMenuOpen(false)} hitSlop={20}>
                <Feather name="x" size={24} color={colors.white} />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.navScrollArea} showsVerticalScrollIndicator={false}>
            
            {/* General Menus, grouped into collapsible sections */}
            <View style={styles.navContainer}>
              {NAV_GROUPS.map((group) => {
                // Overview items and single-item groups render flat — no
                // point collapsing a "section" that's just one destination.
                if (group.alwaysOpen || group.items.length === 1) {
                  return group.items.map((item) => {
                    const isActive = item.route === "/(protected)/manager"
                      ? pathname === "/(protected)/manager"
                      : pathname.startsWith(item.route);

                    return (
                      <Pressable
                        key={item.route}
                        style={[styles.navItem, isActive && styles.navItemActive]}
                        onPress={() => handleNavigation(item.route)}
                      >
                        <Feather name={item.icon as any} size={18} color={isActive ? "#111111" : "#9CA3AF"} />
                        <Text style={[styles.navText, isActive && styles.navTextActive]}>
                          {item.title}
                        </Text>
                      </Pressable>
                    );
                  });
                }

                const isOpen = isGroupOpen(group.section);

                return (
                  <View key={group.section} style={styles.deptBlock}>
                    <Pressable
                      style={[styles.deptHeader, isOpen && styles.deptHeaderExpanded]}
                      onPress={() => toggleGroup(group.section)}
                    >
                      <Feather name={(group.groupIcon || "folder") as any} size={18} color={isOpen ? "#FFFFFF" : "#9CA3AF"} />
                      <Text style={[styles.deptName, isOpen && styles.deptNameExpanded]}>
                        {group.section}
                      </Text>
                      <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                    </Pressable>

                    {isOpen && (
                      <View style={styles.nestedContainer}>
                        {group.items.map((item) => {
                          const isActive = pathname.startsWith(item.route);
                          return (
                            <Pressable
                              key={item.route}
                              style={[styles.nestedItem, isActive && styles.nestedItemActive]}
                              onPress={() => handleNavigation(item.route)}
                            >
                              <Feather name={item.icon as any} size={16} color={isActive ? "#111111" : "#9CA3AF"} />
                              <Text style={[styles.nestedItemText, isActive && styles.nestedItemTextActive]}>
                                {item.title}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* DEPARTMENTS SECTION */}
            <View style={styles.navContainer}>
              <Text style={styles.sectionTitle}>DEPARTMENTS</Text>
              
              {departments.map((dept) => {
                const isExpanded = expandedDept === dept.id;

                return (
                  <View key={dept.id} style={styles.deptBlock}>
                    <Pressable 
                      style={[styles.deptHeader, isExpanded && styles.deptHeaderExpanded]}
                      onPress={() => setExpandedDept(isExpanded ? null : dept.id)}
                    >
                      <Feather name={getDeptIcon(dept.name)} size={18} color={isExpanded ? "#FFFFFF" : "#9CA3AF"} />
                      <Text style={[styles.deptName, isExpanded && styles.deptNameExpanded]}>
                        {dept.name}
                      </Text>
                      <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.nestedContainer}>
                        {SUB_MENU.map((sub, idx) => {
                          const route = `/(protected)/manager/departments/${dept.id}/${sub.routeSuffix}`;
                          const isSubActive = pathname.includes(sub.routeSuffix) && pathname.includes(String(dept.id));

                          return (
                            <Pressable
                              key={idx}
                              style={[styles.nestedItem, isSubActive && styles.nestedItemActive]}
                              onPress={() => handleNavigation(route)}
                            >
                              <Feather name={sub.icon as any} size={16} color={isSubActive ? "#111111" : "#9CA3AF"} />
                              <Text style={[styles.nestedItemText, isSubActive && styles.nestedItemTextActive]}>
                                {sub.title}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Staff Section */}
          <View style={styles.staffSection}>
            <Text style={styles.staffTitle}>{user?.name || "Staff"}</Text>
            <Text style={styles.staffSubtitle}>{user?.role || "No department"}</Text>
            <Pressable style={styles.signOutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#D1D5DB" />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>

        </View>
      )}

      <View style={styles.contentArea}>
        {!isLargeScreen && (
          <View style={[styles.mobileTopBar, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => setIsMobileMenuOpen(true)} style={styles.hamburgerBtn} hitSlop={20}>
              <Feather name="menu" size={24} color={colors.navy} />
            </Pressable>
            <Text style={styles.mobileTopBarTitle}>Factory Co-Pilot</Text>
            <View style={{ width: 24 }} /> 
          </View>
        )}
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#F9FAFB" },
  
  // Sidebar Structure
  sidebar: { width: 260, backgroundColor: "#111111", borderRightWidth: 1, borderColor: "#2A2A2A" },
  sidebarMobile: { position: "absolute", top: 0, bottom: 0, left: 0, zIndex: 50, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 15, elevation: 10 },
  backdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 40 },
  
  // Brand Header
  brandContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: "#2A2A2A", marginBottom: spacing.md },
  logoBadge: { width: 40, height: 40, borderRadius: 8, backgroundColor: "rgba(167, 139, 250, 0.2)", alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  brandTextWrapper: { flex: 1 },
  brandName: { color: colors.white, fontSize: 16, fontWeight: "700" },
  brandRole: { color: "#9CA3AF", fontSize: 12 },
  
  // Scroll Area & General Nav
  navScrollArea: { flex: 1 },
  navContainer: { paddingHorizontal: spacing.sm, paddingBottom: 16 },
  
  navItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: spacing.md, borderRadius: 20, marginBottom: 4 },
  navItemActive: { backgroundColor: "#A78BFA" },
  navText: { color: "#D1D5DB", fontSize: 14, fontWeight: "500", marginLeft: spacing.md },
  navTextActive: { color: "#111111", fontWeight: "700" },

  // Departments Section
  sectionTitle: { color: "#6B7280", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 12, marginBottom: 12, paddingHorizontal: 12 },
  
  deptBlock: { marginBottom: 4 },
  deptHeader: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  deptHeaderExpanded: { backgroundColor: "#1F1F22" },
  deptName: { flex: 1, color: "#D1D5DB", fontSize: 14, fontWeight: "500", marginLeft: 12 },
  deptNameExpanded: { color: "#FFFFFF", fontWeight: "600" },

  nestedContainer: { marginLeft: 34, borderLeftWidth: 1, borderColor: "#374151", paddingLeft: 12, marginTop: 4, marginBottom: 12, gap: 4 },
  nestedItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  nestedItemActive: { backgroundColor: "#A78BFA" },
  nestedItemText: { color: "#9CA3AF", fontSize: 14, fontWeight: "500", marginLeft: 12 },
  nestedItemTextActive: { color: "#111111", fontWeight: "700" },

  // Bottom Staff Section
  staffSection: { padding: 20, borderTopWidth: 1, borderColor: "#2A2A2A", backgroundColor: "#111111" },
  staffTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  staffSubtitle: { color: "#9CA3AF", fontSize: 12, marginBottom: 16 },
  signOutBtn: { flexDirection: "row", alignItems: "center" },
  signOutText: { color: "#D1D5DB", fontSize: 14, fontWeight: "500", marginLeft: 8 },
  
  // Content Core
  contentArea: { flex: 1, overflow: "hidden", backgroundColor: "#F9FAFB" },
  mobileTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border, elevation: 2 },
  hamburgerBtn: { padding: 4 },
  mobileTopBarTitle: { fontSize: 18, fontWeight: "700", color: colors.navy }
});