import "server-only";

// The business day is the day in Kyiv, whatever region the function runs in.
const KYIV_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD" in Kyiv.
export function kyivToday(now: Date = new Date()): string {
  return KYIV_DAY.format(now);
}
