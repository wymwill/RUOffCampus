/** Material Symbols icon. Decorative by default, pass a label to announce it. */
function Icon({ name, filled = false, className = "", label }) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? "icon-filled" : ""} ${className}`}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}

export default Icon;
