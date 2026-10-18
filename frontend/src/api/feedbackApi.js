import { getListingsAccessToken, getListingsApiBase } from "./listingsApi";

const DEFAULT_TIMEOUT_MS = 10000;

// Sends one feedback message. Works signed in or out; when the visitor is
// signed in, their token goes along so the backend can attach their profile.
export async function submitFeedback({ message, email, page }) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const token = getListingsAccessToken();
    const response = await fetch(`${getListingsApiBase()}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, email, page }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data.error === "string" ? data.error : "Could not send feedback.";
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Check that the backend is running.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
