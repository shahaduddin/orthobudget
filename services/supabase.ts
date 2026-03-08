import { createClient } from '@supabase/supabase-js';

// Helper to retrieve env vars from either process.env (Standard) or import.meta.env (Vite)
const getEnvVar = (key: string, viteKey: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[viteKey]) {
      // @ts-ignore
      return import.meta.env[viteKey];
    }
  } catch (e) {
    // Ignore error if import.meta is not defined
  }
  return '';
};

// Replace these placeholders with your actual Supabase project credentials in your .env file
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
const SUPABASE_URL = getEnvVar('REACT_APP_SUPABASE_URL', 'VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('REACT_APP_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('your-project')) {
    console.warn('Supabase credentials may be missing or invalid. Please check your environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
