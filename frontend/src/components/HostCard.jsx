import { useEffect, useState } from "react";
import { requestJson } from "../api/listingsApi";
import AccountBadge from "./AccountBadge";
import Avatar from "./ui/Avatar";

/**
 * Who posted a student listing: photo, name, pronouns, class year and bio.
 * The listings feed leaves photos and bios out, so this loads the single
 * listing, which includes them.
 */
function HostCard({ listing }) {
  const [host, setHost] = useState(null);
  const listingId = listing.id;

  useEffect(() => {
    let cancelled = false;
    requestJson(`/listings/${encodeURIComponent(listingId)}`, { fallbackError: "Could not load host." })
      .then((detail) => {
        if (!cancelled) setHost(detail);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const name = host?.hostName || listing.hostName;
  const details = [host?.hostPronouns, host?.hostClassYear ? `Class of ${host.hostClassYear}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">Hosted by</p>
      <div className="flex items-center gap-3">
        <Avatar src={host?.hostAvatarUrl} name={name} className="h-12 w-12 text-lg" />
        <div className="min-w-0">
          <p className="truncate font-bold text-midnight">{name || "ScarletSublet member"}</p>
          {details && <p className="text-xs text-slate-600">{details}</p>}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <AccountBadge isRutgers={listing.hostIsRutgers} isAdmin={listing.hostIsAdmin} compact />
      </div>
      {host?.hostBio && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{host.hostBio}</p>}
    </div>
  );
}

export default HostCard;
