// ── System config service with in-memory cache (30s TTL) ──
import { systemConfigRepository } from "./system-config.repository";

const cache = new Map<string, { value: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

export const systemConfigService = {
  async get<T = unknown>(key: string, fallback: T): Promise<T> {
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return (cached.value as T) ?? fallback;

    const value = await systemConfigRepository.get(key);
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return (value as T) ?? fallback;
  },

  async set(key: string, value: unknown, updatedBy: number): Promise<void> {
    await systemConfigRepository.set(key, value, updatedBy);
    cache.delete(key);
  },

  invalidate(key?: string): void {
    if (key) cache.delete(key);
    else cache.clear();
  },
};
