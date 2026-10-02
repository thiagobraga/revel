---
name: db-migration
description: Add or review a numbered PostgreSQL migration.
---

Read CLAUDE.md and the current feature plan before working.

Write a failing real-database test. Add a new forward-only SQL file. Verify fresh apply, repeat apply, lock serialization and failure rollback. Never edit existing history. Update API documentation and task.md.
