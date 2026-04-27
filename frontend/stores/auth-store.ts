import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { env, isDev } from "@/config/env";

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  name: string; // displayed full name (firstName + lastName)
  isSystemRole: boolean;
  permissions: string[]; // "module:action" list
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  hasHydrated: false,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setHasHydrated: (value) => set({ hasHydrated: value }),

        setTokens: (accessToken, refreshToken) =>
          set({ accessToken, refreshToken, isAuthenticated: true }),

        setUser: (user) => set({ user }),

        setAuth: (user, accessToken, refreshToken) =>
          set({ user, accessToken, refreshToken, isAuthenticated: true }),

        setAccessToken: (accessToken) => set({ accessToken }),

        clearAuth: () =>
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

        reset: () => set(initialState),
      }),
      {
        name: `${env.NEXT_PUBLIC_PROJECT_PREFIX}-auth`,
        skipHydration: true,
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.setHasHydrated(true);
          } else {
            useAuthStore.setState({ hasHydrated: true });
          }
        },
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    { enabled: isDev, name: "auth-store" },
  ),
);
