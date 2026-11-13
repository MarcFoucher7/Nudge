"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createTask, deleteTask, updateTask, type TaskInput } from "@/lib/actions";

export type EditableTask = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  mentalLoad: "HIGH" | "MEDIUM" | "LOW";
  scheduledAt: string | null; // ISO
  projectId: string | null;
};
export type ProjectOption = { id: string; name: string };

/** Date → valeur pour <input type="datetime-local"> (heure locale). */
export const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function TaskDialog({
  open,
  task,
  defaultStart,
  projects,
  onClose,
  onSaved,
}: {
  open: boolean;
  task?: EditableTask | null;
  defaultStart?: Date | null;
  projects: ProjectOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const submit = (fd: FormData) => {
    const input: TaskInput = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      durationMinutes: Number(fd.get("durationMinutes")),
      mentalLoad: fd.get("mentalLoad") as TaskInput["mentalLoad"],
      scheduledAt: String(fd.get("scheduledAt") ?? ""),
      projectId: String(fd.get("projectId") ?? ""),
    };
    start(async () => {
      try {
        if (task) await updateTask(task.id, input);
        else await createTask(input);
        setError(null);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible");
      }
    });
  };

  const remove = () => {
    if (!task || !confirm("Supprimer cette tâche ?")) return;
    start(async () => {
      await deleteTask(task.id);
      onSaved();
    });
  };

  const field = "w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink";
  const start0 = task?.scheduledAt ? toLocalInput(new Date(task.scheduledAt)) : defaultStart ? toLocalInput(defaultStart) : "";

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-full max-w-md rounded-lg border border-line bg-paper p-0 text-ink shadow-sm backdrop:bg-ink/20">
      {open && (
        <form action={submit} className="flex flex-col gap-3 p-5" key={task?.id ?? "new"}>
          <h2 className="text-sm font-medium">{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
          <input name="title" required defaultValue={task?.title ?? ""} placeholder="Titre" className={field} autoFocus />
          <textarea name="description" rows={3} defaultValue={task?.description ?? ""} placeholder="Description, questions d'Active Recall…" className={field} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-ink-soft">
              Durée (min)
              <input name="durationMinutes" type="number" min={5} max={480} step={5} defaultValue={task?.durationMinutes ?? 25} className={`${field} mt-1`} />
            </label>
            <label className="text-xs text-ink-soft">
              Charge mentale
              <select name="mentalLoad" defaultValue={task?.mentalLoad ?? "MEDIUM"} className={`${field} mt-1`}>
                <option value="HIGH">Haute</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="LOW">Basse</option>
              </select>
            </label>
            <label className="text-xs text-ink-soft">
              Créneau
              <input name="scheduledAt" type="datetime-local" defaultValue={start0} className={`${field} mt-1`} />
            </label>
            <label className="text-xs text-ink-soft">
              Projet
              <select name="projectId" defaultValue={task?.projectId ?? ""} className={`${field} mt-1`}>
                <option value="">Aucun</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="text-xs text-salmon-ink">{error}</p>}
          <div className="mt-1 flex items-center gap-2">
            <button disabled={pending} className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50">
              {task ? "Enregistrer" : "Créer"}
            </button>
            <button type="button" onClick={onClose} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:text-ink">
              Annuler
            </button>
            {task && (
              <button type="button" onClick={remove} disabled={pending} className="ml-auto inline-flex items-center gap-1 text-xs text-ink-mute hover:text-salmon-ink">
                <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                Supprimer
              </button>
            )}
          </div>
        </form>
      )}
    </dialog>
  );
}
