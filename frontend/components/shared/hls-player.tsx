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

    // Safari + iOS รองรับ HLS native — ใช้ตรง
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const onPlay = () => setState("playing");
      const onError = () => {
        setState("error");
        setErrorMessage("เปิดสตรีมไม่สำเร็จ");
      };
      video.addEventListener("playing", onPlay);
      video.addEventListener("error", onError);
      return () => {
        video.removeEventListener("playing", onPlay);
        video.removeEventListener("error", onError);
        video.src = "";
      };
    }

    if (!Hls.isSupported()) {
      setState("error");
      setErrorMessage("เบราว์เซอร์ไม่รองรับ HLS");
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      maxBufferLength: 10,
    });
    hls.loadSource(src);
    hls.attachMedia(video);

    const onPlaying = () => setState("playing");
    video.addEventListener("playing", onPlaying);

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      // recover network errors automatically
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
      video.removeEventListener("playing", onPlaying);
      hls.destroy();
    };
  }, [src]);

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
