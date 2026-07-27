import { View, Text } from "react-native";

import AppButton from "@/components/common/AppButton";

import { router } from "expo-router";

import useAuthStore from "@/store/authStore";

import AuthService from "@/services/auth";

import { clearSession } from "@/utils/storage";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function signOut() {

    await clearSession();

    logout();

    router.replace("/(auth)/login");
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
        }}
      >
        Welcome
      </Text>

      <Text
        style={{
          marginBottom: 30,
        }}
      >
        {user?.phone}
      </Text>

      <AppButton
        title="Logout"
        onPress={signOut}
      />
    </View>
  );
}