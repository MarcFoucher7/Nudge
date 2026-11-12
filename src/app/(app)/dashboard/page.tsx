import { TodayTasks, type TaskView } from "@/components/today-tasks";
import { ProjectGauge } from "@/components/project-gauge";
import { TodayDate } from "@/components/today-date";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calendarFor, eventsBetween } from "@/lib/google-calendar";
import { addDays, startOfDay } from "@/lib/scheduling";

const hhmm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function DashboardPage() {
  const userId = await requireUserId();
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { tasks: true } }, tasks: { where: { completedAt: { not: null } }, select: { id: true } } },
    }),
    prisma.task.findMany({
      where: { userId, OR: [{ scheduledAt: { gte: today, lt: tomorrow } }, { scheduledAt: null, completedAt: null }] },
      orderBy: [{ scheduledAt: "asc" }],
      include: { project: { select: { name: true } } },
    }),
  ]);

  // Lecture de l'emploi du temps Google (hors événements créés par Nudge)
  const ownIds = new Set(tasks.map((t) => t.googleEventId));
  const cal = await calendarFor(userId);
  const agenda = cal ? (await eventsBetween(cal, today, tomorrow).catch(() => [])).filter((e) => !ownIds.has(e.id)) : [];

  const views: TaskView[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    durationMinutes: t.durationMinutes,
    mentalLoad: t.mentalLoad,
    time: t.scheduledAt ? hhmm(t.scheduledAt) : null,
    done: !!t.completedAt,
    project: t.project?.name ?? null,
  }));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Aujourd&apos;hui</h1>
        <TodayDate />
      </header>

      {projects.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Progression</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {projects.map((p) => (
              <ProjectGauge key={p.id} name={p.name} color={p.color} total={p._count.tasks} done={p.tasks.length} />
            ))}
          </div>
        </section>
      )}

      {agenda.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Agenda</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-paper shadow-sm">
            {agenda.map((e) => (
              <li key={e.id} className="flex gap-3 px-4 py-2 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-ink-mute">
                  {hhmm(e.start)}–{hhmm(e.end)}
                </span>
                <span className="truncate">{e.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TodayTasks initialTasks={views} />
    </div>
  );
}
