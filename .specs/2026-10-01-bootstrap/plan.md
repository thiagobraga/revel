# Revel bootstrap

REVEL is a public band website with a private editor. Listeners discover Estrada Perdida and Petróleo, read the manifesto, browse confirmed shows, enquire about merch and subscribe to updates. Portuguese is the default language, with English available. Both themes follow the supplied grayscale design and keep the Petróleo footer in the opposite tonal polarity.

The reference feature is Show. An administrator or editor creates, edits and removes shows. Visitors see published shows in the agenda. Admin changes sync across sessions and can queue offline, with explicit handling of conflicting edits. No Planner task, habit or collection logic is carried over.

## Decisions

- Approved: isolated worktree, branch feat/bootstrap, Next.js App Router and standalone output, independent Express API, TanStack Query only.
- REVEL / revel, owner thiagobraga, GHCR revel-api and revel-app. Domain is configured later.
- Cookie sessions with CSRF, admin/editor roles, no public registration or invitations.
- Bundled artwork. Releases, tracks and merch remain content configuration; only Show is a complete reference entity.
- Newsletter subscribers use double opt-in. Production mail requires a verified sending subdomain and Resend credentials.
- Offline reads and ordered, idempotent admin mutation replay; logout wipes local user data.
- Theme/locale preferences, install UX, update toast and public offline fallback.
- No checkout, stock claims, invented shows, fake streaming links, OAuth, passkeys, TOTP, uploads, collaboration, recurrence, reminders or native wrapper.

## Acceptance

The public page renders server-side, has keyboard-accessible responsive navigation and faithful original logos/covers. The Show editor works with real PostgreSQL and Redis, session revocation, CSRF, rate limits and realtime notifications. Deployments use hardened images and a single migration job. Tests cover successful and rejected requests, offline retry/conflict behavior and both desktop and mobile layouts.

## Relevant files

CLAUDE.md, DESIGN.md, compose.yml, compose.prod.yml, .env.example, .docker/, api/src/, app/src/, app/public/, .hooks/, .github/, .claude/.

## Verification limits

This execution environment has no Docker daemon and no container capabilities. Docker build/boot verification must run in CI or on a Docker host; do not report it as passed here.
