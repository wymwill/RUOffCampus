import Icon from "./ui/Icon";

/**
 * Rutgers or non-Rutgers label for a person. isRutgers comes from the
 * trusted Supabase flag (confirmed Rutgers email). Null renders nothing.
 */
function AccountBadge({ isRutgers, compact = false, className = "" }) {
  if (isRutgers == null) return null;

  const tone = isRutgers ? "bg-verified-soft text-verified" : "bg-amber-50 text-amber-800";
  const size = compact ? "gap-0.5 px-1.5 py-0.5 text-[10px]" : "gap-1 px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-semibold ${tone} ${size} ${className}`}
      title={
        isRutgers
          ? "Confirmed Rutgers email (rutgers.edu or scarletmail.rutgers.edu)"
          : "This account does not use a Rutgers email"
      }
    >
      <Icon
        name={isRutgers ? "verified" : "person"}
        filled={isRutgers}
        className={compact ? "text-[12px]" : "text-[15px]"}
      />
      {isRutgers ? "Rutgers verified" : "Non-Rutgers account"}
    </span>
  );
}

export default AccountBadge;
