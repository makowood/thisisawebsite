# ROADMAP.md — thisisawebsite.fyi

> Built 2026-10-15 from VISION.md's open items plus a full-site `/site-review`
> (design-critic + security-reviewer). No deadline (see VISION §2) — order is
> by impact, not by date. Check things off as they ship; re-run `/site-review`
> to refill it.
>
> Caveat: neither critic had a browser this round, so visual/contrast/mobile
> items marked **[verify]** are worked out from code, not screenshots.

---

## Now — broken or failing the standard

### Accessibility & contrast (VISION §8 violation, every page, both themes)
- [x] `--green-faint` (~1.6:1) is used as *text*: homepage CTA `.footer`, every
      `.page .back` link, `.gb-counter`, `.gb-entry-time`, `.gb-entry-key`.
      Make faint borders-only; move those to `--green-dim`.
- [x] `--green-dim` (~3.7:1, amber ~3.4:1) fails AA on `.dim` output, splash,
      inactive tabs, subtitles, labels. Raise to ~`#2a9a4d` / amber ~`#b07800`,
      target ≥5:1 to survive the scanline multiply.
      _Shipped `#2a9a4d` (5.17:1) and amber `#b47b00` (5.21:1; `#b07800` measured 4.99:1)._
- [x] ASCII `h1.logo` has no `aria-label` — screen readers read punctuation.
- [x] `#output` needs `role="log" aria-live="polite"`.
- [x] `printHTML()` doesn't scroll to bottom (neofetch, fleet, cowsay, coffee).
- [x] Global click→focus handler kills text selection; skip when text is
      selected or the target is a link.

### Arcade (pillar #3) bugs
- [x] `snake` → Esc → `clear` → `snake` draws to a detached canvas (invisible
      game, arrow keys captured). Re-append `arcadeWrap` on every launch —
      also fixes games appearing far up the scrollback.
- [x] Mobile soft-lock: games only exit on Escape. Add a touch exit / guard.
      _Done: coarse-pointer devices get "snake needs arrow keys"; visible `[esc] quit` button; tapping the canvas exits._
- [x] Canvas colours hard-coded green; amber theme still gets a green snake.

### 404 page
- [x] Probably not served at all — Caddy config in `server/README.md` has no
      `handle_errors`. **[verify]**
      _Repo side done: `handle_errors` example in `server/README.md`. Michael applies it on the box._
- [x] Relative asset paths break on nested URLs (`/foo/bar`). Make root-absolute.
- [x] h1 says "segmentation fault", dump says "Kernel panic". Pick one.

