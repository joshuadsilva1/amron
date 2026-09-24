// Dynamic RBAC UI gating.
//
// The backend's `dynamic_permissions`-style system (Role -> Permission ->
// AppModule) already decides, server-side, exactly which routes a user is
// allowed to see — `user.modules` (from /auth/login and /auth/me) is that
// allowed subset. The backend also separately exposes the FULL set of
// configured modules via GET /admin/modules (any authenticated user can
// read it — it's metadata, not gated data).
//
// A route is only ever hidden if it's BOTH:
//   1. present in the full module list (i.e. an admin actually configured
//      gating for it), AND
//   2. absent from this user's allowed list.
// A route nobody has wired up as a module yet is left visible — the app
// has many more pages than there are AppModule rows today, and hiding
// everything un-configured would take down navigation for non-admins
// instead of just gating the handful of modules that are actually set up.
// The Flask `permission_required` decorators remain the real
// enforcement (403) regardless of what this shows or hides.

export interface AppModuleInfo {
  route: string;
  name?: string;
  icon?: string;
  description?: string;
}

/** Returns true if `route` should be shown to a user whose allowed module
 * list is `userModules`, given the full configured set `allModules`. */
export function isRouteVisible(
  route: string,
  allModules: AppModuleInfo[] | null | undefined,
  userModules: AppModuleInfo[] | null | undefined
): boolean {
  if (!allModules || allModules.length === 0) return true; // nothing configured yet / fetch failed — fail open
  if (!userModules) return true; // stale/older session with no modules snapshot — fail open, backend still enforces

  const isGated = allModules.some((m) => m.route === route);
  if (!isGated) return true;

  return userModules.some((m) => m.route === route);
}

/** Filters a list of {route} items down to the ones this user may see. */
export function filterVisible<T extends { route: string }>(
  items: T[],
  allModules: AppModuleInfo[] | null | undefined,
  userModules: AppModuleInfo[] | null | undefined
): T[] {
  return items.filter((item) => isRouteVisible(item.route, allModules, userModules));
}
