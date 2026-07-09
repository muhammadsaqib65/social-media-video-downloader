"use client";

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };
    
    checkStandalone();

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(reg => {
            console.log('[PWA] SW registered:', reg.scope);
            // Check for updates
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New content available, will use on next reload');
                    // Could show update toast
                  }
                });
              }
            });
          })
          .catch(err => console.log('[PWA] SW registration failed:', err));
      });
    }

    // Handle beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show our custom install banner after 2 sec if not standalone
      if (!isStandalone) {
        setTimeout(() => {
          const dismissed = localStorage.getItem('pwa-install-dismissed');
          const lastDismiss = dismissed ? parseInt(dismissed) : 0;
          // Show again if dismissed more than 1 day ago
          if (Date.now() - lastDismiss > 24 * 60 * 60 * 1000) {
            setShowInstallBanner(true);
          }
        }, 2000);
      }
      console.log('[PWA] Install prompt available');
    };

    // Handle app installed
    const handleInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      // Optional analytics
      try {
        fetch('/api/history?event=pwa_install', { method: 'POST' } as any).catch(() => {});
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback: try to show manual instructions
      setShowInstallBanner(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', choice.outcome);
      
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.log('[PWA] Install prompt error:', err);
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Expose install function globally for page.tsx to use
  useEffect(() => {
    (window as any).snapdownInstall = handleInstallClick;
    (window as any).snapdownDeferredPrompt = deferredPrompt;
    (window as any).snapdownIsInstalled = isInstalled;
  }, [deferredPrompt, isInstalled]);

  if (!showInstallBanner || isInstalled || isStandalone) return null;

  return (
    <div className="fixed bottom-[84px] md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-[420px] animate-[slideUp_0.4s_ease]">
      <div className="rounded-[20px] bg-[#1a1a1e] border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-[1px]">
        <div className="rounded-[19px] bg-gradient-to-b from-white/[0.06] to-transparent p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-[12px] bg-white flex items-center justify-center flex-shrink-0">
            <img src="/icons/icon-192.png" alt="SnapDown" className="w-8 h-8 rounded-[8px]" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-[Space_Grotesk] font-bold text-[13px] text-white leading-tight">Install SnapDown App</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-[1.3]">Add to home screen • Share videos directly to app • Works offline</p>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button onClick={handleDismissBanner} className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition text-[12px]">
              ✕
            </button>
            <button onClick={handleInstallClick} className="h-8 px-3.5 rounded-full bg-white text-black font-bold text-[12px] hover:bg-zinc-100 transition">
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper hook for page.tsx
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const check = () => {
      setCanInstall(!!(window as any).snapdownDeferredPrompt);
      setIsInstalled(!!(window as any).snapdownIsInstalled || window.matchMedia('(display-mode: standalone)').matches);
    };
    
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const install = () => {
    if ((window as any).snapdownInstall) {
      (window as any).snapdownInstall();
    }
  };

  return { canInstall, isInstalled, install };
}
