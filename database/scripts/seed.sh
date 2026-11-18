#!/usr/bin/env bash
# Loads development seed data (categories, demo users and listings, sample
# images). Run once on a freshly migrated database; the seeds are not
# idempotent (re-running fails on duplicate categories and stops).
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/db-env.sh"
SEEDS_DIR="$SCRIPT_DIR/../seeds"

echo "Seeding database $DB_NAME ($DB_HOST:$DB_PORT)..."

for seed in "$SEEDS_DIR"/*.sql; do
  echo "  Applying: $(basename "$seed")"
  psql_db --single-transaction -f "$seed"
done

echo "✅ Seed data applied."
