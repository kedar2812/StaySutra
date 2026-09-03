import type { SVGProps } from "react";

/**
 * The single icon family. 24px grid, 1.5px stroke, rounded caps, currentColor.
 * Amenity, facility, category and UI icons all come from here.
 * No emoji, no second set. DPR §4.7
 */

export type IconName = keyof typeof paths;

const paths = {
  /* — Rider & road ————————————————————————————————— */
  motorcycle: (
    <>
      <circle cx="5.5" cy="16.5" r="3.5" />
      <circle cx="18.5" cy="16.5" r="3.5" />
      <path d="M5.5 16.5h4.2l3.1-6.2h4.4" />
      <path d="M13.5 6.5h2.6l1.6 3.5" />
      <path d="M9.7 16.5 8 12.5h4" />
    </>
  ),
  helmet: (
    <>
      <path d="M3.5 13.5a8.5 8.5 0 0 1 17 0v2a2 2 0 0 1-2 2h-4l-1.5-2.5H3.7" />
      <path d="M3.6 12.9h9.2a2 2 0 0 1 1.7 3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="5.5" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M6 8v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3" />
    </>
  ),
  mountain: (
    <>
      <path d="M2.5 19.5 9 7.5l4.2 7.4" />
      <path d="m11 19.5 4.4-8 6.1 8z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.2 8.8-1.7 4.7-4.7 1.7 1.7-4.7z" />
    </>
  ),
  fuel: (
    <>
      <path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h6A1.5 1.5 0 0 1 13 5.5V20" />
      <path d="M3 20h11" />
      <path d="M13 10h3.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
      <path d="M6.5 7.5h4v3h-4z" />
    </>
  ),

  /* — Facilities ————————————————————————————————— */
  parking: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M9.5 16.5v-9h3.2a2.9 2.9 0 0 1 0 5.8H9.5" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.6 6.2a4.3 4.3 0 0 0 5.4 5.6l-8.2 8.2a2.3 2.3 0 0 1-3.3-3.3z" />
      <path d="M14.6 6.2 12 3.6a4.3 4.3 0 0 0-3.6 6.9" />
    </>
  ),
  wash: (
    <>
      <path d="M6 3.5v6" />
      <path d="M3.5 9.5h5" />
      <path d="M8.5 6.5h6.8a3 3 0 0 1 3 3v1.5" />
      <path d="M18.3 14.2c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8 1.8-3.2 1.8-3.2 1.8 2.2 1.8 3.2Z" />
      <path d="M4 20.5h16" />
    </>
  ),
  bonfire: (
    <>
      <path d="M12 3.5c2.4 2.4 3.6 4.3 3.6 6a3.6 3.6 0 0 1-7.2 0c0-1.7 1.2-3.6 3.6-6Z" />
      <path d="M4 20.5 12 16l8 4.5" />
      <path d="M5.5 16.5 18 20" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.2 2.8 7.6 7 9.8 4.2-2.2 7-5.6 7-9.8V5.8z" />
      <path d="m9.2 11.8 2 2 3.6-3.8" />
    </>
  ),
  headset: (
    <>
      <path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3" />
      <path d="M4.5 13.5h1.8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1z" />
      <path d="M19.5 13.5h-1.8a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h.8a1 1 0 0 0 1-1z" />
      <path d="M19.5 18v.5a2.5 2.5 0 0 1-2.5 2.5h-2.2" />
    </>
  ),

  /* — Amenities ————————————————————————————————— */
  wifi: (
    <>
      <path d="M2.8 9a13 13 0 0 1 18.4 0" />
      <path d="M6.2 12.4a8.2 8.2 0 0 1 11.6 0" />
      <path d="M9.6 15.8a3.4 3.4 0 0 1 4.8 0" />
      <path d="M12 19.2h.01" />
    </>
  ),
  pool: (
    <>
      <path d="M2.5 17.5c1.6 0 1.6 1.4 3.2 1.4s1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3.2-1.4 1.6 1.4 3.2 1.4 1.6-1.4 3-1.4" />
      <path d="M7.5 15V6a2 2 0 0 1 4 0" />
      <path d="M14.5 15V6a2 2 0 0 1 4 0" />
      <path d="M7.5 10h7" />
    </>
  ),
  kitchen: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M3.5 9.5h17" />
      <path d="M7 6.5h.01M10.5 6.5h.01" />
      <path d="M12 12.5v5" />
      <path d="M9 12.5c0 1.7 1.3 3 3 3s3-1.3 3-3" />
    </>
  ),
  meals: (
    <>
      <path d="M5 3.5v7a2.5 2.5 0 0 0 5 0v-7" />
      <path d="M7.5 10.5v10" />
      <path d="M17 20.5V3.5c-1.9.7-3 2.7-3 5.2s1.1 4 3 4.3" />
    </>
  ),
  ac: (
    <>
      <rect x="3" y="5" width="18" height="7" rx="2" />
      <path d="M6.5 8.5h11" />
      <path d="M7.5 15v3M12 15v4.5M16.5 15v3" />
    </>
  ),
  pets: (
    <>
      <ellipse cx="6.6" cy="10" rx="1.8" ry="2.3" />
      <ellipse cx="17.4" cy="10" rx="1.8" ry="2.3" />
      <ellipse cx="10" cy="6.4" rx="1.7" ry="2.2" />
      <ellipse cx="14.6" cy="6.4" rx="1.7" ry="2.2" />
      <path d="M12 12.5c2.6 0 4.7 1.9 4.7 4.2 0 1.7-1.4 2.8-3 2.4l-1.7-.4-1.7.4c-1.6.4-3-.7-3-2.4 0-2.3 2.1-4.2 4.7-4.2Z" />
    </>
  ),
  trek: (
    <>
      <circle cx="14.5" cy="4.8" r="1.8" />
      <path d="m8 20.5 2.6-5 2.1 2.3.9 2.7" />
      <path d="m10.6 15.5-.9-4.4L13 8.4l2.6 2.3 2.6.9" />
      <path d="M6.5 3.5v17" />
      <path d="M6.5 3.5 9 5" />
    </>
  ),
  view: (
    <>
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),

  /* — Property types ————————————————————————————— */
  villa: (
    <>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5.5 9.3V20h13V9.3" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  farmhouse: (
    <>
      <path d="M3 11 12 4.5 21 11" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 13.5h5v6.5h-5z" />
      <path d="M12 13.5V20" />
    </>
  ),
  resort: (
    <>
      <path d="M4 20.5h16" />
      <path d="M6.5 20.5V9.5h11v11" />
      <path d="M6.5 13h11M6.5 16.8h11" />
      <path d="M4.5 9.5 12 5l7.5 4.5" />
    </>
  ),
  highway: (
    <>
      <path d="M9 3.5 6 20.5M15 3.5l3 17" />
      <path d="M12 4.5v3M12 10.5v3M12 16.5v3" />
    </>
  ),
  homestay: (
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M12 20v-4a2 2 0 0 1 4 0v4" />
      <circle cx="9.5" cy="14" r="1.5" />
    </>
  ),

  /* — Layout & UI ————————————————————————————————— */
  guests: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20v-1a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v1" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9" />
      <path d="M17.5 14.2a5 5 0 0 1 3 4.6v1.2" />
    </>
  ),
  bed: (
    <>
      <path d="M3 19.5v-13" />
      <path d="M3 10.5h13a5 5 0 0 1 5 5v4" />
      <path d="M3 15.5h18" />
      <circle cx="7.5" cy="13" r="0.01" />
    </>
  ),
  bath: (
    <>
      <path d="M3.5 12.5h17v2.2a4.3 4.3 0 0 1-4.3 4.3H7.8a4.3 4.3 0 0 1-4.3-4.3z" />
      <path d="M6 12.5V6.2A2.2 2.2 0 0 1 8.2 4c1 0 1.9.7 2.1 1.7" />
      <path d="M7.5 19v1.5M16.5 19v1.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21c4-4.4 6-7.6 6-10a6 6 0 1 0-12 0c0 2.4 2 5.6 6 10Z" />
      <circle cx="12" cy="10.8" r="2.4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v3M16 3.5v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20.5 20.5-4.8-4.8" />
    </>
  ),
  filter: (
    <>
      <path d="M3.5 6.5h17" />
      <path d="M6.5 12h11" />
      <path d="M10 17.5h4" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19.5 12h-15" />
      <path d="m10.5 6-6 6 6 6" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </>
  ),
  chevronDown: <path d="m5.5 9 6.5 6.5L18.5 9" />,
  chevronRight: <path d="m9 5.5 6.5 6.5L9 18.5" />,
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  menu: (
    <>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h12" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  heart: (
    <path d="M12 20.3S3.8 15.4 3.8 9.7A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.2 2.4c0 5.7-8.2 10.6-8.2 10.6Z" />
  ),
  star: (
    <path d="m12 3.8 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 10l5.9-.9z" />
  ),
  whatsapp: (
    <>
      <path d="M3.6 20.4 5 16.3a8 8 0 1 1 3 3z" />
      <path d="M9 9.4c0 2.6 3 5.6 5.6 5.6.6 0 1.2-.5 1.5-1.1l-1.8-1-.9.9c-1-.4-2.2-1.6-2.6-2.6l.9-.9-1-1.8c-.6.3-1.1.9-1.1 1.5" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.6 6.8 7.2 5.3a2 2 0 0 0 2.4 0l7.2-5.3" />
    </>
  ),
  phone: (
    <path d="M8.4 4.5 10 8l-1.7 1.7a11 11 0 0 0 6 6L16 14l3.5 1.6v3a1.9 1.9 0 0 1-2.1 1.9C10.4 20 4 13.6 3.5 6.6A1.9 1.9 0 0 1 5.4 4.5z" />
  ),
  upload: (
    <>
      <path d="M12 16V4.5" />
      <path d="m7.5 9 4.5-4.5L16.5 9" />
      <path d="M4 15v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V15" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8.5h3l1.6-2.5h7.8l1.6 2.5h3v10a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
      <circle cx="12" cy="13.5" r="3.6" />
    </>
  ),
  quote: (
    <>
      <path d="M9.5 6.5c-2.8 1-4.5 3.4-4.5 6.5v4.5h5V13H6.6" />
      <path d="M19.5 6.5c-2.8 1-4.5 3.4-4.5 6.5v4.5h5V13h-3.4" />
    </>
  ),
  community: (
    <>
      <circle cx="12" cy="7" r="3" />
      <circle cx="5.5" cy="16" r="2.6" />
      <circle cx="18.5" cy="16" r="2.6" />
      <path d="M9.4 9.3 7.6 13.6M14.6 9.3l1.8 4.3M8.1 16h7.8" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.2A1.7 1.7 0 0 1 5.7 3.5H10a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h4.3A1.7 1.7 0 0 1 20 5.2v12a1.7 1.7 0 0 1-1.7 1.7H14a2 2 0 0 0-2 1.6 2 2 0 0 0-2-1.6H5.7A1.7 1.7 0 0 1 4 17.2z" />
      <path d="M12 4.5v16" />
    </>
  ),
} as const;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** Decorative by default; pass a label to expose it to assistive tech. */
  label?: string;
}

export function Icon({ name, size = 24, label, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

/** Maps a database `iconKey` to an icon, falling back to a neutral mark. */
export function iconFor(key: string | null | undefined): IconName {
  if (key && key in paths) return key as IconName;
  return "check";
}
