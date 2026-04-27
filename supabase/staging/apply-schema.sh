#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required (Node.js)."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required (Postgres client)."
  exit 1
fi

SCHEMA_DUMP="$ROOT_DIR/supabase/supabase_schema.sql"
if [[ ! -f "$SCHEMA_DUMP" ]]; then
  echo "Missing schema dump: $SCHEMA_DUMP"
  exit 1
fi

echo "Discovering linked Supabase DB connection string..."
CONNECT_OUT="$(npx -y supabase db connect --linked 2>/dev/null || true)"

# The CLI typically prints a `psql "<url>"` command. Extract the first postgresql://... token.
DB_URL=""
if [[ "$CONNECT_OUT" == *"postgresql://"* ]]; then
  # shellcheck disable=SC2001
  DB_URL="$(echo "$CONNECT_OUT" | sed -n 's/.*\(postgresql:\/\/[^"'\''[:space:]]*\).*/\1/p' | head -n 1)"
fi

if [[ -z "${DB_URL}" ]]; then
  echo "Could not get DB URL from Supabase CLI."
  echo
  echo "Supabase CLI output was:"
  echo "$CONNECT_OUT"
  echo
  echo "Make sure you ran: npx -y supabase link --project-ref <staging_ref>"
  exit 1
fi

echo "Applying full schema dump: supabase/supabase_schema.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_DUMP"

echo "Applying incremental SQL scripts in supabase/sql/"
for f in "$ROOT_DIR"/supabase/sql/*.sql; do
  [[ -f "$f" ]] || continue
  echo " - $(basename "$f")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Done. Schema + policies + triggers + RPCs applied to linked Supabase project."

