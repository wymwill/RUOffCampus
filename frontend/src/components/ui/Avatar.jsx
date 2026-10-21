import Icon from "./Icon";

/** Profile photo, or the first letter of the name or email on a tint. */
function Avatar({ src, name, email, className = "h-10 w-10 text-sm" }) {
  const label = (name || email || "").trim();
  if (src) {
    return <img src={src} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-high font-bold uppercase text-midnight ${className}`}
    >
      {label ? label[0] : <Icon name="person" filled className="text-[1.4em] text-slate-500" />}
    </span>
  );
}

export default Avatar;
