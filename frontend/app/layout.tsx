import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Pole",
  description: "Smart Pole management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
