// Flux iCalendar (RFC 5545) pour Apple Calendar / Outlook. Pur, testé dans ics.test.ts.

export type IcsEvent = { uid: string; title: string; description?: string | null; start: Date; end: Date; done?: boolean };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Plie les lignes à 75 octets (RFC 5545 §3.1). */
const fold = (line: string) => line.match(/.{1,74}/gu)!.join("\r\n ");

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nudge//FR", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Nudge"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@nudge`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${esc(e.done ? `✓ ${e.title}` : e.title)}`,
      ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
