import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAdminListing,
  deleteUser,
  getAdminConversations,
  getAdminFeedback,
  getAdminListings,
  getAdminMessages,
  getAdminUsers,
  runImport,
  setUserBanned,
  updateAdminListing,
} from "../api/adminApi";
import SignInRequired from "../components/SignInRequired";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { useListings } from "../context/ListingsContext";
import { formatListingPrice } from "../utils/listingUtils";

const TABS = [
  ["listings", "Listings", "home_work"],
  ["users", "Users", "group"],
  ["messages", "Messages", "forum"],
  ["feedback", "Feedback", "feedback"],
];

const LOADERS = {
  listings: getAdminListings,
  users: getAdminUsers,
  messages: getAdminConversations,
  feedback: getAdminFeedback,
};

function formatWhen(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const smallButton =
  "rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const neutralButton = `${smallButton} border-slate-300 text-midnight hover:bg-surface-low`;
const dangerButton = `${smallButton} border-red-300 text-red-700 hover:bg-red-50`;

function Pill({ tone = "slate", children }) {
  const tones = {
    slate: "bg-surface-low text-slate-700",
    green: "bg-verified-soft text-verified",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    midnight: "bg-midnight text-white",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ListingsTab({ rows, act }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((listing) =>
      [listing.title, listing.address, listing.hostEmail, listing.sourceName]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(needle))
    );
  }, [rows, query]);

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, address or host email"
        className="mb-4 w-full max-w-md rounded-full bg-surface-low px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-midnight"
      />
      <ul className="divide-y divide-slate-100">
        {shown.map((listing) => (
          <li key={listing.id} className="flex flex-wrap items-center gap-3 py-3">
            <img src={listing.image_url || listing.image} alt="" className="h-12 w-16 shrink-0 rounded-lg bg-surface-high object-cover" />
            <div className="min-w-0 flex-1">
              <Link to={`/listings/${listing.id}`} className="block truncate text-sm font-semibold text-midnight hover:underline">
                {listing.title}
              </Link>
              <p className="truncate text-xs text-slate-600">
                {formatListingPrice(listing)} ·{" "}
                {listing.isImported ? listing.sourceName || "Imported" : listing.hostEmail || "No host"}
              </p>
            </div>
            <Pill tone={listing.status === "active" ? "green" : listing.status === "taken" ? "midnight" : "amber"}>
              {listing.status}
            </Pill>
            <div className="flex gap-2">
              <Link to={`/listings/${listing.id}/edit`} className={neutralButton}>
                Edit
              </Link>
              <button
                type="button"
                className={neutralButton}
                onClick={() =>
                  act((options) =>
                    updateAdminListing(
                      listing.id,
                      { status: listing.status === "active" ? "paused" : "active" },
                      options
                    )
                  )
                }
              >
                {listing.status === "active" ? "Pause" : "Activate"}
              </button>
              <button
                type="button"
                className={dangerButton}
                onClick={() =>
                  act(
                    (options) => deleteAdminListing(listing.id, options),
                    `Delete "${listing.title}"? This cannot be undone.${
                      listing.isImported ? " Imported listings come back on the next import." : ""
                    }`
                  )
                }
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function UsersTab({ rows, act, currentUserId }) {
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((person) => {
        const banned = person.bannedUntil && new Date(person.bannedUntil) > new Date();
        const locked = person.isAdmin || person.id === currentUserId;
        return (
          <li key={person.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-midnight">{person.email}</p>
              <p className="text-xs text-slate-600">
                Joined {formatWhen(person.createdAt)} · Last sign in {formatWhen(person.lastSignInAt)} ·{" "}
                {person.listingCount} {person.listingCount === 1 ? "listing" : "listings"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {person.isAdmin && <Pill tone="midnight">Admin</Pill>}
              {person.isRutgers ? <Pill tone="green">Rutgers verified</Pill> : <Pill>Non-Rutgers</Pill>}
              {!person.emailConfirmed && <Pill tone="amber">Unconfirmed</Pill>}
              {banned && <Pill tone="red">Banned</Pill>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={locked}
                title={locked ? "Admins can only be changed in Supabase" : undefined}
                className={neutralButton}
                onClick={() =>
                  act(
                    (options) => setUserBanned(person.id, !banned, options),
                    banned ? null : `Ban ${person.email}? Their listings will be paused.`
                  )
                }
              >
                {banned ? "Unban" : "Ban"}
              </button>
              <button
                type="button"
                disabled={locked}
                className={dangerButton}
                onClick={() =>
                  act(
                    (options) => deleteUser(person.id, options),
                    `Delete ${person.email}? Their account, listings, saves and messages are removed for good.`
                  )
                }
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MessagesTab({ rows, accessToken }) {
  const [openId, setOpenId] = useState(null);
  const [thread, setThread] = useState({ id: null, messages: [], error: "" });

  useEffect(() => {
    if (!openId) return undefined;
    let cancelled = false;
    getAdminMessages(openId, { accessToken })
      .then((messages) => !cancelled && setThread({ id: openId, messages, error: "" }))
      .catch((error) => !cancelled && setThread({ id: openId, messages: [], error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [openId, accessToken]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ul className="divide-y divide-slate-100">
        {rows.map((conversation) => (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => setOpenId(conversation.id)}
              className={`w-full rounded-xl px-3 py-3 text-left transition ${
                openId === conversation.id ? "bg-surface-low" : "hover:bg-surface-low"
              }`}
            >
              <p className="truncate text-sm font-semibold text-midnight">
                {conversation.listingTitle || "Deleted listing"}
              </p>
              <p className="truncate text-xs text-slate-600">{conversation.participants.join(" · ")}</p>
              <p className="text-xs text-slate-600">
                {conversation.messageCount} messages · {formatWhen(conversation.lastMessageAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-surface-low p-4">
        {!openId ? (
          <p className="text-sm text-slate-600">Pick a conversation to read it.</p>
        ) : thread.id !== openId ? (
          <p className="text-sm text-slate-600">Loading messages...</p>
        ) : thread.error ? (
          <p className="text-sm text-red-700">{thread.error}</p>
        ) : thread.messages.length === 0 ? (
          <p className="text-sm text-slate-600">No messages yet.</p>
        ) : (
          <ol className="space-y-3">
            {thread.messages.map((message) => (
              <li key={message.id} className="rounded-xl bg-white p-3 shadow-card">
                <p className="text-xs font-semibold text-slate-600">
                  {message.senderEmail} · {formatWhen(message.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-midnight">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function FeedbackTab({ rows }) {
  return (
    <ul className="space-y-3">
      {rows.map((item) => (
        <li key={item.id} className="rounded-2xl bg-surface-low p-4">
          <p className="text-xs font-semibold text-slate-600">
            {formatWhen(item.created_at)} · {item.email || "Anonymous"}
            {item.page ? ` · ${item.page}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-midnight">{item.message}</p>
        </li>
      ))}
    </ul>
  );
}

function AdminPage() {
  const { user, session, isAdmin, isReady } = useAuth();
  const { refreshListings } = useListings();
  const accessToken = session?.access_token;
  const [tab, setTab] = useState("listings");
  const [data, setData] = useState({ tab: null, rows: [], error: "" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!accessToken || !isAdmin) return undefined;
    let cancelled = false;
    LOADERS[tab]({ accessToken })
      .then((rows) => !cancelled && setData({ tab, rows: rows ?? [], error: "" }))
      .catch((error) => !cancelled && setData({ tab, rows: [], error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [accessToken, isAdmin, tab]);

  useEffect(load, [load]);

  // Runs one admin action, after a confirm when one is given, then reloads.
  const act = async (action, confirmText = null) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setNotice("");
    try {
      await action({ accessToken });
      load();
      refreshListings();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isReady) return <p className="px-6 py-10 text-slate-600">Checking authentication status...</p>;
  if (!user) return <SignInRequired message="Sign in with an admin account." />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-midnight">Admins only</h1>
        <p className="mt-2 text-slate-600">This account doesn't have admin access.</p>
      </div>
    );
  }

  const loading = data.tab !== tab;

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Owner tools</p>
          <h1 className="text-[26px] font-bold leading-8 text-midnight md:text-[32px] md:leading-10">Admin</h1>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            act(async (options) => {
              const result = await runImport(options);
              setNotice(`Imported ${result.importedCount} Rutgers marketplace listings.`);
            })
          }
          className="flex items-center gap-1.5 rounded-full bg-midnight px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          <Icon name="sync" className="text-[18px]" />
          Re-run Rutgers import
        </button>
      </div>

      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === key ? "bg-midnight text-white" : "bg-surface-low text-midnight hover:bg-surface"
            }`}
          >
            <Icon name={icon} className="text-[18px]" />
            {label}
            {data.tab === key && <span className="opacity-70">{data.rows.length}</span>}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-2xl bg-surface-low px-4 py-3 text-sm text-midnight">
          {notice}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:p-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : data.error ? (
          <p role="alert" className="text-sm text-red-700">
            {data.error}
          </p>
        ) : data.rows.length === 0 ? (
          <p className="text-sm text-slate-600">Nothing here yet.</p>
        ) : tab === "listings" ? (
          <ListingsTab rows={data.rows} act={act} />
        ) : tab === "users" ? (
          <UsersTab rows={data.rows} act={act} currentUserId={user.id} />
        ) : tab === "messages" ? (
          <MessagesTab rows={data.rows} accessToken={accessToken} />
        ) : (
          <FeedbackTab rows={data.rows} />
        )}
      </section>
    </main>
  );
}

export default AdminPage;
