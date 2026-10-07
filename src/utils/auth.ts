import { isSupabaseConfigured, supabase } from '@/utils/supabase-client';

export type EmailSignInOutcome = { status: 'ok' } | { status: 'error'; message: string } | { status: 'not-configured' };

/**
 * Admin-only sign-in. Accounts are created by hand in the Supabase dashboard
 * (Authentication -> Users -> Add user) and granted admin via public.admins
 * (see 0005_admins.sql) — visitors use the calculator without signing in.
 */
export async function signInWithEmailPassword(email: string, password: string): Promise<EmailSignInOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'not-configured' };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { status: 'error', message: error.message } : { status: 'ok' };
}

/** Whether the user is in public.admins — gates the vehicle admin screen. */
export async function fetchIsAdmin(userId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }
  const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !error && Boolean(data);
}
