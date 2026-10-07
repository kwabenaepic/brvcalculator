import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Expo Router's web build renders once on the server (Node), where there's
 * no `window` — AsyncStorage's web implementation reaches for
 * `window.localStorage` as soon as GoTrueClient reads a session, which
 * crashes the SSR pass. Swap in a no-op storage during that pass only.
 */
const authStorage =
  typeof window === 'undefined'
    ? {
        getItem: async () => null,
        setItem: async () => {},
        removeItem: async () => {},
      }
    : AsyncStorage;

/**
 * `null` when EXPO_PUBLIC_SUPABASE_URL/ANON_KEY aren't set yet (e.g. before a
 * Supabase project exists). Callers must treat that the same as "unreachable"
 * and fall back to the local cache, not throw — the app should stay usable
 * offline-only until real credentials are provided.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Supabase's recommended React Native snippet: only refresh the auth token
 * while the app is in the foreground, so a backgrounded app doesn't keep
 * waking up the network.
 */
AppState.addEventListener('change', (state) => {
  if (!supabase) {
    return;
  }
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
