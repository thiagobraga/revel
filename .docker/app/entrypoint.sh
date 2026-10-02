#!/bin/sh
set -e
npm ci --include=optional
mkdir -p coverage-reports dist/screenshots
exec "$@"
