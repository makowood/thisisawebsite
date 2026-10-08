# VISION.md — thisisawebsite.fyi

> **Status: confirmed draft.** Reverse-engineered from the live site on
> 2026-09-16, then corrected by Michael the same day. Every review agent
> (`design-critic`, `security-reviewer`, `web-coder`) reads this file before
> starting work and treats it as the standard the site is held to. Keep it
> current or the reviews drift.

## 1. What this site is

A personal site for Michael — cybersecurity student (BYU-Idaho,
expected spring 2028), homelab operator, and self-taught security/infra
tinkerer. It's not a portfolio-as-resume-PDF and not a product marketing
site. It's closer to a public terminal into his homelab: a working demo of
the kind of infra and security instincts he's building, wrapped in a
retro-hacker aesthetic he clearly enjoys for its own sake.

**One-line pitch:** *"A CRT terminal you can poke around in, run by someone
who actually runs the servers he's talking about."*

## 2. Who it's for

- Professors, recruiters, or hiring managers checking out real work
  (the Wazuh/Cowrie writeup exists because a professor pushed it to a
  showcase — this audience matters).
- Technically-curious strangers who land on the site and start typing
  commands into the terminal.
- Michael himself, as a place to write up homelab projects honestly —
  including what broke, not just what worked.

**Not for:** recruiters skimming for keyword-matched buzzwords, or anyone
expecting a conventional "hire me" landing page. The site is allowed to
require a little curiosity from the visitor (type `help`).

**Confirmed: no deadline.** This is open-ended, ongoing work — no
application, showcase, or semester milestone is driving it. Reviews should
optimize for getting the site right, not for shipping fast.

**Confirmed: dual purpose, genuinely equal weight.** This is both a
hiring/credibility signal *and* a personal creative project — deliberately,
not by default. When a review surfaces tension between "more
legible/professional for a recruiter" and "more true to the
terminal/hacker aesthetic Michael actually wants to build," **do not
resolve it silently in either direction.** Name the tradeoff explicitly and
let Michael decide. Neither audience gets to quietly win by default.

## 3. Voice & tone

Pulled directly from existing copy — keep new copy consistent with this:

- Lowercase-leaning, plain, dry. `"poke around."` `"no affiliate links,
  just what's on the machines."` `"cowrie's retired now. that same oracle
  box runs this site instead."`
- First person, understated, occasionally self-deprecating about failure
  ("the honest answer: my own hardware").
- Technical vocabulary used unapologetically (SIEM, GeoIP enrichment,
  timing-safe compare) — no dumbing down for a general audience.
- No corporate softness, no marketing adjectives ("seamless," "robust,"
  "cutting-edge"), no emoji.
- Humor is dry/situational, never a punchline or meme reference.

## 4. Visual system

- **Motif:** CRT terminal emulator — scanlines, vignette, glitch-shift
  animation on navigation, blinking cursor, ambient matrix-rain canvas
  background at low opacity.
- **Type:** `VT323` (display/headers, `h1.logo`, page `h1`/`h2`) +
  `IBM Plex Mono` (body/UI). Monospace everywhere — never break this.
- **Color:** phosphor green on near-black by default (`--green: #39ff6a`
  on `--bg: #060a07`), with a full amber CRT theme swap (`body.theme-amber`)
  as an alternate, not a "dark mode" — both are dark, it's a phosphor-color
  toggle, not a light/dark toggle.
- **Chrome:** the whole site lives inside a fake terminal window
  (`.crt > .screen`) with a macOS-style dot titlebar showing a fake path
  (`root@sentinel : ~/resume`) and tab-styled nav mimicking terminal/browser
  tabs (`~/`, resume, projects, uses, guestbook).
- **Motion:** respects `prefers-reduced-motion` (rain and cursor blink are
  already disabled under it) — any new animation must do the same.

## 5. Site map & purpose of each page

