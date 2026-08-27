# Subscription Tracker

Tracks whether your subscriptions are worth it — log a use (and optionally what it would have
cost elsewhere) and see per-subscription value against monthly cost.

See `PLAN.md` for the original design doc.

## Stack

- Next.js (App Router)
- Turso (SQLite) + Drizzle ORM in `lib/db`
- Firebase Auth (Google sign-in)
- Deployed on Vercel

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Turso database:

   ```bash
   turso db create sub-tracker
   turso db show sub-tracker --url
   turso db tokens create sub-tracker
   ```

3. Create a Firebase project, enable the Google sign-in provider, and generate a service
   account key for `firebase-admin`.

4. Copy `.env.example` to `.env.local` and fill in the Turso and Firebase values.

5. Create the tables in Turso. Either push the schema directly:

   ```bash
   npm run db:push
   ```

   or run the SQL migration yourself against the database:

   ```bash
   turso db shell sub-tracker < lib/db/migrations/0000_glorious_captain_britain.sql
   ```

   The raw SQL (two tables, `subscriptions` and `usage_events`, plus their indexes) is checked
   into `lib/db/migrations/`. Regenerate it after schema changes with `npm run db:generate`.

6. Start the dev server:

   ```bash
   npm run dev
   ```

## Deployment

Import the repo into Vercel and set the variables from `.env.example` in the project's
environment settings. This is a plain Next.js app at the repo root — no `vercel.json` or custom
Root Directory setting is needed.
