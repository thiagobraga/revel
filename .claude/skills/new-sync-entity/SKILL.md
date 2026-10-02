---
name: new-sync-entity
description: Wire a new domain entity through mutation, sync and offline replay.
---

Read CLAUDE.md and the current feature plan before working.

Write tests for authorization, idempotency and version conflicts first. Make database changes forward-only. Call publishEvent from all mutations. Use only authorized rooms and invalidate the relevant Query keys. Explicitly extend the offline path allowlist and payload validation; test replay and logout wipe.
