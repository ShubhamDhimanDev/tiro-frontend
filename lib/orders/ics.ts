/**
 * Client-side .ics (RFC 5545) generation for "Add to calendar". Times are
 * written as floating local times (no TZID, no "Z"), so the event lands at the
 * same wall-clock time the customer was told, in whatever timezone their
 * calendar is in. Appointments are always at the customer's own address.
 */

export interface IcsEventInput {
  uid: string;
  title: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" 24-hour */
  start: string;
  end: string;
  description?: string;
  location?: string;
  /** Overridable for tests. */
  now?: Date;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold to 75 characters per line as the spec requires (character approximation of octets). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

function localStamp(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const t = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!d || !t) return null;
  return `${d[1]}${d[2]}${d[3]}T${t[1].padStart(2, "0")}${t[2]}00`;
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Returns the calendar file text, or `null` when the date/time can't be parsed. */
export function buildIcs(input: IcsEventInput): string | null {
  const dtStart = localStamp(input.date, input.start);
  const dtEnd = localStamp(input.date, input.end);
  if (!dtStart || !dtEnd) return null;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tiro Mobile Tyres//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(input.uid)}`,
    `DTSTAMP:${utcStamp(input.now ?? new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Tyre fitting appointment",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Triggers a browser download of the .ics text. Browser-only. */
export function downloadIcs(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
