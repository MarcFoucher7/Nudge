import { FocusTimer } from "@/components/focus-timer";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "@/lib/scheduling";
import { startOfWeek } from "@/lib/stats";

export default async function TimerPage() {
  const userId = await requireUserId();
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);

  const [tasks, sessions] = await Promise.all([
    prisma.task.findMany({
      where: { userId, completedAt: null, OR: [{ scheduledAt: { gte: today, lt: addDays(today, 1) } }, { scheduledAt: null }] },
      select: { id: true, title: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.focusSession.findMany({ where: { userId, startedAt: { gte: weekStart } }, orderBy: { startedAt: "desc" } }),
  ]);
  const titles = new Map((await prisma.task.findMany({ where: { id: { in: sessions.map((s) => s.taskId).filter((x): x is string => !!x) } }, select: { id: true, title: true } })).map((t) => [t.id, t.title]));
  const minutesToday = sessions.filter((s) => s.startedAt >= today).reduce((a, s) => a + s.minutes, 0);
  const minutesWeek = sessions.reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Timer</h1>
        <p className="text-sm tabular-nums text-ink-soft">
          {minutesToday} min aujourd&apos;hui · {minutesWeek} min cette semaine
        </p>
      </header>

      <FocusTimer tasks={tasks} />

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Sessions de la semaine</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune session. Chaque phase de travail terminée est enregistrée ici.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper text-sm shadow-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex gap-3 px-4 py-2">
                <span className="w-28 shrink-0 tabular-nums text-ink-mute">
                  {s.startedAt.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" })} {s.startedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="w-16 shrink-0 tabular-nums">{s.minutes} min</span>
                <span className="truncate text-ink-soft">{s.taskId ? (titles.get(s.taskId) ?? "Tâche supprimée") : "Session libre"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
