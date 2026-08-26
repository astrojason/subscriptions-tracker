# Subscription Tracker — Build Plan

## Stack
- **Monorepo:** Turborepo, npm workspaces
- **Frontend:** Next.js (App Router) in `apps/web`
- **DB:** Turso (SQLite) + Drizzle ORM
- **Auth:** Firebase Auth (email/password or Google sign-in)
- **Hosting:** Vercel

## Repo structure
```
sub-tracker/
├── apps/
│   └── web/                # Next.js app
│       ├── app/
│       │   ├── api/subs/route.ts       # GET/POST subscriptions
│       │   ├── api/subs/[id]/route.ts  # PATCH/DELETE, POST /log-use
│       │   ├── page.tsx                # dashboard
│       │   └── login/page.tsx
│       ├── lib/
│       │   ├── db.ts        # Drizzle + Turso client
│       │   ├── firebase.ts  # Firebase client + admin init
│       │   └── auth.ts      # session/middleware helper
│       └── middleware.ts    # protect routes, verify Firebase token
├── packages/
│   └── db/                  # shared Drizzle schema + migrations
│       ├── schema.ts
│       └── drizzle.config.ts
├── turbo.json
├── package.json
└── .env.example
```

## Data model (`packages/db/schema.ts`)
```
subscriptions
  id            text (uuid), pk
  userId        text (Firebase uid), indexed
  name          text
  monthlyCost   real
  createdAt     integer (timestamp)

usage_events
  id              text (uuid), pk
  subscriptionId  text, fk -> subscriptions.id
  usedAt          integer (timestamp)
  value           real, nullable   # what this use would have cost otherwise
```
"Worth it" and per-use cost are computed, not stored — see logic below.

## "Worth it" logic
Two ways value gets tallied, both fed by the same `value` field on a usage_event:

1. **Value-tracked (AMC+ style):** user logs what each use would have cost (ticket price, concession discount, etc.). Sum `value` across events this month.
   - `totalValue = sum(uses.value)` for the current month
   - Worth it when `totalValue >= monthlyCost`
   - Progress bar: `totalValue / monthlyCost`

2. **Count-only (Netflix style):** user just logs "I used it" with no value.
   - `perUseCost = monthlyCost / usesThisMonth`
   - Worth it is judgment-based here (no external price to compare to) — just surface `perUseCost` and let the "barely used" flag trigger if `usesThisMonth` is low (e.g. < 2/month)

Mixed logging (some events with value, some without) is fine — sum whatever `value`s exist, and additionally show use count/per-use cost for context. A subscription is only measured on whichever mode has data.

## Auth flow
1. Firebase client SDK handles sign-in in `login/page.tsx`.
2. Client attaches Firebase ID token to API requests (`Authorization: Bearer <token>`).
3. `middleware.ts` / API routes verify token via `firebase-admin`.
4. All DB queries scoped by `userId` from the verified token — no cross-user data leakage.

## API routes
- `GET /api/subs` — list current user's subscriptions with usage counts
- `POST /api/subs` — create `{ name, monthlyCost }`
- `PATCH /api/subs/:id` — edit name/cost
- `DELETE /api/subs/:id` — remove (cascade usage_events)
- `POST /api/subs/:id/log-use` — insert a usage_event with now() and optional `{ value }`

## Frontend
- Reuse the layout/logic from the artifact I already built (`sub-tracker.jsx`) as the visual reference — same card layout, add form, check-to-log-use, "barely used" flag.
- Swap `window.storage` calls for fetch calls to the API routes above.
- Add a login gate (redirect to `/login` if no Firebase session).

## Environment variables (`.env.example`)
```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Deployment
- Push repo to GitHub, import into Vercel.
- Set env vars above in Vercel project settings.
- Vercel builds `apps/web` via Turborepo (`turbo run build --filter=web`).
- Turso DB provisioned separately (`turso db create`), migrations run via `drizzle-kit push` in a predeploy step or manually before first deploy.

## Build order for Claude Code
1. Scaffold Turborepo + npm workspaces, empty Next.js app in `apps/web`.
2. Add `packages/db` with Drizzle schema + Turso client, run first migration.
3. Wire up Firebase client + admin SDKs, build `/login`.
4. Build API routes (CRUD + log-use), scoped to authed user.
5. Port the dashboard UI from `sub-tracker.jsx`, hooked to the API.
6. Add `vercel.json` if needed, verify build, deploy.