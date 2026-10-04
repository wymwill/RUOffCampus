import Icon from "./ui/Icon";

/**
 * Where a listing comes from. Student posted listings need a confirmed
 * Rutgers email to publish, so they get the verified badge. Imported ones
 * name the site they came from.
 */
function ListingTrust({ listing, compact = false }) {
  if (listing.isImported) {
    return (
      <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-500">
        <Icon name="public" className="text-[15px]" />
        <span className="truncate">{listing.sourceName || "Imported listing"}</span>
      </span>
    );
  }

  if (!listing.host_id) return null;

  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full bg-verified-soft font-semibold text-verified ${
        compact ? "px-0 bg-transparent text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon name="verified" filled className={compact ? "text-[14px]" : "text-[16px]"} />
      Rutgers email verified
    </span>
  );
}

export default ListingTrust;
