import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

// A department's "Stock vs PO" is now the shared Material Requirements
// screen filtered to that department — one place for every department's
// requirements (every recipe level, stock shown but not subtracted).
export default function DepartmentStockVsPoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/(protected)/manager/material-requirements", params: { department_id: String(id) } }} />;
}
