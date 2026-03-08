import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { dbService } from '../services/db';
import { driveService } from '../services/driveService';
import { notificationService } from '../services/notifications';
import { supabase } from '../services/supabase';
import { ICONS, CURRENCIES, COUNTRIES, AVATARS } from '../constants';

interface Props {
  user: User;
  onLogout: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onUpdateUser: (user: User) => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
  requestConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onNavigate: (view: any) => void;
}

const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const BookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);

const Profile: React.FC<Props> = ({ user, onLogout, theme, toggleTheme, onUpdateUser, onToast, requestConfirm, onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    country: user.country || COUNTRIES[0],
    birthDate: user.birthDate || '',
    currency: user.currency || 'USD',
    avatar: user.avatar || AVATARS[0]
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(driveService.isConnected());
  const [notificationStatus, setNotificationStatus] = useState(notificationService.getPermission());
  
  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsDriveConnected(driveService.isConnected());
  }, []);

  const handleSave = () => {
    onUpdateUser({
      ...user,
      ...formData
    });
    setIsEditing(false);
    onToast("Profile updated");
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
        onToast("New passwords do not match.", 'error');
        return;
    }

    setPasswordLoading(true);

    try {
        // 1. Verify current password by attempting a sign-in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
            onToast("Incorrect current password.", 'error');
            setPasswordLoading(false);
            return;
        }
        
        // 2. Update to new password
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        
        if (updateError) {
            onToast("Failed: " + updateError.message, 'error');
        } else {
            onToast("Password updated successfully.");
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    } catch (error) {
        console.error(error);
        onToast("An unexpected error occurred.", 'error');
    } finally {
        setPasswordLoading(false);
    }
  };

  const toggleNotifications = async () => {
      if (notificationStatus === 'granted') {
          onToast("Please reset permissions in browser settings.", 'error');
      } else {
          const result = await notificationService.requestPermission();
          setNotificationStatus(result);
          if (result === 'granted') onToast("Notifications enabled");
      }
  };

  const handleBackup = async () => {
    try {
        const json = await dbService.exportDatabase();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ortho_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onToast("Backup file downloaded");
    } catch (e) { console.error(e); onToast("Export failed", 'error'); }
  };
  
  const handleDriveConnect = async () => {
    setIsDriveLoading(true);
    try { 
        const success = await driveService.connect(); 
        setIsDriveConnected(success); 
        if(success) onToast("Connected to Google Drive");
        else onToast("Connection cancelled or failed", 'error');
    } 
    catch (e) { onToast("Connection failed", 'error'); } 
    finally { setIsDriveLoading(false); }
  };

  const handleDriveBackup = async () => {
    if (!isDriveConnected) return handleDriveConnect();
    setIsDriveLoading(true);
    try {
        const json = await dbService.exportDatabase();
        await driveService.uploadBackup(json);
        onToast("Cloud backup successful");
    } catch (e) { 
        onToast("Cloud sync failed", 'error'); 
        setIsDriveConnected(driveService.isConnected()); 
    } 
    finally { setIsDriveLoading(false); }
  };
  
  const handleDriveRestore = async () => {
      if (!isDriveConnected) return handleDriveConnect();
      
      requestConfirm(
        "Restore from Cloud?", 
        "This will overwrite your current data with the backup from Google Drive.", 
        async () => {
            setIsDriveLoading(true);
            try {
                const content = await driveService.downloadBackup();
                if(content && await dbService.importDatabase(content)) {
                    onToast("Restore successful");
                    window.location.reload();
                } else {
                    onToast("No backup found or restore failed", 'error');
                }
            } catch(e) { onToast("Restore error", 'error'); }
            finally { setIsDriveLoading(false); }
        }
      );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      requestConfirm(
        "Import Backup?",
        "This will overwrite your current data with the selected file.",
        () => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (event.target?.result && await dbService.importDatabase(event.target.result as string)) {
                    window.location.reload();
                } else {
                    onToast("Import failed: Invalid file", 'error');
                }
            };
            reader.readAsText(file);
        }
      );
  };

  const handleDeleteAccount = async () => {
    requestConfirm(
        "Delete Account Permanently?",
        "This action is absolute. Your user profile, transactions, work logs, and assets will be PERMANENTLY deleted from this device and your session will be closed on our servers.",
        async () => {
            try {
                // 1. Wipe all local IndexedDB stores
                await dbService.clearAllData();
                
                // 2. Clear all localStorage keys (theme, drive tokens, sync status)
                localStorage.clear();
                
                // 3. Sign out from Supabase (removes session from site)
                await supabase.auth.signOut();
                
                // 4. Force a hard reload to reset the app environment and redirect to landing
                window.location.href = '/';
            } catch (e) {
                console.error("Deletion failed", e);
                onToast("An error occurred during account deletion.", 'error');
            }
        }
    );
  };

  return (
    <div className="pb-12 pt-6 px-4 animate-fade-in no-scrollbar overflow-y-auto">
      <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-6 ml-2">Settings</h2>

      {/* User Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 text-6xl flex items-center justify-center shadow-lg mb-4 ring-4 ring-white dark:ring-black">
                {user.avatar ? user.avatar : user.username.charAt(0).toUpperCase()}
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="absolute bottom-4 right-0 bg-brand-600 text-white p-2.5 rounded-full shadow-md hover:scale-110 transition-transform">
                <ICONS.Edit className="w-4 h-4" />
            </button>
        </div>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{user.username}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{user.email}</p>
      </div>

      {isEditing && (
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 mb-8 animate-slide-up shadow-sm border border-zinc-100 dark:border-zinc-800">
             <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-4">
                  {AVATARS.map(av => (
                    <button 
                      key={av} 
                      onClick={() => setFormData({...formData, avatar: av})}
                      className={`text-3xl p-3 rounded-full transition-all ${formData.avatar === av ? 'bg-brand-100 dark:bg-brand-900/50 scale-110 ring-2 ring-brand-500' : 'opacity-50 hover:opacity-100'}`}
                    >
                      {av}
                    </button>
                  ))}
             </div>
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                    <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none text-zinc-900 dark:text-white font-medium" placeholder="Full Name" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Currency</label>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none appearance-none text-zinc-900 dark:text-white font-medium">
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.symbol}</option>)}
                    </select>
                 </div>
                 <button onClick={handleSave} className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all">Save Changes</button>
             </div>
        </div>
      )}

      {/* Inset Grouped Lists */}
      <div className="space-y-6">
        
        {/* Appearance */}
        <section>
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest ml-4 mb-2">Preferences</h4>
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div onClick={toggleTheme} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform"><ICONS.Moon className="w-5 h-5" /></div>
                        <span className="font-bold text-zinc-900 dark:text-white">Dark Mode</span>
                    </div>
                    <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${theme === 'dark' ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                </div>
                <div onClick={toggleNotifications} className="flex justify-between items-center p-5 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500 group-hover:scale-110 transition-transform"><BellIcon className="w-5 h-5" /></div>
                        <span className="font-bold text-zinc-900 dark:text-white">Notifications</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-400 dark:text-zinc-500">{notificationStatus === 'granted' ? 'On' : 'Off'}</span>
                </div>
            </div>
        </section>

        {/* Data Management */}
        <section>
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest ml-4 mb-2">Data & Cloud</h4>
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                
                {!isDriveConnected ? (
                     <div onClick={handleDriveConnect} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><ICONS.Google className="w-5 h-5" /></div>
                            <span className="font-bold text-zinc-900 dark:text-white">Connect Drive</span>
                        </div>
                        <ICONS.List className="w-5 h-5 text-zinc-300 -rotate-90" />
                    </div>
                ) : (
                    <>
                        <div onClick={handleDriveBackup} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform"><ICONS.Download className="w-5 h-5 rotate-180" /></div>
                                <span className="font-bold text-zinc-900 dark:text-white">Cloud Backup</span>
                            </div>
                            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
                                {isDriveLoading ? 'Syncing...' : 'Auto-Enabled'}
                            </span>
                        </div>
                         <div onClick={handleDriveRestore} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform"><ICONS.Sync className="w-5 h-5" /></div>
                                <span className="font-bold text-zinc-900 dark:text-white">Cloud Restore</span>
                            </div>
                        </div>
                    </>
                )}

                <div onClick={handleBackup} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform"><ICONS.Download className="w-5 h-5" /></div>
                        <span className="font-bold text-zinc-900 dark:text-white">Export JSON</span>
                    </div>
                </div>
                <div onClick={() => fileInputRef.current?.click()} className="flex justify-between items-center p-5 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform"><ICONS.List className="w-5 h-5" /></div>
                        <span className="font-bold text-zinc-900 dark:text-white">Import JSON</span>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </div>
        </section>

        {/* Legal & Support */}
        <section>
            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest ml-4 mb-2">Legal & Support</h4>
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div onClick={() => onNavigate('DOCS')} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                            <BookIcon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">Documentation</span>
                    </div>
                     <span className="text-zinc-300 dark:text-zinc-600">→</span>
                </div>
                <div onClick={() => onNavigate('PRIVACY')} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                            <ICONS.Info className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">Privacy Policy</span>
                    </div>
                     <span className="text-zinc-300 dark:text-zinc-600">→</span>
                </div>
                <div onClick={() => onNavigate('TERMS')} className="flex justify-between items-center p-5 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                            <ICONS.Info className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-900 dark:text-white">Terms of Service</span>
                    </div>
                    <span className="text-zinc-300 dark:text-zinc-600">→</span>
                </div>
            </div>
        </section>

        {/* Account */}
        <section>
             <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest ml-4 mb-2">Account</h4>
             <div className="bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div onClick={() => setShowPasswordModal(true)} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform"><ICONS.Lock className="w-5 h-5" /></div>
                        <span className="font-bold text-zinc-900 dark:text-white">Change Password</span>
                    </div>
                </div>
                <div onClick={onLogout} className="flex justify-between items-center p-5 border-b border-zinc-50 dark:border-zinc-800 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors text-red-500">
                    <span className="font-bold">Log Out</span>
                </div>
                <div onClick={handleDeleteAccount} className="flex justify-between items-center p-5 cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800 transition-colors text-red-500">
                    <span className="font-bold">Delete Account</span>
                </div>
             </div>
        </section>
        
        <div className="text-center pt-8 pb-4">
             <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Ortho v2.4</p>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-xl animate-slide-up border border-transparent dark:border-zinc-800">
             <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">Change Password</h3>
             <form onSubmit={handlePasswordUpdate} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none text-zinc-900 dark:text-white font-medium" placeholder="••••••••" required />
                 </div>
                 <div className="border-t border-zinc-100 dark:border-zinc-800 my-4"></div>
                 <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none text-zinc-900 dark:text-white font-medium" placeholder="••••••••" required minLength={6} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl outline-none text-zinc-900 dark:text-white font-medium" placeholder="••••••••" required minLength={6} />
                 </div>
                 <div className="flex gap-3 mt-6 pt-2">
                    <button type="button" onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
                    <button type="submit" disabled={passwordLoading} className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all disabled:opacity-70 disabled:cursor-wait">
                        {passwordLoading ? 'Verifying...' : 'Update'}
                    </button>
                 </div>
             </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Profile;