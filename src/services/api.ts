import axios from "axios";
import { router } from "expo-router";
import useAuthStore from "@/store/authStore";
import { clearSession, getSession } from "@/utils/storage"; // Import getSession here

// Set EXPO_PUBLIC_API_URL in .env to point at a deployed backend (e.g. the
// Render URL). Falls back to the local LAN dev server when unset.
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    // 1. Try memory first (Instant, prevents storage lookup on every single API call)
    let token = useAuthStore.getState().jwt;
    
    // 2. If memory is empty (due to web page reload), use your cross-platform utility
    if (!token) {
      try {
        const session = await getSession();
        if (session && session.token) {
          token = session.token;
          
          // Optional but recommended: Quietly put the token back into Zustand 
          // so the next API call doesn't have to hit the async storage again
          useAuthStore.setState({ jwt: session.token, user: session.user });
        }
      } catch (e) {
        console.error("Error reading token from storage:", e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("401 Unauthorized: Wiping session and redirecting to login.");
      
      // Wipe memory
      if (useAuthStore.getState().logout) {
        useAuthStore.getState().logout();
      } else {
        useAuthStore.setState({ user: null, jwt: null, isAuthenticated: false });
      }
      
      // Wipe storage using your utility
      await clearSession();
      
      router.replace("/(auth)/login");
    }
    return Promise.reject(error);
  }
);

export default api;