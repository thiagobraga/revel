# Production environment

Use https://revel.thiagobraga.dev on the existing VPS. Keep the independent Next.js/API Docker images, the single migration service, internal data networks and loopback gateway. Production PROD_DOMAIN is a hostname without a scheme or path; derive both API origin and server-rendered metadata from it.

Keep the approved isolated worktree and create a focused branch from merged main. Preserve the existing local deletion of .github/copilot-instructions.md outside this change.

Provide a separate production environment template, a runtime-only SITE_URL for server metadata/CSP, correct forwarded HTTPS handling, an initial manual deployment path and a VPS/DNS/TLS/secret/provisioning runbook. Add real gateway assertions to the container CI job. Do not invent credentials, a server IP, mail verification or successful DNS/TLS deployment.

Latest merged quality/security checks pass. Dependency review alone fails with a GitHub feature-availability error. Retain the high-severity gate; inspect the repository setting rather than bypassing it. GitHub settings require browser fallback approval because the connector cannot access them.

Host address, current reverse proxy, Resend sending-domain verification and deployment access are still needed for live setup. If the host has no reverse proxy, Caddy is the simple recommended option; reuse an existing proxy when present.
