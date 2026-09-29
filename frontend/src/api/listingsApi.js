// Production builds call the backend on the same domain under /api (see vercel.json).
const DEFAULT_BASE = import.meta.env.DEV ? "http://localhost:3001" : "/api";
const DEFAULT_TIMEOUT_MS = 10000;

export function getListingsApiBase() {
  const configuredBase =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const base = configuredBase?.replace(/\/$/, "") ?? DEFAULT_BASE;
  return base;
}

/** Optional; set from Supabase session after login (e.g. session.access_token). */
export function getListingsAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("sublet_access_token");
}

async function wait(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

async function parseJsonResponse(response) {
  return response.json().catch(() => ({}));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Check that the backend is running.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getListings(options = {}) {
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 1000;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${getListingsApiBase()}/listings`);
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        const message =
          typeof data.error === "string" ? data.error : "Could not load listings.";
        const err = new Error(message);
        err.status = response.status;
        throw err;
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      await wait(retryDelayMs);
    }
  }

  return [];
}

/**
 * POST /listings — body matches backend (price_monthly, campus_location, etc.).
 * @param {Record<string, unknown>} payload
 * @param {{ accessToken?: string | null }} [options]
 */
export async function createListing(payload, options = {}) {
  let token = options.accessToken ?? getListingsAccessToken();
  // Avoid sending bogus headers like "Bearer undefined".
  if (typeof token !== "string") token = null;
  token = token?.trim?.() ?? null;
  if (token && token.length === 0) token = null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetchWithTimeout(`${getListingsApiBase()}/listings`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Could not create listing.";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

function buildAuthHeaders(accessToken) {
  let token = accessToken ?? getListingsAccessToken();
  if (typeof token !== "string") token = null;
  token = token?.trim?.() ?? null;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getFavoriteListings(options = {}) {
  const response = await fetchWithTimeout(`${getListingsApiBase()}/listings/favorites`, {
    headers: buildAuthHeaders(options.accessToken),
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Could not load favorites.";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return Array.isArray(data) ? data : [];
}

export async function addFavoriteListing(listingId, options = {}) {
  const response = await fetchWithTimeout(`${getListingsApiBase()}/listings/favorites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(options.accessToken),
    },
    body: JSON.stringify({ listing_id: listingId }),
  });
  const data = await parseJsonResponse(response);

  if (!response.ok && response.status !== 409) {
    const message =
      typeof data.error === "string" ? data.error : "Could not save favorite.";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

export async function removeFavoriteListing(listingId, options = {}) {
  const response = await fetchWithTimeout(
    `${getListingsApiBase()}/listings/favorites/${encodeURIComponent(listingId)}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(options.accessToken),
    }
  );
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Could not remove favorite.";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

async function requestJson(path, { method = "GET", body, accessToken, fallbackError }) {
  const response = await fetchWithTimeout(`${getListingsApiBase()}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...buildAuthHeaders(accessToken),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await parseJsonResponse(response);

  if (!response.ok) {
    const err = new Error(typeof data?.error === "string" ? data.error : fallbackError);
    err.status = response.status;
    throw err;
  }

  return data;
}

/** GET /listings/mine — every listing the signed in user hosts, including paused and taken ones. */
export async function getMyListings(options = {}) {
  const data = await requestJson("/listings/mine", {
    accessToken: options.accessToken,
    fallbackError: "Could not load your listings.",
  });
  return Array.isArray(data) ? data : [];
}

/** PUT /listings/:id — only fields the host may edit are applied by the API. */
export async function updateListing(listingId, updates, options = {}) {
  return requestJson(`/listings/${encodeURIComponent(listingId)}`, {
    method: "PUT",
    body: updates,
    accessToken: options.accessToken,
    fallbackError: "Could not update listing.",
  });
}

export async function deleteListing(listingId, options = {}) {
  await requestJson(`/listings/${encodeURIComponent(listingId)}`, {
    method: "DELETE",
    accessToken: options.accessToken,
    fallbackError: "Could not delete listing.",
  });
}
