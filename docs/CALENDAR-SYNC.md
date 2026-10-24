# Calendar sync (iCal)

How StaySutra keeps its availability in step with Airbnb, Booking.com, Agoda,
MakeMyTrip, Goibibo and Vrbo, so a night sold on one is closed on all of them.

## What iCal does, and what it doesn’t

Every platform publishes an **export link** (`.ics`) per listing — a list of
unavailable dates — and can **import** someone else’s. That is all iCal
carries: **dates only**. No prices, no guest details, no listing text, no
photos. Listing details and photos are edited in the dashboard; prices on
each platform are set on that platform.

## How it works here

```
Airbnb ──export link──▶ StaySutra (every 15 min) ──▶ booked nights blocked on the site
                                    │
StaySutra ──per-platform link──▶ Airbnb, Booking.com… (each polls on its own schedule)
```

- **Import.** The app fetches each connected platform’s export link every 15
  minutes (`instrumentation.ts`) and on **Calendar → Sync now**. Each event
  becomes a `CalendarBlock` tied to that feed; events that disappear (a
  cancellation) are removed on the next sync. If a platform is unreachable the
  last good blocks are **kept** — an outage never reopens booked nights.
- **Export.** Every connected platform gets its own link,
  `/calendar/<token>.ics`. It contains every blocked night on the property
  **except that platform’s own bookings**, so Airbnb never sees its
  reservations echoed back as foreign blocks. A property-wide link (all
  blocks) is shown under *StaySutra calendar link* for platforms not set up
  as channels. Links are unguessable and can be reissued if one leaks.
- **On the website** booked nights are struck through on the stay page, the
  date picker will not let a guest choose them, and the enquiry endpoint
  refuses a clashing range with a 409 — re-checked against the database at
  the moment of sending.
- **Confirming an enquiry** in the dashboard (*Confirm & hold dates*) blocks
  its nights, which then flow out to every platform. Reopening it releases them.
- **Blocking by hand** — tap the first and last night in the Calendar planner.
  Every action has an undo.
- **Double bookings** — if two sources ever claim the same night, the
  Calendar shows a red *Possible double booking* card with the dates.

## Setting up a platform (≈ 3 minutes each)

1. Dashboard → **Calendar** → **Connect** (Airbnb is already listed).
2. Copy the platform’s **export** link — the help text in the panel says where
   it lives on each platform — and paste it in. Save. Bookings appear at once.
3. Copy the **StaySutra link** shown in the same panel and paste it into the
   platform’s **import calendar** screen. The panel shows when the platform
   first reads it (“Airbnb last read it 4 min ago”).

## The honest limit

Platforms read imported calendars on their own schedule — Airbnb roughly every
2 hours, others between 30 minutes and a day. A booking made here can take
that long to close elsewhere. That window is why every StaySutra booking is
still confirmed by a person, and why the dashboard flags any clash it sees.
A real-time, two-way link (prices and bookings too) needs a channel manager
(Channex, STAAH, eZee…) — the schema leaves room for it.

## Operations

| Task | How |
|---|---|
| Change the sync interval | `CALENDAR_SYNC_MINUTES` (min 5) |
| Sync from the server | `curl -H "Authorization: Bearer $CRON_SECRET" https://staysutra.in/api/cron/calendar-sync` |
| Turn the timer off (second app container) | `CALENDAR_SYNC=off` |
| Parser tests | `npm test` |
