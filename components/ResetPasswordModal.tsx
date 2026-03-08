import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { ICONS } from '../constants';

interface Props {
  onSuccess: () => void;
  onCancel: () => void; // Optional, though usually we want to force a reset if in recovery
}

const ResetPasswordModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-scale-in">
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-50 dark:border-brand-900/50">
                <ICONS.Lock className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Reset Password</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                Create a new password to secure your account.
            </p>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold p-3 rounded-xl mb-4 text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">New Password</label>
            <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white font-medium transition-all" 
                placeholder="••••••••" 
                required 
                minLength={6}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Confirm Password</label>
            <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:border-brand-500 text-zinc-900 dark:text-white font-medium transition-all" 
                placeholder="••••••••" 
                required 
                minLength={6}
            />
          </div>

          <div className="pt-2">
            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-70"
            >
                {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;