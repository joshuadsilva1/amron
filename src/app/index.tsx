import React from "react";

import { ActivityIndicator, View } from "react-native";

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

    if (session) {
      restore(
        session.user,
        session.token
      );

      router.replace("/(protected)/dashboard");
    } else {
      setLoading(false);

      router.replace("/(auth)/login");
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}