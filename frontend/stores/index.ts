import { useAuthStore } from "./auth-store";

export function resetAllStores(): void {
  useAuthStore.getState().reset();
}

export { useAuthStore };
