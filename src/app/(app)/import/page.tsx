import { ImportForm } from "@/components/import-form";

const PROMPT = `Tu es un expert en neurosciences, en apprentissage optimisé (Active Recall, Spaced Repetition/Méthode des J) et en gestion du temps.

Mon objectif : [OBJECTIF, ex: Préparer le TOEIC]
Mon temps disponible : [ex: 2h par soir la semaine, 4h le samedi]
Date butoir : [DATE]

Découpe cet objectif en un plan d'action concret et génère un fichier JSON avec les tâches.
Pour chaque tâche, applique la méthode la plus adaptée :
- Si c'est de la mémorisation, génère plusieurs occurrences (J+1, J+3, J+7).
- Si c'est de l'apprentissage, inclus 2-3 questions de test (Active Recall) dans la "description".
- Découpe les tâches longues en blocs Pomodoro (25min travail / 5min pause).
- Assigne une "mental_load" (high, medium, low).

Format JSON attendu :
{
  "project": "Nom du projet",
  "tasks": [
    {
      "title": "Titre actionnable",
      "description": "Détails ou questions d'Active Recall",
      "duration_minutes": 25,
      "mental_load": "high",
      "method_used": "pomodoro",
      "schedule_offset_days": 0
    }
  ]
}
Renvoie UNIQUEMENT le bloc JSON valide.`;

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Importer un plan</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Colle le JSON généré par une IA. Les J+n sont calculés depuis aujourd&apos;hui et chaque tâche est placée dans un créneau libre de ton calendrier.
        </p>
      </header>
      <ImportForm />
      <details className="rounded-lg border border-line bg-paper shadow-sm">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Prompt à donner à l&apos;IA</summary>
        <pre className="overflow-x-auto border-t border-line px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">{PROMPT}</pre>
      </details>
    </div>
  );
}
