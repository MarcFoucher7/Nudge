import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/ics";
import { addDays } from "@/lib/scheduling";

/** Flux iCalendar privé : webcal://<hôte>/api/ics/<token> (Apple Calendar, Outlook, Google). */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await prisma.user.findUnique({ where: { icsToken: token }, select: { id: true } });
  if (!user) return new Response("Not found", { status: 404 });
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { userId: user.id, scheduledAt: { gte: addDays(now, -30), lt: addDays(now, 120) } },
    orderBy: { scheduledAt: "asc" },
  });
  const ics = buildIcs(
    tasks.map((t) => ({ uid: t.id, title: t.title, description: t.description, start: t.scheduledAt!, end: new Date(t.scheduledAt!.getTime() + t.durationMinutes * 60_000), done: !!t.completedAt })),
    now,
  );
  return new Response(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="nudge.ics"', "cache-control": "private, max-age=300" },
  });
}
