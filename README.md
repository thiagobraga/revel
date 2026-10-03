# REVEL

Public band website and private show editor. Next.js App Router provides server-rendered public pages; Express owns authentication, PostgreSQL data and Socket.IO sync. Two independent npm packages, Node >=24, no workspaces.

The public identity follows [DESIGN.md](DESIGN.md), using supplied original artwork, grayscale themes and a contrasting Petróleo footer. Portuguese and English are supported. Show is the reference vertical slice, with admin/editor authorization, version conflicts, idempotency, realtime refresh and offline mutation replay.

Copy .env.example to .env, configure the external Traefik network/local HTTPS, then run:

```sh
bash .hooks/setup-hooks.sh
docker compose up -d
```

See [operations](docs/OPERATIONS.md) for production secrets, provisioning, email, backups and restore. See [CLAUDE.md](CLAUDE.md) for architecture and commands, [the plan](.specs/2026-10-01-bootstrap/plan.md) for approved decisions, and [verification](docs/VERIFICATION.md) for tested behavior and limits. Generated API contract: GET /api/v1/openapi.json. Production is planned at https://revel.thiagobraga.dev on the existing VPS; see [the production runbook](docs/PRODUCTION.md). External music/contact links remain configuration.
