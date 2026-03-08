import React from 'react';
import { APP_NAME, ICONS } from '../constants';
import { User } from '../types';

interface Props {
  user?: User | null;
  onBack?: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ user, onBack }) => {
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
          <h1 className="text-3xl font-black mb-2">{APP_NAME} Privacy Policy</h1>
          <p className="mb-8 text-zinc-500 dark:text-zinc-400 text-sm font-medium">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-8 leading-relaxed text-zinc-700 dark:text-zinc-300">
            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">1. Introduction</h2>
              <p>Welcome to {APP_NAME}. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">2. Data We Collect</h2>
              <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier provided via Google or GitHub login.</li>
                <li><strong>Contact Data:</strong> includes email address.</li>
                <li><strong>Financial Data:</strong> includes transaction history, budget details, asset information, and work logs you manually enter into the application.</li>
                <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, and operating system used to access this application.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">3. How We Use Your Data</h2>
              <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>To register you as a new user and manage your account.</li>
                <li>To provide the core functionality of budget management, expense tracking, and financial reporting.</li>
                <li>To manage our relationship with you, including notifying you about changes to our terms or privacy policy.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">4. Data Security</h2>
              <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way. We use Supabase for secure authentication and data storage.</p>
            </section>
            
             <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li><strong>Supabase:</strong> For authentication and database hosting.</li>
                  <li><strong>Google Drive API:</strong> (Optional) Used only if you explicitly enable cloud backups. We access your Google Drive specifically to create and manage the application backup file. We do not read other files in your Drive.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">6. Contact Us</h2>
              <p>If you have any questions about this privacy policy or our privacy practices, please contact us at support@ortho.app.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;