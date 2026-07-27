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
- `GUESTBOOK_ADMIN_TOKEN` — **required** for delete to work at all. Generate
  one with `openssl rand -hex 24` and keep it out of git. This is also the
  password you'll type into the `guestbook-admin` terminal command.

Run it directly to test:

```
PORT=8787 GUESTBOOK_ADMIN_TOKEN=<your-token> node server.js
```

### systemd (suggested)

Copy `guestbook.service` to `/etc/systemd/system/guestbook.service`, edit
the paths/token, then:

```
sudo systemctl daemon-reload
sudo systemctl enable --now guestbook
```

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
