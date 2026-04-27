import { create } from "zustand";
import { persist } from "zustand/middleware";
import { env } from "@/config/env";

interface AuthUser {
  id: number;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  reset: () => void;
}

const initialState = { user: null, accessToken: null };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      reset: () => set(initialState),
    }),
    { name: `${env.NEXT_PUBLIC_PROJECT_PREFIX}-auth`, skipHydration: true },
  ),
);
