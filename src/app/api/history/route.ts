import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { downloads } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const platform = searchParams.get('platform');
    
    let query = db.select().from(downloads).orderBy(desc(downloads.createdAt)).limit(limit);
    
    // If platform filter
    if (platform && ['tiktok', 'instagram', 'youtube'].includes(platform)) {
      const filtered = await db.select().from(downloads).where(eq(downloads.platform, platform)).orderBy(desc(downloads.createdAt)).limit(limit);
      return NextResponse.json({
        success: true,
        data: filtered,
        count: filtered.length,
      });
    }
    
    const recent = await db.select().from(downloads).orderBy(desc(downloads.createdAt)).limit(limit);
    
    // Get stats
    const statsRes = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE platform = 'tiktok') as tiktok,
        COUNT(*) FILTER (WHERE platform = 'instagram') as instagram,
        COUNT(*) FILTER (WHERE platform = 'youtube') as youtube
      FROM downloads
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    
    const stats = (statsRes.rows[0] as any) || { total: 0, tiktok: 0, instagram: 0, youtube: 0 };
    
    return NextResponse.json({
      success: true,
      data: recent,
      count: recent.length,
      stats: {
        total: parseInt(stats.total) || recent.length,
        tiktok: parseInt(stats.tiktok) || 0,
        instagram: parseInt(stats.instagram) || 0,
        youtube: parseInt(stats.youtube) || 0,
      }
    });
  } catch (error: any) {
    console.error('History error:', error);
    // Return empty if table doesn't exist yet
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      stats: { total: 0, tiktok: 0, instagram: 0, youtube: 0 },
      note: 'Database not initialized, run drizzle-kit push',
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get('days') || '30';
    
    await db.execute(sql`DELETE FROM downloads WHERE created_at < NOW() - INTERVAL '${sql.raw(olderThan)} days'`);
    
    return NextResponse.json({ success: true, message: `Cleaned downloads older than ${olderThan} days` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
