// Kyiv wall-clock time for the scheduling field. The browser's
// datetime-local input knows no time zone, and staff may sit anywhere (or
// on a laptop set to another zone), so the field's "YYYY-MM-DDTHH:mm" is
// read as Kyiv time and turned into a real moment here.

const KYIV = "Europe/Kyiv";

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: KYIV,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function kyivParts(ms: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of PARTS.formatToParts(new Date(ms))) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return out;
}

// How far Kyiv is ahead of UTC at the moment `ms`.
function offsetAt(ms: number): number {
  const p = kyivParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

// "2026-11-14T10:00" (Kyiv) -> an ISO moment, or null for a malformed value.
export function kyivLocalToIso(local: string): string | null {
  const match = LOCAL.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // The offset depends on the moment itself (summer time): guess, then
  // correct once with the offset of the guess.
  let moment = wall - offsetAt(wall);
  moment = wall - offsetAt(moment);
  return Number.isNaN(moment) ? null : new Date(moment).toISOString();
}

// An ISO moment -> "YYYY-MM-DDTHH:mm" in Kyiv (the field's value).
export function isoToKyivLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const p = kyivParts(ms);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
}
