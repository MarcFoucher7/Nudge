import Link from "next/link";
import { ArrowRight, CheckCircle2, Flame, Target, Timer } from "lucide-react";
import { TodayTasks, type TaskView } from "@/components/today-tasks";
import { ProjectGauge } from "@/components/project-gauge";
import { TodayDate } from "@/components/today-date";
import { WeekBars } from "@/components/week-bars";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calendarFor, eventsBetween } from "@/lib/google-calendar";
import { addDays, startOfDay } from "@/lib/scheduling";
import { startOfWeek, suggestions, weekStats } from "@/lib/stats";

const hhmm = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function DashboardPage() {
  const userId = await requireUserId();
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(now);

  // ponytail: toutes les tâches de l'utilisateur en mémoire ; paginer si un jour il en a des milliers
  const [user, projects, tasks, focus] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currentStreak: true, longestStreak: true } }),
    prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { _count: { select: { tasks: true } }, tasks: { where: { completedAt: { not: null } }, select: { id: true } } } }),
    prisma.task.findMany({ where: { userId }, orderBy: [{ scheduledAt: "asc" }], include: { project: { select: { name: true } } } }),
    prisma.focusSession.aggregate({ where: { userId, startedAt: { gte: weekStart } }, _sum: { minutes: true } }),
  ]);

  const week = weekStats(tasks, weekStart);
  const doneWeek = tasks.filter((t) => t.completedAt && t.completedAt >= weekStart).length;
  const rate = tasks.length ? Math.round((tasks.filter((t) => t.completedAt).length / tasks.length) * 100) : 0;
  const tips = suggestions(tasks, now, user.currentStreak);

  const todays = tasks.filter((t) => (t.scheduledAt && t.scheduledAt >= today && t.scheduledAt < tomorrow) || (!t.scheduledAt && !t.completedAt));
  const ownIds = new Set(todays.map((t) => t.googleEventId));
  const cal = await calendarFor(userId);
  const agenda = cal ? (await eventsBetween(cal, today, tomorrow).catch(() => [])).filter((e) => !ownIds.has(e.id)) : [];

  const views: TaskView[] = todays.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    durationMinutes: t.durationMinutes,
    mentalLoad: t.mentalLoad,
    scheduledAt: t.scheduledAt?.toISOString() ?? null,
    projectId: t.projectId,
    time: t.scheduledAt ? hhmm(t.scheduledAt) : null,
    done: !!t.completedAt,
    project: t.project?.name ?? null,
  }));

  const tiles = [
    { Icon: CheckCircle2, label: "Terminées cette semaine", value: doneWeek },
    { Icon: Timer, label: "Minutes de focus", value: focus._sum.minutes ?? 0 },
    { Icon: Flame, label: "Série", value: `${user.currentStreak} j`, sub: `record ${user.longestStreak} j` },
    { Icon: Target, label: "Taux de réalisation", value: `${rate}%` },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <TodayDate />
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ Icon, label, value, sub }) => (
          <div key={label} className="rounded-lg border border-line bg-paper p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-ink-mute">
              <Icon className="size-3.5" strokeWidth={1.5} aria-hidden />
              {label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            {sub && <p className="text-xs text-ink-mute">{sub}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Cette semaine</h2>
            <WeekBars days={week} today={today} />
          </section>

          {agenda.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Agenda du jour</h2>
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

          <TodayTasks initialTasks={views} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Suggestions</h2>
            <ul className="flex flex-col gap-2">
              {tips.length === 0 && <li className="rounded-lg border border-line bg-paper p-4 text-sm text-ink-soft shadow-sm">Tout est en ordre.</li>}
              {tips.map((s, i) => (
                <li key={i} className="rounded-lg border border-line bg-paper p-4 text-sm shadow-sm">
                  <p className="leading-relaxed">{s.text}</p>
                  {s.href && (
                    <Link href={s.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink hover:underline">
                      {s.label}
                      <ArrowRight className="size-3" strokeWidth={1.5} aria-hidden />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {projects.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-mute">Progression</h2>
              <div className="flex flex-col gap-3">
                {projects.map((p) => (
                  <ProjectGauge key={p.id} name={p.name} color={p.color} total={p._count.tasks} done={p.tasks.length} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
