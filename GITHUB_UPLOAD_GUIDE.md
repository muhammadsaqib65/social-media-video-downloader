# How to Upload This Project to GitHub (2 mins)

You said you only want to download and upload to GitHub - here's exactly how:

## Option 1: Download ZIP from this preview (if available)
1. In your arena dashboard, look for "Download Project" or "Export"
2. Unzip locally

## Option 2: Push this exact code to your GitHub

The project is already production-ready. Just run these commands in your terminal from project root:

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "feat: SnapDown - TikTok IG YT downloader no watermark"

# Create new repo on GitHub.com first, then:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/snapdown.git
git push -u origin main
```

## Option 3: Direct Vercel Deploy (from GitHub)

After pushing to GitHub:

1. Go to https://vercel.com
2. Click "New Project" → Import your snapdown repo
3. Add Environment Variable:
   - `DATABASE_URL` = your Postgres URL (optional - from Neon, Supabase, Vercel Postgres)
   - If you skip DB, app still works!
4. Deploy - you get `https://yourapp.vercel.app` live in 30s

## What's Included & Ready?

✅ Next.js 16 App Router + TypeScript
✅ Tailwind CSS v4 premium UI dark mode
✅ Complete extractor: Cobalt API (primary, no watermark) + TikWM + Invidious fallback
✅ 3 APIs: /api/extract, /api/download (proxy), /api/history, /api/health
✅ PostgreSQL + Drizzle ORM (optional but included)
✅ .gitignore, LICENSE (MIT), .env.example, README.md
✅ next.config.ts with CORS & image unoptimized
✅ No secrets hardcoded

## Environment Variables Needed

Only optional:
```
DATABASE_URL=postgresql://...
```
App works without it (mock stats).

For production, you can also set:
```
COBALT_API_URL=https://api.cobalt.tools/api/json
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## After Upload - Test Locally

```bash
npm install
cp .env.example .env
# edit .env if you have DB
npx drizzle-kit push   # if you have DB
npm run dev
```

Open http://localhost:3000
Paste: https://www.tiktok.com/@test/video/...
Click Download → No watermark!

## Features You Got

- No watermark on all platforms (TikTok HD play, IG original, YT HD)
- Auto platform detection
- Quality selector (1080p, 720p)
- Proxy download to avoid CORS
- Analytics table
- SEO optimized
- Mobile paste button
- Toast notifications
- GitHub badge

## Need Changes?

Edit:
- `src/app/page.tsx` → UI colors, text
- `src/lib/extractors.ts` → Add more extractor logic
- `src/db/schema.ts` → Add more fields

Then re-build:
```
npm run build
```

Push again to GitHub.

---

Enjoy! Star if helpful ⭐
