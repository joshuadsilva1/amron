// Single source of truth for the sidebar — the layout renders it and the
// home-page smart search (utils/navSearch.ts) indexes it, so a new page
// added here shows up in both.

export interface NavGroup {
  section: string;
  alwaysOpen?: boolean;
  groupIcon?: string;
  items: { title: string; icon: string; route: string }[];
}

// The sidebar reads top-to-bottom as the actual factory process — a PO
// comes in from a client (1), gets checked against its recipe (2), raw
// material gets bought if short (3), each department fulfills its slice
// and hands off downstream as needed — Lazer, Colour, etc. (4, the
// per-department DEPARTMENTS block rendered between _PRE and _POST below),
// QC (5), then dispatch (6). Everything after that is reference/support
// material that isn't part of any one PO's journey, not another stage.
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
    section: "Customer Orders",
    groupIcon: "file-plus",
    items: [
      { title: "New Purchase Order", icon: "plus-circle", route: "/(protected)/manager/purchase-order/new" },
      { title: "Clients", icon: "users", route: "/(protected)/manager/clients" },
      { title: "Party Products (OEM)", icon: "box", route: "/(protected)/manager/oem" },
    ],
  },
  {
    section: "Recipes & Requirements",
    groupIcon: "list",
    items: [
      { title: "Recipes (BOM)", icon: "list", route: "/(protected)/manager/recipes" },
      { title: "Material Requirements", icon: "alert-triangle", route: "/(protected)/manager/mrp" },
    ],
  },
  {
    section: "Purchasing",
    groupIcon: "shopping-cart",
    items: [
      { title: "Suppliers", icon: "truck", route: "/(protected)/manager/suppliers" },
      { title: "Supplier Orders", icon: "truck", route: "/(protected)/manager/supplier-orders" },
    ],
  },
];

export const NAV_GROUPS_POST: NavGroup[] = [
  {
    section: "Quality",
    items: [
      { title: "Quality Control", icon: "check-circle", route: "/(protected)/quality" },
    ],
  },
  {
    section: "Dispatch",
    groupIcon: "send",
    items: [
      { title: "Dispatch Outward", icon: "send", route: "/(protected)/dispatch" },
      { title: "Assemble Finished Goods", icon: "layers", route: "/(protected)/dispatch/assemble" },
      { title: "Dispatch Challans", icon: "file-text", route: "/(protected)/manager/dispatch-challans" },
    ],
  },
  {
    section: "Production Planning",
    items: [
      { title: "Production Planning", icon: "calendar", route: "/(protected)/manager/production" },
    ],
  },
  {
    section: "Inventory & Master Data",
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

// Per-department submenu (the DEPARTMENTS block, stage 4), in the order
// the work actually happens: see what's owed, buy what's short, do the
// work, hand it off downstream, keep the physical count honest.
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
