import { requestJson } from "./listingsApi";

// Owner tools. The API checks profiles.is_admin on every call.

const admin = (path, fallbackError, options = {}) =>
  requestJson(`/admin${path}`, { ...options, fallbackError });

export const getAdminListings = (options) => admin("/listings", "Could not load listings.", options);
export const getAdminListing = (id, options) =>
  admin(`/listings/${encodeURIComponent(id)}`, "Could not load listing.", options);
export const updateAdminListing = (id, updates, options) =>
  admin(`/listings/${encodeURIComponent(id)}`, "Could not update listing.", {
    ...options,
    method: "PATCH",
    body: updates,
  });
export const deleteAdminListing = (id, options) =>
  admin(`/listings/${encodeURIComponent(id)}`, "Could not delete listing.", {
    ...options,
    method: "DELETE",
  });

export const getAdminUsers = (options) => admin("/users", "Could not load users.", options);
export const setUserBanned = (id, banned, options) =>
  admin(`/users/${encodeURIComponent(id)}/ban`, "Could not update user.", {
    ...options,
    method: "POST",
    body: { banned },
  });
export const deleteUser = (id, options) =>
  admin(`/users/${encodeURIComponent(id)}`, "Could not delete user.", {
    ...options,
    method: "DELETE",
  });

export const getAdminConversations = (options) =>
  admin("/conversations", "Could not load conversations.", options);
export const getAdminMessages = (id, options) =>
  admin(`/conversations/${encodeURIComponent(id)}/messages`, "Could not load messages.", options);

export const getAdminFeedback = (options) => admin("/feedback", "Could not load feedback.", options);
export const runImport = (options) =>
  admin("/import", "Import failed.", { ...options, method: "POST" });
