"use client";

import { useOptimistic, useState, useTransition } from "react";
import { BatteryLow, Check, Clock, Play } from "lucide-react";
import type { MentalLoad } from "@prisma/client";
import { setTaskDone, snoozeTask } from "@/lib/actions";
import { Pomodoro } from "./pomodoro";

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  mentalLoad: MentalLoad;
  time: string | null;
  done: boolean;
  project: string | null;
};

const LOAD: Record<MentalLoad, { label: string; cls: string }> = {
  HIGH: { label: "Haute", cls: "bg-salmon text-salmon-ink" },
  MEDIUM: { label: "Moyenne", cls: "bg-butter text-butter-ink" },
  LOW: { label: "Basse", cls: "bg-mint text-mint-ink" },
};

export function TodayTasks({ initialTasks }: { initialTasks: TaskView[] }) {
  const [tasks, setDone] = useOptimistic(initialTasks, (ts, u: { id: string; done: boolean }) =>
    ts.map((t) => (t.id === u.id ? { ...t, done: u.done } : t)),
  );
  const [, startTransition] = useTransition();
  const [tired, setTired] = useState(false);
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const [active, setActive] = useState<TaskView | null>(null);

  const visible = tired ? tasks.filter((t) => t.mentalLoad === "LOW") : tasks;

  const toggle = (t: TaskView) => {
    setJustChecked(t.id);
    startTransition(async () => {
      setDone({ id: t.id, done: !t.done });
      await setTaskDone(t.id, !t.done);
    });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-mute">Tâches</h2>
        <button
          onClick={() => setTired((v) => !v)}
          aria-pressed={tired}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
            tired ? "border-mint-ink/30 bg-mint text-mint-ink" : "border-line bg-paper text-ink-soft hover:text-ink"
          }`}
        >
          <BatteryLow className="size-3.5" strokeWidth={1.5} aria-hidden />
          Énergie basse
        </button>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper shadow-sm">
        {visible.map((t) => {
          const load = LOAD[t.mentalLoad];
          return (
            <li key={t.id} className={`group flex items-start gap-3 px-4 py-3 ${t.done ? "opacity-50" : ""}`}>
              <button
                onClick={() => toggle(t)}
                aria-label={t.done ? "Marquer à faire" : "Marquer comme faite"}
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition ${
                  t.done ? "border-ink bg-ink text-white" : "border-gray-300 hover:border-ink"
                } ${justChecked === t.id && t.done ? "animate-pop" : ""}`}
              >
                {t.done && <Check className="size-3" strokeWidth={2.5} aria-hidden />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-medium ${t.done ? "line-through" : ""}`}>{t.title}</h3>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${load.cls}`}>{load.label}</span>
                  {t.project && <span className="text-xs text-ink-mute">{t.project}</span>}
                </div>
                {t.description && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.description}</p>}
                <p className="mt-1.5 flex items-center gap-1 text-xs tabular-nums text-ink-mute">
                  <Clock className="size-3" strokeWidth={1.5} aria-hidden />
                  {t.time ? `${t.time} · ` : "Sans créneau · "}
                  {t.durationMinutes} min
                </p>
              </div>

              {!t.done && (
                <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    onClick={() => setActive(t)}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:bg-canvas hover:text-ink"
                    title="Lancer un Pomodoro de 25 min"
                  >
                    <Play className="size-3" strokeWidth={1.5} aria-hidden />
                    Pomodoro
                  </button>
                  <button
                    onClick={() => startTransition(() => snoozeTask(t.id))}
                    className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:bg-canvas hover:text-ink"
                    title="Reporter au prochain créneau libre"
                  >
                    Reporter
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink-soft">
            {tired ? "Aucune tâche à énergie basse aujourd'hui." : "Rien de prévu. Importe un plan pour commencer."}
          </li>
        )}
      </ul>

      {active && (
        <Pomodoro
          title={active.title}
          onClose={() => setActive(null)}
          onDone={() => {
            toggle(active);
            setActive(null);
          }}
        />
      )}
    </section>
  );
}