| Page | Purpose |
|---|---|
| `index.html` | Interactive terminal shell (`script.js`) — type `help` for commands; reportedly includes easter-egg arcade games (snake/pong/breakout via `#arcadeCanvas`). This is the front door and the main "wow" moment. |
| `resume.html` | Condensed public version of `docs/master-resume.md`: education, flagship project, homelab/cloud, experience table, stack tags. No phone/email. Explicitly says a downloadable full resume is "coming soon." |
| `projects.html` | Long-form writeup(s), blog-style. Currently one: the Wazuh SIEM + Cowrie honeypot project, written as an honest retrospective (what it caught, what broke, what changed his mind) — this is the template for future writeups. |
| `uses.html` | "What's actually running" — OS/phone/homelab fleet/networking/daily apps as tables and tag lists. Explicitly "no affiliate links." |
| `guestbook.html` + `guestbook.js` + `server/` | Public write surface: visitors post name+message, stored server-side (flat JSON file), profanity-filtered, admin-deletable via token. The only part of the site that accepts untrusted input and persists it — treat it as the security-sensitive surface. |
| `404.html` | Themed as a "kernel panic" — in-universe error page, not a generic 404. |

## 6. Functional pillars (don't accidentally break these)

1. **Terminal shell** — `help`-driven command interface on the homepage.
2. **Theme toggle** — green ⇄ amber phosphor swap via `body.theme-amber`.
3. **Arcade easter eggs** — snake/pong/breakout sharing `#arcadeCanvas`.
4. **Guestbook** — public POST with profanity filtering, name/message length
   limits, admin token delete (`X-Admin-Token`, timing-safe compare).
5. **Ambient rain canvas** — decorative, must stay decorative (low CPU,
   `pointer-events:none`, killed under reduced-motion).

## 7. Infrastructure context (for the security agent — not to solve, just to know)

- Hosted on an Oracle Cloud ARM instance nicknamed **sentinel**
  (`uses.html`), which formerly ran a Cowrie honeypot before becoming the
  production box for this site.
- Static files served by **Caddy**, which also reverse-proxies `/api/*` to
  the Node guestbook service on `localhost:8787` (see `server/README.md`).
- Guestbook runs as a **systemd** service (`server/guestbook.service`) as
  `User=www-data`, sandboxed (`ProtectSystem=strict` with only `data/`
  writable, no capabilities, syscall filter, `IPAddressDeny=any` except
  localhost). Binds to `127.0.0.1` by default. Admin token is loaded from
  a root-owned `/etc/guestbook.env`, not the unit file. Whether the live
  box has actually been updated to this unit is unconfirmed.
- Storage is a flat JSON file (`server/data/guestbook.json`), no database.
- Admin auth is a single shared bearer token via env var
  (`GUESTBOOK_ADMIN_TOKEN`), compared with `crypto.timingSafeEqual`.
- No live SSH/OCI CLI access is granted to any review agent — infra
  recommendations are based on what's in this repo plus whatever Michael
  describes about the box directly. Don't assume anything about firewall
  rules, patch cadence, or NSG config that isn't stated somewhere.

## 8. Non-negotiables / guardrails

- No frameworks, no build step, no bundler. Vanilla HTML/CSS/JS stays
  vanilla HTML/CSS/JS unless Michael explicitly asks to change that.
- No stock photography, no generic SaaS-landing-page patterns, no tracking
  scripts/analytics bloat.
- Keep the terminal/CRT conceit intact — a redesign suggestion that quietly
  turns this into a normal portfolio site is a rejection of the brief, not
  a design win, even if it's more "conventional good design."
- Accessibility still matters *inside* the aesthetic — the retro look is
  not an excuse for unreadable contrast, keyboard traps, or missing focus
  states (there's already a `:focus-visible` treatment — keep and extend
  the standard, don't erode it for "vibes").

**Confirmed: nothing is off-limits.** The arcade easter eggs, the rain
shader, and the terminal command set are all fair game for critique and
change, same as everything else. No sacred cows — if a critic thinks one
of Michael's favorite touches is actually hurting the site, say so.

**Confirmed finding, not an open question:** the "coming soon" downloadable
resume on `resume.html` is a real, current gap. Treat it as a finding to
flag in reviews (missing deliverable), not as intentionally deferred scope.

## 9. Open questions for Michael to fill in

Resolved items have moved into the sections above. Still open:

- Any planned future `projects.html` writeups beyond the SIEM/honeypot one,
  so the design-critic can judge whether the current one-article layout
  will scale?
- Any hard requirement around SEO / social-card correctness beyond what's
  already in the `<meta>` tags?
