import AccountBadge from "./AccountBadge";
import Icon from "./ui/Icon";

/**
 * Who posted a listing. Imported listings name the site they came from.
 * Posted listings show whether the host has a confirmed Rutgers email.
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

  // Unknown in local dev, where accounts have no email. Posting always needs
  // a confirmed email, so say that much.
  if (listing.hostIsRutgers == null) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
        <Icon name="mark_email_read" className="text-[15px]" />
        Confirmed email
      </span>
    );
  }

  return <AccountBadge isRutgers={listing.hostIsRutgers} compact={compact} />;
}

export default ListingTrust;
