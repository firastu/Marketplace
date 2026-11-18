#!/usr/bin/env bash
# Drops and recreates the database. Pass --yes to skip the confirmation.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/db-env.sh"

if [ "${1:-}" != "--yes" ]; then
  echo "⚠️  This will DROP and RECREATE the database: $DB_NAME ($DB_HOST:$DB_PORT)"
  read -r -p "Are you sure? (y/N): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

psql_admin() {
  psql -X -q -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres "$@"
}

echo "Dropping database $DB_NAME..."
psql_admin -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo "Creating database $DB_NAME..."
psql_admin -c "CREATE DATABASE \"$DB_NAME\";"

echo "✅ Database reset complete. Run migrate.sh next."
