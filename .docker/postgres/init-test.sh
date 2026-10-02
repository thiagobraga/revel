#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v test_db="${POSTGRES_DB}_test" <<'SQL'
SELECT format('CREATE DATABASE %I', :'test_db') WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname=:'test_db') \gexec
SQL
