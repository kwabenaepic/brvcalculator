import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';

import { fetchIsAdmin } from '@/utils/auth';
import { supabase } from '@/utils/supabase-client';

export type SessionContextValue = {
  session: Session | null;
  isAdmin: boolean;
  /** True while a signed-in user's admin status is still being looked up. */
  isCheckingAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isAdmin: false,
  isCheckingAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [adminCheck, setAdminCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  // Derived from which user the last check was for, rather than flags set in
  // an effect: the render where a session first appears must already count as
  // "checking", or consumers see a momentary isAdmin=false and act on it.
  const isCheckingAdmin = Boolean(userId) && adminCheck?.userId !== userId;
  const isAdmin = Boolean(userId) && adminCheck?.userId === userId && adminCheck?.isAdmin === true;

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    fetchIsAdmin(userId).then((result) => {
      if (!cancelled) {
        setAdminCheck({ userId, isAdmin: result });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <SessionContext.Provider value={{ session, isAdmin, isCheckingAdmin, isLoading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
