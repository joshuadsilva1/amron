import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

export async function saveSession(token: string, user: any) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const user = await SecureStore.getItemAsync(USER_KEY);

  if (!token || !user) return null;

  return {
    token,
    user: JSON.parse(user),
  };
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}