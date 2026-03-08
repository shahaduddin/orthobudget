import React, { useEffect, useState } from 'react';
import { ICONS, APP_NAME } from '../constants';

interface Props {
  onGetStarted: () => void;
  onLogin?: () => void;
  onSignUp?: () => void;
}

const LandingPage: React.FC<Props> = ({ onGetStarted, onLogin, onSignUp }) => {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (window.deferredPrompt) {
      setCanInstall(true);
    }
    const handler = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) return;
    window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      window.deferredPrompt = null;
    }
  };

  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans overflow-x-hidden overflow-y-auto no-scrollbar scroll-smooth">
        {/* Navigation */}
        <header className="sticky top-0 z-[60] w-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe transition-all">
          <nav className="flex justify-between items-center h-[60px] px-5 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-3">
                  <img 
                    src="/ortho-app-icon-192.png" 
                    alt={APP_NAME} 
                    className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/20" 
                  />
                  <span className="font-bold text-xl tracking-tight">{APP_NAME}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                  <button onClick={onLogin || onGetStarted} className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                      Log In
                  </button>
                  <button onClick={onSignUp || onGetStarted} className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold shadow-lg shadow-zinc-500/20 transition-transform active:scale-95">
                      Sign Up
                  </button>
              </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="px-6 py-12 md:py-24 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8 animate-fade-in text-center md:text-left">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 pb-2">
                    Master your money,<br/>simply.
                </h1>
                <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed font-medium mx-auto md:mx-0">
                    Ortho is an intelligent, offline-first budget tracker designed to give you clarity without the clutter.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <button 
                        onClick={onGetStarted}
                        className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-500/20 transition-all transform hover:scale-105 active:scale-95"
                    >
                        Get Started
                    </button>
                    {canInstall && (
                        <button 
                            onClick={handleInstall}
                            className="px-8 py-4 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-2xl font-bold text-lg transition-all"
                        >
                            Install App
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 w-full max-w-md md:max-w-full relative flex justify-center items-center">
                 <div className="absolute inset-0 bg-brand-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                 <img 
                    src="/ortho-app-icon-512.png" 
                    alt={`${APP_NAME} Branding`} 
                    className="relative w-64 h-64 md:w-80 md:h-80 object-contain rounded-[3.5rem] shadow-2xl drop-shadow-2xl hover:scale-105 transition-transform duration-500 animate-bounce-small" 
                 />
            </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-24 bg-zinc-50 dark:bg-zinc-900/50 mt-12">
             <div className="max-w-7xl mx-auto">
                 <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black mb-4 text-zinc-900 dark:text-white">Why Ortho?</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Built for speed, privacy, and simplicity. Everything you need to manage your finances, nothing you don't.</p>
                 </div>
                 
                 <div className="grid md:grid-cols-3 gap-8">
                     <FeatureCard 
                        icon={<ICONS.Sparkles className="w-6 h-6 text-amber-500" />}
                        title="Smart Insights"
                        desc="Intelligent analysis of your spending habits to help you save more effectively without complex charts."
                     />
                     <FeatureCard 
                        icon={<ICONS.Lock className="w-6 h-6 text-brand-500" />}
                        title="Privacy First"
                        desc="Your data belongs to you. We support offline mode and local storage with optional cloud backup."
                     />
                     <FeatureCard 
                        icon={<ICONS.Chart className="w-6 h-6 text-blue-500" />}
                        title="Detailed Reports"
                        desc="Visual breakdowns of your income, expenses, and net worth over time. Export data anytime."
                     />
                 </div>
             </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-12 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
                <div className="flex gap-6">
                    <a href="/docs" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Documentation</a>
                    <a href="/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</a>
                    <a href="/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms of Service</a>
                </div>
            </div>
        </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="bg-white dark:bg-zinc-950 p-8 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">{title}</h3>
        <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
            {desc}
        </p>
    </div>
);

export default LandingPage;