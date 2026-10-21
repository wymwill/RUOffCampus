import { useId } from "react";

const HOUSE = "M6 31 L32 8 L42 16.8 V11 H49 V23 L58 31 H52 V56 H12 V31 Z";
const R_SHAPE =
  "M 17 22.5 H 36 C 43 22.5 47 26 47 31 C 47 35 44.5 37.8 40.5 38.8 L 44 48.5 H 47 V 52.5 H 33.5 V 48.5 H 35 L 32.5 40.5 H 31 V 48.5 H 34 V 52.5 H 17 V 48.5 H 20.5 V 26.5 H 17 Z";
const R_COUNTER = "M 31 26.5 H 34.5 C 37 26.5 38.3 28.3 38.3 31 C 38.3 33.7 37 35.5 34.5 35.5 H 31 Z";

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
