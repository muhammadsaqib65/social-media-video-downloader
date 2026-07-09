"use client";

import { useEffect, useState } from "react";

type Platform = "tiktok" | "instagram" | "youtube";

interface VideoInfo {
  title: string;
  downloadUrl: string;
  thumbnail: string;
  duration: number;
  author: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function extractFirstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match?.[0]?.replace(/[),.]+$/, "") ?? "";
}

function detectPlatform(url: string): Platform {
  const loweredUrl = url.toLowerCase();

  if (loweredUrl.includes("instagram.com")) {
    return "instagram";
  }

  if (loweredUrl.includes("youtube.com") || loweredUrl.includes("youtu.be")) {
    return "youtube";
  }

  return "tiktok";
}

export default function VideoDownloaderPage() {
  const [activeTab, setActiveTab] = useState<Platform>("tiktok");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const processVideo = async (platform: Platform, urlToDownload = videoUrl) => {
    const cleanedUrl = extractFirstUrl(urlToDownload) || urlToDownload.trim();

    if (!cleanedUrl) {
      setError("Please enter a valid video URL.");
      return;
    }

    setVideoUrl(cleanedUrl);
    setActiveTab(platform);
    setLoading(true);
    setError("");
    setNotice("");
    setVideoInfo(null);

    try {
      const response = await fetch(`/api/download/${platform}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: cleanedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video info.");
      }

      setVideoInfo(data);
      setNotice("Video is ready. Tap Download Video to save it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("Service worker registration failed:", err);
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const searchParams = new URLSearchParams(window.location.search);
    const sharedValue = [
      searchParams.get("sharedUrl"),
      searchParams.get("url"),
      searchParams.get("text"),
    ]
      .filter(Boolean)
      .join(" ");
    const sharedUrl = extractFirstUrl(sharedValue);
    const shareError = searchParams.get("shareError");

    if (shareError) {
      setError(shareError);
    }

    if (sharedUrl) {
      const platform = detectPlatform(sharedUrl);
      setNotice("Shared link received. Preparing your download...");
      void processVideo(platform, sharedUrl);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const downloadVideoFile = async () => {
    if (!videoInfo) return;

    try {
      const response = await fetch(`/api/download/${activeTab}/video?url=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link.");
      }

      if (data.downloadUrl) {
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = `${data.title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setNotice("Download started. If it opens in a new tab, use your browser save button.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download video.");
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pastedUrl = extractFirstUrl(text) || text.trim();

      if (!pastedUrl) {
        setError("Clipboard does not contain a video URL.");
        return;
      }

      const platform = detectPlatform(pastedUrl);
      setVideoUrl(pastedUrl);
      setActiveTab(platform);
      setNotice("URL pasted from clipboard.");
    } catch {
      setError("Clipboard permission was denied. Paste the link manually.");
    }
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (choice.outcome === "accepted") {
        setNotice("App installed. You can now share videos directly to VideoDL.");
      } else {
        setNotice("Install canceled. You can install anytime from the browser menu.");
      }
      return;
    }

    setNotice(
      "Install manually: Chrome/Edge → ⋮ menu → Install app. iPhone Safari → Share → Add to Home Screen."
    );
  };

  const handleShareApp = async () => {
    try {
      const shareNavigator = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        clipboard?: Clipboard;
      };

      if (shareNavigator.share) {
        await shareNavigator.share({
          title: "Video Downloader Pro",
          text: "Download TikTok, Instagram, and YouTube videos without watermark.",
          url: window.location.href,
        });
        return;
      }

      if (shareNavigator.clipboard) {
        await shareNavigator.clipboard.writeText(window.location.href);
        setNotice("App link copied to clipboard.");
        return;
      }

      setNotice("Copy this page link and open it on your phone to install.");
    } catch {
      setNotice("Copy this page link and open it on your phone to install.");
    }
  };

  const platformExamples: Record<Platform, string> = {
    tiktok: "https://www.tiktok.com/@user/video/123...",
    instagram: "https://www.instagram.com/reel/ABC...",
    youtube: "https://www.youtube.com/watch?v=...",
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-100 to-sky-100 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-[2rem] bg-white/90 p-5 shadow-xl shadow-indigo-100 ring-1 ring-slate-200 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Mobile PWA Downloader
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Video Downloader Pro
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Install it on your phone, then share TikTok, Instagram, or YouTube links directly to this app.
              </p>
            </div>
            <div className="flex flex-row gap-2 sm:flex-col">
              <button
                onClick={handleInstallApp}
                className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
              >
                {isStandalone ? "Installed" : "Install App"}
              </button>
              <button
                onClick={handleShareApp}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Share App
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-200 ring-1 ring-slate-200 sm:p-6">
          <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {(["tiktok", "instagram", "youtube"] as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`rounded-xl px-2 py-3 text-sm font-bold capitalize transition ${
                  activeTab === platform
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>

          <label className="mb-2 block text-sm font-bold text-slate-700">
            Paste or share a {activeTab} video link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={videoUrl}
              onChange={(event) => {
                const value = event.target.value;
                setVideoUrl(value);
                if (value.includes("http")) {
                  setActiveTab(detectPlatform(value));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void processVideo(detectPlatform(videoUrl), videoUrl);
                }
              }}
              placeholder={platformExamples[activeTab]}
              className="min-h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
            <button
              onClick={pasteFromClipboard}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Paste
            </button>
          </div>

          <button
            onClick={() => processVideo(detectPlatform(videoUrl), videoUrl)}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Preparing Download..." : "Get Download Link"}
          </button>

          {notice && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {videoInfo && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              {videoInfo.thumbnail && (
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="h-52 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                  Ready to download
                </p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{videoInfo.title}</h2>
                <p className="mt-1 text-sm text-slate-600">Creator: {videoInfo.author}</p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={downloadVideoFile}
                    className="rounded-2xl bg-green-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-green-100 transition hover:bg-green-700"
                  >
                    Download Video
                  </button>
                  <button
                    onClick={handleShareApp}
                    className="rounded-2xl bg-purple-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700"
                  >
                    Share App
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
            <p className="text-2xl">1️⃣</p>
            <h3 className="mt-2 font-black">Install</h3>
            <p className="mt-1 text-sm text-slate-600">Tap Install App, or use your browser menu to add it to your home screen.</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
            <p className="text-2xl">2️⃣</p>
            <h3 className="mt-2 font-black">Share</h3>
            <p className="mt-1 text-sm text-slate-600">In TikTok, Instagram, or YouTube, press Share and choose VideoDL.</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
            <p className="text-2xl">3️⃣</p>
            <h3 className="mt-2 font-black">Download</h3>
            <p className="mt-1 text-sm text-slate-600">The shared link opens here automatically so you can download without closing the app.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
