import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { downloads } from '@/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get('url');
  let filename = searchParams.get('filename') || 'video';
  const platform = searchParams.get('platform') || 'video';
  
  if (!videoUrl) {
    return NextResponse.json({ error: 'Video URL required' }, { status: 400 });
  }
  
  // Handle special cobalt proxy needed case
  if (videoUrl.startsWith('__COBALT_PROXY_NEEDED__')) {
    const originalUrl = videoUrl.replace('__COBALT_PROXY_NEEDED__', '');
    try {
      // Try cobalt again to get real redirect URL
      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: originalUrl,
          vQuality: '1080',
          isNoTTWatermark: true,
          filenamePattern: 'basic',
        }),
        signal: AbortSignal.timeout(15000),
      });
      
      if (cobaltRes.ok) {
        const data = await cobaltRes.json();
        if (data.url) {
          // Redirect to actual download URL
          return NextResponse.redirect(data.url, 302);
        }
      }
    } catch (e) {
      console.error('Cobalt proxy fallback failed', e);
    }
    return NextResponse.json({ error: 'Direct download not available, please try extraction again' }, { status: 404 });
  }
  
  // Validate URL is http(s)
  try {
    const parsed = new URL(videoUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }
    // Basic SSRF protection - block private IPs
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
      return NextResponse.json({ error: 'Private IP not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
  }
  
  // Sanitize filename
  filename = filename.replace(/[^a-zA-Z0-9-_ ]/g, '').substring(0, 100) || 'video';
  const ext = videoUrl.includes('.mp4') ? 'mp4' : videoUrl.includes('.mp3') ? 'mp3' : 'mp4';
  const safeFilename = `${filename.replace(/\s+/g, '_')}_${platform}_nowatermark.${ext}`;
  
  try {
    // Log download attempt
    try {
      await db.insert(downloads).values({
        platform: platform as any,
        originalUrl: videoUrl,
        title: filename,
        status: 'downloaded',
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
        userAgent: req.headers.get('user-agent') || null,
      });
    } catch {}
    
    // Proxy stream the video
    const videoRes = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.tiktok.com/',
      },
      signal: AbortSignal.timeout(50000),
    });
    
    if (!videoRes.ok) {
      return NextResponse.json({ error: `Failed to fetch video: ${videoRes.status}` }, { status: 502 });
    }
    
    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const contentLength = videoRes.headers.get('content-length');
    
    // Stream response
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    headers.set('Cache-Control', 'no-cache');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Access-Control-Allow-Origin', '*');
    if (contentLength) headers.set('Content-Length', contentLength);
    
    // If body is available as stream, pipe it
    if (videoRes.body) {
      return new NextResponse(videoRes.body, {
        status: 200,
        headers,
      });
    } else {
      const buffer = await videoRes.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers,
      });
    }
    
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return NextResponse.json({
      error: 'Failed to download video',
      details: error.message,
      suggestion: 'The video CDN might be blocking proxy. Try opening the direct link in new tab.',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, quality, filename, platform } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }
    
    // For POST, we return download URL info for frontend to handle
    // This can be used for advanced download tracking
    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || 'video')}&platform=${platform || 'unknown'}`,
      directUrl: url,
      filename: filename || 'video',
      quality: quality || 'HD',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
