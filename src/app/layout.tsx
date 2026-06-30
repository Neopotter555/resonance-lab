import type { Metadata } from "next";
import {
  Cinzel_Decorative,
  Cormorant_Garamond,
  Geist_Mono,
  Rajdhani,
} from "next/font/google";
import "./globals.css";

const displayFont = Cinzel_Decorative({
  variable: "--font-codex-display",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const bodyFont = Cormorant_Garamond({
  variable: "--font-codex-body",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});

const uiFont = Rajdhani({
  variable: "--font-codex-ui",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-codex-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resonance Lab",
  description:
    "A research-safe frequency, meditation, visualization, journaling, and consciousness experimentation laboratory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${uiFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
