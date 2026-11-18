#!/usr/bin/env bash
# Gives an existing account moderation rights.
#
#   bash database/scripts/make-admin.sh user@example.com            → admin
#   bash database/scripts/make-admin.sh user@example.com moderator  → moderator
#   bash database/scripts/make-admin.sh user@example.com user       → back to normal
#
# With the Docker setup, run the same UPDATE inside the database container:
#   docker compose exec -T postgres psql -U marketplace -d marketplace_db \
#     -c "UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER('user@example.com')"
#
# Takes effect on the user's next request (roles are re-read every time).
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/db-env.sh"

email="${1:?usage: make-admin.sh <email> [admin|moderator|user]}"
role="${2:-admin}"
case "$role" in
  admin|moderator|user) ;;
  *) echo "role must be admin, moderator or user" >&2; exit 1 ;;
esac

updated="$(psql_db -tA -v email="$email" -v role="$role" <<'SQL'
UPDATE users SET role = :'role'
WHERE LOWER(email) = LOWER(:'email') AND deleted_at IS NULL
RETURNING username;
SQL
)"
if [ -z "$updated" ]; then
  echo "❌ No active account with email $email" >&2
  exit 1
fi
echo "✅ $updated is now: $role"
