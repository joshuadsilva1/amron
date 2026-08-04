import React from "react";
import { Stack } from "expo-router";

console.log("==== APP LAYOUT IS BOOTING ====");

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
