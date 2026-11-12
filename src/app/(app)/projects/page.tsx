import { Plus } from "lucide-react";
import { ProjectGauge } from "@/components/project-gauge";
import { createProject } from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const userId = await requireUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { tasks: { select: { id: true, title: true, completedAt: true, scheduledAt: true }, orderBy: { scheduledAt: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projets</h1>
        <form action={createProject} className="flex gap-2">
          <input
            name="name"
            required
            placeholder="Nouveau projet"
            className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink"
          />
          <button className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft hover:text-ink">
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            Créer
          </button>
        </form>
      </header>

      {projects.length === 0 && (
        <p className="text-sm text-ink-soft">Aucun projet. Crée-en un ou importe un plan JSON.</p>
      )}

      {projects.map((p) => {
        const done = p.tasks.filter((t) => t.completedAt).length;
        return (
          <section key={p.id} className="flex flex-col gap-3">
            <ProjectGauge name={p.name} color={p.color} total={p.tasks.length} done={done} />
            {p.tasks.length > 0 && (
              <ul className="divide-y divide-line rounded-lg border border-line bg-paper text-sm shadow-sm">
                {p.tasks.map((t) => (
                  <li key={t.id} className={`flex gap-3 px-4 py-2 ${t.completedAt ? "text-ink-mute line-through" : ""}`}>
                    <span className="w-24 shrink-0 tabular-nums text-ink-mute">
                      {t.scheduledAt ? t.scheduledAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
                    </span>
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
