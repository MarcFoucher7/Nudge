import { z } from "zod";
import type { Method } from "@prisma/client";

export const planSchema = z.object({
  project: z.string().trim().min(1),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().optional(),
        duration_minutes: z.number().int().positive().default(25),
        mental_load: z.enum(["high", "medium", "low"]).default("medium"),
        method_used: z.string().optional(),
        schedule_offset_days: z.number().int().min(0).default(0),
        scheduled_at: z.iso.datetime({ offset: true, local: true }).optional(), // créneau choisi par l'IA (ISO 8601)
      }),
    )
    .min(1),
});
export type Plan = z.infer<typeof planSchema>;

/** Parse la sortie d'une IA : tolère les fences ``` et les commentaires // de fin de ligne. */
export function parsePlan(raw: string): Plan {
  // ponytail: le strip de commentaires ignore les lignes contenant un " après le // (URLs dans les strings)
  const cleaned = raw.replace(/```(?:json)?/g, "").replace(/\/\/[^\n"]*$/gm, "");
  return planSchema.parse(JSON.parse(cleaned));
}

export function methodOf(s?: string): Method {
  const m = (s ?? "").toLowerCase();
  if (m.includes("pomodoro")) return "POMODORO";
  if (m.includes("recall")) return "ACTIVE_RECALL";
  if (m.includes("spaced") || m.includes("repetition") || m.includes("répétition") || m.includes("des j")) return "SPACED_REPETITION";
  return "NONE";
}
