import { useMemo, useState } from "react";

// Flattens a row into one lowercase string of everything searchable in it:
// its own strings/numbers plus those of nested objects/arrays (two levels
// deep, e.g. a PO's line items), so a page only has to pass its rows.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

function haystackOf(value: any, depth = 0): string {
  if (value == null) return "";
  const t = typeof value;
  // Raw ids are noise — a short query would match random uuid fragments.
  if (t === "string") return UUID.test(value) ? "" : value;
  if (t === "number" || t === "boolean") return String(value);
  if (depth >= 2) return "";
  if (Array.isArray(value)) return value.map((v) => haystackOf(v, depth + 1)).join(" ");
  if (t === "object") return Object.values(value).map((v) => haystackOf(v, depth + 1)).join(" ");
  return "";
}

// Page-level search box state. Every word typed must appear somewhere in
// the row (any order, any column), case-insensitive — "acme 1001" finds a
// row containing both. `getText` lets a page search a custom string
// (e.g. a looked-up department name that isn't on the row itself).
export function useSearch<T>(data: T[], getText?: (row: T) => string, deps: any[] = []) {
  const [query, setQuery] = useState("");

  const haystacks = useMemo(
    () => data.map((row) => (getText ? getText(row) : haystackOf(row)).toLowerCase()),
    // `deps` = anything getText reads that can change (e.g. a department lookup).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, ...deps]
  );

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return data;
    return data.filter((_, i) => words.every((w) => haystacks[i].includes(w)));
  }, [data, haystacks, query]);

  return { query, setQuery, filtered, isSearching: query.trim().length > 0 };
}
