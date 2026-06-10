"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, VideoOff } from "lucide-react";

export interface HlsPlayerProps {
  src: string;
  className?: string;
  muted?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
}

type HlsState = "loading" | "playing" | "error";

export function HlsPlayer({
  src,
  className,
  muted = true,
  autoPlay = true,
  controls = true,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<HlsState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setState("loading");
    setErrorMessage(null);

    // ใช้ updater function เพื่อกัน stale closure
    const goPlaying = () => setState((s) => (s === "loading" ? "playing" : s));

    // ── Video listeners — ทุก event ที่บอกว่าพร้อมเล่น ──────
    const onLoadedData = () => goPlaying();
    const onCanPlay = () => {
      if (autoPlay) {
        void video.play().catch(() => goPlaying());
      } else {
        goPlaying();
      }
    };
    const onPlaying = () => goPlaying();
    const onError = () => {
      setState("error");
      setErrorMessage("วิดีโอเล่นไม่ได้");
    };
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    // ── Safari + iOS รองรับ HLS native ────────────────────
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      setState("error");
      setErrorMessage("เบราว์เซอร์ไม่รองรับ HLS");
      return () => {
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
      };
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      liveSyncDuration: 4,
      liveMaxLatencyDuration: 12,
      backBufferLength: 30,
      maxBufferLength: 30,
      manifestLoadingTimeOut: 10_000,
      manifestLoadingMaxRetry: 3,
      levelLoadingTimeOut: 10_000,
      fragLoadingTimeOut: 20_000,
    });
    hls.loadSource(src);
    hls.attachMedia(video);

    // ── HLS events — multiple trigger เผื่อ video event ไม่ fire ──
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoPlay) void video.play().catch(() => goPlaying());
    });

    hls.on(Hls.Events.LEVEL_LOADED, () => {
      // variant playlist parsed → SRS HLS ready
      if (autoPlay) void video.play().catch(() => undefined);
    });

    hls.on(Hls.Events.FRAG_BUFFERED, () => goPlaying());

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
        return;
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
        return;
      }
      setState("error");
      setErrorMessage(`เกิดข้อผิดพลาดในการสตรีม (${data.type})`);
    });

    // ── Safety net — force ออกจาก loading หลัง 8 วินาที ────
    // ถ้า event ทั้งหมดข้างบนไม่ trigger ภายใน 8s ให้ user เห็น video element + กด play
    const safetyTimer = setTimeout(() => goPlaying(), 8_000);

    return () => {
      clearTimeout(safetyTimer);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      hls.destroy();
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
      {state !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 bg-black/70 pointer-events-none">
          {state === "loading" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <span className="text-sm">กำลังเชื่อมต่อสตรีม...</span>
            </>
          )}
          {state === "error" && (
            <>
              <VideoOff className="h-10 w-10 mb-2" />
              <span className="text-sm">{errorMessage ?? "สตรีมหยุดทำงาน"}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
