#!/usr/bin/env bash
# Applies database/migrations/*.sql in order, each exactly once. Applied
# files are recorded in the schema_migrations table, so running this again
# only applies new migrations. Each migration runs in its own transaction.
#
# Usage:
#   bash database/scripts/migrate.sh                 apply pending migrations
#   bash database/scripts/migrate.sh --status        show applied / pending
#   bash database/scripts/migrate.sh --baseline 008  mark 001..008 as applied
#                                                    without running them
#
# --baseline is for databases set up with the old script (before tracking
# existed): record what is already there, then run migrate.sh normally.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/db-env.sh"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

psql_db -c "SET client_min_messages = warning;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

is_applied() {
  [ "$(psql_db -tA -c "SELECT 1 FROM schema_migrations WHERE version = '$1'")" = "1" ]
}

mode="${1:-apply}"

case "$mode" in
  --status)
    for file in "$MIGRATIONS_DIR"/*.sql; do
      version="$(basename "$file" .sql)"
      if is_applied "$version"; then echo "  applied  $version"; else echo "  pending  $version"; fi
    done
    exit 0
    ;;

  --baseline)
    upto="${2:?usage: migrate.sh --baseline <number, e.g. 008>}"
    for file in "$MIGRATIONS_DIR"/*.sql; do
      version="$(basename "$file" .sql)"
      number="${version%%_*}"
      if [ "$((10#$number))" -le "$((10#$upto))" ]; then
        psql_db -c "INSERT INTO schema_migrations (version) VALUES ('$version') ON CONFLICT DO NOTHING;"
        echo "  baselined $version"
      fi
    done
    echo "✅ Baseline recorded. Now run migrate.sh to apply the rest."
    exit 0
    ;;

  apply) ;;

  *)
    echo "Unknown option: $mode (use --status or --baseline <n>)" >&2
    exit 1
    ;;
esac

# Refuse to guess on a database migrated by the old, untracked script.
history_count="$(psql_db -tA -c "SELECT COUNT(*) FROM schema_migrations")"
has_users="$(psql_db -tA -c "SELECT to_regclass('public.users') IS NOT NULL")"
if [ "$history_count" = "0" ] && [ "$has_users" = "t" ]; then
  echo "❌ $DB_NAME already has tables but no migration history." >&2
  echo "   If it was set up with the old migrate.sh (migrations 001–008), run:" >&2
  echo "     bash database/scripts/migrate.sh --baseline 008" >&2
  echo "   then run migrate.sh again." >&2
  exit 1
fi

echo "Running migrations on $DB_NAME ($DB_HOST:$DB_PORT)..."
applied_now=0
for file in "$MIGRATIONS_DIR"/*.sql; do
  version="$(basename "$file" .sql)"
  if is_applied "$version"; then
    continue
  fi
  echo "  Applying: $version"
  psql_db --single-transaction \
    -f "$file" \
    -c "INSERT INTO schema_migrations (version) VALUES ('$version');"
  applied_now=$((applied_now + 1))
done

if [ "$applied_now" -eq 0 ]; then
  echo "✅ Database is up to date."
else
  echo "✅ Applied $applied_now migration(s)."
fi
