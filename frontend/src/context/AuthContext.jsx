import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAdminStatus } from "../api/adminApi";
import { isSupabaseBrowserConfigured, supabase } from "../lib/supabaseClient";

const TOKEN_KEY = "sublet_access_token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(!isSupabaseBrowserConfigured);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured || !supabase) {
      window.localStorage.removeItem(TOKEN_KEY);
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("Failed to restore auth session", error.message);
      }
      const nextSession = data?.session ?? null;
      setSession(nextSession);
      if (nextSession?.access_token) {
        window.localStorage.setItem(TOKEN_KEY, nextSession.access_token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      if (nextSession?.access_token) {
        window.localStorage.setItem(TOKEN_KEY, nextSession.access_token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Only shows or hides admin links. The API checks admin access itself.
  const [adminUserId, setAdminUserId] = useState(null);
  const accessToken = session?.access_token;
  const userId = session?.user?.id;
  useEffect(() => {
    if (!accessToken || !userId) return undefined;
    let cancelled = false;
    getAdminStatus({ accessToken })
      .then((isAdmin) => {
        if (!cancelled) setAdminUserId(isAdmin ? userId : null);
      })
      .catch(() => {
        if (!cancelled) setAdminUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, userId]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: Boolean(userId) && adminUserId === userId,
      isReady,
      isConfigured: isSupabaseBrowserConfigured,
    }),
    [adminUserId, isReady, session, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
