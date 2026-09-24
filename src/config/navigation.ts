// Single source of truth for the sidebar — the layout renders it and the
// home-page smart search (utils/navSearch.ts) indexes it, so a new page
// added here shows up in both.

export interface NavGroup {
  section: string;
  alwaysOpen?: boolean;
  groupIcon?: string;
  items: { title: string; icon: string; route: string }[];
}

// The numbered groups (1-5) are the actual order work happens in for one
// PO: it comes in (1), gets checked against its recipe and a production
// plan is made (2), raw material gets bought if short (3), QC signs off
// on what departments produced (4), it ships (5). "Factory Floor" — the
// day-to-day per-department work that happens between steps 3 and 4 — is
// rendered last, on purpose: it's the biggest, most-nested part of the
// menu (a whole sub-list per department), and having it in the middle
// pushed Quality/Dispatch/Reports/Admin below the fold for anyone
// scrolling past it. Everything unnumbered (Inventory, Workforce, Reports,
// Admin) is reference/support material you dip into, not a step you pass
// through once per PO.
export const NAV_GROUPS_PRE: NavGroup[] = [
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
    section: "1. Sales & Orders",
    groupIcon: "file-plus",
    items: [
      { title: "New Purchase Order", icon: "plus-circle", route: "/(protected)/manager/purchase-order/new" },
      { title: "Clients", icon: "users", route: "/(protected)/manager/clients" },
      { title: "Party Products (OEM)", icon: "box", route: "/(protected)/manager/oem" },
    ],
  },
  {
    section: "2. Planning",
    groupIcon: "list",
    items: [
      { title: "Recipes (BOM)", icon: "list", route: "/(protected)/manager/recipes" },
      { title: "Material Requirements", icon: "alert-triangle", route: "/(protected)/manager/mrp" },
      { title: "Production Planning", icon: "calendar", route: "/(protected)/manager/production" },
    ],
  },
  {
    section: "3. Purchasing",
    groupIcon: "shopping-cart",
    items: [
      { title: "Suppliers", icon: "truck", route: "/(protected)/manager/suppliers" },
      { title: "Supplier Orders", icon: "truck", route: "/(protected)/manager/supplier-orders" },
    ],
  },
];

export const NAV_GROUPS_POST: NavGroup[] = [
  {
    section: "4. Quality Check",
    items: [
      { title: "Quality Control", icon: "check-circle", route: "/(protected)/quality" },
    ],
  },
  {
    section: "5. Dispatch",
    groupIcon: "send",
    items: [
      { title: "Dispatch Outward", icon: "send", route: "/(protected)/dispatch" },
      { title: "Assemble Finished Goods", icon: "layers", route: "/(protected)/dispatch/assemble" },
      { title: "Dispatch Challans", icon: "file-text", route: "/(protected)/manager/dispatch-challans" },
    ],
  },
  {
    section: "Inventory & Stock",
    groupIcon: "database",
    items: [
      { title: "Items & QR", icon: "target", route: "/(protected)/manager/items" },
      { title: "QR Code Sheet", icon: "maximize", route: "/(protected)/manager/qr-sheet" },
      { title: "Stock Report", icon: "clipboard", route: "/(protected)/manager/stocks" },
      { title: "Racks", icon: "rack", route: "/(protected)/manager/racks" },
      { title: "Boxes", icon: "package", route: "/(protected)/manager/boxes" },
      { title: "Transaction History", icon: "clock", route: "/(protected)/manager/transaction-history" },
      { title: "Import from Excel", icon: "download", route: "/(protected)/manager/import" },
    ],
  },
  {
    section: "Workforce & Payroll",
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

// Per-department submenu (the Factory Floor block), in the order the work
// actually happens: see what's owed, buy what's short, do the work, hand
// it off downstream, keep the physical count honest.
export const SUB_MENU = [
  { title: "Internal PO", icon: "inbox", routeSuffix: "internal-po" },
  { title: "Stock vs PO", icon: "activity", routeSuffix: "stock-po" },
  { title: "Order Materials", icon: "truck", routeSuffix: "suppliers" },
  { title: "Work Allotment", icon: "list", routeSuffix: "work-allotment" },
  { title: "Log Production", icon: "cpu", routeSuffix: "produce" },
  { title: "Allot & Handoff", icon: "send", routeSuffix: "handoff" },
  { title: "Verify Handoffs", icon: "check-square", routeSuffix: "verify-handoff" },
  { title: "Scan In / Out", icon: "maximize", routeSuffix: "scan" },
  { title: "Rack Stock", icon: "archive", routeSuffix: "rack-stock" },
];
