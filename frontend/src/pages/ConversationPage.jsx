import { useEffect, useMemo, useRef, useState } from "react";
import AccountBadge from "../components/AccountBadge";
import Icon from "../components/ui/Icon";
import { Link, useParams } from "react-router-dom";
import {
  getConversations,
  getMessages,
  markMessagesRead,
  sendMessage,
} from "../api/messagingApi";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function ConversationPage() {
  const { conversationId } = useParams();
  const { session, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [requestStatus, setRequestStatus] = useState("idle");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const isLoading = Boolean(user && requestStatus === "idle");

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => String(conversation.id) === String(conversationId)
      ) ?? null,
    [conversationId, conversations]
  );

  useEffect(() => {
    if (!user || !conversationId) {
      return undefined;
    }

    let isMounted = true;

    Promise.all([
      getConversations({ accessToken: session?.access_token }),
      getMessages(conversationId, { accessToken: session?.access_token }),
      markMessagesRead(conversationId, { accessToken: session?.access_token }).catch(() => null),
    ])
      .then(([nextConversations, nextMessages]) => {
        if (!isMounted) return;
        setError("");
        setConversations(nextConversations);
        setMessages(nextMessages);
        setRequestStatus("success");
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(loadError.message || "Could not load conversation.");
        setRequestStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, session?.access_token, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!supabase || !conversationId || !user) return undefined;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => appendMessage(prev, payload.new));
          markMessagesRead(conversationId, {
            accessToken: session?.access_token,
          }).catch(() => null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, session?.access_token, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedBody = body.trim();
    if (!trimmedBody || isSending) return;

    setIsSending(true);
    setError("");

    try {
      const sentMessage = await sendMessage(conversationId, trimmedBody, {
        accessToken: session?.access_token,
      });
      setMessages((prev) => appendMessage(prev, sentMessage));
      setBody("");
    } catch (sendError) {
      setError(sendError.message || "Could not send message.");
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Conversation</h1>
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

  const otherIsRutgers = activeConversation?.other_participants?.[0]?.profile?.is_rutgers ?? null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--header-h))] max-w-[1000px] flex-col px-6 py-6">
      <div className="mb-4">
        <Link to="/inbox" className="text-sm font-semibold text-red-600">
          Back to Inbox
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {activeConversation ? getParticipantLabel(activeConversation) : "Conversation"}
            <AccountBadge isRutgers={otherIsRutgers} compact />
          </p>
          <h1 className="truncate text-xl font-semibold text-slate-900">
            {activeConversation?.listing?.title || "Listing conversation"}
          </h1>
        </div>

        {otherIsRutgers === false && (
          <div className="flex gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            <Icon name="info" className="mt-0.5 text-[18px]" />
            <p>
              This person isn't using a Rutgers email. Be careful: see the place in person or on a live
              video call before paying, and never send a deposit by gift card, wire or crypto.
            </p>
          </div>
        )}

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
          {isLoading ? (
            <p className="text-slate-600">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
              No messages yet.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isMine = String(message.sender_id) === String(user.id);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isMine
                          ? "bg-red-600 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p
                        className={`mt-2 text-xs ${
                          isMine ? "text-red-100" : "text-slate-400"
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
          <div className="flex gap-3">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              placeholder="Write a message..."
              className="min-h-12 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-red-200 focus:ring"
            />
            <button
              type="submit"
              disabled={!body.trim() || isSending}
              className="h-12 self-end rounded-lg bg-red-600 px-5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function appendMessage(messages, message) {
  if (!message?.id) return messages;
  if (messages.some((item) => String(item.id) === String(message.id))) return messages;

  return [...messages, message].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function getParticipantLabel(conversation) {
  const profile = conversation.other_participants?.[0]?.profile;
  return profile?.name || profile?.full_name || profile?.email || "Conversation";
}

function formatMessageTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default ConversationPage;
