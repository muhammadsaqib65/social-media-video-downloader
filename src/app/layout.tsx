import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapDown - TikTok, Instagram & YouTube Downloader Without Watermark",
  description: "Download TikTok, Instagram Reels, and YouTube videos without watermark in HD. Free, fast, no registration. Best online video downloader 2025.",
  keywords: ["tiktok downloader", "instagram downloader", "youtube downloader", "no watermark", "video downloader", "reels downloader", "tiktok without watermark", "instagram reels download"],
  authors: [{ name: "SnapDown Team" }],
  openGraph: {
    title: "SnapDown - Download Videos Without Watermark",
    description: "Free TikTok, Instagram & YouTube video downloader. No watermark, HD quality, fast & secure.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0a0a0a] text-white antialiased overflow-x-hidden selection:bg-[#ff0050] selection:text-white">
        {children}
      </body>
    </html>
  );
}
