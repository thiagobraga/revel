# Running Revel

Node 24 or newer is required. api/ and app/ have independent lockfiles. Copy .env.example to .env, activate hooks with bash .hooks/setup-hooks.sh, and use docker compose up -d. The dev entrypoint is the only dev migration caller. Production uses the one-shot migrate service and gates API startup on its success.

## Local HTTPS and worktrees

Use a unique COMPOSE_PROJECT_NAME and APP_SUBDOMAIN for each worktree. The external Traefik network named by PROXY_NETWORK must exist. Generate a local certificate with mkcert for revel.local and '*.revel.local', load it into the host Traefik TLS configuration, and add 127.0.0.1 host entries for revel.local, api.revel.local, db.revel.local and coverage.revel.local. Wildcards in /etc/hosts do not work. Set CORS_ORIGIN and NEXT_PUBLIC_SITE_URL to the exact HTTPS origin. Certificates and hosts entries are host setup, never repository secrets. The debug profile adds pgAdmin and coverage reports.

## Production

Choose the real domain and verified Resend sending address first. Generate distinct random passwords and a 32-byte CSRF secret outside git. Place secrets in the paths listed in compose.prod.yml. DATABASE_URL and REDIS_URL must use the same credentials as the corresponding service. Files must be readable by container UID 1000; mount the secret directory with strict host access. Use a secret manager on a shared host. Set HTTPS CORS_ORIGIN, EMAIL_FROM, GHCR_OWNER and an immutable IMAGE_TAG. The application cannot start with development passwords or missing mail credentials.

Run docker compose -f compose.prod.yml pull, then docker compose -f compose.prod.yml up -d --wait. The API trusts one backend proxy hop for client IP rate limits. The host reverse proxy must overwrite X-Forwarded-For with the real client IP; the loopback-only gateway preserves that trusted header. The host reverse proxy terminates HTTPS and forwards only to 127.0.0.1:8080. Data/backend networks are internal. Only API has outbound mail access. Verify /api/v1/health and /health, then provision the first admin with docker compose -f compose.prod.yml exec api node dist/db/provisionUser.js EMAIL PASSWORD admin. Provisioning an existing account intentionally changes its password/role and revokes every session.

The manual deploy workflow publishes SHA-tagged GHCR images with SBOM/provenance, then calls a configured HTTPS deployment receiver. Configure DEPLOY_WEBHOOK_URL and DEPLOY_WEBHOOK_TOKEN in the production GitHub environment. The receiver must validate the token, select the image tag, pull and run the compose command. No production host or domain is configured in this scaffold. Deployment is serialized. Configure band links through SPOTIFY_URL, BANDCAMP_URL, YOUTUBE_URL, INSTAGRAM_URL, CONTACT_URL and PETROLEO_URL in the app environment. Empty links produce an honest availability notice. No payments or inventory are implemented.

## Backup and recovery

Create BACKUP_DIR/daily and BACKUP_DIR/weekly owned by UID 1000. Enable --profile operations for the pg_dump backup service. It writes atomic custom-format dumps, retains seven daily and four weekly snapshots and must be monitored for failed exits. Copy encrypted backups off the host. A mounted local directory alone is insufficient protection against host loss.

For a restore drill, create a new database and use pg_restore --exit-on-error --no-owner --dbname=RESTORE_DATABASE SNAPSHOT.dump. Compare row counts and run the API integration smoke checks before switching application credentials. Never restore over the running production database. Take a backup before schema changes. Migrations are forward-only: restore the backup into a separate database for data recovery, or add a new corrective migration. Never change an applied SQL checksum. Failed SQL rolls back without entering schema_migrations.

## Auth, email and retention

Cookie sessions have configurable idle and absolute TTLs. Password resets expire after 30 minutes, consume once and revoke all sessions. Socket checks fail closed on revocation, expiry or storage failure. Origin and signed CSRF checks apply to every write. Public registration is closed; admin/editor accounts are provisioned by CLI. Account deletion protects the last administrator. User export excludes secrets. Admin show import accepts at most 100 records and is resumable with the same idempotency key; a conflicting payload receives 409.

Configure SPF and DKIM using the exact records supplied by Resend for a dedicated sending subdomain, and publish a DMARC policy. Test real delivery before launch. Development without a mail key logs the confirmation/reset URL. Newsletter confirmation is double opt-in; unsubscribe uses the private confirmation token. Avoid forwarding links into shared logs. The cleanup service runs hourly, expiring sessions/reset tokens, unconfirmed seven-day subscribers. Mutation receipts remain for the lifetime of the account so delayed retries cannot reapply a committed change. Account deletion removes those receipts.

## Verification

API tests destructively reset only a dedicated database whose URL ends in _test. Never point tests at development or production data. Start real PostgreSQL 16 and Redis 7, export DATABASE_URL, REDIS_URL, CORS_ORIGIN and CSRF_SECRET, then run npm --prefix api run coverage. Browser tests use another isolated _test database, require the API build and a running production app, and provision their own user. PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH selects a system Chromium when needed.

Run package lint, typecheck, coverage and build commands; npm --prefix app run test:e2e; npm --prefix app run budget; and npm audit --audit-level=high in both packages. Browser coverage uses COVERAGE=true for an instrumented build and PLAYWRIGHT_COVERAGE=1 for E2E, followed by app/scripts/merge-coverage.mjs. Start that instrumented build before running the browser suite. Coverage builds intentionally disable the service worker. The coverage debug service serves app/coverage-reports.

Logs use JSON, request IDs and cookie/token redaction. Configure an external uptime check against /api/v1/health. Prometheus, OpenTelemetry, Sentry, OAuth, passkeys, TOTP, BullMQ, uploads, collaboration, push and native wrappers are deferred until required. The scheduled backup and lightweight cleanup loop are sufficient for this scaffold.

The dev Postgres initializer creates POSTGRES_DB_test on first boot. With an existing volume, run the initializer manually using docker compose exec -T postgres sh /docker-entrypoint-initdb.d/init-test.sh. TEST_DATABASE_URL controls API tests independently of the live database URL. Browser tests should use a separate dedicated test database and test API process, because their fixtures intentionally truncate show and preference data.

Activate the Claude workflow by installing the Claude GitHub App for this repository and configuring ANTHROPIC_API_KEY. It accepts @claude mentions only from repository owners, members and collaborators. Playwright MCP is configured in .mcp.json; Claude permissions are in .claude/settings.json. No agent credential is committed.

Image builds receive BUILD_REVISION from the Git SHA or IMAGE_TAG. This changes the timestamped BUILD_ID even when an API layer would otherwise be reused for a frontend-only release.
