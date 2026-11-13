"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Check } from "lucide-react";
import { logFocusSession } from "@/lib/actions";

type S = { phase: "work" | "break"; left: number; running: boolean; cycles: number };

const tick = (work: number, brk: number) => (s: S): S => {
  if (!s.running) return s;
  if (s.left > 1) return { ...s, left: s.left - 1 };
  return s.phase === "work" ? { phase: "break", left: brk * 60, running: true, cycles: s.cycles + 1 } : { phase: "work", left: work * 60, running: false, cycles: s.cycles };
};

export const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

/** Compte à rebours travail/pause. `onWorkComplete(minutes)` à chaque fin de phase de travail. */
export function useCountdown(work: number, brk: number, onWorkComplete?: (minutes: number) => void, autoStart = false) {
  const [s, setS] = useState<S>({ phase: "work", left: work * 60, running: autoStart, cycles: 0 });
  const cb = useRef(onWorkComplete);
  useEffect(() => {
    cb.current = onWorkComplete;
  });

  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => setS(tick(work, brk)), 1000);
    return () => clearInterval(id);
  }, [s.running, work, brk]);

  const prev = useRef(s.phase);
  useEffect(() => {
    if (prev.current === "work" && s.phase === "break") cb.current?.(work);
    prev.current = s.phase;
  }, [s.phase, work]);

  useEffect(() => {
    const before = document.title;
    document.title = `${fmt(s.left)} · ${s.phase === "work" ? "Travail" : "Pause"}`;
    return () => {
      document.title = before;
    };
  }, [s.left, s.phase]);

  return {
    ...s,
    toggle: () => setS((x) => ({ ...x, running: !x.running })),
    reset: () => setS({ phase: "work", left: work * 60, running: false, cycles: 0 }),
  };
}

/** Barre fixe lancée depuis une tâche (25/5). */
export function Pomodoro({ title, taskId, onDone, onClose }: { title: string; taskId?: string; onDone: () => void; onClose: () => void }) {
  const t = useCountdown(25, 5, (m) => void logFocusSession(m, taskId), true);
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper px-6 py-3 shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-4">
        <span className="w-16 text-2xl font-semibold tabular-nums tracking-tight">{fmt(t.left)}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-ink-mute">{t.phase === "work" ? "Travail" : "Pause"}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{title}</span>
        <button onClick={t.toggle} className="rounded-md border border-line p-1.5 text-ink-soft hover:text-ink" aria-label={t.running ? "Pause" : "Reprendre"}>
          {t.running ? <Pause className="size-4" strokeWidth={1.5} /> : <Play className="size-4" strokeWidth={1.5} />}
        </button>
        <button onClick={onDone} className="inline-flex items-center gap-1 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
          <Check className="size-4" strokeWidth={2} aria-hidden />
          Terminé
        </button>
        <button onClick={onClose} className="rounded-md border border-line p-1.5 text-ink-soft hover:text-ink" aria-label="Arrêter">
          <Square className="size-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
