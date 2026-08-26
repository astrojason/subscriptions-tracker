# Subscription Tracker

Tracks whether your subscriptions are worth it — log a use (and optionally what it would have
cost elsewhere) and see per-subscription value against monthly cost.

See `PLAN.md` for the original design doc.

## Stack

- Turborepo + npm workspaces
- Next.js (App Router) in `apps/web`
- Turso (SQLite) + Drizzle ORM in `packages/db`
- Firebase Auth (email/password + Google)
- Deployed on Vercel

## Setup

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Create a Turso database:

   ```bash
   turso db create sub-tracker
   turso db show sub-tracker --url
   turso db tokens create sub-tracker
   ```

3. Create a Firebase project, enable the Email/Password and Google sign-in providers, and
   generate a service account key for `firebase-admin`.

4. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the Turso and Firebase
   values.

5. Create the tables in Turso. Either push the schema directly:

   ```bash
   npm run db:push
   ```

   or run the SQL migration yourself against the database:

   ```bash
   turso db shell sub-tracker < packages/db/migrations/0000_glorious_captain_britain.sql
   ```

   The raw SQL (two tables, `subscriptions` and `usage_events`, plus their indexes) is checked
   into `packages/db/migrations/`. Regenerate it after schema changes with
   `npm run db:generate --workspace=@sub-tracker/db`.

6. Start the dev server:

   ```bash
   npm run dev
   ```

## Deployment

Import the repo into Vercel and set the variables from `apps/web/.env.example` in the project's
environment settings. The root `vercel.json` runs `turbo run build --filter=web`, so the Vercel
project's Root Directory should stay at the repo root (not `apps/web`).
