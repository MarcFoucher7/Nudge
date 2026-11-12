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
    (app)/
      layout.tsx              # sidebar, série, déconnexion ; redirige vers /login
      dashboard/page.tsx      # progression, agenda Google du jour, tâches du jour
      projects/page.tsx       # jauges + tâches par projet, création
      import/page.tsx         # import JSON + prompt à donner à l'IA
      academy/page.tsx        # Méthode des J, Active Recall, Pomodoro
  components/
    today-tasks.tsx           # liste, filtre énergie basse, cochage optimiste, report, Pomodoro
    pomodoro.tsx              # 25/5, barre fixe en bas, titre d'onglet
    project-gauge.tsx         # progression dotée (5 % + 95 % × faites/total)
    import-form.tsx           # useActionState sur importPlan
  lib/
    auth.ts                   # NextAuth + requireUserId()
    prisma.ts                 # client singleton
    google-calendar.ts        # calendarFor, busyBetween (dérivé des événements, freeBusy exigerait calendar.readonly), eventsBetween, upsertEvent
    scheduling.ts             # findSlot, placeAll (pur, testé)
    import.ts                 # schéma zod, parsePlan (tolère ``` et // commentaires)
    actions.ts                # server actions : setTaskDone, snoozeTask, createProject, importPlan
```

## Règles métier

- **Progression dotée** : la jauge d'un projet part à 5 % puis `5 + 95 × (faites / total)`.
- **Charge mentale** : `HIGH | MEDIUM | LOW`. Le filtre « Énergie basse » n'affiche que `LOW`.
- **Créneaux** : heures de travail 9 h–21 h, pas de 15 min, recherche sur 14 jours (`src/lib/scheduling.ts`). Les créneaux occupés sont ceux du calendrier Google plus les tâches Nudge déjà planifiées.
- **Import JSON** : `schedule_offset_days` est ajouté à la date d'import (J+0 démarre à l'heure courante). Chaque tâche devient un événement Google si le calendrier est connecté.
- **Report** : prochain créneau libre à partir de maintenant, événement Google déplacé, `snoozeCount` incrémenté.
- **Série** : incrémentée au premier cochage de la journée si la veille était active, sinon remise à 1.
- **Fuseau** : le serveur tourne avec `TZ=Europe/Paris` (variable d'environnement, à définir aussi sur Vercel).
