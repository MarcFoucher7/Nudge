"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square, Check } from "lucide-react";

const WORK = 25 * 60;
const BREAK = 5 * 60;
type S = { phase: "work" | "break"; left: number; running: boolean };

const tick = (s: S): S => {
  if (!s.running) return s;
  if (s.left > 1) return { ...s, left: s.left - 1 };
  return s.phase === "work" ? { phase: "break", left: BREAK, running: true } : { ...s, left: 0, running: false };
};

export function Pomodoro({ title, onDone, onClose }: { title: string; onDone: () => void; onClose: () => void }) {
  const [s, setS] = useState<S>({ phase: "work", left: WORK, running: true });

  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => setS(tick), 1000);
    return () => clearInterval(id);
  }, [s.running]);

  useEffect(() => {
    const prev = document.title;
    document.title = `${fmt(s.left)} · ${s.phase === "work" ? "Travail" : "Pause"}`;
    return () => {
      document.title = prev;
    };
  }, [s.left, s.phase]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper px-6 py-3 shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center gap-4">
        <span className="w-16 text-2xl font-semibold tabular-nums tracking-tight">{fmt(s.left)}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-ink-mute">{s.phase === "work" ? "Travail" : "Pause"}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{title}</span>
        <button onClick={() => setS((x) => ({ ...x, running: !x.running }))} className="rounded-md border border-line p-1.5 text-ink-soft hover:text-ink" aria-label={s.running ? "Pause" : "Reprendre"}>
          {s.running ? <Pause className="size-4" strokeWidth={1.5} /> : <Play className="size-4" strokeWidth={1.5} />}
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

const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
