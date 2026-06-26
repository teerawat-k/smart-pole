// Runtime URL builder — รวมจัดการทุก URL ที่ frontend เรียกออกไป
//
// Strategy: ถ้า env กำหนดมา → ใช้ตรง ๆ
//           ถ้าไม่กำหนด → คำนวณจาก window.location (relative ต่อ page origin)
//
// ผลที่ได้:
//   - Page บน https://152.42.242.162  → API/WS/HLS ก็ใช้ https/wss origin เดียวกัน
//   - Page บน http://152.42.242.162:7765 → API/WS/HLS ก็ใช้ http origin เดียวกัน
//   - ไม่มี cross-origin / mixed-content issue
//
// Next.js rewrites ใน next.config.ts จัดการ port 7765 → backend container

import { env } from "@/config/env";

/**
 * API base — สำหรับ axios baseURL
 * Empty string = axios ใช้ relative URL (resolve เอง ตาม page origin)
 */
export function apiBase(): string {
  return env.NEXT_PUBLIC_API_URL;
}

/**
 * WebSocket URL พร้อม token
 * - มี env กำหนด → ใช้ตรง ๆ (สำหรับ dev: ws://localhost:7766/ws)
 * - ไม่มี → คำนวณจาก window.location (wss:// ถ้า page เป็น https)
 */
export function buildWsUrl(token: string): string {
  const encoded = encodeURIComponent(token);
  if (env.NEXT_PUBLIC_WS_URL) {
    return `${env.NEXT_PUBLIC_WS_URL}?token=${encoded}`;
  }
  if (typeof window === "undefined") {
    // SSR — return placeholder, จะถูก override ตอน client mount
    return `/ws?token=${encoded}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws?token=${encoded}`;
}

/**
 * HLS playlist URL ของเสา (fallback player)
 * Default: /hls/live/<pole>.m3u8 (relative, hls.js resolve เอง)
 */
export function hlsPlaylistUrl(poleName: string): string {
  const base = env.NEXT_PUBLIC_HLS_BASE || "/hls";
  return `${base}/live/${poleName}.m3u8`;
}

/**
 * HTTP-FLV stream URL ของเสา (low-latency live ผ่าน mpegts.js)
 * Default: /flv/live/<pole>.flv (relative — nginx /flv/ → SRS http-flv)
 */
export function flvStreamUrl(poleName: string): string {
  const base = env.NEXT_PUBLIC_FLV_BASE || "/flv";
  return `${base}/live/${poleName}.flv`;
}

/**
 * Camera clip stream URL — สำหรับ <video src=...>
 * Browser resolve relative path เทียบ page origin
 */
export function cameraClipStreamUrl(poleName: string, queryString: string): string {
  const base = env.NEXT_PUBLIC_API_URL;
  return `${base}/api/cameras/${encodeURIComponent(poleName)}/stream?${queryString}`;
}
