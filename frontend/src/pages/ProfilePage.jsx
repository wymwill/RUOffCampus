import { useState } from "react";
import { Link } from "react-router-dom";
import { updateMyProfile } from "../api/profileApi";
import AccountBadge from "../components/AccountBadge";
import SignInRequired from "../components/SignInRequired";
import Avatar from "../components/ui/Avatar";
import Icon from "../components/ui/Icon";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { fileToAvatar } from "../utils/imageUtils";

const BIO_LIMIT = 500;
const THIS_YEAR = new Date().getFullYear();
const CLASS_YEARS = Array.from({ length: 10 }, (_, index) => THIS_YEAR - 4 + index);

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-midnight outline-none transition focus:border-midnight focus:ring-2 focus:ring-midnight/20";
const labelClass = "mb-1.5 block text-sm font-semibold text-midnight";

function toForm(profile) {
  return {
    name: profile?.name ?? "",
    pronouns: profile?.pronouns ?? "",
    classYear: profile?.classYear ?? "",
    bio: profile?.bio ?? "",
    avatarUrl: profile?.avatarUrl ?? "",
  };
}

function ProfileForm({ profile, user, isAdmin, accessToken, onSaved }) {
  const [form, setForm] = useState(() => toForm(profile));
  const [status, setStatus] = useState({ saving: false, message: "", error: "" });
  const isDirty = JSON.stringify(form) !== JSON.stringify(toForm(profile));
  const update = (changes) => setForm((prev) => ({ ...prev, ...changes }));

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      update({ avatarUrl: await fileToAvatar(file) });
      setStatus({ saving: false, message: "", error: "" });
    } catch (photoError) {
      setStatus({ saving: false, message: "", error: photoError.message });
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setStatus({ saving: true, message: "", error: "" });
    try {
      const saved = await updateMyProfile(form, { accessToken });
      onSaved(saved);
      setStatus({ saving: false, message: "Profile saved.", error: "" });
    } catch (saveError) {
      setStatus({ saving: false, message: "", error: saveError.message });
    }
  };

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card">
        <Avatar
          src={form.avatarUrl}
          name={form.name}
          email={user.email}
          className="h-32 w-32 text-4xl"
        />
        <div className="flex flex-wrap justify-center gap-2">
          <label className="cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-midnight transition hover:bg-surface-low">
            {form.avatarUrl ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
          </label>
          {form.avatarUrl && (
            <button
              type="button"
              onClick={() => update({ avatarUrl: "" })}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-midnight"
            >
              Remove
            </button>
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-midnight">{form.name || "Add your name"}</p>
          {form.pronouns && <p className="text-sm text-slate-600">{form.pronouns}</p>}
          {form.classYear && <p className="text-sm text-slate-600">Class of {form.classYear}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          <AccountBadge isRutgers={profile?.isRutgers ?? null} isAdmin={isAdmin} />
        </div>
        <p className="text-xs text-slate-600">
          This is how hosts and renters see you on listings and in messages.
        </p>
      </aside>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-5 text-lg font-bold text-midnight">About you</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="profile-name" className={labelClass}>
                Display name
              </label>
              <input
                id="profile-name"
                value={form.name}
                maxLength={60}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="First and last name"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="profile-pronouns" className={labelClass}>
                Pronouns <span className="font-normal text-slate-600">(optional)</span>
              </label>
              <input
                id="profile-pronouns"
                value={form.pronouns}
                maxLength={30}
                onChange={(e) => update({ pronouns: e.target.value })}
                placeholder="e.g. she/her"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="profile-class" className={labelClass}>
                Class year <span className="font-normal text-slate-600">(optional)</span>
              </label>
              <select
                id="profile-class"
                value={form.classYear}
                onChange={(e) => update({ classYear: e.target.value ? Number(e.target.value) : "" })}
                className={fieldClass}
              >
                <option value="">Not a student / prefer not to say</option>
                {CLASS_YEARS.map((year) => (
                  <option key={year} value={year}>
                    Class of {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="profile-bio" className={labelClass}>
                Bio <span className="font-normal text-slate-600">(optional)</span>
              </label>
              <textarea
                id="profile-bio"
                rows={4}
                value={form.bio}
                maxLength={BIO_LIMIT}
                onChange={(e) => update({ bio: e.target.value })}
                placeholder="Major, schedule, what you're looking for in a roommate or subletter..."
                className={fieldClass}
              />
              <p className="mt-1 text-right text-xs text-slate-600">
                {form.bio.length}/{BIO_LIMIT}
              </p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!isDirty || status.saving}
              className="rounded-full bg-scarlet px-6 py-2.5 text-sm font-semibold text-white shadow-scarlet transition hover:bg-scarlet-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.saving ? "Saving..." : "Save profile"}
            </button>
            {isDirty && !status.saving && (
              <button
                type="button"
                onClick={() => setForm(toForm(profile))}
                className="text-sm font-semibold text-slate-600 hover:text-midnight"
              >
                Discard changes
              </button>
            )}
            {status.message && (
              <p role="status" className="flex items-center gap-1 text-sm font-semibold text-verified">
                <Icon name="check_circle" filled className="text-[18px]" />
                {status.message}
              </p>
            )}
            {status.error && (
              <p role="alert" className="text-sm font-semibold text-red-700">
                {status.error}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-lg font-bold text-midnight">Account</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold text-midnight">Email</dt>
              <dd className="text-slate-600">{user.email}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold text-midnight">Member since</dt>
              <dd className="text-slate-600">
                {new Date(profile?.createdAt || user.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/my-listings"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-midnight hover:bg-surface-low"
            >
              My listings
            </Link>
            <Link
              to="/auth/forgot-password"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-midnight hover:bg-surface-low"
            >
              Change password
            </Link>
            <button
              type="button"
              onClick={() => supabase?.auth.signOut()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-midnight hover:bg-surface-low"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}

function ProfilePage() {
  const { user, session, profile, setProfile, isAdmin, isReady } = useAuth();

  if (!isReady) return <p className="px-6 py-10 text-slate-600">Checking authentication status...</p>;
  if (!user) return <SignInRequired message="Sign in to edit your profile." />;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-scarlet">Your account</p>
      <h1 className="mb-6 text-[26px] font-bold leading-8 text-midnight md:text-[32px] md:leading-10">Profile</h1>
      {profile ? (
        <ProfileForm
          key={profile.id}
          profile={profile}
          user={user}
          isAdmin={isAdmin}
          accessToken={session?.access_token}
          onSaved={setProfile}
        />
      ) : (
        <p className="text-slate-600">Loading your profile...</p>
      )}
    </main>
  );
}

export default ProfilePage;
