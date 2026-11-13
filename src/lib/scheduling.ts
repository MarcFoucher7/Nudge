// Fonctions pures de planification (testées dans scheduling.test.ts).
// Les heures sont locales : le serveur tourne avec TZ=Europe/Paris (voir .env.example).

export type Busy = { start: Date; end: Date };

// ponytail: constantes globales, préférences par utilisateur plus tard
export const WORK_START = 9;
export const WORK_END = 21;
const STEP_MS = 15 * 60_000;
export const SEARCH_DAYS = 14;
const DAY_MS = 86_400_000;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const at = (d: Date, hour: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
const roundUp = (d: Date) => new Date(Math.ceil(d.getTime() / STEP_MS) * STEP_MS);

/** Premier créneau libre de `durationMin` minutes à partir de `from`, dans les heures de travail, hors `busy`. */
export function findSlot(busy: Busy[], from: Date, durationMin: number): Date {
  const dur = durationMin * 60_000;
  const limit = from.getTime() + SEARCH_DAYS * DAY_MS;
  let t = roundUp(from);
  while (t.getTime() < limit) {
    if (t < at(t, WORK_START)) t = at(t, WORK_START);
    const end = new Date(t.getTime() + dur);
    if (end > at(t, WORK_END)) {
      t = at(addDays(t, 1), WORK_START);
      continue;
    }
    const clash = busy.find((b) => b.start < end && b.end > t);
    if (!clash) return t;
    t = roundUp(clash.end);
  }
  return t; // ponytail: rien de libre sous 14 jours → on place quand même
}

/** Place une liste de tâches dans l'ordre, chaque tâche réservant son créneau pour les suivantes. */
export function placeAll<T extends { earliest: Date; durationMinutes: number }>(busy: Busy[], tasks: T[]) {
  const taken = [...busy];
  return tasks.map((t) => {
    const start = findSlot(taken, t.earliest, t.durationMinutes);
    taken.push({ start, end: new Date(start.getTime() + t.durationMinutes * 60_000) });
    return { ...t, start };
  });
}

/** Fenêtres libres (heures de travail moins `busy`) entre `from` et `from + days`, pour le contexte envoyé à l'IA. */
export function freeSlots(busy: Busy[], from: Date, days: number): Busy[] {
  const out: Busy[] = [];
  const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let d = 0; d < days; d++) {
    const day = addDays(startOfDay(from), d);
    let cursor = d === 0 && from > at(day, WORK_START) ? from : at(day, WORK_START);
    const dayEnd = at(day, WORK_END);
    for (const b of sorted) {
      if (b.end <= cursor || b.start >= dayEnd) continue;
      if (b.start > cursor) out.push({ start: cursor, end: b.start });
      if (b.end > cursor) cursor = b.end;
    }
    if (cursor < dayEnd) out.push({ start: cursor, end: dayEnd });
  }
  return out;
}
