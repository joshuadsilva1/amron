import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView, Platform } from "react-native";
import { Slot, usePathname, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";
import api from "@/services/api";
import useAuthStore from "@/store/authStore";

import { NAV_GROUPS_PRE, NAV_GROUPS_POST, SUB_MENU, NavGroup } from "@/config/navigation";
import { filterVisible, AppModuleInfo } from "@/utils/moduleAccess";

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
  // The full configured module set (every route an Admin has wired to a
  // permission), fetched once — compared against user.modules (this
  // user's allowed subset) to decide what the sidebar hides. See
  // utils/moduleAccess.ts for why a route with no module configured at
  // all stays visible rather than being hidden by default.
  const [allModules, setAllModules] = useState<AppModuleInfo[] | null>(null);

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

    api
      .get("/admin/modules")
      .then((res) => {
        const modules = (res.data?.modules || [])
          .filter((m: any) => m.is_active)
          .map((m: any) => ({ route: m.route, name: m.name, icon: m.icon, description: m.description }));
        setAllModules(modules);
      })
      .catch((e) => {
        console.warn("Failed to fetch modules for nav gating (failing open)", e);
        setAllModules(null);
      });
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
    const group = [...NAV_GROUPS_PRE, ...NAV_GROUPS_POST].find((g) => g.section === section);
    return !!group?.items.some((item) => pathname.startsWith(item.route));
  };

  // Shared by NAV_GROUPS_PRE and NAV_GROUPS_POST, rendered on either side
  // of the DEPARTMENTS block so the whole sidebar reads in process order.
  const renderGroup = (rawGroup: NavGroup) => {
    // Dynamic RBAC: a link an Admin has revoked the module for
    // conditionally unmounts here rather than just 403-ing on click (the
    // API still enforces the same rule regardless — see
    // components/common/RequireModuleAccess.tsx for the matching
    // page-content guard).
    const visibleItems = filterVisible(rawGroup.items, allModules, user?.modules as AppModuleInfo[] | undefined);
    if (visibleItems.length === 0) return null;
    const group: NavGroup = { ...rawGroup, items: visibleItems };

    // Overview items and single-item groups render flat — no point
    // collapsing a "section" that's just one destination.
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
            
            {/* Stages 1-3: PO intake through purchasing, before any department gets involved */}
            <View style={styles.navContainer}>
              {NAV_GROUPS_PRE.map(renderGroup)}
            </View>

            {/* Stage 4: per-department production & downstream handoffs (Lazer, Colour, etc.) */}
            <View style={styles.navContainer}>
              <Text style={styles.sectionTitle}>PRODUCTION & HANDOFFS</Text>
              
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

            {/* Stages 5-6: QC and dispatch, plus everything below that supports the process but isn't a stage of it */}
            <View style={styles.navContainer}>
              {NAV_GROUPS_POST.map(renderGroup)}
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