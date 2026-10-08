---
name: site-review
description: Run a full design + security review cycle on thisisawebsite.fyi — design-critic and security-reviewer independently review the current state against VISION.md, then web-coder (the only agent with write access) implements the feedback it agrees with. Use when the user asks to review, critique, roast, or audit the site, or asks to run /site-review.
user-invocable: true
allowed-tools:
  - Read
  - Agent
  - AskUserQuestion
---

# /site-review

Orchestrates the three standing site agents — `design-critic`,
`security-reviewer`, `web-coder` — for one review-and-fix round on
**thisisawebsite.fyi**. You (the main session) are the coordinator: you
never write code yourself in this flow, and the two critic agents never
write code either. Only `web-coder` touches files.

Arguments passed: `$ARGUMENTS` — may specify scope (e.g. "just the
guestbook", "frontend only", "resume.html") or be empty (review
everything changed, or the whole site on a first run).

## Steps

1. **Read `VISION.md`** at the repo root so you can frame the round for
   both critics and notice if it looks stale against the current site.

2. **Determine scope** for this round:
   - If `$ARGUMENTS` names a scope, use it.
   - Otherwise, check `git status`/`git diff` for uncommitted or
     recently-committed changes since the last review round; if there's
     nothing to anchor to, default to a full-site pass.
   - Confirm scope with the user in one line if it's ambiguous — don't
     silently guess on a full-site pass vs. a targeted one.

3. **Spawn `design-critic` and `security-reviewer` in parallel** (single
   message, two `Agent` calls, `subagent_type` set to each agent's name).
   Give each:
   - The scope for this round.
   - An explicit pointer to read `VISION.md` first (they're instructed to
     do this anyway, but restate the scope-specific ask).
   - A reminder of their production guardrails (passive browser use only,
     never submit forms / trigger writes against the live guestbook).
   - Ask each to report back in their defined output format.

   Do not summarize or soften either report when you relay it — the
   design-critic in particular is meant to be blunt; preserve that.

4. **Present both reports to the user** before implementing anything,
   unless the user has already said (in this session or a standing
   instruction) that they want fixes applied automatically. If feedback
   from the two agents conflicts, surface the conflict rather than
   picking a side.

5. **Hand off to `web-coder`** with the combined feedback, the agreed
   scope, and VISION.md context. Let `web-coder` triage what to implement
   directly versus what to flag back as a judgment call (it's instructed
   to do this). Changes are left uncommitted — do not commit or push on
   the user's behalf.

6. **Report results**: what got implemented, what got pushed back on or
   needs a human decision, and what's still open (including any "Open
   questions for Michael" sections the critics raised). Remind the user
   the changes are uncommitted and worth testing before they commit.

## Notes

- If this is the first run and `design-critic`/`security-reviewer`/
  `web-coder` don't show up as available `Agent` subagent types, the
  session likely needs a restart to pick up newly-added
  `.claude/agents/*.md` files and the `playwright` MCP server in
  `.mcp.json` — tell the user that plainly rather than improvising a
  workaround.
- A round can be scoped narrowly ("just re-review the guestbook form
  after that last fix") — you don't need to re-review the whole site
  every time.
- This skill assumes the two critic agents may want to interact with a
  locally-running instance of the site for anything that would write to
  the live guestbook. If they ask for one, relay that request to
  `web-coder` rather than starting a server yourself.
