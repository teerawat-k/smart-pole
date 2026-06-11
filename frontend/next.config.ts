import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: { unoptimized: true },

  // Rewrites — สำหรับ user ที่เข้าผ่าน HTTP port 7765 (Next.js direct)
  // /api และ /hls จะถูก proxy ไป backend container + SRS container
  // (HTTPS via nginx ไม่ใช้ rewrites — nginx จัดการเอง)
  //
  // ⚠️ WebSocket (/ws) ไม่อยู่ใน rewrites — Next.js ไม่ proxy WS protocol
  // → WS ใช้ได้เฉพาะ HTTPS path (ผ่าน nginx) เท่านั้น
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://backend:7766/api/:path*" },
      { source: "/hls/:path*", destination: "http://srs:8080/:path*" },
    ];
  },
};

export default nextConfig;
