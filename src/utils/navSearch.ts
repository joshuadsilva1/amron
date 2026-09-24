// Local "search engine" for finding a page by what you want to DO, not by
// its exact sidebar name. Pure logic (no React) so it's easy to test.
//
// How a query is scored:
//   1. Lowercased, punctuation stripped, filler words removed ("where do I
//      add a new item" -> "add new item").
//   2. Each remaining word is matched against every destination's title,
//      section, and hand-written synonym list ("salary" finds Payroll).
//   3. Words that are only *close* to a real word still match — one or two
//      letters off ("payrol", "suplier") — so typos don't dead-end.
//   4. A destination has to match every word to rank at the top; ones that
//      match only some words still show, lower down.

import { NAV_GROUPS_PRE, NAV_GROUPS_POST, SUB_MENU } from "@/config/navigation";

export interface SearchDestination {
  title: string;
  section: string;
  route: string;
  icon: string;
  keywords: string[];
  // Set on the per-department pages so a generic query ("stock") doesn't
  // get buried under one copy per department.
  dept?: string;
}

export interface SearchHit extends SearchDestination {
  score: number;
}

// Synonyms / things people call the same page, keyed by route suffix.
// Match is "route contains key" (longest key wins), so
// "/(protected)/manager/clients" is matched by "clients".
const ROUTE_KEYWORDS: Record<string, string[]> = {
  "manager/control-tower": ["orders board", "risk", "delayed", "overview", "status", "today", "live", "factory status", "at a glance", "send to departments", "internal po"],
  "manager/notifications": ["alerts", "messages", "inbox", "updates"],
  "manager/purchase-order/new": ["po", "new order", "customer order", "client order", "enter order", "create order", "add order", "place order", "booking"],
  "manager/clients": ["customer", "party", "buyer", "companies", "add client", "add customer"],
  "manager/oem": ["client product code", "party code", "mapping", "oem", "purchase orders", "orders", "client products", "customer codes"],
  "manager/recipes/new": ["new recipe", "build recipe", "create recipe", "add recipe", "bom builder", "edit recipe"],
  "manager/recipes": ["bom", "bill of materials", "formula", "components", "what goes into", "ingredients", "recipe"],
  "manager/mrp": ["shortage", "raw material", "requirements", "planning", "what to buy", "material check", "missing material", "mrp"],
  "manager/suppliers": ["vendor", "raw material seller", "supplier list", "add supplier", "add vendor"],
  "manager/supplier-orders": ["vendor orders", "buy", "procurement", "material order", "purchase", "order materials", "bills"],
  "quality/iqc": ["incoming quality", "inspection", "iqc", "supplier check"],
  "quality": ["qc", "inspection", "reject", "approve", "quality", "hold", "test"],
  "dispatch/history": ["dispatch history", "past shipments", "sent orders", "shipped"],
  "manager/dispatch-challans": ["delivery challan", "transfer", "movement", "challan", "handoff record"],
  "dispatch": ["shipping", "outward", "send goods", "delivery", "ship", "courier", "truck"],
  "manager/production": ["plan", "daily plan", "target", "schedule", "production planning", "plan day", "output"],
  "manager/items": ["products", "master", "qr", "codes", "add item", "finished goods", "parts", "item list", "catalog", "add product"],
  "manager/qr-sheet": ["print qr", "labels", "stickers", "barcode", "qr sheet"],
  "manager/generate-qr": ["mint qr", "bin barcodes", "new qr", "generate qr", "print bins"],
  "manager/stocks": ["inventory", "stock report", "quantity", "how many", "on hand", "current stock", "balance"],
  "manager/racks": ["storage", "bins", "location", "shelf", "rack", "warehouse"],
  "manager/boxes": ["packing", "carton", "packaging", "pieces per box", "box", "pouch"],
  "manager/transaction-history": ["stock in out", "ledger", "movements", "audit", "log", "history", "who moved"],
  "manager/transactions/manual": ["manual stock", "adjust stock", "stock in", "stock out", "correction"],
  "manager/import": ["excel", "upload", "bulk", "spreadsheet", "csv", "template", "import", "xlsx", "bulk add"],
  "manager/payroll/attendance": ["payroll attendance", "monthly attendance", "attendance sheet"],
  "manager/payroll/report": ["salary report", "payslip", "payroll report"],
  "manager/payroll": ["salary", "wages", "pay", "staff pay", "payslip", "paid"],
  "manager/attendance": ["present", "absent", "check in", "punch", "workers", "staff", "leave", "shift"],
  "manager/reports": ["whatsapp", "send report", "daily report", "export", "pdf", "print", "report"],
  "admin/users": ["users", "add user", "login", "accounts", "staff accounts", "password"],
  "admin/roles": ["roles", "permissions", "access", "who can"],
  "admin/departments": ["departments", "add department", "levels", "hierarchy", "finished goods department"],
  "admin/routing": ["routes", "routing", "allowed movement", "handoff rules", "flow"],
  "admin/modules": ["modules", "features", "enable", "turn on"],
  "admin/whatsapp": ["whatsapp settings", "gupshup", "bot", "api key", "sender number"],
  "admin": ["settings", "admin", "configuration", "setup"],
  "chat": ["message", "talk", "conversation", "team chat"],
  "settings": ["profile", "account", "preferences", "logout", "sign out"],
  "floor-worker/scan": ["scan", "barcode", "qr scan", "stock in", "stock out"],
};

