"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUserId } from "./auth";
import { busyBetween, calendarFor, upsertEvent, type Calendar } from "./google-calendar";
import { addDays, findSlot, placeAll, SEARCH_DAYS, startOfDay, type Busy } from "./scheduling";
import { methodOf, parsePlan } from "./import";

const LOAD = { high: "HIGH", medium: "MEDIUM", low: "LOW" } as const;

export async function setTaskDone(id: string, done: boolean) {
  const userId = await requireUserId();
  await prisma.task.update({ where: { id, userId }, data: { completedAt: done ? new Date() : null } });
  if (done) await touchStreak(userId);
  revalidatePath("/", "layout");
}

/** Report intelligent : prochain créneau libre à partir de maintenant, événement Google déplacé. */
export async function snoozeTask(id: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findUniqueOrThrow({ where: { id, userId } });
  const cal = await calendarFor(userId);
  const from = new Date();
  const busy = await allBusy(userId, cal, from, addDays(from, SEARCH_DAYS), id);
  const start = findSlot(busy, from, task.durationMinutes);
  const googleEventId = cal ? await upsertEvent(cal, { ...task, start }) : task.googleEventId;
  await prisma.task.update({ where: { id }, data: { scheduledAt: start, googleEventId, snoozeCount: { increment: 1 } } });
  revalidatePath("/", "layout");
}

export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.project.create({ data: { userId, name } });
  revalidatePath("/projects");
}

export type ImportState = { error?: string; created?: number; project?: string };

/** Import JSON "smart" : J+n relatif à aujourd'hui, créneaux libres du calendrier, événements Google créés. */
export async function importPlan(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const userId = await requireUserId();
  let plan;
  try {
    plan = parsePlan(String(formData.get("json") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "JSON invalide" };
  }

  try {
    return await schedulePlan(userId, plan);
  } catch (e) {
    return { error: e instanceof Error ? `Planification impossible : ${e.message}` : "Planification impossible" };
  }
}

async function schedulePlan(userId: string, plan: ReturnType<typeof parsePlan>): Promise<ImportState> {
  const project =
    (await prisma.project.findFirst({ where: { userId, name: plan.project } })) ??
    (await prisma.project.create({ data: { userId, name: plan.project } }));

  const now = new Date();
  const today = startOfDay(now);
  const maxOffset = Math.max(...plan.tasks.map((t) => t.schedule_offset_days));
  const cal = await calendarFor(userId);
  const busy = await allBusy(userId, cal, today, addDays(today, maxOffset + SEARCH_DAYS));

  const placed = placeAll(
    busy,
    plan.tasks.map((t) => ({ ...t, earliest: t.schedule_offset_days === 0 ? now : addDays(today, t.schedule_offset_days), durationMinutes: t.duration_minutes })),
  );

  for (const t of placed) {
    const googleEventId = cal ? await upsertEvent(cal, { title: t.title, description: t.description, start: t.start, durationMinutes: t.durationMinutes }) : null;
    await prisma.task.create({
      data: {
        userId,
        projectId: project.id,
        title: t.title,
        description: t.description,
        durationMinutes: t.durationMinutes,
        mentalLoad: LOAD[t.mental_load],
        method: methodOf(t.method_used),
        scheduledAt: t.start,
        googleEventId,
      },
    });
  }
  revalidatePath("/", "layout");
  return { created: placed.length, project: project.name };
}

/** Créneaux occupés : calendrier Google (s'il est connecté) + tâches Nudge déjà planifiées. */
async function allBusy(userId: string, cal: Calendar | null, from: Date, to: Date, exceptTaskId?: string): Promise<Busy[]> {
  const own = await prisma.task.findMany({
    where: { userId, completedAt: null, scheduledAt: { gte: from, lt: to }, NOT: exceptTaskId ? { id: exceptTaskId } : undefined },
    select: { scheduledAt: true, durationMinutes: true },
  });
  const google = cal ? await busyBetween(cal, from, to) : [];
  return [...google, ...own.map((t) => ({ start: t.scheduledAt!, end: new Date(t.scheduledAt!.getTime() + t.durationMinutes * 60_000) }))];
}

async function touchStreak(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const today = startOfDay(new Date());
  const last = u.lastActiveOn?.getTime();
  if (last === today.getTime()) return;
  const current = last === addDays(today, -1).getTime() ? u.currentStreak + 1 : 1;
  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: current, longestStreak: Math.max(current, u.longestStreak), lastActiveOn: today },
  });
}
