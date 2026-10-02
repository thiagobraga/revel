---
name: pr-ready
description: Verify a Revel change before marking its PR ready.
---

Read CLAUDE.md and the current feature plan before working.

Read the feature spec and current diff. Run relevant lint, typecheck, unit/integration coverage and builds; run browser tests for UI/auth/offline changes. Verify migration and production boot for infrastructure changes on a Docker host. Run dependency audit and inspect final screenshots. Update task.md and the PR with actual results, explicit unavailable checks and remaining configuration. Require Conventional Commits and the Codex coauthor trailer.
