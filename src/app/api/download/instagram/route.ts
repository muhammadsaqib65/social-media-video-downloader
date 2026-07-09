import { db } from "@/db";
import { downloadLogs } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Function to download Instagram video
async function downloadInstagramVideo(url: string): Promise<{
  title: string;
  downloadUrl: string;
  thumbnail: string;
  duration: number;
  author: string;
}> {
  // Validate Instagram URL
  const instagramPattern = /^https?:\/\/(www\.)?(instagram\.com|dd\.instagram\.com)\/(p|reel|tv|stories)\/\S+/;
  if (!instagramPattern.test(url)) {
    throw new Error("Invalid Instagram URL");
  }

  // Use Instagram oEmbed API
  const oembedResponse = await fetch(`https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!oembedResponse.ok) {
    throw new Error("Failed to fetch Instagram video info");
  }

  const data = await oembedResponse.json();
  
  return {
    title: data.title || "Instagram Video",
    downloadUrl: data.thumbnail_url || url,
    thumbnail: data.thumbnail_url || "",
    duration: data.duration ? Math.floor(data.duration) : 0,
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

    const videoData = await downloadInstagramVideo(url);

    // Log the download
    await db.insert(downloadLogs).values({
      platform: "instagram",
      url: url,
      success: true,
      fileName: `${videoData.title.replace(/[^a-z0-9]/gi, '_')}.mp4`,
    });

    return NextResponse.json({
      success: true,
      ...videoData,
      downloadUrl: `/api/download/instagram/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await db.insert(downloadLogs).values({
      platform: "instagram",
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
    const videoData = await downloadInstagramVideo(url);
    return NextResponse.json({
      success: true,
      ...videoData,
      downloadUrl: `/api/download/instagram/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}