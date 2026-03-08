import React, { useState, useEffect, useRef } from 'react';
import { User, Transaction, TransactionType, RecurrenceFrequency, RecurringTransaction, UserRole, UserTier } from './types';
import { dbService, syncWithServer } from './services/db';
import { supabase } from './services/supabase';
import { driveService } from './services/driveService';
import { processRecurringTransactions, processAutoWorkLogs } from './services/scheduler';
import { ICONS, APP_NAME } from './constants';

import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import BalanceCard from './components/BalanceCard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Reports from './components/Reports';
import RecurringList from './components/RecurringList';
import Profile from './components/Profile';
import Investments from './components/Investments';
import WorkTracker from './components/WorkTracker';
import InstallPrompt from './components/InstallPrompt';
import ConfirmDialog from './components/ConfirmDialog';
import Toast from './components/Toast';
import ResetPasswordModal from './components/ResetPasswordModal';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import Sidebar from './components/Sidebar';
import Documentation from './components/Documentation';
import HomeChart from './components/HomeChart';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'HOME' | 'REPORTS' | 'PROFILE' | 'ASSETS' | 'WORK' | 'DOCS' | 'PRIVACY' | 'TERMS'>('HOME');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoading, setIsLoading] = useState(true);
  
  // Landing Page State: Default true for browser, will be set to false if standalone
  const [showLanding, setShowLanding] = useState(true);
  // Track whether to show Login or Signup when entering Auth flow
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // UI State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', show: boolean}>({
      message: '', type: 'success', show: false
  });
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [showResetPassword, setShowResetPassword] = useState(false);

  // Smart Backup Ref to debounce
  const backupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Theme logic
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', systemDark);
    }

    // Check if Standalone (Installed) Mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
        setShowLanding(false);
    }

    // Handle URL Routing (Back/Forward)
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    // Check for OAuth errors or Actions in URL
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    
    // Check for action param (login/signup) from external pages like Privacy/Terms
    const action = params.get('action');
    
    if (error) {
        showToast(errorDesc || 'Authentication failed', 'error');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (action === 'login' || action === 'signup') {
        // Handle external link actions
        setShowLanding(false);
        setAuthInitialMode(action.toUpperCase() as 'LOGIN' | 'SIGNUP');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Initialize Auth Listener
    const isAuthCallback = params.has('code') || window.location.hash.includes('access_token');
    
    if (!isAuthCallback) {
        checkSession();
    }
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setShowResetPassword(true);
            setShowLanding(false); // Ensure we show modal over auth/app
        }

        if (session) {
            await handleSupabaseUser(session.user);
            if (isAuthCallback) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
             if (!isAuthCallback || event === 'SIGNED_OUT') {
                 setUser(null);
                 setIsLoading(false);
                 // If standalone, keep showing auth (showLanding=false). 
                 // If browser, we might want to revert to landing page on explicit logout? 
                 // Current logic preserves showLanding state. On Logout, we might want to go to landing?
                 if (event === 'SIGNED_OUT' && !isStandalone) {
                     setShowLanding(true);
                 }
             }
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
        window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Smart Backup Logic
  useEffect(() => {
      if (user && transactions.length > 0 && driveService.isConnected()) {
          if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current);
          
          backupTimeoutRef.current = setTimeout(async () => {
              try {
                  const json = await dbService.exportDatabase();
                  await driveService.uploadBackup(json);
                  console.log("Smart Backup: Synced to Drive");
              } catch (e) {
                  console.error("Smart Backup Failed", e);
              }
          }, 10000); // 10 second debounce
      }
  }, [transactions, user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type, show: true });
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
      setConfirmState({
          isOpen: true, 
          title, 
          message, 
          onConfirm: () => {
              onConfirm();
              setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const checkSession = async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              await handleSupabaseUser(session.user);
          } else {
              setIsLoading(false);
          }
      } catch (e) {
          console.error("Session check failed", e);
          setIsLoading(false);
      }
  };

  const handleSupabaseUser = async (authUser: any) => {
      const email = authUser.email!.toLowerCase();
      // Check if user exists in local IndexedDB
      let localUser = await dbService.getUser(email);
      
      // If not, create a local copy
      if (!localUser) {
          const newUser: User = {
              id: authUser.id,
              username: authUser.user_metadata?.full_name || email.split('@')[0],
              email: email,
              createdAt: Date.now(),
              role: UserRole.USER,
              tier: UserTier.FREE,
              currency: 'USD',
              avatar: undefined
          };
          await dbService.saveUser(newUser);
          localUser = newUser;
      }

      setUser(localUser);
      await loadData(localUser.email);
      
      // Auto-Restore Check for new logins/devices
      if (driveService.isConnected()) {
          const hasBackup = await driveService.checkForBackup();
          if (hasBackup) {
             const txCount = (await dbService.getTransactionsByUser(localUser.email)).length;
             if (txCount === 0) {
                 requestConfirm(
                     "Backup Found", 
                     "We found a backup on your Google Drive. Would you like to restore your data now?", 
                     async () => {
                         setIsLoading(true);
                         const content = await driveService.downloadBackup();
                         if(content && await dbService.importDatabase(content)) {
                             window.location.reload();
                         } else {
                             showToast("Restore failed", 'error');
                             setIsLoading(false);
                         }
                     }
                 );
             }
          }
      }

      // Run background processes
      Promise.all([
        processRecurringTransactions(localUser.email),
        processAutoWorkLogs(localUser.email)
      ]).then((results) => {
         if(results.some(r => r === true)) loadData(localUser!.email);
      });
      
      setIsLoading(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const loadData = async (userId: string) => {
    const txs = await dbService.getTransactionsByUser(userId);
    setTransactions(txs.sort((a, b) => b.date - a.date)); 
  };

  const handleLogin = (loggedInUser: User) => {
     // Handled by Supabase listener
  };

  const handleLogout = () => {
    setConfirmState({
      isOpen: true,
      title: 'Sign Out',
      message: 'Your data will remain safely on this device. You can access it again by logging in with the same account.',
      onConfirm: async () => {
        // Only clear authentication session, preserve local storage settings (theme) and IndexedDB
        await supabase.auth.signOut();
        setTransactions([]);
        setView('HOME');
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (!isStandalone) {
             setShowLanding(true);
        }
      }
    });
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await dbService.saveUser(updatedUser);
    setUser(updatedUser);
  };

  const saveTransaction = async (amount: number, date: number, type: TransactionType, category: string, description: string, frequency: RecurrenceFrequency) => {
    if (!user) return;
    
    if (frequency !== RecurrenceFrequency.NEVER && !editingTransaction) {
       // New Recurring Rule
       const recurringTx: RecurringTransaction = {
         id: crypto.randomUUID(),
         userId: user.email,
         amount,
         type,
         category,
         description,
         frequency,
         nextDueDate: date 
       };
       await dbService.addRecurringTransaction(recurringTx);
       await processRecurringTransactions(user.email);
    } else {
      // One-time Transaction
      const newTx: Transaction = {
        id: editingTransaction ? editingTransaction.id : crypto.randomUUID(),
        userId: user.email, 
        amount,
        type,
        category,
        description,
        date: date
      };
      await dbService.addTransaction(newTx);
    }
    
    await loadData(user.email);
    setShowAddModal(false);
    setEditingTransaction(null);
    showToast("Transaction saved");
  };

  const handleDelete = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Flow',
      message: 'This transaction will be permanently removed from your history.',
      onConfirm: async () => {
        await dbService.deleteTransaction(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
        setConfirmState(p => ({ ...p, isOpen: false }));
        showToast("Transaction deleted");
      }
    });
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTransaction(null);
  };

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Public Route Handling (Privacy Policy & Terms)
  if (currentPath === '/privacy') {
    return (
        <>
            <PrivacyPolicy 
                user={user} 
                onBack={() => window.location.href = '/'}
            />
            <script>
                {/* Ensure theme persists even on static pages */}
                {theme === 'dark' ? "document.documentElement.classList.add('dark')" : "document.documentElement.classList.remove('dark')"}
            </script>
        </>
    );
  }
  
  if (currentPath === '/terms') {
    return (
        <>
            <TermsOfService 
                user={user} 
                onBack={() => window.location.href = '/'}
            />
            <script>
                {theme === 'dark' ? "document.documentElement.classList.add('dark')" : "document.documentElement.classList.remove('dark')"}
            </script>
        </>
    );
  }

  if (currentPath === '/docs') {
    return (
        <>
            <Documentation 
                onBack={() => window.location.href = '/'} 
                onAuth={() => window.location.href = '/'} 
                user={user} 
            />
            <script>
                {theme === 'dark' ? "document.documentElement.classList.add('dark')" : "document.documentElement.classList.remove('dark')"}
            </script>
        </>
    );
  }

    if (isLoading) {
      return (
          <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-black">
              <img 
                  src="/ortho-app-icon.png" 
                  alt="Loading" 
                  className="w-20 h-20 rounded-full animate-spin-reverse shadow-2xl shadow-brand-500/20"
              />
          </div>
      );
  }

  if (!user) {
    if (showLanding) {
        return <LandingPage 
            onGetStarted={() => { setAuthInitialMode('SIGNUP'); setShowLanding(false); }} 
            onLogin={() => { setAuthInitialMode('LOGIN'); setShowLanding(false); }}
            onSignUp={() => { setAuthInitialMode('SIGNUP'); setShowLanding(false); }}
        />;
    }

    return (
        <div className="h-full w-full overflow-hidden relative">
            <Auth 
                onLogin={handleLogin} 
                onBack={
                    !((window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches) 
                    ? () => setShowLanding(true) 
                    : undefined
                }
                initialMode={authInitialMode}
            />
            <InstallPrompt />
            <Toast 
                message={toast.message} 
                type={toast.type} 
                isVisible={toast.show} 
                onClose={() => setToast(p => ({...p, show: false}))} 
            />
            {showResetPassword && (
                <ResetPasswordModal 
                    onSuccess={() => {
                        setShowResetPassword(false);
                        showToast("Password updated successfully");
                    }} 
                    onCancel={() => setShowResetPassword(false)} 
                />
            )}
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans overflow-hidden">
      <InstallPrompt />
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.show} 
        onClose={() => setToast(p => ({...p, show: false}))} 
      />
      
      {showResetPassword && (
        <ResetPasswordModal 
            onSuccess={() => {
                setShowResetPassword(false);
                showToast("Password updated successfully");
            }} 
            onCancel={() => setShowResetPassword(false)} 
        />
      )}

      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(p => ({ ...p, isOpen: false }))}
      />
      
      <Sidebar 
         isOpen={showSidebar} 
         onClose={() => setShowSidebar(false)} 
         user={user} 
         onUpdateUser={handleUpdateUser}
         currency={user.currency || 'USD'}
      />

      {/* Header - Fixed Shell with Blur - Hidden in DOCS/PRIVACY/TERMS mode for cleaner view */}
      {!['DOCS', 'PRIVACY', 'TERMS'].includes(view) && (
        <header className="absolute top-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 pt-safe transition-all">
            <div className="px-5 py-3 flex justify-between items-center h-[60px]">
            <div className="flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity" onClick={() => setShowSidebar(true)}>
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-zinc-800 text-brand-600 dark:text-brand-400 flex items-center justify-center text-sm font-bold overflow-hidden shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
                {user.avatar ? user.avatar : user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight leading-none">{APP_NAME}</h1>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-tight mt-0.5">Hello, {user.username.split(' ')[0]}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => { vibrate(); setShowRecurringModal(true); }} 
                    className="p-2.5 text-zinc-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition bg-zinc-100 dark:bg-zinc-900 rounded-full active:scale-95 transform"
                >
                <ICONS.Repeat className="w-5 h-5" />
                </button>
            </div>
            </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${!['DOCS', 'PRIVACY', 'TERMS'].includes(view) ? 'pt-[calc(60px+env(safe-area-inset-top))] pb-[calc(80px+env(safe-area-inset-bottom))]' : ''} overscroll-y-contain no-scrollbar relative`}>
        {view === 'HOME' && (
          <div className="pt-4 px-4 space-y-6 animate-fade-in">
            <BalanceCard transactions={transactions} currency={user.currency || 'USD'} />
            <HomeChart transactions={transactions} currency={user.currency || 'USD'} />
            <TransactionList 
                transactions={transactions} 
                onDelete={handleDelete} 
                onEdit={handleEdit}
                currency={user.currency || 'USD'}
            />
          </div>
        )}

        {view === 'ASSETS' && <Investments userId={user.email} currency={user.currency || 'USD'} />}
        {view === 'WORK' && <WorkTracker userId={user.email} currency={user.currency || 'USD'} onSync={() => loadData(user.email)} />}
        {view === 'REPORTS' && <Reports transactions={transactions} currency={user.currency || 'USD'} />}
        {view === 'PROFILE' && (
            <Profile 
                user={user} 
                onLogout={handleLogout} 
                theme={theme} 
                toggleTheme={toggleTheme} 
                onUpdateUser={handleUpdateUser}
                onToast={showToast}
                requestConfirm={requestConfirm}
                onNavigate={setView}
            />
        )}
        {view === 'DOCS' && <Documentation onBack={() => setView('PROFILE')} user={user} />}
        {view === 'PRIVACY' && <PrivacyPolicy user={user} onBack={() => setView('PROFILE')} />}
        {view === 'TERMS' && <TermsOfService user={user} onBack={() => setView('PROFILE')} />}
      </main>

      {/* Floating Action Button (FAB) */}
      {view === 'HOME' && (
        <button
          onClick={() => { vibrate(); setShowAddModal(true); }}
          className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/40 flex items-center justify-center transform transition-all active:scale-90 z-20 hover:bg-brand-500 group"
        >
          <ICONS.Plus className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
        </button>
      )}

      {/* Bottom Navigation - Hidden on DOCS/PRIVACY/TERMS page */}
      {!['DOCS', 'PRIVACY', 'TERMS'].includes(view) && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 pb-safe z-30">
            <div className="flex justify-around items-center h-[60px] px-2">
            <NavBtn view={view} target="HOME" icon={ICONS.Home} setView={setView} label="Home" vibrate={vibrate} />
            <NavBtn view={view} target="WORK" icon={ICONS.Briefcase} setView={setView} label="Work" vibrate={vibrate} />
            <NavBtn view={view} target="ASSETS" icon={ICONS.TrendingUp} setView={setView} label="Assets" vibrate={vibrate} />
            <NavBtn view={view} target="REPORTS" icon={ICONS.Chart} setView={setView} label="Reports" vibrate={vibrate} />
            <NavBtn view={view} target="PROFILE" icon={ICONS.User} setView={setView} label="Profile" vibrate={vibrate} />
            </div>
        </nav>
      )}

      {/* Modals */}
      {showAddModal && (
        <TransactionForm 
            onSave={saveTransaction} 
            onCancel={handleCloseModal} 
            currency={user.currency || 'USD'} 
            initialData={editingTransaction ? { ...editingTransaction, frequency: RecurrenceFrequency.NEVER } : undefined} 
        />
      )}
      
      {showRecurringModal && (
        <RecurringList userId={user.email} onClose={() => setShowRecurringModal(false)} currency={user.currency || 'USD'} />
      )}
    </div>
  );
}

// Sub-component for Cleaner Nav
const NavBtn = ({ view, target, icon: Icon, setView, label, vibrate }: any) => {
    const isActive = view === target;
    return (
        <button 
            onClick={() => { vibrate(); setView(target); }} 
            className="flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform"
        >
            <div className={`p-1 rounded-xl transition-colors duration-300 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-2 fill-brand-100/20 dark:fill-brand-900/20' : 'stroke-[1.5]'}`} />
            </div>
            <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                {label}
            </span>
        </button>
    );
};
