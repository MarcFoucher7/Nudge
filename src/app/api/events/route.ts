import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calendarFor, eventsBetween } from "@/lib/google-calendar";

const LOAD_COLORS = {
  HIGH: { bg: "#fff1f2", fg: "#be123c" },
  MEDIUM: { bg: "#fefce8", fg: "#a16207" },
  LOW: { bg: "#ecfdf5", fg: "#047857" },
} as const;

/** Événements du calendrier (tâches Nudge + Google) pour FullCalendar. */
export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const start = new Date(url.searchParams.get("start") ?? "");
  const end = new Date(url.searchParams.get("end") ?? "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return new Response("Bad range", { status: 400 });

  const tasks = await prisma.task.findMany({
    where: { userId, scheduledAt: { gte: start, lt: end } },
    include: { project: { select: { name: true } } },
  });
  const own = new Set(tasks.map((t) => t.googleEventId));
  const cal = await calendarFor(userId);
  const google = cal ? await eventsBetween(cal, start, end).catch(() => []) : [];

  return Response.json([
    ...tasks.map((t) => ({
      id: `task:${t.id}`,
      title: t.title,
      start: t.scheduledAt,
      end: new Date(t.scheduledAt!.getTime() + t.durationMinutes * 60_000),
      color: LOAD_COLORS[t.mentalLoad].bg,
      contrastColor: LOAD_COLORS[t.mentalLoad].fg,
      classNames: t.completedAt ? ["nudge-done"] : [],
      extendedProps: { kind: "task", taskId: t.id, description: t.description, mentalLoad: t.mentalLoad, done: !!t.completedAt, project: t.project?.name ?? null },
    })),
    ...google
      .filter((e) => !own.has(e.id))
      .map((e) => ({
        id: `gcal:${e.id}`,
        title: e.title,
        start: e.start,
        end: e.end,
        color: "#f3f4f6",
        contrastColor: "#374151",
        extendedProps: { kind: "google", googleEventId: e.id },
      })),
  ]);
}
