import { Listing } from '@/src/types/listing';

const DEFAULT_API_URL = 'https://sublet-matching-api.onrender.com';

const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 'fallback-1',
    title: 'Sunny Room Near College Ave',
    description: 'Quick walk to campus buses and downtown New Brunswick.',
    price: 850,
    beds: 1,
    propertyType: 'Room',
    distance: 0.4,
    image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
    campus_location: 'College Ave',
    host_id: null,
  },
  {
    id: 'fallback-2',
    title: 'Modern 2BR by Livingston',
    description: 'Furnished apartment with laundry and parking options.',
    price: 1650,
    beds: 2,
    propertyType: 'Apartment',
    distance: 0.7,
    image_url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858',
    campus_location: 'Livingston',
    host_id: null,
  },
];

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? DEFAULT_API_URL;
}

function buildAuthHeaders(accessToken?: string | null): Record<string, string> {
  if (!accessToken) return {};
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function normalizeListing(item: any): Listing {
  return {
    id: String(item.id),
    title: item.title ?? 'Untitled listing',
    description: item.description ?? null,
    price: Number(item.price ?? item.price_monthly ?? 0),
    beds: Number(item.beds ?? 0),
    propertyType: String(item.propertyType ?? item.property_type ?? 'Apartment'),
    distance: Number(item.distance ?? 0),
    image_url: item.image_url ?? item.image ?? null,
    campus_location: item.campus_location ?? item.campus ?? null,
    host_id: item.host_id ?? null,
  };
}

export async function fetchListings(): Promise<{ listings: Listing[]; usingFallback: boolean }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/listings`);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data)) {
      throw new Error('Failed loading listings');
    }

    return {
      listings: data.map(normalizeListing),
      usingFallback: false,
    };
  } catch {
    return {
      listings: FALLBACK_LISTINGS,
      usingFallback: true,
    };
  }
}

export type CreateListingPayload = {
  title: string;
  description?: string | null;
  price_monthly: number;
  campus_location: string;
  beds: number;
  property_type: string;
  distance?: number;
  image_url?: string | null;
  amenities?: Record<string, unknown>;
};

export async function createListing(
  payload: CreateListingPayload,
  accessToken: string
): Promise<Listing> {
  const response = await fetch(`${getApiBaseUrl()}/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(accessToken),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not create listing.');
  }

  return normalizeListing(data);
}

export async function deleteListing(listingId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/listings/${listingId}`, {
    method: 'DELETE',
    headers: {
      ...buildAuthHeaders(accessToken),
    },
  });

  if (response.status === 204) return;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not delete listing.');
  }
}

export async function fetchFavorites(accessToken: string): Promise<{ id: string; listing_id: string }[]> {
  const response = await fetch(`${getApiBaseUrl()}/listings/favorites`, {
    method: 'GET',
    headers: {
      ...buildAuthHeaders(accessToken),
    },
  });

  const data = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Could not load favorites.');
  }

  return data.map((row: any) => ({
    id: String(row.id),
    listing_id: String(row.listing_id),
  }));
}

export async function addFavorite(listingId: string, accessToken: string): Promise<{ id: string }> {
  const response = await fetch(`${getApiBaseUrl()}/listings/favorites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(accessToken),
    },
    body: JSON.stringify({ listing_id: listingId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not add favorite.');
  }

  return {
    id: String(data.id),
  };
}

// The API deletes favorites by listing id, not by favorite row id.
export async function removeFavorite(listingId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/listings/favorites/${encodeURIComponent(listingId)}`, {
    method: 'DELETE',
    headers: {
      ...buildAuthHeaders(accessToken),
    },
  });

  if (response.status === 204) return;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not remove favorite.');
  }
}
