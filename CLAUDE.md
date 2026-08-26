# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Development Rules

## Database schema changes

The database is Turso (SQLite) via Drizzle ORM (`packages/db/schema.ts`). Never push or apply
schema changes directly against the live database (no `drizzle-kit push`, no live migration
runs on the user's behalf).

Instead:

1. Update `packages/db/schema.ts` to match the desired schema.
2. Run `npm run db:generate --workspace=@sub-tracker/db` to produce a SQL migration file under
   `packages/db/migrations/`.
3. Tell the user the migration file exists and that they need to run it manually against Turso
   (e.g. `turso db shell <db-name> < packages/db/migrations/<file>.sql`) — do not run it for them.

## Test-driven workflow

All bugs and feature work must follow this order:

1. Write a test (or tests) that **fail** against the current code, demonstrating the bug or the missing behaviour.
2. Implement the fix or feature.
3. Confirm every test passes (`npm test`).
4. Confirm the build succeeds (`npm run build`).

Work is not complete until **both** the test suite and the build are green.

## Responsive / mobile layout

When fixing mobile layout issues, **only add mobile-specific styles — never alter the desktop layout**. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) to apply styles at larger breakpoints that restore or preserve the existing desktop appearance. The pattern is: set the mobile style as the default, then use a breakpoint prefix to restore the desktop style. Never remove or change a desktop layout class — add a responsive override instead.

## Error handling

Nothing is allowed to fail silently. All errors must be surfaced in the UI as a copyable block containing the full error message.

## TODO.md

`TODO.md` is the single source of truth for all work in this project. Every bug, feature, enhancement, and upgrade must have an entry there before work begins.

Keep `TODO.md` up to date:

- Add an entry for every bug, feature, enhancement, or upgrade as soon as it is identified — before any code is written.
- Remove items from TODO.md once the work has been committed — do not leave them checked off. The git log is the record.

## Versioning

The app version lives in `package.json` and is displayed in the footer. A pre-commit hook should prompt interactively for a major/minor/patch bump on every commit; it should no-op when stdin isn't a TTY (e.g. commits made by Claude), so **when committing on the user's behalf, suggest which bump type (major/minor/patch) the change warrants** so the user can apply it manually if the hook doesn't catch it.

Every commit that changes actual code must bump the version (in `package.json` and `package-lock.json`). Commits that touch only `CLAUDE.md` are excluded.
