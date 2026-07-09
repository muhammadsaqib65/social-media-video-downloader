"use client";

import { useEffect, useState } from 'react';

interface ShareData {
  url: string;
  title?: string;
  text?: string;
  source: 'share_target' | 'clipboard' | 'protocol';
}

export function useShareTarget() {
  const [sharedData, setSharedData] = useState<ShareData | null>(null);
  const [hasSharedContent, setHasSharedContent] = useState(false);

  useEffect(() => {
    const processUrlParams = () => {
      if (typeof window === 'undefined') return;
      
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      const textParam = params.get('text');
      const titleParam = params.get('title');
      const protocolParam = params.get('protocol');
      const shortcutParam = params.get('shortcut');
      
      let extractedUrl: string | null = null;
      let source: ShareData['source'] = 'share_target';
      
      // Method 1: Direct url param from Web Share Target API
      if (urlParam) {
        extractedUrl = urlParam;
      }
      // Method 2: text param often contains URL (Android shares text with URL)
      else if (textParam) {
        const urlMatch = textParam.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          extractedUrl = urlMatch[0];
        } else if (textParam.includes('tiktok.com') || textParam.includes('instagram.com') || textParam.includes('youtube.com') || textParam.includes('youtu.be')) {
          extractedUrl = textParam;
        }
      }
      // Method 3: title param might contain URL
      else if (titleParam) {
        const urlMatch = titleParam.match(/https?:\/\/[^\s]+/);
        if (urlMatch) extractedUrl = urlMatch[0];
      }
      // Method 4: protocol handler
      else if (protocolParam) {
        try {
          const decoded = decodeURIComponent(protocolParam);
          const urlMatch = decoded.match(/https?:\/\/[^\s]+/);
          if (urlMatch) extractedUrl = urlMatch[0];
          source = 'protocol';
        } catch {}
      }
      
      // Also check for url in hash or full href (some browsers)
      if (!extractedUrl) {
        const fullUrl = window.location.href;
        // Look for tiktok/instagram/youtube links in entire URL
        const patterns = [
          /https?:\/\/(?:www\.)?tiktok\.com\/[^\s&"']+/,
          /https?:\/\/vt\.tiktok\.com\/[^\s&"']+/,
          /https?:\/\/vm\.tiktok\.com\/[^\s&"']+/,
          /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[^\s&"']+/,
          /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^\s&"']+/,
          /https?:\/\/youtu\.be\/[^\s&"']+/,
          /https?:\/\/(?:www\.)?youtube\.com\/shorts\/[^\s&"']+/,
        ];
        
        for (const pattern of patterns) {
          const match = fullUrl.match(pattern);
          if (match) {
            extractedUrl = match[0];
            break;
          }
        }
      }
      
      if (extractedUrl) {
        // Clean URL (remove utm params from our own redirect, but keep video ID)
        let cleanUrl = extractedUrl;
        try {
          const urlObj = new URL(extractedUrl);
          // Remove our own tracking but keep important params
          urlObj.searchParams.delete('utm_source');
          urlObj.searchParams.delete('utm_medium');
          urlObj.searchParams.delete('shortuct');
          // For youtube, keep v param
          if (!urlObj.hostname.includes('youtube.com')) {
            // Keep clean
          }
          cleanUrl = urlObj.toString();
        } catch {
          // Keep as is if URL parsing fails
        }
        
        setSharedData({
          url: cleanUrl,
          title: titleParam || undefined,
          text: textParam || undefined,
          source,
        });
        setHasSharedContent(true);
        
        // Clean URL from address bar (remove share params but keep path)
        // Use replaceState to avoid adding history entry
        const cleanSearch = new URLSearchParams();
        // Keep non-share params like shortcut if needed for UI, but we'll clear share params after 100ms
        setTimeout(() => {
          if (window.history.replaceState) {
            const newUrl = window.location.pathname + (shortcutParam ? `?shortcut=${shortcutParam}` : '');
            window.history.replaceState({}, '', newUrl);
          }
        }, 500);
      }
      
      // Log shortcut usage
      if (shortcutParam) {
        console.log('[Share] Shortcut opened:', shortcutParam);
      }
    };
    
    processUrlParams();
    
    // Also listen for focus - when app comes back from share, clipboard might have URL
    const handleFocus = async () => {
      // Optional: Auto-read clipboard if permission granted (reduces friction)
      // This enables "without closing app" flow - user copies in TikTok, switches back to SnapDown, auto detects
      try {
        if (navigator.clipboard && document.hasFocus()) {
          // Don't auto-read without permission - just check if we can
          // We'll let user click Paste, but we can show hint
        }
      } catch {}
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const clearSharedData = () => {
    setSharedData(null);
    setHasSharedContent(false);
  };

  return { sharedData, hasSharedContent, clearSharedData };
}

// Component that shows banner when shared content detected
export function ShareTargetBanner({ onUseSharedUrl }: { onUseSharedUrl: (url: string) => void }) {
  const { sharedData, clearSharedData } = useShareTarget();
  
  useEffect(() => {
    if (sharedData?.url) {
      // Auto-use shared URL
      onUseSharedUrl(sharedData.url);
      // Don't auto clear, let user see it came from share
    }
  }, [sharedData]);

  if (!sharedData) return null;

  const platform = sharedData.url.toLowerCase().includes('tiktok') ? 'TikTok' :
                   sharedData.url.toLowerCase().includes('instagram') ? 'Instagram' :
                   sharedData.url.toLowerCase().includes('youtube') || sharedData.url.toLowerCase().includes('youtu.be') ? 'YouTube' : 'Video';

  return (
    <div className="animate-[slideIn_0.4s_ease] mx-auto max-w-[640px] mt-6 rounded-[16px] bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white">
        📲
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[13px] text-white flex items-center gap-2">
          Shared from {platform} detected!
          <span className="px-1.5 py-0.5 rounded-full bg-violet-500 text-white text-[9px] font-bold">SHARE TARGET</span>
        </h4>
        <p className="text-[12px] text-violet-200/80 mt-1 truncate">{sharedData.url}</p>
        <p className="text-[11px] text-violet-300/60 mt-1">Auto-filled below • Tap Download for no watermark</p>
      </div>
      <button onClick={clearSharedData} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition">✕</button>
    </div>
  );
}
