
import React, { useEffect, useState } from 'react';
import { ICONS, APP_NAME } from '../constants';

const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const PlusSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mq.matches);
    
    if (mq.matches) return;

    // Check if previously dismissed
    const isDismissed = localStorage.getItem('installPromptDismissed');
    if (isDismissed) return;

    // Check if IOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice) {
        setIsIOS(true);
        // IOS doesn't support beforeinstallprompt, show after a delay
        setTimeout(() => setShowPrompt(true), 3000);
    }

    // Check if the event was already captured globally in index.html
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setTimeout(() => setShowPrompt(true), 1000);
    }

    // Also listen for future events (if not already fired)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e; // Update global
      setTimeout(() => setShowPrompt(true), 1000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      window.deferredPrompt = null;
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
      setShowPrompt(false);
      localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-scale-in border border-zinc-100 dark:border-zinc-800 text-center relative overflow-hidden"
        role="dialog"
        aria-labelledby="install-title"
        aria-modal="true"
      >
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-900/20 pointer-events-none" />

        <div className="relative z-10">
            <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-2xl mx-auto shadow-xl shadow-brand-500/10 flex items-center justify-center mb-6 border border-zinc-50 dark:border-zinc-700">
               <img src="/ortho-app-icon-192.png" alt={APP_NAME} className="w-16 h-16 rounded-xl" />
            </div>

            <h3 id="install-title" className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                Install {APP_NAME}
            </h3>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
                {isIOS 
                    ? "Install this application on your home screen for quick access and offline experience." 
                    : "Install our app for the best experience with offline access and full-screen view."}
            </p>

            {isIOS && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span>Tap</span>
                        <ShareIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" /> 
                        <span><strong>Share</strong></span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span>then</span>
                        <PlusSquareIcon className="w-5 h-5 text-zinc-900 dark:text-white" /> 
                        <span><strong>Add to Home Screen</strong></span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                {!isIOS && (
                    <button 
                        onClick={handleInstallClick} 
                        className="w-full py-4 rounded-xl text-sm font-bold bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition-all active:scale-[0.98]"
                    >
                        Install Application
                    </button>
                )}
                <button 
                    onClick={handleDismiss} 
                    className="w-full py-4 rounded-xl text-sm font-bold text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                    Not Now
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
