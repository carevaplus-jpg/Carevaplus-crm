import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * null when the app is built without Supabase credentials → the CRM keeps every
 * record on this device (local-first). Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * to provide a Supabase client for multi-user cloud accounts — see README.md.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      })
    : null;

export const cloudEnabled = !!supabase;

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(cloudEnabled);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}
