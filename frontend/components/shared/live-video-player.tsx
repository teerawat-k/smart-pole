"use client";

import { useCallback, useState } from "react";
import { FlvPlayer } from "./flv-player";
import { HlsPlayer } from "./hls-player";
import { flvStreamUrl, hlsPlaylistUrl } from "@/lib/runtime-url";

// Live video chooser — เริ่มที่ HTTP-FLV (latency ~1-3s)
// ถ้า FLV ล่ม/เบราว์เซอร์ไม่รองรับ MSE (iOS Safari) → fallback ไป HLS อัตโนมัติ
//
// remount ด้วย key={poleName} ที่ parent → mode reset เป็น flv ทุกครั้งที่เปลี่ยนเสา

export interface LiveVideoPlayerProps {
  poleName: string;
  className?: string;
}

type Mode = "flv" | "hls";

export function LiveVideoPlayer({ poleName, className }: LiveVideoPlayerProps) {
  const [mode, setMode] = useState<Mode>("flv");

  const fallbackToHls = useCallback(() => setMode("hls"), []);

  if (mode === "flv") {
    return (
      <FlvPlayer
        src={flvStreamUrl(poleName)}
        className={className}
        onFatalError={fallbackToHls}
      />
    );
  }
  return <HlsPlayer src={hlsPlaylistUrl(poleName)} className={className} />;
}
