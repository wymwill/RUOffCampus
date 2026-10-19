/** A missing item is only a not-found result after the request succeeds. */
export function getListingDetailState({ listing, isLoading, error }) {
  if (listing) return "ready";
  if (isLoading) return "loading";
  if (error) return "error";
  return "not-found";
}
