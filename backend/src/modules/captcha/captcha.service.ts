import { randomUUID, createHash } from "node:crypto";
import { captchaRepository } from "./captcha.repository";
import { CAPTCHA_CHARS, CAPTCHA_LENGTH, CAPTCHA_TTL_MS } from "./captcha.constants";

// ── Pure helpers ──────────────────────────────────────────
function generateText(length = CAPTCHA_LENGTH): string {
  const chars = CAPTCHA_CHARS;
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function hashCaptcha(text: string): string {
  return createHash("sha256").update(text.toUpperCase()).digest("hex");
}

/**
 * Render captcha as inline SVG (data URI)
 * - simple distortion: rotate + dx + dy per character
 * - dev/test friendly — production แนะนำใช้ canvas-based + noise lines
 */
function renderSvg(text: string): string {
  const width = 160;
  const height = 50;
  const charWidth = width / (text.length + 1);
  const colors = ["#1565C0", "#0D47A1", "#1976D2", "#1E88E5"];
  const chars = text
    .split("")
    .map((ch, i) => {
      const x = charWidth * (i + 1);
      const y = height / 2 + 8;
      const rot = (Math.random() - 0.5) * 30;
      const color = colors[Math.floor(Math.random() * colors.length)];
      return `<text x="${x}" y="${y}" font-family="monospace" font-size="28" font-weight="bold" fill="${color}" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
    })
    .join("");
  // noise lines
  const lines = Array.from({ length: 4 }, () => {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#90CAF9" stroke-width="1"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#E3F2FD"/>${lines}${chars}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export const captchaService = {
  async create(): Promise<{ sessionKey: string; image: string; expiresAt: Date }> {
    const sessionKey = randomUUID();
    const text = generateText();
    const captchaHash = hashCaptcha(text);
    const expiresAt = new Date(Date.now() + CAPTCHA_TTL_MS);
    await captchaRepository.create({ sessionKey, captchaHash, expiresAt });
    return { sessionKey, image: renderSvg(text), expiresAt };
  },

  async verify(sessionKey: string, input: string): Promise<boolean> {
    if (!input || input.length === 0) return false;
    const attempt = await captchaRepository.findActive(sessionKey);
    if (!attempt) return false;
    const inputHash = hashCaptcha(input);
    if (attempt.captchaHash !== inputHash) return false;
    await captchaRepository.markSolved(attempt.id);
    return true;
  },

  async cleanupExpired(): Promise<number> {
    return captchaRepository.cleanupExpired();
  },
};
