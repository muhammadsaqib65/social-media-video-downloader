import { db } from "@/db";
import { downloadLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TikTok video download using public endpoint
async function downloadTikTokVideo(url: string): Promise<{
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
  author: string;
}> {
  // Use TikTok API wrapper endpoint
  const apiUrl = "https://tiktok-api-downloader.p.rapidapi.com/v1/video/id";
  
  // Extract video ID from URL
  const videoIdMatch = url.match(/tiktok\.com\/(embed\/)?(@[^/]+)\/video\/(\d+)/) || 
                       url.match(/tiktok\.com\/video\/(\d+)/) ||
                       url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
  
  if (!videoIdMatch) {
    throw new Error("Invalid TikTok URL");
  }

  const videoId = videoIdMatch[2] || videoIdMatch[1];
  
  const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch TikTok video info");
  }

  const data = await response.json();
  
  // Extract video ID for API call
  const finalUrl = `https://www.tiktok.com/@${data.author_name || 'user'}/video/${videoId}`;
  
  return {
    title: data.title || "TikTok Video",
    url: data.thumbnail_url || url,
    thumbnail: data.thumbnail_url || "",
    duration: Math.floor(data.duration || 0),
    author: data.author_name || "Unknown"
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate TikTok URL
    const tiktokPattern = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|www\.tiktok\.com\/@)\S+/;
    if (!tiktokPattern.test(url)) {
      return NextResponse.json({ error: "Invalid TikTok URL" }, { status: 400 });
    }

    // Extract video information
    const videoData = await downloadTikTokVideo(url);

    // Log the download
    await db.insert(downloadLogs).values({
      platform: "tiktok",
      url: url,
      success: true,
      fileName: `${videoData.title.replace(/[^a-z0-9]/gi, '_')}.mp4`,
    });

    return NextResponse.json({
      success: true,
      ...videoData,
      downloadUrl: `/api/download/tiktok/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await db.insert(downloadLogs).values({
      platform: "tiktok",
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
    const videoData = await downloadTikTokVideo(url);
    return NextResponse.json({
      success: true,
      ...videoData,
      downloadUrl: `/api/download/tiktok/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}