import { db } from "@/db";
import { downloadLogs } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import ytdl from "ytdl-core";

export const dynamic = "force-dynamic";

// Function to get YouTube video download URL
async function getYouTubeVideoDownload(url: string): Promise<{
  title: string;
  downloadUrl: string;
  thumbnail: string;
  duration: number;
  author: string;
  format: string;
}> {
  // Validate URL
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid YouTube URL");
  }

  // Get video info
  const info = await ytdl.getInfo(url);
  
  const title = info.videoDetails.title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const videoId = info.videoDetails.videoId;
  const duration = parseInt(info.videoDetails.lengthSeconds) || 0;
  const author = typeof info.videoDetails.author === 'string' 
    ? info.videoDetails.author 
    : (info.videoDetails.author as any).name;
  const thumbnail = info.videoDetails.thumbnails[0]?.url || 
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // Get the best format
  const format = ytdl.chooseFormat(info.formats, {
    quality: 'highest',
    filter: 'videoandaudio'
  });

  return {
    title,
    downloadUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail,
    duration,
    author: author || "YouTube",
    format: format?.itag?.toString() || "best"
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const videoData = await getYouTubeVideoDownload(url);
    
    // Log the download
    await db.insert(downloadLogs).values({
      platform: "youtube",
      url: url,
      success: true,
      fileName: `${videoData.title.replace(/[^a-z0-9]/gi, '_')}.mp4`,
    });

    return NextResponse.json(videoData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await db.insert(downloadLogs).values({
      platform: "youtube",
      url: url || "",
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