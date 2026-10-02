---
name: new-service
description: Add a thin REST boundary and PostgreSQL service.
---

Read CLAUDE.md and the current feature plan before working.

Write a failing real-DB integration test. Add Zod validation at the request boundary, types in api/src/types, SQL in services and a thin route. Use parameterized queries and AppError. Document the endpoint and publish each persistent mutation after commit.
