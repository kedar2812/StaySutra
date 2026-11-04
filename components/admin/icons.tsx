import type { SVGProps } from "react";

/**
 * The dashboard icon set: a 24px grid, 1.5px stroke, round caps and joins,
 * currentColor — one consistent hand across every screen.
 */
const P = {
  overview: <><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" /></>,
  properties: <><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M9.5 21v-6h5v6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  inbox: <><path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" /><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5" /></>,
  media: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.5-4.5-8 8" /></>,
  content: <><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M9 9v11" /></>,
  map: <><path d="m9 4.5-5.5 2v13l5.5-2 6 2 5.5-2v-13l-5.5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>,
  stories: <><path d="M5 4.5h10.5L19 8v11.5H5z" /><path d="M15 4.5V8h4M8.5 12h7M8.5 15.5h7" /></>,
  lists: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.75" cy="6.5" r=".9" fill="currentColor" /><circle cx="4.75" cy="12" r=".9" fill="currentColor" /><circle cx="4.75" cy="17.5" r=".9" fill="currentColor" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 7.4M18.5 14.5a6.5 6.5 0 0 1 3 5.5" /></>,
  logout: <><path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16.5 14.5 12 10 7.5M14.5 12H4" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: <><path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10.5v5.5M14 10.5v5.5" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.6M6.4 6.5A16.7 16.7 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1M9.9 10a2.8 2.8 0 0 0 4 4" /></>,
  external: <><path d="M13.5 4.5h6v6M19.5 4.5 11 13" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 8.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h3.5" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.8-3.5M4 4v4h4M4 13a8 8 0 0 0 14.8 3.5M20 20v-4h-4" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  more: <><circle cx="5.5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18.5" cy="12" r="1.2" fill="currentColor" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sidebar: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9.5 4.5v15" /></>,
  upload: <><path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" /></>,
  download: <><path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5" /><path d="M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" /></>,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>,
  phone: <path d="M8.5 3.5H6A2 2 0 0 0 4 5.6 16.5 16.5 0 0 0 18.4 20a2 2 0 0 0 2.1-2v-2.5l-3.5-1.5-2 2a12 12 0 0 1-5-5l2-2z" />,
  whatsapp: <><path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.5z" /><path d="M9 9.2c0 2.8 2.2 5.4 5.4 5.9l1.1-1.3-1.7-.9-.7.8a4 4 0 0 1-2.3-2.3l.8-.7-.9-1.7-1.3 1.1z" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  grip: <><circle cx="9" cy="6.5" r="1.1" fill="currentColor" /><circle cx="15" cy="6.5" r="1.1" fill="currentColor" /><circle cx="9" cy="12" r="1.1" fill="currentColor" /><circle cx="15" cy="12" r="1.1" fill="currentColor" /><circle cx="9" cy="17.5" r="1.1" fill="currentColor" /><circle cx="15" cy="17.5" r="1.1" fill="currentColor" /></>,
  star: <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" />,
  alert: <><path d="M12 4.5 21 19.5H3z" /><path d="M12 10v4M12 16.8v.2" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  sparkle: <path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z" />,
  sync: <><path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5M20 4.5v5h-5M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5M4 19.5v-5h5" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  note: <><path d="M5 4.5h14v10l-5 5H5z" /><path d="M14 19.5v-5h5" /></>,
  sun: <><circle cx="12" cy="12" r="3.8" /><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" /></>,
  moon: <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />,
  monitor: <><rect x="3" y="4.5" width="18" height="12" rx="2.2" /><path d="M9 20h6M12 16.5V20" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.8" /><rect x="13" y="4" width="7" height="7" rx="1.8" /><rect x="4" y="13" width="7" height="7" rx="1.8" /><rect x="13" y="13" width="7" height="7" rx="1.8" /></>,
  rows: <><rect x="4" y="4.5" width="16" height="6" rx="1.8" /><rect x="4" y="13.5" width="16" height="6" rx="1.8" /></>,
  bed: <><path d="M3 18.5V6M3 14h18v4.5M21 14v-2.5a3 3 0 0 0-3-3h-7V14" /><circle cx="7" cy="11" r="1.8" /></>,
  bolt: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.5-4.5-8 8" /></>,
  imagePlus: <><path d="M20.5 12v5a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17V7A2.5 2.5 0 0 1 6 4.5h6" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.5-4.5-8 8M18 2.8v6M15 5.8h6" /></>,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.2 2.6 2.6 4.9-5.4" /></>,
  xCircle: <><circle cx="12" cy="12" r="8.5" /><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" /></>,
  rupee: <path d="M7 4.5h10M7 8.5h10M8 4.5h3a4 4 0 0 1 0 8H8l7.5 7" />,
  command: <path d="M9 9V6.5A2.5 2.5 0 1 0 6.5 9H9zm0 0v6m0-6h6m-6 6H6.5A2.5 2.5 0 1 0 9 17.5V15zm0 0h6m0 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15zm0 0V9m0 0h2.5A2.5 2.5 0 1 0 15 6.5V9z" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  pause: <><rect x="6.5" y="5" width="3.5" height="14" rx="1.2" /><rect x="14" y="5" width="3.5" height="14" rx="1.2" /></>,
  cloud: <><path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.6a4 4 0 0 1-.5 9.9z" /><path d="M12 15.5V10M9.6 12.2 12 9.8l2.4 2.4" /></>,
  arrowUpRight: <path d="M7 17 17 7M8.5 7H17v8.5" />,
  trendUp: <path d="m3.5 16.5 5.5-5.5 4 4 7.5-7.5M15 7.5h5.5V13" />,
  trendDown: <path d="m3.5 7.5 5.5 5.5 4-4 7.5 7.5M15 16.5h5.5V11" />,
  door: <><path d="M5 20.5V4.5A1.5 1.5 0 0 1 6.5 3h8A1.5 1.5 0 0 1 16 4.5v16" /><path d="M3 20.5h18M12.5 12v.2M16 6h2.5A1.5 1.5 0 0 1 20 7.5v13" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="m7.5 14.5 3.5-4 3 2.5 5-6" /></>,
  pulse: <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />,
  bike: <><circle cx="6" cy="16" r="3.5" /><circle cx="18" cy="16" r="3.5" /><path d="M6 16l3.5-7h5l3.5 7M12 16l-2.5-7M14.5 9l1-3h2" /></>,
} as const;

export type AdminIconName = keyof typeof P;

export function AdminIcon({
  name,
  size = 18,
  ...rest
}: { name: AdminIconName; size?: number } & SVGProps<SVGSVGElement>) {
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
      aria-hidden
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
