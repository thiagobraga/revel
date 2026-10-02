#!/usr/bin/env bash
set -euo pipefail
git config core.hooksPath .hooks
chmod 755 .hooks/pre-commit .hooks/pre-push .hooks/setup-hooks.sh
