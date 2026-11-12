// Progression dotée : on part de 5 % pour que la jauge ne soit jamais vide.
export const progressOf = (total: number, done: number) => (total === 0 ? 5 : Math.round(5 + 95 * (done / total)));

const BAR: Record<string, string> = { mint: "bg-mint-ink", butter: "bg-butter-ink", salmon: "bg-salmon-ink", sky: "bg-sky-ink" };

export function ProjectGauge({ name, color, total, done }: { name: string; color: string; total: number; done: number }) {
  const pct = progressOf(total, done);
  return (
    <div className="rounded-lg border border-line bg-paper p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-medium">{name}</h3>
        <span className="text-xs tabular-nums text-ink-soft">{pct}%</span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line">
        <div className={`h-full ${BAR[color] ?? BAR.mint} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs tabular-nums text-ink-mute">
        {done} / {total} tâches
      </p>
    </div>
  );
}
