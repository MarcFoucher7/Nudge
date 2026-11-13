"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RotateCcw } from "lucide-react";
import { logFocusSession } from "@/lib/actions";
import { fmt, useCountdown } from "./pomodoro";

const PRESETS = [
  { work: 25, brk: 5 },
  { work: 50, brk: 10 },
  { work: 90, brk: 15 },
];

export type TimerTask = { id: string; title: string };

export function FocusTimer({ tasks }: { tasks: TimerTask[] }) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [taskId, setTaskId] = useState<string>("");
  const router = useRouter();

  return (
    <div className="rounded-lg border border-line bg-paper p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.work}
            onClick={() => setPreset(p)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${preset.work === p.work ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:text-ink"}`}
          >
            {p.work} / {p.brk}
          </button>
        ))}
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="ml-auto max-w-60 rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-soft outline-none focus:border-ink">
          <option value="">Sans tâche</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <Countdown
        key={`${preset.work}-${preset.brk}`}
        work={preset.work}
        brk={preset.brk}
        onWorkComplete={async (m) => {
          await logFocusSession(m, taskId || null);
          router.refresh();
        }}
      />
    </div>
  );
}

function Countdown({ work, brk, onWorkComplete }: { work: number; brk: number; onWorkComplete: (m: number) => void }) {
  const t = useCountdown(work, brk, onWorkComplete);
  const total = (t.phase === "work" ? work : brk) * 60;
  const pct = Math.round(((total - t.left) / total) * 100);
  return (
    <div className="mt-8 flex flex-col items-center">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-mute">{t.phase === "work" ? "Travail" : "Pause"}</span>
      <span className="mt-2 text-7xl font-semibold tabular-nums tracking-tight">{fmt(t.left)}</span>
      <div className="mt-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-line">
        <div className="h-full bg-ink transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-6 flex items-center gap-2">
        <button onClick={t.toggle} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          {t.running ? <Pause className="size-4" strokeWidth={1.5} /> : <Play className="size-4" strokeWidth={1.5} />}
          {t.running ? "Pause" : t.left === work * 60 && t.phase === "work" ? "Démarrer" : "Reprendre"}
        </button>
        <button onClick={t.reset} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm text-ink-soft hover:text-ink">
          <RotateCcw className="size-4" strokeWidth={1.5} />
          Réinitialiser
        </button>
      </div>
      <p className="mt-4 text-xs text-ink-mute">{t.cycles} cycle{t.cycles > 1 ? "s" : ""} terminé{t.cycles > 1 ? "s" : ""} dans cette session</p>
    </div>
  );
}
