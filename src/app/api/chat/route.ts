import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allBusy, calendarFor } from "@/lib/google-calendar";
import { addDays, freeSlots, SEARCH_DAYS } from "@/lib/scheduling";
import { chatStream, type Msg } from "@/lib/llm";

const body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) })).min(1).max(40),
});

const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const now = new Date();
  const cal = await calendarFor(userId);
  const busy = await allBusy(userId, cal, now, addDays(now, SEARCH_DAYS)).catch(() => []);
  const free = freeSlots(busy, now, SEARCH_DAYS);
  const projects = await prisma.project.findMany({ where: { userId }, select: { name: true } });

  const system: Msg = {
    role: "system",
    content: `Tu es Nudge, assistant de planification de révisions (Active Recall, répétition espacée / méthode des J, Pomodoro). Réponds en français, de façon concise et concrète.

Date et heure actuelles : ${now.toISOString()} (fuseau ${process.env.TZ ?? "UTC"}).
Projets existants : ${projects.map((p) => p.name).join(", ") || "aucun"}.
Créneaux libres des ${SEARCH_DAYS} prochains jours (heures locales) :
${free.map((s) => `- ${fmt.format(s.start)} → ${fmt.format(s.end)}`).join("\n") || "- aucun"}

Quand l'utilisateur demande un planning ou un plan de révision, termine ta réponse par un seul bloc \`\`\`json au format :
{"project":"Nom du projet","tasks":[{"title":"Titre actionnable","description":"Détails ou 2-3 questions d'Active Recall","duration_minutes":25,"mental_load":"high|medium|low","method_used":"pomodoro|spaced_repetition|active_recall","scheduled_at":"2026-01-31T18:00:00+01:00"}]}
Règles : chaque scheduled_at est le début d'une tâche placé DANS un créneau libre ci-dessus, sans chevauchement entre tâches ; blocs de 25 min pour le travail profond ; pour la mémorisation, répète la tâche à J+1, J+3, J+7. Hors demande de planning, ne produis pas de JSON.`,
  };

  try {
    const stream = await chatStream([system, ...parsed.data.messages]);
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "LLM indisponible", { status: 502 });
  }
}
