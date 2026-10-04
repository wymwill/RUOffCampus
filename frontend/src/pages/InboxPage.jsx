import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConversations } from "../api/messagingApi";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_LISTING_IMAGE } from "../utils/listingUtils";

function InboxPage() {
  const { session, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [requestStatus, setRequestStatus] = useState("idle");
  const [error, setError] = useState("");
  const isLoading = Boolean(user && requestStatus === "idle");

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isMounted = true;

    getConversations({ accessToken: session?.access_token })
      .then((nextConversations) => {
        if (!isMounted) return;
        setError("");
        setConversations(nextConversations);
        setRequestStatus("success");
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError.message || "Could not load conversations.");
        setRequestStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [session?.access_token, user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>
          <p className="mt-2 text-slate-600">Sign in to view your messages.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Messages</p>
        <h1 className="text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">Inbox</h1>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
          Loading conversations...
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
          No conversations yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/inbox/${conversation.id}`}
              className="flex gap-4 border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-slate-50"
            >
              <img
                src={conversation.listing?.image_url || DEFAULT_LISTING_IMAGE}
                alt=""
                className="h-20 w-24 shrink-0 rounded-lg object-cover bg-slate-100"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-900">
                      {conversation.listing?.title || "Listing conversation"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {getParticipantLabel(conversation)}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                <p className="mt-3 truncate text-sm text-slate-600">
                  {conversation.last_message?.body || "No messages yet."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getParticipantLabel(conversation) {
  const profile = conversation.other_participants?.[0]?.profile;
  return profile?.name || profile?.full_name || profile?.email || "Conversation";
}

export default InboxPage;
