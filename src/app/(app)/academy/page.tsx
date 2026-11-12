const METHODS = [
  {
    title: "Méthode des J",
    summary: "Répétition espacée : revoir une notion à J+1, J+3, J+7 puis J+30.",
    body: "Chaque relecture intervient juste avant l'oubli. Le rappel coûte un peu d'effort, et c'est cet effort qui ancre la mémoire. Dans Nudge, un plan importé avec schedule_offset_days crée automatiquement ces occurrences.",
  },
  {
    title: "Active Recall",
    summary: "Se tester plutôt que relire.",
    body: "Ferme le cours, formule la question, réponds de tête, puis vérifie. Les tâches importées avec des questions dans la description sont faites pour ça : réponds avant d'ouvrir tes notes.",
  },
  {
    title: "Pomodoro",
    summary: "25 minutes de travail, 5 minutes de pause.",
    body: "Un bloc court force à démarrer et limite les distractions. Après quatre blocs, prends une pause plus longue. Le minuteur se lance depuis n'importe quelle tâche du jour.",
  },
];

export default function AcademyPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold tracking-tight">Méthodes</h1>
      <div className="flex flex-col gap-4">
        {METHODS.map((m) => (
          <article key={m.title} className="rounded-lg border border-line bg-paper p-5 shadow-sm">
            <h2 className="text-sm font-medium">{m.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{m.summary}</p>
            <p className="mt-3 text-sm leading-relaxed">{m.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
