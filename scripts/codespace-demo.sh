#!/usr/bin/env bash
# Starts the whole app (PostgreSQL, API, web app) inside a GitHub Codespace
# and prints a link you can share. For demos only: data lives in this
# codespace and the link works while the codespace is running.
#
#   bash scripts/codespace-demo.sh          start (or update after git pull)
#   bash scripts/codespace-demo.sh --stop   stop the containers
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--stop" ]; then
  docker compose --profile app down
  exit 0
fi

if [ -z "${CODESPACE_NAME:-}" ] || [ -z "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  echo "This script is meant to run inside a GitHub Codespace." >&2
  echo "Elsewhere, see the README (docker compose --profile app up -d --build)." >&2
  exit 1
fi

WEB_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
API_URL="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

# The URLs are baked into the web app at build time, so .env is rewritten
# whenever the codespace (and with it the URL) changes. Secrets are kept.
existing() { [ -f .env ] && grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
POSTGRES_PASSWORD="$(existing POSTGRES_PASSWORD)"; POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"
JWT_SECRET="$(existing JWT_SECRET)"; JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
INTERNAL_API_KEY="$(existing INTERNAL_API_KEY)"; INTERNAL_API_KEY="${INTERNAL_API_KEY:-$(openssl rand -hex 32)}"

cat > .env <<ENV
# Written by scripts/codespace-demo.sh for codespace ${CODESPACE_NAME}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
INTERNAL_API_KEY=${INTERNAL_API_KEY}
PUBLIC_APP_URL=${WEB_URL}
PUBLIC_BACKEND_URL=${API_URL}
CORS_ORIGINS=${WEB_URL}
# GitHub's port forwarding is one proxy hop in front of the API.
TRUST_PROXY=1
# Demo: show the API docs at ${API_URL}/api/docs
ENABLE_SWAGGER=true
ENV

echo "▶ Building and starting the app (the first run takes a few minutes)…"
docker compose --profile app up -d --build

echo "▶ Waiting for the API…"
for _ in $(seq 1 90); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null)" = "healthy" ] && break
  sleep 2
done

psql_db() { docker compose exec -T postgres psql -q -v ON_ERROR_STOP=1 -U marketplace -d marketplace_db "$@"; }
if [ "$(psql_db -tAc 'SELECT COUNT(*) FROM categories')" = "0" ]; then
  echo "▶ Loading categories and demo listings…"
  psql_db < database/seeds/001_seed_categories.sql
  psql_db < database/seeds/002_seed_demo_data.sql
fi

echo "▶ Making the web app and API reachable for anyone with the link…"
if ! gh codespace ports visibility 3000:public 3001:public -c "$CODESPACE_NAME" >/dev/null 2>&1; then
  echo "  Couldn't change port visibility automatically. In the PORTS tab, right-click"
  echo "  ports 3000 and 3001 → Port Visibility → Public."
fi

cat <<DONE

✅ The demo is running.

   Share this link:  ${WEB_URL}
   English version:  ${WEB_URL}/en
   Demo account:     alice@example.com / password123

   It works while this codespace is running; GitHub stops idle codespaces
   after a while (Settings → Codespaces → default idle timeout). To bring it
   back, open the codespace again and rerun this script.
DONE
