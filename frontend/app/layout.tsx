import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { Providers } from "@/components/shared/providers";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Smart Pole",
  description: "Smart Pole — ระบบเฝ้าระวังเสาสัญญาณอัจฉริยะ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
