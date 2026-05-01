# Staging smoke tests (manual)

Assumes:
- Terraform created the EC2 instance and you have its `public_ip`
- Ansible completed successfully

## 1) Webapp loads
- Open:
  - `http://<public_ip>/`
- Expect:
  - Admin UI HTML loads (Vue app), no Nginx 404.

## 2) Backend HTTP reachable via Nginx proxy
- Open:
  - `http://<public_ip>/api/keep-alive`
- Expect:
  - `ok`

## 3) Backend service healthy on the VM
SSH to the box and run:

```bash
sudo systemctl status campustour-backend --no-pager
sudo journalctl -u campustour-backend -n 100 --no-pager
```

Expect:
- service is `active (running)`
- logs show “Express is listening…” and no env errors

## 4) WebSocket proxy handshake (basic)
From your machine (requires `websocat` installed locally):

```bash
websocat "ws://<public_ip>/ws"
```

Expect:
- Connection opens (even if you immediately close). If it fails, check Nginx and backend logs.

## 5) Nginx config sanity
SSH to the box and run:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
```

