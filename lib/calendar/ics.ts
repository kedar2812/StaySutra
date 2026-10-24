import { addDays, isIsoDate } from "./dates";

/**
 * Just enough iCalendar (RFC 5545) to read every OTA's availability export and
 * to write one they can all read back.
 *
 * Airbnb, Booking.com, Agoda, MakeMyTrip/Goibibo and Vrbo publish all-day
 * VEVENTs — one per reservation or blocked run — with DATE values. Some add
 * times, time zones or cancelled events; all of those are handled below. What
 * none of them publish is a price, a guest or a listing detail: an .ics feed
 * is a list of unavailable dates and nothing else.
 */

export interface IcsEvent {
  uid: string;
  /** First unavailable night, YYYY-MM-DD. */
  start: string;
  /** Checkout day, exclusive. */
  end: string;
  summary: string;
}

/** Undo RFC 5545 line folding: a CRLF followed by a space or tab continues the line. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

/**
 * Reads a DTSTART/DTEND into a calendar date.
 *
 * DATE values are taken as written. A UTC DATE-TIME is moved to India time
 * first, because "20261102T200000Z" is already the 3rd in Karjat. A local or
 * TZID DATE-TIME is taken at face value — the platform wrote it in the
 * property's own zone.
 */
function readDate(params: string, value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h && z) {
    const t = Date.UTC(+y!, +mo! - 1, +d!, +h, +mi!, +s!) + 5.5 * 3_600_000;
    return new Date(t).toISOString().slice(0, 10);
  }
  const iso = `${y}-${mo}-${d}`;
  void params;
  return isIsoDate(iso) ? iso : null;
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Record<string, { params: string; value: string }> | null = null;

  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const event = toEvent(current, events.length);
        if (event) events.push(event);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const semi = head.indexOf(";");
    const name = (semi === -1 ? head : head.slice(0, semi)).toUpperCase();
    const params = semi === -1 ? "" : head.slice(semi + 1);
    current[name] = { params, value };
  }

  return events;
}

function toEvent(
  props: Record<string, { params: string; value: string }>,
  index: number,
): IcsEvent | null {
  if (props.STATUS?.value.trim().toUpperCase() === "CANCELLED") return null;
  const dtstart = props.DTSTART;
  if (!dtstart) return null;
  const start = readDate(dtstart.params, dtstart.value);
  if (!start) return null;

  let end = props.DTEND ? readDate(props.DTEND.params, props.DTEND.value) : null;
  // A timed event that ends the same day still occupies that night.
  if (!end || end <= start) end = addDays(start, 1);

  return {
    // UIDs are how a re-sync recognises the same booking. A feed without them
    // gets a stable stand-in built from the dates.
    uid: props.UID?.value.trim() || `${start}_${end}_${index}`,
    start,
    end,
    summary: props.SUMMARY ? unescapeText(props.SUMMARY.value) : "",
  };
}

/* — Writing ———————————————————————————————————————————————— */

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Fold at 75 octets, as RFC 5545 requires. Counts bytes, not characters. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character.
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines spend one octet on the leading space
  }
  return parts.join("\r\n ");
}

const compact = (iso: string) => iso.replace(/-/g, "");

export function buildIcs({
  name,
  events,
  domain = "staysutra.in",
  now = new Date(),
}: {
  name: string;
  events: { uid: string; start: string; end: string; summary?: string }[];
  domain?: string;
  now?: Date;
}): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StaySutra//Availability//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid.includes("@") ? e.uid : `${e.uid}@${domain}`}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${escapeText(e.summary || "Not available")}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
