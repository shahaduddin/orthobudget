import React from 'react';
import { ICONS, APP_NAME } from '../constants';
import { User } from '../types';

interface Props {
  onBack: () => void;
  onAuth?: () => void;
  user?: User | null;
}

const Documentation: React.FC<Props> = ({ onBack, onAuth, user }) => {
  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans overflow-y-auto no-scrollbar overscroll-contain animate-fade-in relative z-50 flex flex-col">
        {/* Synchronized Navigation */}
        <header className="sticky top-0 z-[60] w-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe transition-all">
          <nav className="flex justify-between items-center h-[60px] px-5 max-w-7xl mx-auto w-full">
              <div className="flex items-center gap-3">
                  <img src="/ortho-app-icon-192.png" alt={APP_NAME} className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/10" />
                  <span className="font-bold text-xl tracking-tight">{APP_NAME}</span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4">
                  {user ? (
                      <button 
                        onClick={onBack}
                        className="flex items-center gap-2.5 pl-1 pr-4 py-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 active:scale-95 transition-all group"
                      >
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center text-sm font-bold shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600">
                              {user.avatar ? user.avatar : user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">Profile</span>
                      </button>
                  ) : (
                      <>
                          <button onClick={() => window.location.href = '/?action=login'} className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-white transition-colors">
                              Log In
                          </button>
                          <button onClick={() => window.location.href = '/?action=signup'} className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold shadow-lg shadow-zinc-500/20 transition-transform active:scale-95">
                              Sign Up
                          </button>
                      </>
                  )}
              </div>
          </nav>
        </header>

        <div className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
            {/* Relocated Back Link */}
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 mb-8 text-zinc-400 hover:text-brand-600 dark:text-zinc-500 dark:hover:text-brand-400 transition-colors group"
            >
                <ICONS.ArrowLeft className="w-4 h-4 group-active:-translate-x-1 transition-transform" />
                <span className="text-sm font-bold">Back to App</span>
            </button>

            {/* Header Content */}
            <div className="mb-12">
                <h1 className="text-4xl font-black tracking-tight mb-2">Platform Guide</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium italic">Everything you need to master your personal economy.</p>
            </div>

            {/* Content Sections */}
            <div className="grid gap-8">
                {/* Introduction */}
                <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
                        <ICONS.Sparkles className="w-5 h-5 text-brand-500" />
                        <span>Philosophy</span>
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                        {APP_NAME} is built on the principle of "Offline First, Privacy Always". 
                        Unlike traditional finance apps, your data lives on your device. 
                        We combine manual tracking with smart automation to give you clarity without the clutter.
                    </p>
                </section>

                {/* Core Features */}
                <section>
                    <h2 className="text-xl font-bold mb-6 ml-2 text-zinc-900 dark:text-white">Core Features</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FeatureCard 
                            icon={<ICONS.List className="w-5 h-5" />}
                            title="Transactions"
                            desc="Log income and expenses effortlessly. Use categories to organize your spending and view daily breakdowns on the Home screen."
                        />
                        <FeatureCard 
                            icon={<ICONS.Repeat className="w-5 h-5" />}
                            title="Recurring Flows"
                            desc="Set up automated subscriptions or salary inputs. The app generates these entries automatically when they are due."
                        />
                        <FeatureCard 
                            icon={<ICONS.Briefcase className="w-5 h-5" />}
                            title="Work Tracker"
                            desc="Freelancer or hourly worker? Track your shifts, calculate earnings based on rates, and sync them directly to your budget."
                        />
                        <FeatureCard 
                            icon={<ICONS.TrendingUp className="w-5 h-5" />}
                            title="Assets & Portfolio"
                            desc="Track the value of your stocks, crypto, or other assets manually. View your net worth growth over time."
                        />
                    </div>
                </section>

                {/* Advanced */}
                <section className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">Advanced Usage</h2>
                    
                    <div className="space-y-8">
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                <ICONS.Sync className="w-5 h-5 text-zinc-400" /> Cloud Sync & Backup
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                While Ortho is offline-first, you can connect your Google Drive in the Profile page. 
                                This creates a secure backup of your database (`ortho_backup.json`) in your private Drive storage. 
                                Enabling "Smart Backup" will automatically sync changes when you are online.
                            </p>
                        </div>
                        
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                        <div>
                            <h3 className="font-bold text-lg mb-2 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                <ICONS.Clock className="w-5 h-5 text-zinc-400" /> Auto-Log Hours
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                In the Work tab, you can define jobs with specific schedules (e.g., Mon-Fri, 9-5). 
                                If "Auto-Log" is enabled, the app will automatically create work entries for you each day. 
                                You can delete a specific auto-log to mark it as an "Off Day" for that date.
                            </p>
                        </div>

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                        <div>
                            <h3 className="font-bold text-lg mb-2 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                                <ICONS.Archive className="w-5 h-5 text-zinc-400" /> Archiving Jobs
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                Completed a contract? Archive the job to keep your active list clean while preserving all history and earnings data.
                                You can restore archived jobs from the sidebar menu (tap your profile picture).
                            </p>
                        </div>
                    </div>
                </section>
            </div>
            
            <div className="mt-12 text-center text-zinc-400 dark:text-zinc-600 text-xs font-bold uppercase tracking-widest pb-12">
                <p>Designed for absolute simplicity.</p>
            </div>
        </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: any) => (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
        <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-4 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-700/50">
            {icon}
        </div>
        <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{desc}</p>
    </div>
);

export default Documentation;