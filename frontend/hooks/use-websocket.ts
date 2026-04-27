"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { env } from "@/config/env";

type MessageHandler = (data: unknown) => void;

const RECONNECT_INTERVAL = 3_000;
const PING_INTERVAL = 30_000;

function buildWsUrl(token: string): string {
  const httpUrl = env.NEXT_PUBLIC_API_URL;
  const wsUrl = httpUrl.replace(/^http/, "ws");
  return `${wsUrl}/ws?token=${encodeURIComponent(token)}`;
}

export function useWebSocket(onMessage: MessageHandler): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token || !isMountedRef.current) return;

    // ป้องกัน connection ซ้ำ — รวม CONNECTING ด้วยเพราะ StrictMode อาจเรียก connect ซ้ำก่อน ws เปิดสำเร็จ
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    const ws = new WebSocket(buildWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      // เริ่ม ping เพื่อ keep connection alive
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      if (event.data === "pong") return;
      try {
        const data: unknown = JSON.parse(event.data as string);
        onMessageRef.current(data);
      } catch {
        // ข้อมูลที่ parse ไม่ได้ — ข้ามไป
      }
    };

    ws.onclose = () => {
      clearInterval(pingTimerRef.current);

      // เฉพาะ connection ปัจจุบันเท่านั้นที่จัดการ reconnect
      // ป้องกัน StrictMode race condition ที่ ws เก่า onclose แล้ว overwrite wsRef ของ ws ใหม่
      if (wsRef.current !== ws) return;
      wsRef.current = null;

      // Reconnect อัตโนมัติ ถ้ายัง authenticated
      if (isMountedRef.current && useAuthStore.getState().isAuthenticated) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    // Subscribe auth changes — reconnect เมื่อ login, disconnect เมื่อ logout
    const unsubscribe = useAuthStore.subscribe((state, prevState) => {
      if (state.isAuthenticated && !prevState.isAuthenticated) {
        connect();
      }
      if (!state.isAuthenticated && prevState.isAuthenticated) {
        wsRef.current?.close();
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearTimeout(reconnectTimerRef.current);
      clearInterval(pingTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
