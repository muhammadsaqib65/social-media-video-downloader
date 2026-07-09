import { db } from "@/db";
import { downloadLogs } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Function to download YouTube video without watermark
async function downloadYouTubeVideo(url: string): Promise<{
  title: string;
  downloadUrl: string;
  thumbnail: string;
  duration: number;
  author: string;
}> {
  // Validate YouTube URL
  const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtu\.be|m\.youtube\.com)\/\S+/;
  if (!youtubePattern.test(url)) {
    throw new Error("Invalid YouTube URL");
  }

  // Use YouTube oEmbed API
  const oembedResponse = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }
  );

  if (!oembedResponse.ok) {
    throw new Error("Failed to fetch YouTube video info");
  }

  const data = await oembedResponse.json();

  // Extract video ID
  const videoIdMatch = url.match(/[?&]v=([^&]+)/) || 
                       url.match(/youtu\.be\/([^?]+)/) ||
                       url.match(/youtube\.com\/embed\/([^/?]+)/) ||
                       url.match(/youtube\.com\/watch\?v=([^&]+)/);
  
  const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";
  const thumbnailUrl = data.thumbnail_url || 
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title: data.title || "YouTube Video",
    downloadUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: thumbnailUrl,
    duration: data.duration ? Math.floor(data.duration) : 0,
    author: data.author_name || "YouTube"
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const videoData = await downloadYouTubeVideo(url);

    // Log the download
    await db.insert(downloadLogs).values({
      platform: "youtube",
      url: url,
      success: true,
      fileName: `${videoData.title.replace(/[^a-z0-9]/gi, '_')}.mp4`,
    });

    return NextResponse.json({
      success: true,
      ...videoData,
      downloadUrl: `/api/download/youtube/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await db.insert(downloadLogs).values({
      platform: "youtube",
      url: "",
      success: false,
      error: errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const videoData = await downloadYouTubeVideo(url);
    return NextResponse.json({
      success: true,
      ...videoData,
      downloadUrl: `/api/download/youtube/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}