import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Video Downloader Pro",
  description: "Download TikTok, Instagram, and YouTube videos without watermark. Install on mobile and share videos to download!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "VideoDL",
    statusBarStyle: "black-translucent",
  },
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
    {
      rel: "apple-touch-icon",
      url: "/icon-192x192.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "192x192",
      url: "/icon-192x192.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "512x512",
      url: "/icon-512x512.png",
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
