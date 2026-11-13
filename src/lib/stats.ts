// Statistiques et suggestions du Dashboard (fonctions pures, testées dans stats.test.ts).
import { addDays, startOfDay } from "./scheduling.ts";

export type TaskLite = {
  id: string;
  title: string;
  durationMinutes: number;
  mentalLoad: "HIGH" | "MEDIUM" | "LOW";
  scheduledAt: Date | null;
  completedAt: Date | null;
};

/** Lundi 00:00 de la semaine contenant `d`. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export type DayStat = { day: Date; planned: number; done: number };

/** Minutes planifiées et terminées par jour, lundi → dimanche. */
export function weekStats(tasks: TaskLite[], weekStart: Date): DayStat[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const next = addDays(day, 1);
    const inDay = (d: Date | null) => !!d && d >= day && d < next;
    return {
      day,
      planned: tasks.filter((t) => inDay(t.scheduledAt)).reduce((s, t) => s + t.durationMinutes, 0),
      done: tasks.filter((t) => inDay(t.completedAt)).reduce((s, t) => s + t.durationMinutes, 0),
    };
  });
}

export type Suggestion = { text: string; href?: string; label?: string };

/** Règles simples : retard, sans créneau, énergie selon l'heure, série en danger. */
export function suggestions(tasks: TaskLite[], now: Date, streak: number): Suggestion[] {
  const out: Suggestion[] = [];
  const pending = tasks.filter((t) => !t.completedAt);
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const hour = now.getHours();

  const overdue = pending.filter((t) => t.scheduledAt && t.scheduledAt < today);
  if (overdue.length) out.push({ text: `${overdue.length} tâche${overdue.length > 1 ? "s" : ""} en retard. Reporte-les ou marque-les faites.`, href: "/planner", label: "Voir le planning" });

  const unscheduled = pending.filter((t) => !t.scheduledAt);
  if (unscheduled.length) out.push({ text: `${unscheduled.length} tâche${unscheduled.length > 1 ? "s" : ""} sans créneau.`, href: "/planner", label: "Placer" });

  const todays = pending.filter((t) => t.scheduledAt && t.scheduledAt >= today && t.scheduledAt < tomorrow);
  if (todays.length === 0 && pending.length === 0) out.push({ text: "Rien de prévu. Demande un plan à l'assistant ou importe un JSON.", href: "/planner", label: "Assistant" });
  else if (todays.length) {
    const wantLow = hour >= 18;
    const pick = todays.find((t) => (wantLow ? t.mentalLoad === "LOW" : t.mentalLoad === "HIGH")) ?? todays[0];
    out.push({
      text: wantLow ? `Fin de journée : commence par une tâche légère, « ${pick.title} ».` : `Tu es frais : attaque « ${pick.title} » maintenant.`,
      href: "/timer",
      label: "Lancer le timer",
    });
  }

  const doneToday = tasks.some((t) => t.completedAt && t.completedAt >= today);
  if (streak > 0 && !doneToday && hour >= 18) out.push({ text: `Ta série de ${streak} jour${streak > 1 ? "s" : ""} s'arrête ce soir sans tâche terminée.` });

  return out;
}
