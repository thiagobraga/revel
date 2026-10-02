#!/usr/bin/env bash
set -euo pipefail
repo_root="$(git rev-parse --show-toplevel)"
run_checks(){
  local changed="$1"; shift
  [ "${SKIP_HOOKS:-0}" = 1 ] && return 0
  for package in api app; do
    if printf '%s\n' "$changed" | rg -q "^$package/"; then
      for script in "$@"; do
        if command -v docker >/dev/null && docker compose ps --status running --services 2>/dev/null | rg -qx "$package"; then
          docker compose exec -T "$package" npm run "$script"
        else
          npm --prefix "$repo_root/$package" run "$script"
        fi
      done
    fi
  done
}
