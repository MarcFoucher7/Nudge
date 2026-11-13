"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireUserId } from "./auth";
import { allBusy, calendarFor, upsertEvent } from "./google-calendar";
import { addDays, findSlot, placeAll, SEARCH_DAYS, startOfDay } from "./scheduling";
import { methodOf, parsePlan, type Plan } from "./import";

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

/** Drag & drop d'une tâche Nudge dans le calendrier. */
export async function moveTask(id: string, startIso: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findUniqueOrThrow({ where: { id, userId } });
  const start = new Date(startIso);
  const cal = await calendarFor(userId);
  const googleEventId = cal ? await upsertEvent(cal, { ...task, start }) : task.googleEventId;
  await prisma.task.update({ where: { id }, data: { scheduledAt: start, googleEventId } });
  revalidatePath("/", "layout");
}

/** Drag & drop d'un événement Google externe : on le déplace dans Google Calendar. */
export async function moveGoogleEvent(googleEventId: string, title: string, startIso: string, endIso: string) {
  const userId = await requireUserId();
  const cal = await calendarFor(userId);
  if (!cal) throw new Error("Calendrier Google non connecté");
  const start = new Date(startIso);
  const durationMinutes = Math.round((new Date(endIso).getTime() - start.getTime()) / 60_000);
  await upsertEvent(cal, { googleEventId, title, start, durationMinutes });
}

export async function createProject(formData: FormData) {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.project.create({ data: { userId, name } });
  revalidatePath("/projects");
}

export type ImportState = { error?: string; created?: number; project?: string };

/** Import JSON depuis le formulaire. */
export async function importPlan(_prev: ImportState, formData: FormData): Promise<ImportState> {
  return importPlanJson(String(formData.get("json") ?? ""));
}

/** Import JSON "smart" : J+n relatif à aujourd'hui, créneaux libres du calendrier, événements Google créés. */
export async function importPlanJson(raw: string): Promise<ImportState> {
  const userId = await requireUserId();
  let plan: Plan;
  try {
    plan = parsePlan(raw);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "JSON invalide" };
  }
  try {
    const project =
      (await prisma.project.findFirst({ where: { userId, name: plan.project } })) ??
      (await prisma.project.create({ data: { userId, name: plan.project } }));
    const { cal, placed } = await placePlan(userId, plan);
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
  } catch (e) {
    return { error: e instanceof Error ? `Planification impossible : ${e.message}` : "Planification impossible" };
  }
}

export type PreviewTask = { title: string; description?: string; start: string; durationMinutes: number; mentalLoad: "HIGH" | "MEDIUM" | "LOW" };

/** Aperçu d'un plan (chat IA) : créneaux calculés, rien n'est écrit. */
export async function previewPlan(raw: string): Promise<{ error?: string; project?: string; tasks?: PreviewTask[] }> {
  const userId = await requireUserId();
  try {
    const plan = parsePlan(raw);
    const { placed } = await placePlan(userId, plan);
    return {
      project: plan.project,
      tasks: placed.map((t) => ({ title: t.title, description: t.description, start: t.start.toISOString(), durationMinutes: t.durationMinutes, mentalLoad: LOAD[t.mental_load] })),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Plan invalide" };
  }
}

async function placePlan(userId: string, plan: Plan) {
  const now = new Date();
  const today = startOfDay(now);
  const tasks = plan.tasks.map((t) => {
    const wanted = t.scheduled_at ? new Date(t.scheduled_at) : t.schedule_offset_days === 0 ? now : addDays(today, t.schedule_offset_days);
    return { ...t, earliest: wanted < now ? now : wanted, durationMinutes: t.duration_minutes };
  });
  const latest = new Date(Math.max(...tasks.map((t) => t.earliest.getTime())));
  const cal = await calendarFor(userId);
  const busy = await allBusy(userId, cal, today, addDays(latest, SEARCH_DAYS));
  return { cal, placed: placeAll(busy, tasks) };
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
