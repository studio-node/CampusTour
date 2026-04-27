#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required (Node.js)."
  exit 1
fi

if [[ ! -d "$ROOT_DIR/supabase/functions" ]]; then
  echo "Missing folder: supabase/functions"
  exit 1
fi

echo "Deploying Supabase Edge Functions to linked project..."
echo "Make sure you already ran: npx -y supabase link --project-ref <staging_ref>"

FUNCTIONS=()
while IFS= read -r -d '' dir; do
  name="$(basename "$dir")"
  [[ "$name" == "_shared" ]] && continue
  FUNCTIONS+=("$name")
done < <(find "$ROOT_DIR/supabase/functions" -mindepth 1 -maxdepth 1 -type d -print0)

if [[ ${#FUNCTIONS[@]} -eq 0 ]]; then
  echo "No functions found under supabase/functions (excluding _shared)."
  exit 0
fi

for fn in "${FUNCTIONS[@]}"; do
  echo " - Deploying: $fn"
  npx -y supabase functions deploy "$fn"
done

echo "Done. Edge Functions deployed."

