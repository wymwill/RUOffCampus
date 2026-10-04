import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { isAllowedEmail, RUTGERS_EMAIL_HINT } from "../utils/rutgersEmail";

// Each of these is enforced by the app, not just claimed.
const TRUST_POINTS = [
  { icon: "verified_user", title: "Rutgers emails only", detail: "Other domains can't sign up" },
  { icon: "mark_email_read", title: "Confirmed accounts", detail: "Needed to post or message" },
  { icon: "forum", title: "In-app messaging", detail: "No need to share your number" },
];

const fieldClass =
  "w-full rounded-xl bg-surface-low py-3 pl-11 pr-4 text-sm text-midnight outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-midnight";

function LoginPage() {
  const navigate = useNavigate();
  const { isConfigured, isReady, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState("signin");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const isSignIn = mode === "signin";

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (!supabase || !isConfigured) {
        throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      }

      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate("/");
      } else {
        if (!isAllowedEmail(email)) {
          throw new Error(RUTGERS_EMAIL_HINT);
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          if (/rutgers email/i.test(error.message || "")) {
            throw new Error(RUTGERS_EMAIL_HINT);
          }
          throw error;
        }
        setSuccessMessage("Account created. Check your Rutgers inbox for the confirmation link, then sign in.");
        setMode("signin");
      }
    } catch (error) {
      setErrorMessage(error.message || "Could not authenticate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setErrorMessage("");
    setSuccessMessage("");
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
              <Icon name="shield_person" className="text-[30px]" />
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">
              Rutgers students only
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight">
              {isSignIn ? "Sign in to RU Off-Campus" : "Create your student account"}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-[22px] text-slate-500">
              {isSignIn
                ? "Save sublets, message other Rutgers students and post your own place."
                : "Sign up with your Rutgers email to post sublets and message hosts."}
            </p>
          </div>

          <div className="mt-8 flex gap-3 rounded-xl bg-surface-low px-4 py-4">
            <Icon name="verified_user" className="mt-0.5 text-[20px] text-verified" />
            <div className="text-sm">
              <p className="font-semibold text-midnight">Rutgers email verification</p>
              <p className="mt-0.5 text-xs leading-[18px] text-slate-500">
                Use your <span className="font-semibold text-midnight">@scarletmail.rutgers.edu</span> or{" "}
                <span className="font-semibold text-midnight">@rutgers.edu</span> email. New accounts confirm the
                email before posting or messaging.
              </p>
            </div>
          </div>

          {!isConfigured && (
            <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase frontend env vars are missing. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
            </p>
          )}

          {isConfigured && !isReady && (
            <p className="mt-4 text-sm text-slate-500">Restoring session...</p>
          )}

          {session?.user && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-verified-soft px-4 py-3 text-sm text-verified">
              Signed in as {session.user.email}
            </p>
          )}

          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="login-email" className="text-sm font-semibold text-midnight">
                Rutgers email
              </label>
              <span className="text-xs text-slate-400">e.g. netid@scarletmail.rutgers.edu</span>
            </div>
            <div className="relative">
              <Icon
                name="mail"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-500"
              />
              <input
                id="login-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className={fieldClass}
                placeholder="you@scarletmail.rutgers.edu"
                required
              />
            </div>
            {!isSignIn && <p className="mt-2 text-xs text-slate-500">{RUTGERS_EMAIL_HINT}</p>}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="login-password" className="text-sm font-semibold text-midnight">
                Password
              </label>
              {isSignIn && (
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-semibold text-scarlet hover:text-scarlet-dark"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Icon
                name="lock"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-500"
              />
              <input
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                className={`${fieldClass} pr-12`}
                placeholder={isSignIn ? "Enter your password" : "At least 6 characters"}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-surface hover:text-midnight"
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
              </button>
            </div>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 bg-verified-soft px-4 py-3 text-sm text-verified"
            >
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!isConfigured || isSubmitting}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-scarlet px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(204,0,51,0.25)] transition hover:bg-scarlet-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait..."
              : isSignIn
                ? "Sign in to student account"
                : "Create student account"}
            {!isSubmitting && <Icon name="arrow_forward" className="text-[18px]" />}
          </button>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
            {isSignIn ? "Don't have an account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-scarlet hover:text-scarlet-dark"
            >
              {isSignIn ? "Create student account" : "Sign in"}
            </button>
          </div>
        </form>

        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <li
              key={point.title}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-card"
            >
              <Icon name={point.icon} className="text-[20px] text-verified" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-midnight">
                  {point.title}
                </p>
                <p className="text-xs text-slate-500">{point.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Check your lease and get any required landlord permission before subletting.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
