import { google, type calendar_v3 } from "googleapis";
import { prisma } from "./prisma";
import type { Busy } from "./scheduling";

export type Calendar = calendar_v3.Calendar;

/** Client Calendar de l'utilisateur, ou null s'il n'a pas de refresh token. */
export async function calendarFor(userId: string): Promise<Calendar | null> {
  const acc = await prisma.account.findFirst({ where: { userId, provider: "google" } });
  if (!acc?.refresh_token) return null;
  const oauth = new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
  oauth.setCredentials({ refresh_token: acc.refresh_token, access_token: acc.access_token ?? undefined });
  return google.calendar({ version: "v3", auth: oauth });
}

/** Créneaux occupés. freeBusy exigerait calendar.readonly : on dérive des événements (scope calendar.events). */
export async function busyBetween(cal: Calendar, from: Date, to: Date): Promise<Busy[]> {
  return (await eventsBetween(cal, from, to)).filter((e) => e.busy);
}

export type AgendaEvent = { id: string; title: string; start: Date; end: Date; busy: boolean };

export async function eventsBetween(cal: Calendar, from: Date, to: Date): Promise<AgendaEvent[]> {
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return (res.data.items ?? [])
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      id: e.id!,
      title: e.summary ?? "(sans titre)",
      start: new Date(e.start!.dateTime!),
      end: new Date(e.end!.dateTime!),
      busy: e.transparency !== "transparent",
    }));
}

type EventInput = { googleEventId?: string | null; title: string; description?: string | null; start: Date; durationMinutes: number };

/** Crée ou déplace l'événement ; renvoie son id Google. */
export async function upsertEvent(cal: Calendar, e: EventInput): Promise<string> {
  const requestBody = {
    summary: e.title,
    description: e.description ?? undefined,
    start: { dateTime: e.start.toISOString() },
    end: { dateTime: new Date(e.start.getTime() + e.durationMinutes * 60_000).toISOString() },
  };
  if (e.googleEventId) {
    await cal.events.patch({ calendarId: "primary", eventId: e.googleEventId, requestBody });
    return e.googleEventId;
  }
  const res = await cal.events.insert({ calendarId: "primary", requestBody });
  return res.data.id!;
}
