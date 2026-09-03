import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Triage scoring layer for SaaSquatch exports",
  description: "ICP-fit scoring, deduplication and enrichment on top of raw lead exports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
