import Icon from "./ui/Icon";

/**
 * Labels for a person. isRutgers comes from the trusted Supabase flag
 * (confirmed Rutgers email) and isAdmin from the admin flag, which only SQL
 * can set. Admins get their own tag in front of the Rutgers label.
 */
function AccountBadge({ isRutgers, isAdmin = false, compact = false, className = "" }) {
  const size = compact ? "gap-0.5 px-1.5 py-0.5 text-[10px]" : "gap-1 px-2.5 py-1 text-xs";
  const iconSize = compact ? "text-[12px]" : "text-[15px]";

  const adminTag = isAdmin ? (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-midnight font-bold uppercase tracking-[0.06em] text-white ring-1 ring-scarlet/60 ${size} ${className}`}
      title="ScarletSublet admin"
    >
      <Icon name="shield_person" filled className={`${iconSize} text-[#ff5a7a]`} />
      Admin
    </span>
  ) : null;

  if (isRutgers == null) return adminTag;

  const tone = isRutgers ? "bg-verified-soft text-verified" : "bg-amber-50 text-amber-800";

  return (
    <>
      {adminTag}
      <span
        className={`inline-flex shrink-0 items-center rounded-full font-semibold ${tone} ${size} ${className}`}
        title={
          isRutgers
            ? "Confirmed Rutgers email (rutgers.edu or scarletmail.rutgers.edu)"
            : "This account does not use a Rutgers email"
        }
      >
        <Icon name={isRutgers ? "verified" : "person"} filled={isRutgers} className={iconSize} />
        {isRutgers ? "Rutgers verified" : "Non-Rutgers account"}
      </span>
    </>
  );
}

export default AccountBadge;
