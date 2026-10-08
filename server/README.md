# guestbook API

Tiny dependency-free (except optional `bad-words`) Node backend for the
guestbook on thisisawebsite.fyi. Plain `http` module, JSON file storage —
no database to run.

## Endpoints

- `GET  /api/guestbook` — list all entries, newest first
- `POST /api/guestbook` — body `{ "name": "...", "message": "..." }`, creates
  an entry (`400` on missing/oversized fields, `422` if flagged by the
  profanity filter)
- `DELETE /api/guestbook/:key` — requires header `X-Admin-Token: <token>`
  matching `GUESTBOOK_ADMIN_TOKEN`; `401` on mismatch, `404` if the key
  doesn't exist

Entries are stored in `server/data/guestbook.json` (created automatically).

## Deploy (on terminus/sentinel, wherever this ends up running)

```
cd server
npm install            # pulls in bad-words if the registry is reachable;
                        # the server falls back to wordlist.json if it's not
```

Set env vars before starting:

- `PORT` — defaults to `8787`
- `HOST` — defaults to `127.0.0.1` (only Caddy on the same box should reach it)
- `GUESTBOOK_ADMIN_TOKEN` — **required** for delete to work at all. Generate
  one with `openssl rand -hex 24` and keep it out of git. This is also the
  password you'll type into the `guestbook-admin` terminal command.

Run it directly to test:

```
PORT=8787 GUESTBOOK_ADMIN_TOKEN=<your-token> node server.js
```

### systemd (suggested)

The unit expects the app at `/opt/guestbook` (outside `/home`, so
`ProtectHome` can stay on). Copy `guestbook.service` to
`/etc/systemd/system/guestbook.service`. The token goes in `/etc/guestbook.env` (mode
600, root-owned), not in the unit file:

```
sudo install -m 600 -o root -g root /dev/null /etc/guestbook.env
echo "GUESTBOOK_ADMIN_TOKEN=$(openssl rand -hex 24)" | sudo tee /etc/guestbook.env >/dev/null
sudo install -d -o www-data -g www-data -m 700 /opt/guestbook/data
```

The `data/` dir has to exist before first start — `ProtectSystem=strict`
makes everything else read-only. Then:

```
sudo systemctl daemon-reload
sudo systemctl enable --now guestbook
systemd-analyze security guestbook   # sanity-check the sandbox score
```

### Updating later

From the laptop, `deploy-guestbook` (fish function) rsyncs the code to
`~/guestbook-staging` on sentinel and runs `deploy.sh`, which installs only
changed files into `/opt/guestbook`, reinstalls deps if `package.json`
changed, reloads the unit if `guestbook.service` changed, restarts, and
health-checks. `data/` and `node_modules/` are never touched.
`deploy-guestbook -n` shows what would change.

### Caddy

Add a reverse proxy for `/api/*` alongside the existing static site block in
your Caddyfile:

```
thisisawebsite.fyi {
    reverse_proxy /api/* localhost:8787
    file_server
    root * /var/www/thisisawebsite
}
```

Adjust `root`/existing directives to match whatever's already there — this
just needs the `reverse_proxy /api/*` line added so `guestbook.html` can hit
same-origin `/api/guestbook` with no CORS setup needed.
