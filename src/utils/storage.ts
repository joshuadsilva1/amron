import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "access_token"; // adjust if your key was different
const USER_KEY = "user_key";      // adjust if your key was different

export async function saveSession(token: string, user: any) {
  const userStr = JSON.stringify(user);
  
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, userStr);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, userStr);
  }
}

export async function getSession() {
  let token, userStr;

  if (Platform.OS === "web") {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    userStr = await AsyncStorage.getItem(USER_KEY);
  } else {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
    userStr = await SecureStore.getItemAsync(USER_KEY);
  }

  if (!token || !userStr) return null;
  
  try {
    return { token, user: JSON.parse(userStr) };
  } catch (error) {
    return null; // Failsafe in case JSON parsing breaks
  }
}

export async function clearSession() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}