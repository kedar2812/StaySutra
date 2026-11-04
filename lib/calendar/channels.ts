/**
 * The platforms a StaySutra property can sync with, how to find each one's
 * calendar links, and the colour its bookings take in the dashboard planner.
 * The colours are dashboard theme tokens (app/admin.css), so each one has a
 * light and a dark step validated against that surface.
 */
export const CHANNELS = {
  AIRBNB: {
    label: "Airbnb",
    color: "var(--ch-airbnb)",
    exportHelp: "Airbnb app or website → Listings → your listing → Availability → Connect calendars → Export calendar. Copy the link.",
    importHelp: "On the same screen choose Import calendar, paste the StaySutra link below and name it “StaySutra”.",
  },
  BOOKING_COM: {
    label: "Booking.com",
    color: "var(--ch-booking)",
    exportHelp: "Extranet → Rates & Availability → Sync calendars → Export calendar. Copy the link.",
    importHelp: "On the same page choose Import calendar and paste the StaySutra link below.",
  },
  AGODA: {
    label: "Agoda",
    color: "var(--ch-agoda)",
    exportHelp: "YCS → Calendar → Calendar sync → Export. Copy the .ics link.",
    importHelp: "Under Calendar sync choose Import and paste the StaySutra link below.",
  },
  MAKEMYTRIP: {
    label: "MakeMyTrip",
    color: "var(--ch-mmt)",
    exportHelp: "InGo-MMT → Inventory → Calendar sync (iCal) → Export link. Copy it.",
    importHelp: "Under Calendar sync add an import and paste the StaySutra link below.",
  },
  GOIBIBO: {
    label: "Goibibo",
    color: "var(--ch-goibibo)",
    exportHelp: "InGo-MMT → Inventory → Calendar sync (iCal) → Export link. Copy it.",
    importHelp: "Under Calendar sync add an import and paste the StaySutra link below.",
  },
  VRBO: {
    label: "Vrbo",
    color: "var(--ch-vrbo)",
    exportHelp: "Calendar → Import/Export → Export calendar. Copy the link.",
    importHelp: "Under Import calendar paste the StaySutra link below.",
  },
  OTHER: {
    label: "Other",
    color: "var(--ch-other)",
    exportHelp: "Find the platform’s “Export calendar” or “iCal link” and copy it.",
    importHelp: "Find the platform’s “Import calendar” and paste the StaySutra link below.",
  },
} as const;

export type ChannelKey = keyof typeof CHANNELS;

export const SOURCE_COLOR = {
  MANUAL: "var(--ch-manual)",
  ENQUIRY: "var(--ch-staysutra)",
} as const;