// Same idea for the per-department submenu, keyed by its routeSuffix.
const SUBMENU_KEYWORDS: Record<string, string[]> = {
  "internal-po": ["internal order", "department po", "what we owe", "requests", "owed", "internal purchase order"],
  "stock-po": ["stock vs po", "shortfall", "enough stock", "compare stock", "coverage"],
  "suppliers": ["order materials", "buy", "raw material", "vendor"],
  "work-allotment": ["assign", "allot work", "worker tasks", "who does what", "allocate"],
  "produce": ["log production", "made today", "output", "record production", "produced"],
  "handoff": ["send to lazer", "send to colour", "transfer", "hand off", "challan", "dispatch to next"],
  "verify-handoff": ["receive", "accept", "incoming", "check received", "confirm receipt"],
  "scan": ["scan", "qr", "barcode", "stock in", "stock out"],
  "rack-stock": ["rack", "count", "stocktake", "physical count", "bulk stock"],
};

// Pages that exist but aren't in the sidebar.
const EXTRA_DESTINATIONS: { title: string; section: string; route: string; icon: string }[] = [
  { title: "New Recipe", section: "Recipes & Requirements", route: "/(protected)/manager/recipes/new", icon: "plus-circle" },
  { title: "Generate QR Bins", section: "Inventory & Master Data", route: "/(protected)/manager/generate-qr", icon: "printer" },
  { title: "Manual Stock Transaction", section: "Inventory & Master Data", route: "/(protected)/manager/transactions/manual", icon: "edit-3" },
  { title: "Payroll Attendance", section: "Workforce", route: "/(protected)/manager/payroll/attendance", icon: "calendar" },
  { title: "Payroll Report", section: "Workforce", route: "/(protected)/manager/payroll/report", icon: "file-text" },
  { title: "Dispatch History", section: "Dispatch", route: "/(protected)/dispatch/history", icon: "clock" },
  { title: "Incoming Quality (IQC)", section: "Quality", route: "/(protected)/quality/iqc", icon: "check-circle" },
  { title: "Users", section: "Admin", route: "/(protected)/admin/users", icon: "users" },
  { title: "Roles & Permissions", section: "Admin", route: "/(protected)/admin/roles", icon: "shield" },
  { title: "Departments (Admin)", section: "Admin", route: "/(protected)/admin/departments", icon: "layers" },
  { title: "Department Routing", section: "Admin", route: "/(protected)/admin/routing", icon: "git-branch" },
  { title: "Modules", section: "Admin", route: "/(protected)/admin/modules", icon: "toggle-right" },
  { title: "WhatsApp Settings", section: "Admin", route: "/(protected)/admin/whatsapp", icon: "message-circle" },
  { title: "Settings", section: "Account", route: "/(protected)/settings", icon: "sliders" },
];

function keywordsForRoute(route: string): string[] {
  const path = route.replace("/(protected)/", "");
  const keys = Object.keys(ROUTE_KEYWORDS).filter((k) => path === k || path.startsWith(k + "/") || path === k.split("/").pop());
  // Longest (most specific) key wins so "manager/recipes/new" doesn't also
  // inherit the plain "recipes" synonyms and vice versa.
  keys.sort((a, b) => b.length - a.length);
  return keys.length ? ROUTE_KEYWORDS[keys[0]] : [];
}

