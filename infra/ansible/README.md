# Ansible: deploy staging services

This playbook configures an Ubuntu EC2 host to run:
- `backend/` as a systemd service on localhost (`{{ backend_port }}`) and proxied via Nginx at `/api/*`
- `webapp/` built via Vite and served as static files at `/`

## Prereqs (your machine)
- Ansible installed
- SSH access to the EC2 instance (`ubuntu` user + your private key)

## Configure vars
Edit:
- `group_vars/all.yml`
- `inventory.ini`

You must set:
- `repo_url`
- `supabase_url`
- `supabase_service_role_key`
- `vite_supabase_url`
- `vite_supabase_anon_key`

## Deploy

```bash
cd infra/ansible
ansible-playbook -i inventory.ini site.yml
```

## Endpoints
- Webapp: `http://<public_ip>/`
- Backend keep-alive: `http://<public_ip>/api/keep-alive`

