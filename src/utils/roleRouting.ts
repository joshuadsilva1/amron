const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/(protected)/admin",
  PRODUCTION_MANAGER: "/(protected)/manager",
  QUALITY_HEAD: "/(protected)/quality",
  DISPATCH: "/(protected)/dispatch",
  PENDING: "/(auth)/pending",
};

export function getRouteForRole(role?: string | null): string {
  const upper = role?.toUpperCase();
  if (!upper || upper === "PENDING" || upper === "USER") return "/(auth)/pending";
  return ROLE_ROUTES[upper] || "/(protected)/floor-worker";
}
