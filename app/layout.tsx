import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medhartara Production",
  description: "Manajemen finansial & proyek — Medhartara Production",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
