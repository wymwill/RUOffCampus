import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMyProfile } from "../api/profileApi";
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

  // The signed in user's profile, for their name, photo and admin links. The
  // API checks admin access itself, so this only changes what is shown.
  const [profile, setProfile] = useState(null);
  const accessToken = session?.access_token;
  const userId = session?.user?.id;
  useEffect(() => {
    if (!accessToken || !userId) return undefined;
    let cancelled = false;
    getMyProfile({ accessToken })
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, userId]);

  // A profile left over from a previous account never applies.
  const currentProfile = profile && profile.id === userId ? profile : null;

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: currentProfile,
      setProfile,
      isAdmin: currentProfile?.isAdmin === true,
      isReady,
      isConfigured: isSupabaseBrowserConfigured,
    }),
    [currentProfile, isReady, session]
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
