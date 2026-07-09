import { db } from "@/db";
import { downloadLogs } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Function to get Instagram video URL
async function getInstagramVideoDownload(url: string): Promise<{
  title: string;
  downloadUrl: string;
  thumbnail: string;
  duration: number;
  author: string;
}> {
  // Validate URL
  const instagramPattern = /^https?:\/\/(www\.)?(instagram\.com|dd\.instagram\.com)\/(p|reel|tv|stories)\/\S+/;
  if (!instagramPattern.test(url)) {
    throw new Error("Invalid Instagram URL");
  }

  // Use instagramdownloader API
  const response = await fetch("https://instagram-downlad.surge.sh/api/v1/lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    body: JSON.stringify({ url })
  });

  if (response.ok) {
    const data = await response.json();
    
    // Find video without watermark
    let videoUrl = data.download;
    if (!videoUrl && data.urls) {
      videoUrl = data.urls.find((u: any) => u.includes('mp4')) || data.urls[0];
    }
    
    return {
      title: data.title || "Instagram Video",
      downloadUrl: videoUrl || url,
      thumbnail: data.thumbnail || data.cover || "",
      duration: data.duration ? Math.floor(data.duration) : 0,
      author: data.author || "Unknown"
    };
  }

  // Fallback: Use public Instagram API
  const oembedResponse = await fetch(`https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  if (oembedResponse.ok) {
    const data = await oembedResponse.json();
    return {
      title: data.title || "Instagram Video",
      downloadUrl: data.thumbnail_url || url,
      thumbnail: data.thumbnail_url || "",
      duration: data.duration ? Math.floor(data.duration) : 0,
      author: data.author_name || "Unknown"
    };
  }

  throw new Error("Could not retrieve Instagram video");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const videoData = await getInstagramVideoDownload(url);
    
    // Log the download
    await db.insert(downloadLogs).values({
      platform: "instagram",
      url: url,
      success: true,
      fileName: `${videoData.title.replace(/[^a-z0-9]/gi, '_')}.mp4`,
    });

    return NextResponse.json(videoData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await db.insert(downloadLogs).values({
      platform: "instagram",
      url: url,
      success: false,
      error: errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || (await request.json()).url;
  
  return GET({
    ...request,
    url: `${request.url}?url=${encodeURIComponent(url || "")}`
  } as NextRequest);
}