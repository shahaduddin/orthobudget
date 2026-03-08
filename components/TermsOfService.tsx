import React from 'react';
import { APP_NAME, ICONS } from '../constants';
import { User } from '../types';

interface Props {
  user?: User | null;
  onBack?: () => void;
}

const TermsOfService: React.FC<Props> = ({ user, onBack }) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans overflow-y-auto overscroll-contain flex flex-col no-scrollbar animate-fade-in relative z-50">
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
                        onClick={handleBack}
                        className="flex items-center gap-2.5 pl-1 pr-4 py-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 active:scale-95 transition-all group decoration-none"
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

      <div className="max-w-3xl mx-auto p-6 md:p-12 flex-1 w-full">
        {/* Relocated Back Link */}
        <button 
          onClick={handleBack} 
          className="flex items-center gap-2 mb-8 text-zinc-400 hover:text-brand-600 dark:text-zinc-500 dark:hover:text-brand-400 transition-colors group decoration-none"
        >
            <ICONS.ArrowLeft className="w-4 h-4 group-active:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold">Back to App</span>
        </button>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800 mb-safe">
          <h1 className="text-3xl font-black mb-2">{APP_NAME} Terms of Service</h1>
          <p className="mb-8 text-zinc-500 dark:text-zinc-400 text-sm font-medium">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-8 leading-relaxed text-zinc-700 dark:text-zinc-300">
            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">1. Agreement to Terms</h2>
              <p>By accessing or using {APP_NAME}, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">2. Use of License</h2>
              <p>Permission is granted to temporarily download one copy of the materials (information or software) on {APP_NAME} for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">3. User Accounts</h2>
              <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
              <p className="mt-2">You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">4. Intellectual Property</h2>
              <p>The Service and its original content, features, and functionality are and will remain the exclusive property of {APP_NAME} and its licensors.</p>
            </section>
            
             <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">5. Termination</h2>
              <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">6. Limitation of Liability</h2>
              <p>In no event shall {APP_NAME}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">7. Changes</h2>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;