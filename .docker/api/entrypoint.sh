#!/bin/sh
set -e
npm ci --include=optional
npm run migrate
npm run seed || true
exec "$@"
