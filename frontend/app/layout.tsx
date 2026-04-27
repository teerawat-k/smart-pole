import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/shared/providers";

export const metadata: Metadata = {
  title: "Smart Pole",
  description: "Smart Pole — ระบบเฝ้าระวังเสาสัญญาณอัจฉริยะ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
