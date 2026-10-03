# Revel production on the VPS

Production origin: **https://revel.thiagobraga.dev**. Use the existing VPS and keep the gateway on 127.0.0.1:8080. Only the host reverse proxy exposes HTTP/HTTPS. The app, API, PostgreSQL and Redis need no public ports.

The VPS address and current reverse proxy are still required. This runbook prepares the deployment; it does not assert that DNS, certificates, mail or a live release have been configured.

## DNS and HTTPS

In the DNS zone for thiagobraga.dev, create an A record named revel pointing to the VPS public IPv4 address. Add an AAAA record only if that server actually serves this application over IPv6. Keep existing records for other subdomains.

Route this hostname in the existing HTTPS reverse proxy to http://127.0.0.1:8080. Forward the original Host and HTTPS scheme, replace X-Forwarded-For with the real client IP, and support WebSocket upgrades for /socket.io. The gateway preserves the trusted HTTPS header and passes the WebSocket connection through to the API. Allow inbound 80/443 for the proxy and certificate issuance, alongside the host's existing SSH access policy.

If there is no reverse proxy yet, the host Caddy example in [deploy/Caddyfile](../deploy/Caddyfile) is the simplest option. Caddy obtains/renews certificates, redirects HTTP to HTTPS and proxies WebSockets. Append the site block to an existing Caddyfile rather than replacing other sites. Validate before reloading:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

The example assumes Caddy runs on the host. A proxy container cannot reach this gateway through its own 127.0.0.1; adapt the networking to the actual host arrangement first. Reuse existing Nginx or Traefik instead of installing a second proxy on occupied ports. If Cloudflare is used, use Full (strict) TLS and configure trusted client-IP handling for that proxy explicitly.

## Publish the initial images

After this change is merged, run **Deploy** from GitHub Actions on **main**, leaving the deploy input unchecked. The workflow runs quality checks and publishes both images with the selected commit SHA, SBOM and provenance. The unchecked input deliberately stops after publishing, so the initial VPS setup does not need a webhook receiver.

Images are ghcr.io/thiagobraga/revel-api:SHA and ghcr.io/thiagobraga/revel-app:SHA. Record the full SHA from the successful run. Check GHCR package visibility; a public Git repository does not guarantee public packages. For private packages, authenticate on the VPS with a read:packages credential using docker login ghcr.io --password-stdin. Never put that credential in .env.production or shell history.

## Host checkout and environment

Use a dedicated deployment directory and user on the VPS. Install Docker Engine and the Compose plugin using the host distribution's supported instructions. Clone thiagobraga/revel there, then select the same commit as the images:

```sh
git checkout --detach YOUR_RELEASE_SHA
cp .env.production.example .env.production
chmod 600 .env.production
```

Set IMAGE_TAG to that full SHA. PROD_DOMAIN is already revel.thiagobraga.dev; production Compose derives both API CORS_ORIGIN and frontend SITE_URL from it. SITE_URL is server-only runtime configuration, so a previously built image can use the correct metadata and secure WebSocket origin. Leave the development .env out of the production directory.

Set EMAIL_FROM only after verifying an owned sending domain in Resend. A suggested dedicated subdomain is mail.revel.thiagobraga.dev; use the exact SPF/DKIM records Resend supplies and choose a real sending address on it. There is no verified sender or mail credential in this repository. Production intentionally fails without them.

## Create real secrets once

These commands create new credentials. Run them only in a new deployment directory with no secrets directory; an existing deployment must preserve its database/Redis credentials. Run locally on the VPS, not in a shared terminal transcript:

```sh
bash <<'SH'
set -euo pipefail
test ! -e secrets
umask 077
mkdir -m 700 secrets
production_db_password="$(openssl rand -hex 32)"
production_redis_password="$(openssl rand -hex 32)"
printf '%s' revel > secrets/postgres_user
printf '%s' revel > secrets/postgres_db
printf '%s' "$production_db_password" > secrets/postgres_password
printf '%s' "$production_redis_password" > secrets/redis_password
printf 'postgres://revel:%s@postgres:5432/revel' "$production_db_password" > secrets/database_url
printf 'redis://:%s@redis:6379' "$production_redis_password" > secrets/redis_url
openssl rand -hex 32 > secrets/csrf_secret
unset production_db_password production_redis_password
SH
```

Save the real Resend key into secrets/resend_api_key using a local editor or secret manager. Do not use scripts/test-secrets.sh on production: it creates a fake mail key exclusively for CI. Secret files must be readable by their container users. With file-backed Compose secrets, chmod 444 secrets/* allows the UID 1000 API and database services to read their mounts while the host secrets directory remains mode 700. Limit host access to the deployment user and root. Keep these files outside git and off logs.

Create the backup directories for container UID 1000 before enabling the operations profile:

```sh
sudo install -d -m 750 -o 1000 -g 1000 backups backups/daily backups/weekly
```

## First boot and verification

Always pass the production env file explicitly:

```sh
docker compose --env-file .env.production -f compose.prod.yml config --quiet
docker compose --env-file .env.production -f compose.prod.yml pull
docker compose --env-file .env.production -f compose.prod.yml up -d --wait
```

The migrate service owns schema changes and must complete before API startup. Do not run a second migration command. Verify from the VPS and then through the public HTTPS endpoint:

```sh
curl --fail http://127.0.0.1:8080/api/v1/health
curl --fail https://revel.thiagobraga.dev/health
curl --fail https://revel.thiagobraga.dev/api/v1/health
```

On a host with Node >=24, run PROD_DOMAIN=revel.thiagobraga.dev node scripts/check-production.mjs to check actual gateway responses: public metadata, the WebSocket CSP, secure CSRF cookies, anonymous-access rejection, the PWA manifest and service-worker cache policy. The same check runs in hosted container CI. Inspect the public page in a browser to confirm valid TLS, agenda rendering and secure socket connection after login.

Provision the first administrator through api's node dist/db/provisionUser.js EMAIL PASSWORD admin CLI. Supply the password through a local secret-handling procedure; avoid committing it or placing a literal password in shell history. The API image contains no npm. Verify login, a Show edit and realtime refresh, password reset delivery, newsletter confirmation and offline reconnect on the live origin before launch.

## Subsequent releases

Take a backup before migrations. Publish the release images, select the matching repository commit and change IMAGE_TAG, then pull/up using the commands above. Keep the previous SHA for code recovery, but assess schema compatibility before returning to older images. Migrations are forward-only; use corrective migrations or a verified restore into a separate database for data recovery.

The optional deploy input notifies the HTTPS receiver configured by DEPLOY_WEBHOOK_URL and DEPLOY_WEBHOOK_TOKEN in the GitHub production environment. Enable it only after that receiver exists and validates its token and image tag. The receiver must serialize deployment, select the matching repository commit, update IMAGE_TAG, take the backup and pull/up this production stack. The production environment URL in Actions is set to revel.thiagobraga.dev.

Configure an external uptime check on /api/v1/health and monitor cleanup/backup failures. Schedule the operations backup service and copy encrypted snapshots off-host. Follow [OPERATIONS.md](OPERATIONS.md) for restore drills, retention and auth behavior. Record the DNS/TLS/mail/live-release evidence in [VERIFICATION.md](VERIFICATION.md) after the host is configured.

References: [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Nginx WebSocket proxying](https://nginx.org/en/docs/http/websocket.html).
