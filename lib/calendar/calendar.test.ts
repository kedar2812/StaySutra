import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, parseIcs } from "./ics";
import {
  addDays,
  isNightBlocked,
  isRangeFree,
  lastCheckoutAfter,
  mergeRanges,
  nextFreeWeekend,
  nightsBetween,
  todayIST,
} from "./dates";

/* A trimmed real Airbnb export. */
const AIRBNB = [
  "BEGIN:VCALENDAR",
  "PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "CALSCALE:GREGORIAN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261108",
  "DTSTART;VALUE=DATE:20261106",
  "UID:1418fb94e984-a2b7f3cbe2d4fd8b9c5ef8a6a0b8d4c1@airbnb.com",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMABC123\\nPhone",
  "  Number (Last 4 Digits): 1234",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261201",
  "DTSTART;VALUE=DATE:20261125",
  "UID:7f6b1c2d-blocked@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("parses an Airbnb export, including a folded line", () => {
  const events = parseIcs(AIRBNB);
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    uid: "1418fb94e984-a2b7f3cbe2d4fd8b9c5ef8a6a0b8d4c1@airbnb.com",
    start: "2026-11-06",
    end: "2026-11-08",
    summary: "Reserved",
  });
  assert.equal(events[1]!.summary, "Airbnb (Not available)");
});

test("handles UTC times, TZID times, missing DTEND and cancelled events", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    // 20:00 UTC on the 2nd is 01:30 on the 3rd in India.
    "BEGIN:VEVENT", "UID:a", "DTSTART:20261102T200000Z", "DTEND:20261104T050000Z", "END:VEVENT",
    "BEGIN:VEVENT", "UID:b", "DTSTART;TZID=Asia/Kolkata:20261110T140000", "END:VEVENT",
    "BEGIN:VEVENT", "UID:c", "STATUS:CANCELLED", "DTSTART;VALUE=DATE:20261112", "DTEND;VALUE=DATE:20261113", "END:VEVENT",
    "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261120", "DTEND;VALUE=DATE:20261120", "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  const events = parseIcs(ics);
  assert.deepEqual(
    events.map((e) => [e.uid, e.start, e.end]),
    [
      ["a", "2026-11-03", "2026-11-04"],
      ["b", "2026-11-10", "2026-11-11"],
      ["2026-11-20_2026-11-21_2", "2026-11-20", "2026-11-21"],
    ],
  );
});

test("ignores garbage without throwing", () => {
  assert.deepEqual(parseIcs("<html>Not found</html>"), []);
  assert.deepEqual(parseIcs("BEGIN:VEVENT\nDTSTART:nonsense\nEND:VEVENT"), []);
});

test("builds a feed that reads back to the same events", () => {
  const ics = buildIcs({
    name: "Kashele Farmhouse — StaySutra",
    events: [{ uid: "blk1", start: "2026-12-24", end: "2026-12-27", summary: "Not available" }],
    now: new Date("2026-10-23T10:00:00Z"),
  });
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261224"));
  assert.ok(ics.includes("UID:blk1@staysutra.in"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, line);
  assert.deepEqual(parseIcs(ics).map((e) => [e.start, e.end]), [["2026-12-24", "2026-12-27"]]);
});

test("date ranges: back-to-back stays never clash", () => {
  const blocked = mergeRanges([
    { start: "2026-11-10", end: "2026-11-12" },
    { start: "2026-11-11", end: "2026-11-13" },
    { start: "2026-11-20", end: "2026-11-21" },
  ]);
  assert.deepEqual(blocked, [
    { start: "2026-11-10", end: "2026-11-13" },
    { start: "2026-11-20", end: "2026-11-21" },
  ]);
  assert.equal(isNightBlocked("2026-11-12", blocked), true);
  assert.equal(isNightBlocked("2026-11-13", blocked), false);
  // Check out the morning a booking starts, check in the morning one ends.
  assert.equal(isRangeFree("2026-11-08", "2026-11-10", blocked), true);
  assert.equal(isRangeFree("2026-11-13", "2026-11-20", blocked), true);
  assert.equal(isRangeFree("2026-11-09", "2026-11-11", blocked), false);
  assert.equal(isRangeFree("2026-11-14", "2026-11-14", blocked), false);
  assert.equal(lastCheckoutAfter("2026-11-14", blocked), "2026-11-20");
  assert.equal(lastCheckoutAfter("2026-11-21", blocked), null);
});

test("next free weekend skips booked Fridays and Saturdays", () => {
  // 2026-10-23 is a Friday.
  assert.deepEqual(nextFreeWeekend([], "2026-10-23"), { checkIn: "2026-10-23", checkOut: "2026-10-25" });
  assert.deepEqual(nextFreeWeekend([], "2026-10-24"), { checkIn: "2026-10-30", checkOut: "2026-11-01" });
  const blocked = [
    { start: "2026-10-24", end: "2026-10-25" }, // that Saturday
    { start: "2026-10-30", end: "2026-10-31" }, // next Friday
  ];
  assert.deepEqual(nextFreeWeekend(blocked, "2026-10-23"), { checkIn: "2026-11-06", checkOut: "2026-11-08" });
  // A Sunday-night booking does not spoil the weekend before it.
  assert.deepEqual(nextFreeWeekend([{ start: "2026-10-25", end: "2026-10-26" }], "2026-10-23"), {
    checkIn: "2026-10-23",
    checkOut: "2026-10-25",
  });
});

test("date helpers", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(nightsBetween("2026-02-27", "2026-03-02"), 3);
  assert.equal(todayIST(new Date("2026-10-23T19:00:00Z")), "2026-10-24");
});
