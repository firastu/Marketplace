#!/usr/bin/env bash
# Shared connection settings for the database scripts. Values come from the
# project-root .env (same file docker-compose reads), then these defaults,
# which match docker-compose.yml.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Variables already set in the environment win over .env, so
# `POSTGRES_DB=other bash migrate.sh` and docker-compose settings work.
if [ -f "$ROOT_DIR/.env" ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    key="${key//[[:space:]]/}"
    [[ -z "$key" || "$key" == \#* || ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && continue
    value="${value%$'\r'}"
    value="${value#\"}"; value="${value%\"}"
    value="${value#\'}"; value="${value%\'}"
    if [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < "$ROOT_DIR/.env"
fi

DB_USER="${POSTGRES_USER:-marketplace}"
DB_NAME="${POSTGRES_DB:-marketplace_db}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5433}"
export PGPASSWORD="${POSTGRES_PASSWORD:-marketplace_secret}"

# -X: ignore ~/.psqlrc, ON_ERROR_STOP: abort on the first failing statement
psql_db() {
  psql -X -q -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
}
