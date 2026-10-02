# Agent instructions

Single source: edit CLAUDE.md. AGENTS.md, GEMINI.md and .github/copilot-instructions.md are relative symlinks to it.

## Architecture

REVEL is a public music website with private content administration. Independent npm packages: api/ is Express, PostgreSQL and Redis; app/ is Next.js App Router, React 19 and Tailwind 4. Node >=24. No workspace hoisting. Only Show is an example vertical slice; never import Planner business logic.

REST mutation -> boundary Zod validation -> service -> parameterized SQL transaction -> publishEvent -> Redis Socket.IO adapter -> authorized band/user room -> Query invalidation. Cookie sessions are opaque, hashed in the database, revocable and checked on every request and socket event. All API routes begin /api/v1. Use AuthContext as the sole frontend auth owner.

## Commands

| Command | Purpose |
| --- | --- |
| docker compose up -d | Dev stack, migrations and seed |
| bash .hooks/setup-hooks.sh | Activate versioned hooks |
| npm --prefix api run lint / build / test / coverage | API checks |
| npm --prefix app run lint / build / test / coverage | App checks |
| npm --prefix app run test:e2e | Browser checks |
| docker compose exec api npm run provision-user -- EMAIL PASSWORD admin | Provision admin |
| npm --prefix app run audit:browser / budget | Lighthouse and JS budget |
| make lint / test / build | Run checks in dev containers |
| docker compose -f compose.prod.yml up -d | Production deploy with one migration job |

## Key files

api/src/config.ts, db/migrate.ts, services/authService.ts, services/showService.ts, services/syncService.ts, middleware/security.ts, routes/index.ts; app/src/api/client.ts, contexts/AuthContext.tsx, hooks/useSync.ts, utils/offlineQueue.ts, components/PublicSite.tsx, components/AdminShows.tsx, app/layout.tsx; .env.example, DESIGN.md, docs/OPERATIONS.md.

## API

GET /health and /version; GET /shows; authenticated POST /shows, PATCH/DELETE /shows/:id; GET /auth/csrf, /auth/me; POST /auth/login, /auth/logout, /auth/forgot-password, /auth/reset-password; GET/PATCH /preferences; POST /newsletter; GET /newsletter/confirm; GET /account/export, DELETE /account; admin POST /shows/import. Errors: {error:{code,message,details?}}. Show updates require the current version; mutations use Idempotency-Key.

## Conventions

- Strict TypeScript; no unjustified any. Interfaces/types belong in src/types/.
- TDD: write a failing test before feature code. Real PostgreSQL/Redis integration tests, never mocked DBs. Enforced coverage thresholds.
- Thin route handlers, services own SQL. Validate at system boundaries. Comments only explain non-obvious reasons.
- Every persistent mutation calls publishEvent after commit. Domain rooms are band:revel and user:{id}; do not retain Planner collection rooms.
- Conventional Commits, focused milestones, final body trailer Co-Authored-By: Codex (GPT-6) <codex@openai.com>.
- No em/en dashes in code or documentation. No backwards compatibility shims.
- Follow DESIGN.md; original artwork/logo, flat grayscale surfaces, 4px spacing baseline, no pure black/white in UI tokens.
- Session secrets and keys stay outside git. Secrets support X_FILE; production must fail fast on missing/weak values.

## Feature specs and worktrees

Before coding a direct request, ask which branch/worktree setup the user wants. Record accepted decisions in .specs/yyyy-mm-dd-slug/plan.md and numbered task.md; keep checkboxes current. New worktrees use unique COMPOSE_PROJECT_NAME and APP_SUBDOMAIN. Activate hooks, configure HTTPS/hosts, push focused milestones and open a draft PR. Keep the worktree during review; remove only on explicit request. Never destroy volumes implicitly.

## Design and verification

Use the supplied Estrada Perdida and Petróleo assets. No invented stream URLs, track order, prices or dates. Public copy is Portuguese with English translations. Screenshots go to app/dist/screenshots/. Verify keyboard behavior, both themes, no overflow at 390/768/1440/1920, real API/auth/offline behavior, builds and production hardening. Report checks that the environment cannot run honestly.
