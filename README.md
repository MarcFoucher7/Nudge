# Nudge

Planification de révisions et de projets (TOEIC, concours, partiels) avec synchronisation Google Calendar.

## Stack

| Besoin | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| UI | Tailwind CSS v4, Inter, lucide-react, light theme uniquement |
| Auth Google + scope Calendar | Auth.js v5 (`next-auth@beta`) + `@auth/prisma-adapter` |
| Base de données | PostgreSQL via Prisma 6 |
| Google Calendar | `googleapis` : lecture des événements (créneaux occupés et agenda), création et déplacement d'événements |
| Validation JSON importé | `zod` |
| Calendrier | FullCalendar v7 (`@fullcalendar/react`, vue semaine, drag & drop) |
| IA | Serveur OpenAI-compatible (Ollama, LM Studio…) via `LLM_BASE_URL` ; stub de démonstration sans configuration |
| Tests | `node --test` (fonctions pures : planification, parseur) |
| Hébergement | Vercel + Supabase ou Neon |

## Mise en route

1. Postgres local (ou une URL Supabase/Neon dans `DATABASE_URL`) :

```bash
docker run -d --name nudge-pg -e POSTGRES_PASSWORD=nudge -e POSTGRES_DB=nudge -p 5432:5432 postgres:17
```

2. Variables d'environnement : copier `.env.example` en `.env`, puis générer le secret :

```bash
npx auth secret
```

3. Google Cloud Console : créer un client OAuth 2.0 « application Web », activer l'API Google Calendar, ajouter l'URI de redirection `http://localhost:3000/api/auth/callback/google` (et celle de production). Renseigner `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET`.

4. Installer, migrer, lancer :

```bash
npm install
```

```bash
npx prisma migrate dev
```

```bash
npm run dev
```

## Architecture

```
prisma/schema.prisma          # User (+ streaks), Account, Session, Project, Task
src/
  app/
    layout.tsx                # police Inter, lang fr
    globals.css               # tokens (gris, pastels désaturés)
    login/page.tsx            # bouton Google
    api/auth/[...nextauth]/   # Auth.js
    api/events/route.ts       # événements (tâches Nudge + Google) pour FullCalendar
    api/chat/route.ts         # chat IA : créneaux libres en contexte, réponse en streaming
    (app)/
      layout.tsx              # sidebar, série, déconnexion ; redirige vers /login
      dashboard/page.tsx      # progression, agenda Google du jour, tâches du jour
      planner/page.tsx        # calendrier FullCalendar + chat IA
      projects/page.tsx       # jauges + tâches par projet, création
      import/page.tsx         # import JSON + prompt à donner à l'IA
      academy/page.tsx        # Méthode des J, Active Recall, Pomodoro
  components/
    planner.tsx               # calendrier, drag & drop, panneau de détail, Pomodoro
    chat.tsx                  # chat IA, interception du JSON, aperçu puis ajout
    today-tasks.tsx           # liste, filtre énergie basse, cochage optimiste, report, Pomodoro
    pomodoro.tsx              # 25/5, barre fixe en bas, titre d'onglet
    project-gauge.tsx         # progression dotée (5 % + 95 % × faites/total)
    import-form.tsx           # useActionState sur importPlan
  lib/
    auth.ts                   # NextAuth + requireUserId()
    prisma.ts                 # client singleton
    google-calendar.ts        # calendarFor, busyBetween (dérivé des événements, freeBusy exigerait calendar.readonly), eventsBetween, upsertEvent
    scheduling.ts             # findSlot, placeAll, freeSlots (pur, testé)
    llm.ts                    # client chat/completions en streaming (ou stub)
    import.ts                 # schéma zod, parsePlan (tolère ``` et // commentaires)
    actions.ts                # server actions : setTaskDone, snoozeTask, moveTask, moveGoogleEvent, importPlan, previewPlan
```

## Règles métier

- **Progression dotée** : la jauge d'un projet part à 5 % puis `5 + 95 × (faites / total)`.
- **Charge mentale** : `HIGH | MEDIUM | LOW`. Le filtre « Énergie basse » n'affiche que `LOW`.
- **Créneaux** : heures de travail 9 h–21 h, pas de 15 min, recherche sur 14 jours (`src/lib/scheduling.ts`). Les créneaux occupés sont ceux du calendrier Google plus les tâches Nudge déjà planifiées.
- **Import JSON** : `schedule_offset_days` est ajouté à la date d'import (J+0 démarre à l'heure courante). Chaque tâche devient un événement Google si le calendrier est connecté.
- **Report** : prochain créneau libre à partir de maintenant, événement Google déplacé, `snoozeCount` incrémenté.
- **Série** : incrémentée au premier cochage de la journée si la veille était active, sinon remise à 1.
- **Fuseau** : le serveur tourne avec `TZ=Europe/Paris` (variable d'environnement, à définir aussi sur Vercel).

## Chat IA et planning

1. Le client envoie la conversation à `/api/chat`.
2. Le serveur calcule les créneaux libres des 14 prochains jours (Google Calendar + tâches Nudge) et les place dans le prompt système avec les projets existants.
3. La réponse est streamée. Si elle contient un bloc ```json au format Nudge (avec `scheduled_at` choisi par l'IA), le front appelle `previewPlan` : les tâches apparaissent en pointillés sur le calendrier.
4. « Ajouter au calendrier » appelle `importPlanJson` : tâches créées en base et événements Google créés.

## Serveur IA local (portable)

Sur le portable, installer [Ollama](https://ollama.com) puis :

```bash
ollama pull llama3.1
```

```bash
OLLAMA_HOST=0.0.0.0 ollama serve
```

Sur la machine qui héberge Nudge, dans `.env` : `LLM_BASE_URL="http://<ip-du-portable>:11434/v1"` et `LLM_MODEL="llama3.1"`. Tout serveur exposant `/v1/chat/completions` (LM Studio, vLLM, llama.cpp) convient. Sans `LLM_BASE_URL`, le chat répond avec un plan d'exemple.

Pour héberger aussi le site sur le portable : `npm run build` puis `npm start` (port 3000) derrière un tunnel (Cloudflare Tunnel ou Tailscale) ; ajouter l'URL publique comme URI de redirection dans le client OAuth Google.
