#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$ROOT_DIR/infra/terraform"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is required."
  exit 1
fi

echo "Destroying AWS staging infrastructure..."
terraform -chdir="$TF_DIR" destroy -auto-approve

