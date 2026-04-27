// Atom: seed/cleanup helpers — เรียก test endpoint ของ backend
const API = process.env.E2E_API_URL ?? "http://localhost:7766";

export async function cleanupModule(module: string): Promise<void> {
  await fetch(`${API}/test/cleanup/${module}`, { method: "POST" });
}

export async function seedModule(module: string, payload: unknown): Promise<void> {
  await fetch(`${API}/test/seed/${module}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