export function buildDestinations(departments: { id: string | number; name: string }[] = []): SearchDestination[] {
  const out: SearchDestination[] = [];
  const seen = new Set<string>();
  const push = (d: SearchDestination) => {
    if (seen.has(d.route)) return;
    seen.add(d.route);
    out.push(d);
  };

  for (const group of [...NAV_GROUPS_PRE, ...NAV_GROUPS_POST]) {
    for (const item of group.items) {
      push({ title: item.title, section: group.section, route: item.route, icon: item.icon, keywords: keywordsForRoute(item.route) });
    }
  }
  for (const extra of EXTRA_DESTINATIONS) {
    push({ ...extra, keywords: keywordsForRoute(extra.route) });
  }
  for (const dept of departments) {
    for (const sub of SUB_MENU) {
      push({
        title: `${dept.name} — ${sub.title}`,
        section: "Production & Handoffs",
        route: `/(protected)/manager/departments/${dept.id}/${sub.routeSuffix}`,
        icon: sub.icon,
        keywords: [dept.name, ...(SUBMENU_KEYWORDS[sub.routeSuffix] || [])],
        dept: dept.name,
      });
    }
  }
  return out;
}

// --- text handling ---

const STOPWORDS = new Set([
  "where", "how", "do", "does", "did", "i", "to", "the", "a", "an", "of", "for", "my", "me", "can", "want", "need",
  "find", "show", "go", "page", "screen", "section", "please", "is", "in", "on", "and", "or", "view", "see", "get",
  "open", "take", "am", "we", "our", "with", "from", "at", "it", "that", "this", "should", "would", "let", "lets",
  "who", "what", "which", "when", "why", "are", "was", "be", "there", "all", "any",
]);

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// Crude singularization so "orders"/"order", "clients"/"client" agree.
const stem = (w: string) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

const tokenize = (s: string) => normalize(s).split(" ").filter(Boolean).map(stem);

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
      if (prev[j] < rowMin) rowMin = prev[j];
    }
    if (rowMin > max) return max + 1;
  }
  return prev[b.length];
}

// How well one query word matches one candidate word (0 = no match).
function wordScore(q: string, w: string): number {
  if (q === w) return 10;
  if (w.startsWith(q) && q.length >= 2) return 8;
  if (q.length >= 3 && w.includes(q)) return 5;
  // Typo tolerance only for reasonably long words — on short ones a single
  // letter changes the meaning ("scan" vs "can").
  if (q.length >= 5 && w.length >= 4) {
    const allowed = q.length >= 8 ? 2 : 1;
    if (editDistance(q, w, allowed) <= allowed) return 4;
  }
  return 0;
}

export function searchDestinations(query: string, destinations: SearchDestination[], limit = 8): SearchHit[] {
  const qTokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  if (qTokens.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const dest of destinations) {
    const titleWords = tokenize(dest.title);
    const sectionWords = tokenize(dest.section);
    // Keywords: score per whole phrase AND per word, so "bill of materials"
    // is found by either "bom" or "bill materials".
    const keywordPhrases = dest.keywords.map((k) => tokenize(k));

    const deptWords = dest.dept ? tokenize(dest.dept) : [];
    let deptNamed = false;
    let total = 0;
    let matched = 0;
    for (const q of qTokens) {
      if (deptWords.some((w) => wordScore(q, w) >= 8)) deptNamed = true;
      let best = 0;
      for (const w of titleWords) best = Math.max(best, wordScore(q, w) * 1.5);
      for (const w of sectionWords) best = Math.max(best, wordScore(q, w) * 0.6);
      for (const phrase of keywordPhrases) {
        for (const w of phrase) best = Math.max(best, wordScore(q, w) * (phrase.length === 1 ? 1.2 : 1));
      }
      if (best > 0) matched += 1;
      total += best;
    }
    if (matched === 0) continue;

    // Reward covering every word; a partial match ranks well below a full one.
    const coverage = matched / qTokens.length;
    let score = total * (0.4 + 0.6 * coverage);
    if (matched === qTokens.length) score += 15;
    // Between equally good matches prefer the more specific (shorter) title.
    score += 3 / Math.max(titleWords.length, 1);
    // A phrase that appears verbatim in the title is the strongest signal.
    if (normalize(dest.title).includes(normalize(query))) score += 25;
    // Department pages rank a bit under the main pages unless the query
    // actually names that department.
    if (dest.dept && !deptNamed) score *= 0.7;
    hits.push({ ...dest, score, deptNamed } as SearchHit & { deptNamed: boolean });
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  // Without a department in the query, show at most 2 of the (otherwise
  // near-identical) per-department pages.
  const out: SearchHit[] = [];
  let unnamedDept = 0;
  for (const h of hits as (SearchHit & { deptNamed?: boolean })[]) {
    if (h.dept && !h.deptNamed) {
      if (unnamedDept >= 2) continue;
      unnamedDept += 1;
    }
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}
