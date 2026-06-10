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

    // ── Common video listeners ────────────────────────────
    // transition ออกจาก loading เมื่อ video เริ่มเล่นจริงๆ
    const onCanPlay = () => {
      if (autoPlay) {
        void video.play().catch(() => {
          // ถ้า autoplay ถูก block ผู้ใช้ต้องกด play เอง — แสดง controls
          setState("playing"); // ออกจาก loading เพราะ stream พร้อมแล้ว
        });
      } else {
        setState("playing");
      }
    };
    const onPlaying = () => setState("playing");
    const onError = () => {
      setState("error");
      setErrorMessage("วิดีโอเล่นไม่ได้");
    };
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    // ── Safari + iOS รองรับ HLS native ────────────────────
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => {
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
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("error", onError);
      };
    }

    const hls = new Hls({
      enableWorker: true,
      // ปิด lowLatencyMode — SRS ไม่ support LL-HLS (HTTP/2 + CMAF chunks)
      lowLatencyMode: false,
      // live sync: ใช้ segment ที่ 4s หลัง edge — สอดคล้องกับ hls_fragment 4s ของ SRS
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

    // call play() เมื่อ manifest parsed
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoPlay) {
        void video.play().catch(() => {
          // autoplay block — ออกจาก loading state ให้ user กด play เอง
          setState("playing");
        });
      }
    });

    // backup transition — เมื่อ frag แรกถูก buffer ก็แสดงว่าพร้อมเล่นแล้ว
    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      if (state === "loading") setState("playing");
    });

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

    return () => {
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
