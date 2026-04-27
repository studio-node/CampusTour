## Staging smoke test checklist

Assumes you deployed staging with `deploy-staging.sh` and have:
- a staging Supabase project (schema + storage + edge functions deployed)
- a public IP from Terraform

### 1) Basic service reachability

- **Webapp**: open `http://<PUBLIC_IP>/`
- **Mobile web preview**: open `http://<PUBLIC_IP>/mobile/`
- **Backend HTTP**: open `http://<PUBLIC_IP>/api/keep-alive` and confirm it returns `ok`

### 2) Supabase connectivity (webapp)

- Sign in to the admin webapp (use a staging admin user).
- Confirm the app loads schools/locations without console errors.

### 3) Storage + media workflow

- In the builder/admin dashboard, upload an image to a location.
- Confirm:
  - a new `location_media` row exists in staging Supabase
  - object exists in the `media` bucket
  - the public URL renders in browser

### 4) Edge Function workflow (builder passcode)

- Use a builder flow that hits `manage_location_media_as_builder`.
- Confirm it succeeds and the new media appears.

### 5) Ambassador-led websocket workflow

- Set `EXPO_PUBLIC_WS_URL` to `ws://<PUBLIC_IP>/ws` (or `wss://...` if you put TLS in front).
- Start an ambassador-led session and join from another client.
- Confirm that “current stop” updates propagate.

### 6) Teardown sanity check

- Run `destroy-staging.sh`
- Confirm the EC2 instance and Elastic IP are removed in AWS.

