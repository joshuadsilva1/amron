import { create } from "zustand";

interface User {
  id: number;
  phone: string;
  name?: string;
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

  logout: () =>
    set({
      user: null,
      jwt: null,
      authenticated: false,
      loading: false,
    }),

  setLoading: (loading) => set({ loading }),
}));

export default useAuthStore;