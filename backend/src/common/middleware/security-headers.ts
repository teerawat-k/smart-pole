// ── Security Headers (Helmet equivalent) ───────────────────
// set ครอบคลุม OWASP recommendation — ทุก response มี
import { Elysia } from "elysia";
import { isProd } from "@/config/env";

export const securityHeadersPlugin = new Elysia({ name: "security-headers" }).onAfterHandle(({ set }) => {
  const headers = set.headers as Record<string, string>;

  // ป้องกัน MIME sniffing
  headers["x-content-type-options"] = "nosniff";

  // ป้องกัน clickjacking
  headers["x-frame-options"] = "DENY";

  // ห้าม browser ส่ง referer ออก cross-origin
  headers["referrer-policy"] = "strict-origin-when-cross-origin";

  // ปิดความสามารถที่ไม่ใช้ (camera/microphone/geo)
  headers["permissions-policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()";

  // Cross-origin isolation
  headers["cross-origin-opener-policy"]   = "same-origin";
  headers["cross-origin-resource-policy"] = "same-site";

  // ปิด DNS prefetch
  headers["x-dns-prefetch-control"] = "off";

  // legacy IE
  headers["x-download-options"]                = "noopen";
  headers["x-permitted-cross-domain-policies"] = "none";

  // เปิด HSTS เฉพาะ production (dev http จะใช้ไม่ได้)
  if (isProd) {
    headers["strict-transport-security"] = "max-age=31536000; includeSubDomains; preload";
  }

  // CSP — เข้มงวดเฉพาะ production
  // (dev: swagger UI โหลด resource จาก cdn ผ่อนเอาไว้)
  if (isProd) {
    headers["content-security-policy"] = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
  }
});
