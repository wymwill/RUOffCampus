import { useState } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { submitFeedback } from "../api/feedbackApi";
import { buildFeedbackPayload } from "../utils/feedbackForm";

const fieldClass =
  "w-full rounded-xl bg-surface-low py-3 px-4 text-sm text-midnight outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-midnight";

const IDEAS = [
  { icon: "map", text: "Something confusing on the map or a listing" },
  { icon: "bug_report", text: "A bug, like a filter that resets or a page that breaks" },
  { icon: "lightbulb", text: "A feature that would make subletting easier" },
];

function FeedbackPage() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const payload = buildFeedbackPayload({ message, email });
    if (payload.error) {
      setErrorMessage(payload.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({ ...payload, page: pathname });
      setSent(true);
    } catch (error) {
      setErrorMessage(error.message || "Could not send feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[radial-gradient(ellipse_at_top_left,#ffe4e6_0%,transparent_45%),radial-gradient(ellipse_at_bottom_right,#e5eeff_0%,transparent_50%)] px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 border-t-[6px] border-t-scarlet bg-white px-6 py-10 shadow-lift md:px-11"
        >
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-scarlet">
              <Icon name="forum" className="text-[30px]" />
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
              Built by Rutgers students
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight">
              Tell us what to fix next
            </h1>
            <p className="mt-2 max-w-md text-sm leading-[22px] text-slate-500">
              RU Off-Campus is a small student project. Every note lands with the people building it.
            </p>
          </div>

          <div className="mt-8 space-y-2">
            {IDEAS.map((idea) => (
              <div key={idea.icon} className="flex items-center gap-3 rounded-xl bg-surface-low px-4 py-3">
                <Icon name={idea.icon} className="text-[20px] text-scarlet" />
                <p className="text-sm text-slate-600">{idea.text}</p>
              </div>
            ))}
          </div>

          {sent ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-verified-soft px-4 py-4">
              <Icon name="check_circle" className="mt-0.5 text-[20px] text-verified" />
              <div className="text-sm">
                <p className="font-semibold text-verified">Thanks, we got it.</p>
                <p className="mt-0.5 text-xs leading-[18px] text-slate-500">
                  We read every message. If you left an email, we'll write back when it's fixed.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <label htmlFor="feedback-message" className="text-sm font-semibold text-midnight">
                    Your feedback
                  </label>
                  <span className="text-xs text-slate-400">{message.trim().length}/4000</span>
                </div>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className={`${fieldClass} min-h-32 resize-y`}
                  placeholder="The map pins are hard to tap on my phone..."
                  required
                  maxLength={4000}
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <label htmlFor="feedback-email" className="text-sm font-semibold text-midnight">
                    Email
                  </label>
                  <span className="text-xs text-slate-400">Optional, only if you want a reply</span>
                </div>
                <input
                  id="feedback-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  className={fieldClass}
                  placeholder="you@scarletmail.rutgers.edu"
                />
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-scarlet py-3.5 text-sm font-bold text-white shadow-scarlet transition hover:bg-scarlet-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="send" className="text-[18px]" />
                {isSubmitting ? "Sending..." : "Send feedback"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default FeedbackPage;
