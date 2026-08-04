import React from "react";

import { ActivityIndicator, ScrollView, View } from "react-native";

import { router } from "expo-router";

import useAuthStore from "@/store/authStore";

import { getSession } from "@/utils/storage";

export default function Index() {
  const restore = useAuthStore((s) => s.restore);
  const setLoading = useAuthStore((s) => s.setLoading);

  React.useEffect(() => {
    bootstrap();
  }, []);

async function bootstrap() {
    const session = await getSession();

    if (session && session.user && session.token) {
      restore(session.user, session.token);

      const userRole = session.user.role?.toUpperCase();

      switch (userRole) {
        case "ADMIN":
          router.replace("/(protected)/admin");
          break;
        case "PRODUCTION_MANAGER":
          router.replace("/(protected)/manager");
          break;
        case "QUALITY_HEAD":
          router.replace("/(protected)/quality");
          break;
        case "MOULDING":
        case "BRASSPART":
        case "FITTING":
        case "LASER":
          router.replace("/(protected)/floor-worker"); 
          break;
        case "DISPATCH":
          router.replace("/(protected)/dispatch");
          break;
        default:
          router.replace("/(protected)/dashboard");
      }
    } else {
      setLoading(false);
      router.replace("/(auth)/login");
    }
  }

  return (
    <ScrollView 
  style={{ flex: 1 }}
  contentContainerStyle={{ 
    flexGrow: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  }}
>
      <ActivityIndicator size="large" />
    </ScrollView>
  );
}