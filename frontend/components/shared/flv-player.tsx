"use client";

import { useEffect, useRef, useState } from "react";
import type Mpegts from "mpegts.js";
import { Loader2, VideoOff } from "lucide-react";

// HTTP-FLV player (low-latency live ~1-3s) ผ่าน mpegts.js
// ใช้คู่กับ live-video-player.tsx ที่ fallback ไป HlsPlayer เมื่อ FLV เล่นไม่ได้ (iOS Safari)

type MpegtsPlayer = ReturnType<typeof Mpegts.createPlayer>;

export interface FlvPlayerProps {
  src: string;
  className?: string;
  muted?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  onFatalError?: () => void; // FLV ล่ม/ไม่รองรับ → ให้ chooser ตก HLS
}

type PlayerState = "loading" | "playing" | "error";

export function FlvPlayer({
  src,
  className,
  muted = true,
  autoPlay = true,
  controls = true,
  onFatalError,
}: FlvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<PlayerState>("loading");

  // เก็บ callback ใน ref — กัน effect re-run เมื่อ parent ส่ง fn ใหม่
  const onFatalErrorRef = useRef(onFatalError);
  onFatalErrorRef.current = onFatalError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setState("loading");
    let player: MpegtsPlayer | null = null;
    let disposed = false;

    const goPlaying = () => setState((s) => (s === "loading" ? "playing" : s));
    const onPlaying = () => goPlaying();
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);

    void (async () => {
      const mpegts = (await import("mpegts.js")).default;
      if (disposed) return;

      // mpegts ต้องการ MSE — iOS Safari ไม่รองรับ → fallback HLS
      if (!mpegts.isSupported()) {
        onFatalErrorRef.current?.();
        return;
      }

      const p = mpegts.createPlayer(
        { type: "flv", isLive: true, url: src },
        {
          enableWorker: true,
          liveBufferLatencyChasing: true, // ไล่ตาม live edge → latency ต่ำ
          liveBufferLatencyMaxLatency: 3.0,
          liveBufferLatencyMinRemain: 0.5,
          lazyLoad: false,
          stashInitialSize: 128, // buffer เริ่มต้นเล็ก = latency ต่ำ
        },
      );
      player = p;
      p.attachMediaElement(video);
      p.on(mpegts.Events.ERROR, () => {
        if (disposed) return;
        setState("error");
        onFatalErrorRef.current?.();
      });
      p.load();
      if (autoPlay) p.play();
    })();

    // safety net — หลุดจาก loading ใน 8 วิ ถ้า event ไม่ fire
    const safety = setTimeout(() => goPlaying(), 8_000);

    return () => {
      disposed = true;
      clearTimeout(safety);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
      if (player) {
        try {
          player.pause();
          player.unload();
          player.detachMediaElement();
          player.destroy();
        } catch {
          /* teardown best-effort */
        }
      }
    };
  }, [src, autoPlay]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <video
        ref={videoRef}
        muted={muted}
        autoPlay={autoPlay}
        controls={controls}
        playsInline
        className="w-full h-full object-contain bg-black"
      />
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 bg-black/70 pointer-events-none">
          <VideoOff className="h-10 w-10 mb-2" />
          <span className="text-sm">วิดีโอเล่นไม่ได้</span>
        </div>
      )}
      {state === "loading" && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>เชื่อมต่อ...</span>
        </div>
      )}
    </div>
  );
}
