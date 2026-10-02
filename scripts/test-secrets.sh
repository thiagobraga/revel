#!/usr/bin/env bash
set -euo pipefail
mkdir -p secrets
database_password="$(openssl rand -hex 24)"
redis_password="$(openssl rand -hex 24)"
printf '%s' revel > secrets/postgres_user
printf '%s' revel > secrets/postgres_db
printf '%s' "$database_password" > secrets/postgres_password
printf '%s' "$redis_password" > secrets/redis_password
printf 'postgres://revel:%s@postgres:5432/revel' "$database_password" > secrets/database_url
printf 'redis://:%s@redis:6379' "$redis_password" > secrets/redis_url
openssl rand -hex 32 > secrets/csrf_secret
printf 're_%s' "$(openssl rand -hex 24)" > secrets/resend_api_key
chmod 444 secrets/*
