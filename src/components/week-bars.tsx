import type { DayStat } from "@/lib/stats";

/** Minutes planifiées (clair) et terminées (foncé) par jour, en CSS pur. */
export function WeekBars({ days, today }: { days: DayStat[]; today: Date }) {
  const max = Math.max(60, ...days.map((d) => Math.max(d.planned, d.done)));
  const h = (v: number) => `${Math.round((v / max) * 100)}%`;
  return (
    <div className="rounded-lg border border-line bg-paper p-4 shadow-sm">
      <div className="flex gap-3">
        {days.map((d) => {
          const isToday = d.day.getTime() === today.getTime();
          return (
            <div key={d.day.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-24 w-full items-end justify-center gap-1">
                <div className="w-3 rounded-t bg-line" style={{ height: h(d.planned) }} title={`${d.planned} min planifiées`} />
                <div className="w-3 rounded-t bg-ink" style={{ height: h(d.done) }} title={`${d.done} min terminées`} />
              </div>
              <span className={`text-[11px] ${isToday ? "font-medium text-ink" : "text-ink-mute"}`}>
                {d.day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-ink-mute">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-line" /> planifié
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-sm bg-ink" /> terminé
        </span>
      </div>
    </div>
  );
}
