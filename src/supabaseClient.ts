/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided for DAPOSI
const DEFAULT_SUPABASE_URL = 'https://jhgqpmikwondxnyrxbxv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZ3FwbWlrd29uZHhueXJ4Ynh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNzE4OTUsImV4cCI6MjEwNzc0Nzg5NX0.7NPBkgjXQyADBEbDkQp89WjnEM7G6Gx7VpUZmXjZyWs';

// Helper to sanitize Supabase URL: strip accidental /rest/v1 or trailing slashes
export const sanitizeSupabaseUrl = (urlStr: string): string => {
  let cleaned = (urlStr || '').trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
};

// Get Supabase configuration from environment variables, browser storage, or configured defaults
export const getSupabaseConfig = () => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
  const envUrl = metaEnv?.VITE_SUPABASE_URL || '';
  const envKey = metaEnv?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('daposi_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('daposi_supabase_anon_key') || '' : '';

  const rawUrl = (envUrl || storedUrl || DEFAULT_SUPABASE_URL).trim();
  const url = sanitizeSupabaseUrl(rawUrl);
  const key = (envKey || storedKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url,
    key,
    isConfigured: Boolean(url && key && !url.includes('xyzcompany'))
  };
};

const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

export const setRuntimeSupabaseConfig = (url: string, anonKey: string): void => {
  if (typeof window !== 'undefined') {
    const clean = sanitizeSupabaseUrl(url);
    localStorage.setItem('daposi_supabase_url', clean);
    localStorage.setItem('daposi_supabase_anon_key', anonKey.trim());
    window.location.reload();
  }
};

export default supabase;
