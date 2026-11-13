import Link from "next/link";
import { ArrowRight, Brain, Repeat, Timer } from "lucide-react";

/** Courbe de l'oubli : chaque rappel remonte la rétention et ralentit la chute suivante. */
function ForgettingCurve() {
  const reviews = [
    { x: 90, label: "J+1" },
    { x: 170, label: "J+3" },
    { x: 260, label: "J+7" },
  ];
  return (
    <svg viewBox="0 0 340 130" className="w-full text-ink-mute" aria-label="Courbe de l'oubli avec rappels à J+1, J+3 et J+7">
      <line x1="20" y1="110" x2="330" y2="110" stroke="currentColor" strokeWidth="1" />
      <line x1="20" y1="20" x2="20" y2="110" stroke="currentColor" strokeWidth="1" />
      <text x="24" y="16" fontSize="9" fill="currentColor">mémoire</text>
      <text x="300" y="124" fontSize="9" fill="currentColor">temps</text>
      {/* sans rappel */}
      <path d="M20 22 C 50 70, 80 95, 330 108" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="200" y="104" fontSize="9" fill="currentColor">sans rappel</text>
      {/* avec rappels : la chute ralentit à chaque fois */}
      <path d="M20 22 C 45 60, 70 80, 90 86 L90 24 C 120 50, 150 64, 170 70 L170 24 C 210 40, 240 48, 260 52 L260 24 C 290 30, 310 33, 330 35" fill="none" stroke="#047857" strokeWidth="2" />
      {reviews.map((r) => (
        <g key={r.label}>
          <circle cx={r.x} cy="24" r="3.5" fill="#047857" />
          <text x={r.x} y="14" fontSize="9" textAnchor="middle" fill="#047857" fontWeight="600">{r.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Cycle Pomodoro : 4 blocs de travail, 3 pauses courtes, 1 pause longue. */
function PomodoroCycle() {
  const blocks = [25, 5, 25, 5, 25, 5, 25, 20];
  const total = blocks.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="flex h-8 w-full gap-0.5 overflow-hidden rounded-md">
        {blocks.map((m, i) => (
          <div
            key={i}
            style={{ width: `${(m / total) * 100}%` }}
            className={`flex items-center justify-center text-[10px] font-medium ${i % 2 === 0 ? "bg-ink text-white" : i === 7 ? "bg-mint text-mint-ink" : "bg-line text-ink-soft"}`}
            title={`${m} min`}
          >
            {m}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-ink-mute">
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-ink" /> travail 25 min</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-line" /> pause 5 min</span>
        <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-mint" /> pause longue</span>
      </div>
    </div>
  );
}

const METHODS = [
  {
    Icon: Repeat,
    title: "Méthode des J",
    hook: "Tu oublies 70 % d'un cours en 24 h. Trois rappels bien placés changent tout.",
    why: "Chaque rappel arrive juste avant l'oubli. L'effort de se souvenir, pas la relecture, reconsolide la trace en mémoire et ralentit la chute suivante. Après J+7, l'information tient des semaines.",
    steps: ["Apprends la notion une première fois (J0).", "Revois-la le lendemain (J+1), 10 à 15 minutes suffisent.", "Puis à J+3, J+7 et J+30. Chaque fois plus vite."],
    example: "Vocabulaire TOEIC appris lundi : revu mardi, jeudi, puis lundi suivant.",
    nudge: "Un plan importé avec schedule_offset_days ou demandé à l'assistant crée ces occurrences automatiquement, placées dans tes créneaux libres.",
    visual: <ForgettingCurve />,
  },
  {
    Icon: Brain,
    title: "Active Recall",
    hook: "Relire donne l'impression de savoir. Se tester prouve qu'on sait.",
    why: "La relecture crée une familiarité trompeuse. Récupérer l'information de mémoire, sans support, est l'exercice qui construit le souvenir. Les études le placent loin devant surligner ou recopier.",
    steps: ["Ferme le cours et formule une question précise.", "Réponds à voix haute ou par écrit, de tête.", "Vérifie, note ce qui manque, recommence sur ce point."],
    example: "Plutôt que relire le chapitre sur la responsabilité civile : « Quelles sont les trois conditions de la responsabilité du fait des choses ? »",
    nudge: "Les tâches importées contiennent des questions dans leur description. Réponds avant d'ouvrir tes notes, puis coche.",
    visual: (
      <ol className="grid grid-cols-3 gap-2 text-center text-xs">
        {["Question", "Réponse de tête", "Vérification"].map((s, i) => (
          <li key={s} className="rounded-md border border-line bg-canvas px-2 py-3">
            <span className="block text-lg font-semibold tabular-nums text-ink">{i + 1}</span>
            <span className="text-ink-soft">{s}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    Icon: Timer,
    title: "Pomodoro",
    hook: "Le plus dur n'est pas de travailler 25 minutes, c'est de commencer.",
    why: "Un bloc court rend le démarrage facile et la distraction coûteuse : tout attend la pause. Les pauses régulières évitent la fatigue qui fait relire trois fois la même ligne.",
    steps: ["Choisis une seule tâche, lance 25 minutes.", "Pause de 5 minutes, loin de l'écran.", "Après quatre blocs, pause longue de 15 à 30 minutes."],
    example: "Une séance de 2 h = 4 blocs. Si la tâche est finie avant, utilise le reste pour te tester dessus.",
    nudge: "Le Timer et le bouton Pomodoro de chaque tâche enregistrent tes phases de travail. Le Dashboard cumule tes minutes de focus.",
    visual: <PomodoroCycle />,
  },
];

export default function AcademyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Méthodes</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Trois techniques validées par la recherche en psychologie cognitive. Nudge les applique pour toi, mais les comprendre te rend plus efficace.
        </p>
      </header>

      {METHODS.map((m, i) => (
        <article key={m.title} className="rounded-lg border border-line bg-paper shadow-sm">
          <div className="flex items-start gap-3 border-b border-line p-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-soft">
              <m.Icon className="size-4" strokeWidth={1.5} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-mute">Méthode {i + 1}</p>
              <h2 className="text-base font-semibold tracking-tight">{m.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{m.hook}</p>
            </div>
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider text-ink-mute">Pourquoi ça marche</h3>
                <p className="mt-1.5 text-sm leading-relaxed">{m.why}</p>
              </section>
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wider text-ink-mute">Comment faire</h3>
                <ol className="mt-1.5 flex flex-col gap-1.5 text-sm">
                  {m.steps.map((s, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="w-4 shrink-0 tabular-nums text-ink-mute">{j + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            <div className="flex flex-col gap-5">
              <section>{m.visual}</section>
              <section className="rounded-md bg-canvas p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-mute">Exemple</p>
                <p className="mt-1 leading-relaxed text-ink-soft">{m.example}</p>
              </section>
              <section className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-mute">Dans Nudge</p>
                <p className="mt-1 leading-relaxed">{m.nudge}</p>
              </section>
            </div>
          </div>
        </article>
      ))}

      <section className="rounded-lg border border-line bg-paper p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">Une journée type</h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {[
            ["Matin, énergie haute", "un bloc Pomodoro sur la notion la plus difficile (apprentissage)."],
            ["Après-midi", "deux blocs : exercices, puis Active Recall sur le matin."],
            ["Soir, énergie basse", "15 minutes de rappels J+1 / J+3 / J+7, puis coche et laisse la série monter."],
          ].map(([k, v]) => (
            <li key={k} className="flex gap-2">
              <span className="w-40 shrink-0 font-medium">{k}</span>
              <span className="text-ink-soft">{v}</span>
            </li>
          ))}
        </ol>
        <Link href="/planner" className="mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline">
          Demander un plan à l&apos;assistant
          <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
