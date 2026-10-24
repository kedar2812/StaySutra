/**
 * The platforms a StaySutra property can sync with, how to find each one's
 * calendar links, and the colour its bookings take in the dashboard planner.
 * The colours are data, kept here, not scattered through components.
 */
export const CHANNELS = {
  AIRBNB: {
    label: "Airbnb",
    color: "#ff7a7a",
    exportHelp: "Airbnb app or website → Listings → your listing → Availability → Connect calendars → Export calendar. Copy the link.",
    importHelp: "On the same screen choose Import calendar, paste the StaySutra link below and name it “StaySutra”.",
  },
  BOOKING_COM: {
    label: "Booking.com",
    color: "#5b9bff",
    exportHelp: "Extranet → Rates & Availability → Sync calendars → Export calendar. Copy the link.",
    importHelp: "On the same page choose Import calendar and paste the StaySutra link below.",
  },
  AGODA: {
    label: "Agoda",
    color: "#b794f6",
    exportHelp: "YCS → Calendar → Calendar sync → Export. Copy the .ics link.",
    importHelp: "Under Calendar sync choose Import and paste the StaySutra link below.",
  },
  MAKEMYTRIP: {
    label: "MakeMyTrip",
    color: "#ff9f43",
    exportHelp: "InGo-MMT → Inventory → Calendar sync (iCal) → Export link. Copy it.",
    importHelp: "Under Calendar sync add an import and paste the StaySutra link below.",
  },
  GOIBIBO: {
    label: "Goibibo",
    color: "#4fd1a5",
    exportHelp: "InGo-MMT → Inventory → Calendar sync (iCal) → Export link. Copy it.",
    importHelp: "Under Calendar sync add an import and paste the StaySutra link below.",
  },
  VRBO: {
    label: "Vrbo",
    color: "#56c2f0",
    exportHelp: "Calendar → Import/Export → Export calendar. Copy the link.",
    importHelp: "Under Import calendar paste the StaySutra link below.",
  },
  OTHER: {
    label: "Other",
    color: "#a0aec0",
    exportHelp: "Find the platform’s “Export calendar” or “iCal link” and copy it.",
    importHelp: "Find the platform’s “Import calendar” and paste the StaySutra link below.",
  },
} as const;

export type ChannelKey = keyof typeof CHANNELS;

export const SOURCE_COLOR = {
  MANUAL: "#8a99ad",
  ENQUIRY: "#e9b93c",
} as const;
