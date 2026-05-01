# Terraform: AWS staging VM

## Prereqs
- AWS credentials configured locally (e.g. `aws configure`)
- Terraform installed
- An existing SSH keypair on your machine (we import the **public** key into AWS)

## Deploy
From repo root:

```bash
cd infra/terraform/aws
terraform init
terraform apply \
  -var "public_key_path=$HOME/.ssh/id_ed25519.pub" \
  -var "ssh_ingress_cidr=YOUR_PUBLIC_IP/32"
```

Terraform will output:
- `public_ip`
- `ansible_inventory_snippet`

## Tear down

```bash
cd infra/terraform/aws
terraform destroy
```

