import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { ICONS, APP_NAME } from '../constants';

interface Props {
  onLogin: (user: User) => void;
  onBack?: () => void;
  initialMode?: 'LOGIN' | 'SIGNUP';
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'RESET';

const Auth: React.FC<Props> = ({ onLogin, onBack, initialMode = 'LOGIN' }) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    
    try {
      if (authMode === 'RESET') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) throw error;
        setMessage('If an account exists, a password reset link has been sent to your email.');
      } else if (authMode === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        // Successful login is handled by the onAuthStateChange listener in App.tsx
      } else {
        // Signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: username,
            },
          },
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setMessage('Account created! Please check your email to verify your account.');
          setAuthMode('LOGIN');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
      setError('');
      setIsLoading(true);

      const performWebLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: window.location.origin,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });
            if (error) throw error;
        } catch (e: any) {
            setError(e.message || `Failed to sign in with ${provider}`);
            setIsLoading(false);
        }
      };

      // 1. Native Median App Handling (Google Only)
      const isNative = window.median || navigator.userAgent.indexOf('gonative') > -1;
      
      if (provider === 'google' && isNative) {
          // Verify the plugin is actually present before attempting native flow
          if (window.median?.socialLogin?.google?.login) {
              // Define the global callback expected by Median's Google Login Plugin
              window.gonative_social_login_google_callback = async (data: any) => {
                  if (data?.idToken) {
                      // Exchange the Google ID Token for a Supabase Session
                      const { error } = await supabase.auth.signInWithIdToken({
                          provider: 'google',
                          token: data.idToken,
                      });
                      
                      if (error) {
                          setError(error.message);
                          setIsLoading(false);
                      }
                      // Success is handled by the onAuthStateChange listener in App.tsx
                  } else {
                      setIsLoading(false);
                      if (data?.error) {
                          setError("Sign in cancelled or failed.");
                      }
                  }
              };

              try {
                  window.median.socialLogin.google.login();
                  return; // Successfully triggered native flow, exit function to wait for callback
              } catch (err) {
                  console.warn("Native login trigger failed, falling back to web.", err);
                  // Proceed to fallback below
              }
          }
      }

      // 2. Standard Web Handling (Fallback if not native or native plugin missing)
      await performWebLogin();
  };

  return (
    <div className="h-full w-full overflow-y-auto no-scrollbar bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-slide-up relative">
        
        {onBack && (
            <button 
                onClick={onBack}
                className="absolute top-6 left-6 p-2 -ml-2 -mt-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-full transition-all group"
                aria-label="Back"
            >
                <ICONS.ArrowLeft className="w-6 h-6 group-active:-translate-x-1 transition-transform" />
            </button>
        )}

        <div className="text-center mb-8">
           <img 
             src="/ortho-app-icon-192.png" 
             alt={APP_NAME} 
             className="w-20 h-20 rounded-3xl mx-auto mb-6 shadow-2xl shadow-brand-500/30 rotate-3 transition-transform hover:rotate-6" 
           />
           <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{APP_NAME}</h1>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
             {authMode === 'LOGIN' ? 'Welcome back' : (authMode === 'RESET' ? 'Recover your account' : 'Begin your journey')}
           </p>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl mb-6 border border-red-100 dark:border-red-900/50 text-center font-medium">{error}</div>}
        {message && <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs p-3 rounded-xl mb-6 border border-emerald-100 dark:border-emerald-900/50 text-center font-medium">{message}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'SIGNUP' && (
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Name</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 dark:focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 transition-all" 
                required={authMode === 'SIGNUP'} 
                placeholder="Your Name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 dark:focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 transition-all" 
              required 
              placeholder="hello@example.com"
            />
          </div>

          {authMode !== 'RESET' && (
             <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-brand-500 dark:focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 transition-all" 
                required 
                placeholder="••••••••"
                minLength={6}
                />
            </div>
          )}

          {authMode === 'LOGIN' && (
              <div className="text-right">
                  <button type="button" onClick={() => { setAuthMode('RESET'); setError(''); setMessage(''); }} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      Forgot Password?
                  </button>
              </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 dark:hover:bg-brand-500 transition-all transform active:scale-[0.98] mt-2 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center relative overflow-hidden group"
          >
            {isLoading ? (
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="opacity-90">Processing...</span>
                </div>
            ) : (
                <span>{authMode === 'LOGIN' ? 'Log In' : (authMode === 'RESET' ? 'Send Reset Link' : 'Create Account')}</span>
            )}
            {!isLoading && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />}
          </button>
        </form>

        {authMode !== 'RESET' && (
            <>
                <div className="flex items-center gap-4 my-6">
                    <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Or continue with</span>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-700 flex-1"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-2 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ICONS.Google className="w-5 h-5" />
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Google</span>
                    </button>
                    <button onClick={() => handleOAuth('github')} className="flex items-center justify-center gap-2 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                        <ICONS.GitHub className="w-5 h-5 text-zinc-900 dark:text-white" />
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">GitHub</span>
                    </button>
                </div>
            </>
        )}

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-500 mt-8">
          {authMode === 'LOGIN' ? "New to Ortho? " : (authMode === 'SIGNUP' ? "Have an account? " : "Remembered it? ")}
          <button 
            onClick={() => { 
                setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN'); 
                setError(''); 
                setMessage(''); 
            }} 
            className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
          >
            {authMode === 'LOGIN' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;