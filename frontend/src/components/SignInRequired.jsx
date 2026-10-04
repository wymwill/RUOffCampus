import { Link } from "react-router-dom";

function SignInRequired({ message }) {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-600">
          Sign in required
        </p>
        <h1 className="mt-4 text-[26px] font-bold leading-8 tracking-[-0.015em] text-midnight md:text-[32px] md:leading-10">{message}</h1>
        <Link
          to="/login"
          className="mt-8 inline-flex rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Sign in or create account
        </Link>
      </div>
    </div>
  );
}

export default SignInRequired;
