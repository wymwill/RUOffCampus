import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getListings } from "../api/listingsApi";
import { normalizeListing, normalizeListings } from "../utils/listingUtils";

const ListingsContext = createContext(null);

export function ListingsProvider({ children }) {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshListings = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const nextListings = normalizeListings(
        await getListings({
          retries: 1,
          retryDelayMs: 500,
        })
      );

      setListings(nextListings);
    } catch (loadError) {
      setError(loadError.message || "Could not load listings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadListings = async () => {
      setError("");
      setIsLoading(true);

      try {
        const nextListings = normalizeListings(
          await getListings({
            retries: 1,
            retryDelayMs: 500,
          })
        );

        if (isCancelled) return;

        setListings(nextListings);
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError.message || "Could not load listings.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadListings();

    return () => {
      isCancelled = true;
    };
  }, []);

  const addListing = useCallback((listingInput) => {
    const nextListing = normalizeListing(listingInput);
    if (!nextListing) return;

    startTransition(() => {
      setListings((prev) => [
        nextListing,
        ...prev.filter((listing) => String(listing.id) !== String(nextListing.id)),
      ]);
    });
  }, []);

  const getListingById = useCallback(
    (id) => listings.find((listing) => String(listing.id) === String(id)) ?? null,
    [listings]
  );

  const value = useMemo(
    () => ({
      listings,
      addListing,
      getListingById,
      refreshListings,
      isLoading,
      error,
    }),
    [addListing, error, getListingById, isLoading, listings, refreshListings]
  );

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useListings() {
  const ctx = useContext(ListingsContext);

  if (!ctx) {
    throw new Error("useListings must be used inside ListingsProvider");
  }

  return ctx;
}
