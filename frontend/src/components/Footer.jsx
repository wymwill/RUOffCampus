import { Link } from "react-router-dom";
import Icon from "./ui/Icon";

const BROWSE_LINKS = [
  { to: "/", label: "All listings" },
  { to: "/map", label: "Map view" },
  { to: "/favorites", label: "Saved listings" },
  { to: "/listings/new", label: "Post your sublet" },
];

const ACCOUNT_LINKS = [
  { to: "/login", label: "Sign in or create account" },
  { to: "/inbox", label: "Inbox" },
  { to: "/my-listings", label: "My listings" },
  { to: "/auth/forgot-password", label: "Reset password" },
];

// Official Rutgers pages. All checked to resolve.
const RUTGERS_LINKS = [
  { href: "https://offcampushousing.rutgers.edu", label: "Rutgers Off-Campus Housing" },
  { href: "https://ipo.rutgers.edu/transportation", label: "Rutgers Transportation" },
  { href: "https://ipo.rutgers.edu/publicsafety/rupd", label: "Rutgers Police (RUPD)" },
  { href: "https://rusls.rutgers.edu", label: "Rutgers Student Legal Services" },
  { href: "https://health.rutgers.edu", label: "Rutgers Student Health" },
];

function FooterColumn({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-midnight">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

const linkClass = "text-slate-600 transition-colors hover:text-scarlet";

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-surface-low">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-12 md:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-scarlet text-white">
              <Icon name="home" filled className="text-[20px]" />
            </span>
            <span className="text-lg font-semibold text-midnight">RU Off-Campus</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Sublets and off-campus listings near Rutgers New Brunswick. Anyone can join, and
            accounts with a confirmed Rutgers email are labeled Rutgers verified.
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-verified">
            <Icon name="verified_user" className="text-[16px]" />
            Rutgers verified accounts labeled
          </p>
        </div>

        <FooterColumn title="Browse">
          {BROWSE_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Your account">
          {ACCOUNT_LINKS.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Rutgers resources">
          {RUTGERS_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
        </FooterColumn>
      </div>

      <div className="border-t border-slate-200">
        <p className="mx-auto max-w-[1600px] px-4 py-5 text-xs text-slate-500 md:px-8">
          RU Off-Campus is a student project and is not affiliated with or endorsed by Rutgers,
          The State University of New Jersey. Always check your lease and get any required
          landlord permission before subletting.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
