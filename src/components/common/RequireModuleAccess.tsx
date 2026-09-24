import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import api from "@/services/api";
import useAuthStore from "@/store/authStore";
import { isRouteVisible, AppModuleInfo } from "@/utils/moduleAccess";
import colors from "@/theme/colors";
import spacing from "@/theme/spacing";

/**
 * Mirrors the backend's dynamic RBAC: if an Admin revokes a module for
 * this user's role, its screen unmounts (this) exactly as its nav link
 * disappears from the sidebar (see (protected)/_layout.tsx). This is the
 * belt to that link-hiding's suspenders — it also covers direct
 * navigation/deep links to a route whose module was just revoked.
 *
 * Usage: wrap a route's content —
 *   <RequireModuleAccess route="/(protected)/admin">
 *     <Slot />
 *   </RequireModuleAccess>
 */
export default function RequireModuleAccess({
  route,
  children,
}: {
  route: string;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const [allModules, setAllModules] = useState<AppModuleInfo[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/modules")
      .then((res) => {
        if (cancelled) return;
        const modules = (res.data?.modules || [])
          .filter((m: any) => m.is_active)
          .map((m: any) => ({ route: m.route, name: m.name, icon: m.icon, description: m.description }));
        setAllModules(modules);
      })
      .catch(() => {
        // Fetch failed — fail open (isRouteVisible treats null/empty as
        // "nothing configured", not "deny"); the backend's own
        // permission_required decorators still gate every real action.
        setAllModules(null);
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const visible = isRouteVisible(route, allModules, user?.modules as AppModuleInfo[] | undefined);
  if (!visible) {
    return (
      <View style={styles.centered}>
        <Feather name="lock" size={40} color="#D1D5DB" />
        <Text style={styles.title}>Access restricted</Text>
        <Text style={styles.body}>
          Your role no longer has access to this section. Ask an Admin if you believe this is a mistake.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: 18, fontWeight: "700", color: "#111111", marginTop: spacing.sm },
  body: { fontSize: 14, color: "#6B7280", textAlign: "center", maxWidth: 320 },
});
