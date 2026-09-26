import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addFavorite,
  createListing as createListingApi,
  deleteListing as deleteListingApi,
  fetchFavorites,
  fetchListings,
  removeFavorite,
  type CreateListingPayload,
} from '@/src/api/listings';
import { supabase } from '@/src/api/supabase';
import { Listing } from '@/src/types/listing';

const FAVORITES_STORAGE_KEY = 'sublet_favorites';

type AppContextShape = {
  listings: Listing[];
  loading: boolean;
  usingFallback: boolean;
  favoriteIds: Set<string>;
  authMessage: string;
  userId: string | null;
  canWriteListings: boolean;
  refreshListings: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  createListing: (payload: CreateListingPayload) => Promise<Listing>;
  deleteListing: (id: string) => Promise<void>;
  isFavorited: (id: string) => boolean;
};

const AppContext = createContext<AppContextShape | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState('');
  const previousAccessToken = useRef<string | null>(null);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFavorites() {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (cancelled) return;
        if (!raw) {
          setFavoritesHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          setFavoritesHydrated(true);
          return;
        }
        setFavoriteIds(new Set(parsed.map((id) => String(id))));
      } catch {
        // Ignore corrupted or unavailable local favorites cache.
      } finally {
        if (!cancelled) {
          setFavoritesHydrated(true);
        }
      }
    }

    void hydrateFavorites();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!favoritesHydrated) return;
    void AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteIds]));
  }, [favoriteIds, favoritesHydrated]);

  const refreshListings = useCallback(async () => {
    setLoading(true);
    const next = await fetchListings();
    setListings(next.listings);
    setUsingFallback(next.usingFallback);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncServerFavorites() {
      const hadToken = Boolean(previousAccessToken.current);
      previousAccessToken.current = accessToken;

      if (!accessToken) {
        if (hadToken) {
          setFavoriteIds(new Set());
        }
        setAuthMessage('');
        return;
      }

      try {
        const rows = await fetchFavorites(accessToken);
        if (cancelled) return;
        setFavoriteIds(new Set(rows.map((r) => r.listing_id)));
        setAuthMessage('');
      } catch (error) {
        if (cancelled) return;
        setAuthMessage(error instanceof Error ? error.message : 'Could not load favorites.');
      }
    }

    void syncServerFavorites();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!accessToken) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        setAuthMessage('');
        return;
      }

      try {
        if (favoriteIds.has(id)) {
          await removeFavorite(id, accessToken);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setAuthMessage('');
          return;
        }

        try {
          await addFavorite(id, accessToken);
          setFavoriteIds((prev) => new Set([...prev, id]));
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (message.toLowerCase().includes('already in favorites')) {
            const rows = await fetchFavorites(accessToken);
            setFavoriteIds(new Set(rows.map((r) => r.listing_id)));
          } else {
            throw error;
          }
        }
        setAuthMessage('');
      } catch (error) {
        setAuthMessage(error instanceof Error ? error.message : 'Could not update favorites.');
      }
    },
    [accessToken, favoriteIds]
  );

  const createListing = useCallback(
    async (payload: CreateListingPayload) => {
      if (!accessToken) {
        throw new Error('Sign in required.');
      }
      const created = await createListingApi(payload, accessToken);
      setListings((prev) => [created, ...prev]);
      return created;
    },
    [accessToken]
  );

  const deleteListing = useCallback(
    async (id: string) => {
      if (!accessToken) {
        throw new Error('Sign in required.');
      }
      await deleteListingApi(id, accessToken);
      setListings((prev) => prev.filter((listing) => listing.id !== id));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [accessToken]
  );

  const value = useMemo(
    () => ({
      listings,
      loading,
      usingFallback,
      favoriteIds,
      authMessage,
      userId,
      canWriteListings: Boolean(accessToken),
      refreshListings,
      toggleFavorite,
      createListing,
      deleteListing,
      isFavorited: (id: string) => favoriteIds.has(id),
    }),
    [
      listings,
      loading,
      usingFallback,
      favoriteIds,
      authMessage,
      userId,
      accessToken,
      refreshListings,
      toggleFavorite,
      createListing,
      deleteListing,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used inside AppProvider');
  return ctx;
}
