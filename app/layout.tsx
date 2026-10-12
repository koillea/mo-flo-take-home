import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

// System font stack: no build-time download from Google Fonts, so the build works offline.
export const metadata: Metadata = {
  title: "MoKnowledge",
  description: "Scrape a company website into a structured, reviewable knowledge base.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