### Guestbook backend (security — Medium)
- [x] No rate limit / entry cap; every POST rewrites the whole file with sync
      I/O → spam + event-loop DoS. Per-IP (via `X-Forwarded-For`) + global
      limits, `MAX_ENTRIES` cap (reject, don't evict), cap GET at 100.
- [x] Non-atomic write + swallowed parse error can wipe every entry. Write tmp
      → fsync → rename; only treat `ENOENT` as empty; log errors.
- [x] Profanity filter trivially bypassed (`f.u.c.k`, zero-width, homoglyphs,
      `fuuuck`); fallback list has no slurs; false positives ("hit or miss").
      NFKC + strip `\p{Cf}` + collapse repeats, run both engines, allowlist.
      _Done, with one change: the bundled list matches per token plus joined runs of 1–2 letter tokens instead of the whole space-stripped string (that is what caused "this hit" → "shit"). Known leftover: bad-words itself flags "homo sapiens"._

### Terminal hygiene
- [x] `commands[cmd]` hits the prototype: `__proto__` throws, `toString` etc.
      silently no-op. Use `hasOwnProperty` / `Object.create(null)`.

### Confirmed gap (VISION §8)
- [x] Resume "downloadable version coming soon" — ship a PDF (docx already
      exists in `docs/`) or remove the line.
      _Line removed and replaced with "full resume on request". PDF **not** published: the docx contains a phone number._

---

## Next — features & pillars

### Command discoverability: public `help` vs. secrets  ← requested
See [Command reference](#command-reference) for the full list.
- [x] New `help` output (public commands only, ends with the hidden-files hint).
- [x] `ls -a` shows dotfiles (`.bash_history`, `.secrets`); `honeypot.log` is in plain `ls`.
- [x] `cat .bash_history` / `history` — the secrets list, disguised as Michael's
      shell history (ends with `history -c`, which obviously didn't work).
- [x] `secrets` / `cat .secrets` — found-tracker in `localStorage`, masked
      slots + oblique hints, `secrets --reset`.
- [x] Unknown command → `sentinel: <cmd>: command not found` in shell mode
      (keep DOS message for `dosMode`); every 3rd miss hints at `help`.
- [x] Tab completion across all commands incl. secrets (don't trap Tab on
      empty input — WCAG 2.1.2).
- [x] Optional: `!N` history expansion.
- [x] Breadcrumbs: source comment, devtools `console.log`, `/robots.txt`
      `Disallow: /.secrets`, 404 call-trace frame `ls_hidden [try: ls -a]`,
      final ghost demo types `ls -a`.
- [x] Fix dead promises: splash `/explore` (doesn't exist), "ask me how",
      "ask about the honeypot" (no `ask` command).
- [x] Man pages: `clear` (missing), `history`, `secrets`, `ls [-a]`.
- [x] Security rules for new commands: anything containing user args or
      guestbook data goes through `print()`/`textContent`, never `printHTML`.
      `escapeHTML` doesn't escape quotes — never use it inside attributes.
      Nothing sensitive behind a "secret" (it's all readable in script.js).

### "All your base are belong to us"  ← requested
Delivered deadpan inside an in-universe artifact, never as a punchline.
- [x] **Primary:** `cat honeypot.log` becomes a secret — dramatized Cowrie log
      excerpt (RFC 5737 IPs, labeled "dramatized"), attacker runs
      `echo "all your base are belong to us"`, connection lost after 7s.
      Footer: `log truncated. the base is fine.`
- [x] **Secondary:** 404 call trace frame `? all_your_base+0x0/0x404`.
- [x] ~~Optional splash (only if one of the above isn't live):
      `all your base are belong to us. ssh is tailnet-only, so: no.`~~
      _Not needed: both of the above are live._

### Theme toggle (pillar #2)
- [x] Persist in `localStorage`, apply in `<head>` before paint on every page.
- [x] Visible in-conceit control on every page (e.g. `phosphor: green` in the
      titlebar).

### Infra / security hardening (Low)
- [x] Caddy security headers (HSTS, CSP, nosniff, Referrer/Permissions-Policy,
      `-Server`) — ready-made block in the security report.
      _Repo side done: block in `server/README.md`. Michael applies it on the box._
- [x] Caddy doesn't redact `X-Admin-Token` in access logs → switch to
      `Authorization: Bearer`; rotate token if logging was on.
      _Client + server switched to Bearer. Access logging was never on (checked 2026-10-15), token is 48 chars: no rotation needed._
- [x] Entry keys collide on same-ms posts → `crypto.randomUUID()`.
- [x] Commit `server/package-lock.json`, deploy with `npm ci`; pin `bad-words`.
      _Lockfile generated (left uncommitted), `bad-words` pinned to 3.0.4, deploy.sh uses `npm ci`._
- [x] Reject admin tokens < 32 chars; hash-then-compare; decode key after auth.
- [x] Strip bidi/zero-width/control chars from name+message (spoofing).
- [x] Optional unit extras: `MemoryMax`, `TasksMax`, `ProcSubset=pid`, etc.
      _Added `MemoryMax=256M`, `TasksMax=32`, `RemoveIPC=true`. Skipped `ProcSubset=pid` (V8 can read /proc/cpuinfo on ARM)._

---

## Later — polish & content

- [ ] **projects.html:** cap prose at ~76ch, add a date line, show one real
      Wazuh suppression rule, plan `projects/<slug>.html` + `ls -l` index
      before writeup #2. Calm rain behind long text. **[verify]**
- [ ] **Casing rule:** headings/chrome lowercase, prose sentence case (fix
      projects + uses Title Case).
- [ ] **Resume:** expand "UA technician"; see decisions below.
- [ ] **Mobile:** tab nav likely clips "guestbook" at 375px; tighten `.page`
      padding and vignette under 560px. **[verify 320/375/768]**
- [ ] **Splash cleanup:** cut meme/generic lines (cake, capes, "compiled with
      love", puns, spaghetti, "my dad built this", the IP line); trim honeypot
      jokes from ~8 to 3–4.
- [ ] **Fortune:** replace borrowed lines with homelab originals.
- [ ] **Titlebar:** `guest@sentinel` to match the prompt; `root@` only on 404.
- [ ] **Dead code:** unused `.cursor`/`blink`; "glitch on navigation" doesn't
      exist (only the 5-click bezel egg).
- [ ] **Guestbook UI:** hide `.gb-entry-key`; empty state copy.
- [ ] Swap `10.20.34.x` in `ping`/`hack` for made-up addresses if real.
- [ ] More project writeups (VISION §9 open question).

---

## Command reference

Proposed split. **Public** = returns real info about Michael, the lab, or the
site. **Secret** = the payoff is a joke, game, or mode change.
`guestbook-admin` is admin tooling — in neither list, never gamified.

### `help` (public)
| Command | What it does |
|---|---|
| `whoami` | who runs this thing |
| `neofetch` | specs, but for a person |
| `fleet` | what's in the homelab |
| `ping <host>` | poke a fleet device |
| `stack` | what it all runs on |
| `now` | what i'm working on |
| `theme` | swap green / amber phosphor |
| `man <cmd>` | the manual |
| `clear` | clear the screen |

### Secrets
Michael's cheat sheet. Built from `script.js` (`SECRET_CMDS`, `SECRET_TRIGGERS`,
`markSecretsFor`, `handleShell`), not memory. 33 tracked: 30 commands + 3
triggers. The hint column is exactly what an unfound row shows in `secrets`.
Finds live in `localStorage` (`sentinel.secrets`); `secrets --reset` clears
them. Commands are case-insensitive on the first word. The idle ghost never
earns finds.

#### Tracked (shown in `secrets`)
| # | Secret | Trigger exactly | What it does | Hint |
|---|---|---|---|---|
| 1 | `ls` | `ls` (any `ls`, incl. flags) | fake listing: `regrets/`, `side_projects/`, `todo.txt`, `hopes.sh`, `honeypot.log`. `ls <path>` says "it's a metaphor, not a filesystem." | see what's here |
| 2 | `ls -a` | `ls` with any flag containing `a` (`-a`, `-la`, `-al`...) | adds the dotfiles `.bash_history` and `.secrets` | see what's here, including what's hiding |
| 3 | `history` | `history`, or `cat .bash_history` | prints the operator's 22-line fake shell history (the secrets map) | what did the operator type last |
| 4 | `secrets` | `secrets`, or `cat .secrets` | this tracker. (always marks itself found first, so its hint is never actually seen) | you're looking at it |
| 5 | `games` | `games` | lists snake / pong / breakout / guess | all work and no play |
| 6 | `snake` | `snake` | canvas snake, arrow keys, Esc / `[esc] quit` / tap to exit | eat, grow, don't bite yourself |
| 7 | `pong` | `pong` | pong vs. cpu, up/down or w/s, first to 5 | 1972 called. it has a paddle. |
| 8 | `breakout` | `breakout` | breakout, left/right or a/d, 3 lives | bricks, a ball, and a wall that deserves it |
| 9 | `guess` | `guess` | 1-100 number game, `exit` to bail | i'm thinking of a number |
| 10 | `sl` | `sl` | ascii locomotive drives across, then "you meant 'ls', didn't you." | a typo with a locomotive |
| 11 | `vim` | `vim` | fake vim on `resume.txt`; only `:q`, `:q!`, `:wq` get you out | an editor nobody leaves |
| 12 | `hack` | `hack` | typed fake breach sequence, ends "...nah." + cowrie joke | what the movies think i do all day |
| 13 | `rm -rf /` | `rm -rf /` (or `rm -rf/`) | fake self-destruct countdown, "Permission denied", "relax." | the one command you're told never to run |
| 14 | `fortune` | `fortune` | random line of sysadmin wisdom (12 of them) | a cookie without the cookie |
| 15 | `coffee` | `coffee` | ascii mug + "HTTP 418: I'm a teapot." | ask the server for a hot drink |
| 16 | `cowsay` | `cowsay [msg]` | ascii cow says msg (default "moo.") | a farm animal with something to say |
| 17 | `sudo` | `sudo <anything>` (or bare `sudo`) | "Permission denied: nice try." | ask nicely, as root |
| 18 | `sudo rm honeypot` | `sudo rm honeypot` | "already done. see: my entire personality." (also marks `sudo`) | retire the bait. with authority. |
| 19 | `cat honeypot.log` | `cat` + any path containing `honeypot` | dramatized cowrie log excerpt (has an "all your base" line) | read what the bait caught |
| 20 | `format c:` | `format c:` (or `format c`) | fake DOS format progress, "nice try." | a dos-era way to ruin your afternoon |
| 21 | `a:` | `a:` | enters DOS mode: prompt becomes `A:\>`, MS-DOS 6.22 banner | the drive that came before c: |
| 22 | `cd` | `cd` (anything) | "already home" / "No such directory. this isn't that kind of website." | try going somewhere |
| 23 | `cat` | `cat` (anything, even bare) | "No such file or directory (it was never real)" unless a special file | read a file. any file. |
| 24 | `echo` | `echo [text]` | echoes text back | say something. it says it back. |
| 25 | `pwd` | `pwd` | "/home/guest — you are here, metaphorically speaking." | where exactly is here |
| 26 | `touch` | `touch` (anything, even bare) | "created 'x'. it will never be opened again." | make a file out of nothing |
| 27 | `mkdir` | `mkdir` (anything, even bare) | "created 'x'. still empty. much like the gesture." | make a place to put things |
| 28 | `chmod` | `chmod` (anything) | "permissions updated. it changed nothing" | argue with permissions |
| 29 | `date` | `date` | "the mainframe stirs..." + real local date/time | what day is it |
| 30 | `weather` | `weather` | fake Rexburg forecast, "you should've worn a coat." | check outside without going outside |
| 31 | konami | up up down down left right left right b a (anywhere on the shell page) | `** konami code accepted **` + ascii fireworks (text only under reduced motion) | something involving arrow keys and the letters b, a |
| 32 | bezel | 5 clicks on the bare CRT bezel within 2s | screen glitch for 400ms (none under reduced motion, still counts) | the bezel isn't decorative |
| 33 | logo | triple-click the ascii logo | swaps to "SENTINEL" art for 1s | the logo has a second name |

Found rows show `[x] <cmd>` (triggers show `the konami code`, `five clicks on
the bezel`, `triple-click the logo (SENTINEL)`). All 33 found prints an amber
"you've now read more of this shell than its author remembers writing."

#### Untracked eggs (not in `secrets`, nothing to find, still on the site)
- **DOS mode** (after `a:`): `dir` (fake A:\ listing, serial `1337-C0DE`),
  `cls` (clear), `config.sys`, `autoexec.bat`, `c:` (back to the normal
  prompt; outside DOS mode it says "C:\> already home."), `a:` again ("already
  mounted"). Unknown commands in DOS mode say "Bad command or file name". All
  normal commands still work. `dir`/`cls`/`config.sys`/`autoexec.bat`/`c:`
  work outside DOS mode too.
- **Redirect stubs:** `resume`, `projects`, `blog`, `posts` point at the
  resume / projects tabs.
- **Idle ghost demo:** after 45s idle in the shell, the ghost types `fortune`
  or `fleet`; the 3rd demo types `ls -a` as a breadcrumb; after that it goes
  dormant until the next keypress. Skipped under reduced motion. Never earns
  finds.
- **`!N`:** runs line N (1-22) of the operator history, e.g. `!4` runs `sl`.
  Out of range: "event not found". These do earn finds (it's the visitor
  running them).
- **`history -c`:** "history: cleared. (it says that every time. see line
  22.)" Doesn't actually clear anything.
- **`help -a`** (also `--all`, `all`, `secrets`, `--secrets`): "undocumented
  things live where undocumented things always live."
- **Tab completion:** first word only; completes every command incl. secrets
  and `sudo`, never `guestbook-admin`. Double-Tab lists ambiguous matches.
  Empty input or Shift+Tab still moves focus (no keyboard trap).
- **Unknown commands:** every 3rd one adds "help has the public ones."
- **Breadcrumbs pointing at `ls -a`:**
  - page source: HTML comment in `index.html` ("reading the source. good
    instinct...").
  - console: `sentinel: devtools open. respect. help is the public list. ls -a
    is the other one.`
  - `robots.txt`: `Disallow: /.secrets` + "good recon. wrong layer..."
  - `404.html`: kernel-panic call trace frame `ls_hidden+0x2e/0x41 [try: ls -a]`.
  - splash text (random per load) includes "help is the public list. ls -a is
    the other one.", "psst. try sl.", "formerly a honeypot. cat honeypot.log.",
    "there is no A: drive.", "config.sys not found.", "sudo won't save you
    here."
- **"all your base", both placements:** the `echo "all your base are belong
  to us"` line in `cat honeypot.log`, and the `all_your_base+0x0/0x404`
  frame in the 404 call trace.
- **Man pages exist for most secrets** (`man sl`, `man vim`, `man a:`...), so
  `man` is a quiet second discovery path.

---

## Decisions for Michael (named tradeoffs)

> **Decided 2026-10-15** (all five, recorded in VISION.md): games hidden behind
> secrets (after the arcade fixes); pale amber accents; visible titlebar toggle;
> outlook email on resume.html (surname approved later: resume h1 is `michael gabbitas`); localStorage is fine
> and "no cookies. no tracking." stays as long as it's literally true.

- **Hide `games` behind secrets?** Lowers casual engagement with the arcade
  (the "wow" moment), but makes it the first, easiest secret. Only after the
  arcade bugs are fixed.
- **Amber theme accents** currently flip to green. Pale amber (`#ffd98a`)
  instead?
- **Theme control:** visible chrome on every page, or keep it a command?
- **Contact path + surname on resume:** privacy/persona vs. a recruiter being
  able to follow up. Currently the guestbook is the only way to reach you.
- **Splash "no cookies. no tracking."** vs. `localStorage` for theme + secrets
  (client-only, never leaves the browser). Self-hosting fonts would make "no
  tracking" strictly true.

## VISION.md updates suggested

> **Applied 2026-10-15.** §5 notes that 404.html needs the
> `handle_errors` block from `server/README.md`.

- §3: replace "never a meme reference" with *"references only deadpan inside
  an in-universe artifact (log, stack trace, man page), never a standalone
  punchline."* Add the casing rule.
- §4: remove claims that aren't live (nav glitch, cursor blink) or build them.
- §6: say whether the theme toggle is visible chrome or a secret.
- New section: the public-vs-secret command rule above.
- §2: does *any* contact path belong on the site?
- §5: 404 isn't actually served by the documented Caddy config.

## Open infra questions (security-reviewer)

1. Is the live box running the hardened `guestbook.service`?
   (`systemctl cat guestbook`, `systemd-analyze security guestbook`)
2. ~~Live Caddyfile — is access logging on?~~ No, never enabled (2026-10-15). Token is 48 chars.
3. Live headers: `curl -sI https://thisisawebsite.fyi/`
4. OCI ingress only 80/443? Port 22 closed publicly? Host firewall?
5. Unattended upgrades? Last kernel reboot? Node version/source?
6. SSH: keys only, no root, bound to tailscale?
7. fail2ban/crowdsec? Leftover Wazuh agent still reporting?
8. Is `guestbook.json` backed up anywhere?
9. Free disk; is `data/` on the OS filesystem?
10. Confirm nothing sensitive in `f69b7f3` before `docs/` was gitignored. Is
    the repo public?
11. Are the `10.20.34.0/24` addresses and the splash IP real?
