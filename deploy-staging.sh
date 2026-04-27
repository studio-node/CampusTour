#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TF_DIR="$ROOT_DIR/infra/terraform"
ANSIBLE_DIR="$ROOT_DIR/infra/ansible"

STAGING_ENV_FILE_DEFAULT="$ROOT_DIR/infra/staging-config.env"

SSH_KEY_NAME="${SSH_KEY_NAME:-}"
ALLOWED_SSH_CIDR="${ALLOWED_SSH_CIDR:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"
STAGING_ENV_FILE="${STAGING_ENV_FILE:-$STAGING_ENV_FILE_DEFAULT}"

if [[ -z "$SSH_KEY_NAME" ]]; then
  echo "Set SSH_KEY_NAME to your existing EC2 key pair name."
  exit 1
fi

if [[ -z "$ALLOWED_SSH_CIDR" ]]; then
  echo "Set ALLOWED_SSH_CIDR to your IP CIDR, e.g. 203.0.113.10/32"
  exit 1
fi

if [[ ! -f "$STAGING_ENV_FILE" ]]; then
  echo "Missing staging env file: $STAGING_ENV_FILE"
  echo "Copy from: $ROOT_DIR/infra/staging-config-example.txt"
  echo "Then save it as: $STAGING_ENV_FILE_DEFAULT (or set STAGING_ENV_FILE to its path)"
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is required."
  exit 1
fi

if ! command -v ansible-playbook >/dev/null 2>&1; then
  echo "ansible-playbook is required."
  exit 1
fi

echo "Provisioning AWS infrastructure with Terraform..."
terraform -chdir="$TF_DIR" init
terraform -chdir="$TF_DIR" apply -auto-approve \
  -var="aws_region=$AWS_REGION" \
  -var="instance_type=$INSTANCE_TYPE" \
  -var="ssh_key_name=$SSH_KEY_NAME" \
  -var="allowed_ssh_cidr=$ALLOWED_SSH_CIDR"

PUBLIC_IP="$(terraform -chdir="$TF_DIR" output -raw public_ip)"

echo
echo "Instance is up at: $PUBLIC_IP"
echo "Waiting briefly for SSH to become ready..."
sleep 30

INVENTORY_FILE="$ANSIBLE_DIR/inventory.ini"
cat > "$INVENTORY_FILE" <<EOF
[staging]
staging1 ansible_host=$PUBLIC_IP ansible_user=ubuntu
EOF

echo "Deploying with Ansible..."
ansible-playbook -i "$INVENTORY_FILE" "$ANSIBLE_DIR/playbook.yml" \
  -e "staging_env_file=$STAGING_ENV_FILE"

echo
echo "Staging URLs:"
echo " - Webapp:     http://$PUBLIC_IP/"
echo " - Mobile web: http://$PUBLIC_IP/mobile/"
echo " - Backend:    http://$PUBLIC_IP/api/ (or /api/keep-alive)"
echo " - WebSocket:  ws://$PUBLIC_IP/ws"

