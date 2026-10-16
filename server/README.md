# guestbook API

Tiny dependency-free (except optional `bad-words`) Node backend for the
guestbook on thisisawebsite.fyi. Plain `http` module, JSON file storage —
no database to run.

## Endpoints

- `GET  /api/guestbook` — the newest 100 entries, newest first
- `POST /api/guestbook` — body `{ "name": "...", "message": "..." }`, creates
  an entry. `400` on missing/oversized fields, `422` if flagged by the
  profanity filter, `429` when rate limited, `503` when the guestbook is full
  (500 entries; nothing is ever evicted to make room).
- `DELETE /api/guestbook/:key` — requires header
  `Authorization: Bearer <token>` matching `GUESTBOOK_ADMIN_TOKEN`; `401` on
  mismatch (checked before anything else in the request is parsed), `404` if
  the key doesn't exist

Entries are stored in `server/data/guestbook.json` (created automatically).
Writes are atomic (temp file, fsync, rename). If the file exists but can't be
read or parsed, `GET`/`POST`/`DELETE` return `500` and log to stderr instead of
overwriting it, so fix or restore the file by hand.

### Limits

- Per IP: 3 accepted posts per 10 minutes, and 15 POST attempts of any kind
  per 10 minutes (stops the profanity filter being probed in a loop).
- Global: 30 accepted posts per hour.
- Name/message: control and format characters (bidi overrides, zero-width
  characters) are stripped and stacked combining marks are capped before the
  40/200 length checks.

**Single instance only.** The rate limits and the write lock are in-process.
Don't run two copies against the same data file.

## Deploy (on terminus/sentinel, wherever this ends up running)

```
cd server
npm ci --omit=dev --ignore-scripts   # installs exactly what package-lock.json pins
                                      # (bad-words 3.0.4). if it fails, the server
                                      # still runs on the bundled wordlist.json
```

Set env vars before starting:

- `PORT` — defaults to `8787`
- `HOST` — defaults to `127.0.0.1` (only Caddy on the same box should reach it)
- `GUESTBOOK_ADMIN_TOKEN` — **required** for delete to work at all. Generate
  one with `openssl rand -hex 24` (48 chars) and keep it out of git. Tokens
  shorter than 32 characters are rejected at startup (logged, treated as
  unset). This is also the password you'll type into the `guestbook-admin`
  terminal command.
- `GUESTBOOK_DATA_FILE` — optional override of the data file path. Meant for
  local testing against a throwaway file. Leave unset in production (the
  systemd sandbox only allows writes to `/opt/guestbook/data`).

Run it directly to test:

```
HOST=127.0.0.1 PORT=8787 GUESTBOOK_ADMIN_TOKEN=<your-token> \
  GUESTBOOK_DATA_FILE=/tmp/gb-test/guestbook.json node server.js
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
changed files into `/opt/guestbook`, reinstalls deps with `npm ci` if
`package.json` or `package-lock.json` changed, reloads the unit if `guestbook.service` changed, restarts, and
health-checks. `data/` and `node_modules/` are never touched.
`deploy-guestbook -n` shows what would change. Make sure the fish function's
rsync includes `package-lock.json`, or `npm ci` on the box will fail.

### Caddy

`server/Caddyfile` is a copy of the live `/etc/caddy/Caddyfile` on sentinel
(last synced 2026-10-15). It's a record, not deployed by anything: when you
change the config on the box, update this file to match, and vice versa.

To apply it on the box:

```
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
sudoedit /etc/caddy/Caddyfile        # paste server/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Notes:

- **CSP.** Every script is an external file (`theme.js` loads synchronously
  in `<head>` so the saved phosphor theme applies before first paint), so
  `script-src 'self'` holds with no hashes or `'unsafe-inline'`. Inline
  `style=""` attributes are still used, which is why `style-src` keeps
  `'unsafe-inline'`. If you add an inline `<script>` later, the CSP will block
  it.
- **HSTS** includes subdomains. Only keep `includeSubDomains` if every
  subdomain of thisisawebsite.fyi is HTTPS.
- **Behind Cloudflare.** If Cloudflare proxies the site, Caddy's remote
  address is a Cloudflare edge, and without more config every visitor looks
  like a handful of Cloudflare IPs to the rate limiter. Tell Caddy to trust
  Cloudflare and read the real client from `CF-Connecting-IP`, in the global
  options block:

  ```
  {
      servers {
          trusted_proxies static <cloudflare ipv4 + ipv6 ranges>
          client_ip_headers CF-Connecting-IP
      }
  }
  ```

  (ranges: https://www.cloudflare.com/ips/, or the `caddy-cloudflare-ip`
  module to keep them current). Then `{client_ip}` in `server/Caddyfile` is the visitor.
  Only trust those headers if the origin firewall accepts 80/443 from
  Cloudflare alone, or anyone can claim any IP by talking to the origin directly.
- **Access logs and the admin token.** Delete sends the token as
  `Authorization: Bearer`, which Caddy redacts from access logs by default.
  Don't turn on `log_credentials`. The old client sent `X-Admin-Token`, which
  Caddy does *not* redact. If access logging was on while that was in use,
  rotate the token (see below) and purge or rotate the old logs.
- **404.** Without `handle_errors`, Caddy returns its own empty 404 and
  `404.html` is never shown.

### Rotating the admin token

```
echo "GUESTBOOK_ADMIN_TOKEN=$(openssl rand -hex 24)" | sudo tee /etc/guestbook.env >/dev/null
sudo systemctl restart guestbook
sudo journalctl -u guestbook -n 5 --no-pager   # should NOT show the "shorter than 32" error
```
