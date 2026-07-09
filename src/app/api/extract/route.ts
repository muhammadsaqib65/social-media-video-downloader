import { NextRequest, NextResponse } from 'next/server';
import { extractVideoInfo, detectPlatform } from '@/lib/extractors';
import { db } from '@/db';
import { downloads } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }
    
    const platform = detectPlatform(url);
    if (platform === 'unknown') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported platform. Supported: TikTok, Instagram, YouTube' 
      }, { status: 400 });
    }
    
    const start = Date.now();
    const videoInfo = await extractVideoInfo(url);
    const extractionTime = Date.now() - start;
    
    // Log to DB (non-blocking, ignore errors)
    try {
      await db.insert(downloads).values({
        platform,
        originalUrl: url,
        title: videoInfo.title || null,
        thumbnail: videoInfo.thumbnail || null,
        author: videoInfo.author || null,
        status: videoInfo.success ? 'success' : 'failed',
        metadata: {
          extractionTime,
          qualitiesCount: videoInfo.qualities.length,
          platformDetected: platform,
        } as any,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
    } catch (dbError) {
      console.error('DB log error:', dbError);
    }
    
    if (!videoInfo.success && videoInfo.qualities.length === 0) {
      return NextResponse.json({
        success: false,
        platform,
        error: videoInfo.error || 'Failed to extract video',
        suggestion: 'Try using a public video URL. Private accounts are not supported.',
      }, { status: 200 }); // Return 200 with success false so frontend shows message
    }
    
    return NextResponse.json({
      success: true,
      platform,
      data: videoInfo,
      extractionTime: `${extractionTime}ms`,
      noWatermark: true,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during extraction',
      details: error.message,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ 
      message: 'Video Downloader API - No Watermark',
      version: '2.0.0',
      supported: ['tiktok', 'instagram', 'youtube'],
      endpoints: {
        'POST /api/extract': 'Extract video info - body: {url}',
        'GET /api/download?url=VIDEO_URL&filename=NAME': 'Proxy download',
        'GET /api/history': 'Recent downloads',
      },
      github: 'Ready to deploy'
    });
  }
  
  // Also allow GET for quick testing
  return POST(new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' },
  }) as any);
}
