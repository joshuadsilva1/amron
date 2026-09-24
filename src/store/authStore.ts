import { create } from "zustand";
import { clearSession } from "@/utils/storage";

interface Module {
  name: string;
  route: string;
  icon: string;
  description: string;
}

interface User {
  id: string; // Changed to string to match your Flask UUID
  phone: string;
  name?: string;
  role?: string;
  department_id?: string;
  modules?: Module[]; // Injected dynamically from the backend
}

interface AuthState {
  user: User | null;
  jwt: string | null;
  authenticated: boolean;
  loading: boolean;

  login: (user: User, jwt: string) => void;
  logout: () => void;
  restore: (user: User, jwt: string) => void;
  setLoading: (loading: boolean) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  jwt: null,
  authenticated: false,
  loading: true,

  login: (user, jwt) =>
    set({
      user,
      jwt,
      authenticated: true,
      loading: false,
    }),

  restore: (user, jwt) =>
    set({
      user,
      jwt,
      authenticated: true,
      loading: false,
    }),

  // Clears the saved session too, not just memory — app/index.tsx restores
  // whatever is saved on the next load, so leaving it behind meant "logging
  // out" on a shared device handed the next visitor the previous user's
  // account (chats included).
  logout: () => {
    clearSession().catch(() => {});
    set({
      user: null,
      jwt: null,
      authenticated: false,
      loading: false,
    });
  },

  setLoading: (loading) => set({ loading }),
}));

export default useAuthStore;