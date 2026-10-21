import { useId } from "react";

const HOUSE = "M6 31 L32 8 L42 16.8 V11 H49 V23 L58 31 H52 V56 H12 V31 Z";
const R_SHAPE =
  "M17 26.5 H36 C43 26.5 47 30 47 35 C47 39 44.5 41.8 40.5 42.8 L44 52.5 H47 V56.5 H33.5 V52.5 H35 L32.5 44.5 H31 V52.5 H34 V56.5 H17 V52.5 H20.5 V30.5 H17 Z";
const R_COUNTER = "M31 30.5 H34.5 C37 30.5 38.3 32.3 38.3 35 C38.3 37.7 37 39.5 34.5 39.5 H31 Z";

/** ScarletSublet house with a block R cut out of it. The R is see-through. */
function LogoMark({ className = "", title }) {
  const maskId = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <path d={R_SHAPE} fill="#000" />
          <path d={R_COUNTER} fill="#fff" />
        </mask>
      </defs>
      <path d={HOUSE} fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export default LogoMark;
