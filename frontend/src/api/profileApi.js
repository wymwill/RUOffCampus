import { requestJson } from "./listingsApi";

/** GET /profile/me. The signed in user's profile, including isAdmin. */
export function getMyProfile(options = {}) {
  return requestJson("/profile/me", {
    accessToken: options.accessToken,
    fallbackError: "Could not load your profile.",
  });
}

/** PUT /profile/me with any of name, pronouns, classYear, bio and avatarUrl. */
export function updateMyProfile(updates, options = {}) {
  return requestJson("/profile/me", {
    method: "PUT",
    body: updates,
    accessToken: options.accessToken,
    fallbackError: "Could not save your profile.",
  });
}
