---
slug: extract-walk-skill
started: 2026-08-02
updated: 2026-08-02
consolidated:
---

# Extracting /walk, and two threads that didn't survive contact

Session started as three parallel ideas. One became a change; two were closed with reasons worth keeping.

## Claude Code skill frontmatter — what's actually available

Verified against `code.claude.com/docs/en/skills` and by running probes. This was the session's most reusable finding and none of it was in the repo before.

- **`disable-model-invocation: true`** prevents Claude from auto-loading a skill *and* blocks the **Skill tool** from invoking it. The error is explicit: `Skill spike-flagged cannot be used with Skill tool due to disable-model-invocation`. It also prevents preloading into subagents and (since v2.1.196) blocks scheduled tasks firing the skill. `/name` still works.
- **`user-invocable: false`** is the opposite lever — hides from the `/` menu, keeps model invocation. For background knowledge users shouldn't invoke.
- **The skill listing truncates `description` + `when_to_use` at 1,536 characters.** This is a hard cap on how much trigger text can ever match.
- **`when_to_use`** is a separate frontmatter field appended to `description` in the listing; counts toward the same cap.
- **`paths`** — glob patterns limiting when a skill auto-activates. The lever that actually fits "reduce context without breaking invocation," unexplored so far.
- Others noted: `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `argument-hint`, `arguments`, `shell`.
- Boolean fields accept `yes`/`no`/`on`/`off`/`1`/`0` in any case since v2.1.218.

**Skills hot-reload mid-session.** Creating `.agents/skills/<name>/SKILL.md` makes it invocable immediately — no restart. That's what made the probe experiment possible, and it's how `/walk` became callable the moment it was written.

**How to test a frontmatter flag:** two probe skills, one flagged and one control, then try both. The control proves hot-reload worked, so a failure on the flagged one is attributable to the flag rather than to the skill not being loaded. Without the control the result is ambiguous.

## Why the command-only-skills idea is dead

The goal was reclaiming the context that skill descriptions occupy. Measured: **~2,307 tokens across all 16 skills** (`save` alone is 399, `dream` 249, `improve` 239; the five `openspec-*` are only 210 combined). That's ~1% of a 200k window.

It can't be done anyway. Every WongStack verb is *both* a human entry point *and* a Skill-tool handoff target — `/apply` → `/save`, `/continue` → `/apply`, `/explore` → `openspec-explore`, `/ship` → `openspec-archive-change`, `/wong-setup` → `/wong-sync`. Several of those handoffs are mandated in CLAUDE.md. `disable-model-invocation` would sever all of them.

Secondary argument that stands independently of the mechanism: for some skills the description *is* the product. `wong-setup`'s whole job is firing when someone says "should we set this up here?" — a user who knew to type `/wong-setup` wouldn't need it. Same for `wong-cloudflare` ("make the app reachable at a real address"), `improve`, `dream`. The general principle: **disable the skills you always name; keep the ones that need to find you.**

## Cloudflare: don't author it, and probably don't vendor it

`github.com/cloudflare/skills` is Apache-2.0 and ships 11 skills / 373 files. The `cloudflare` skill alone is **2.0 MB across 319 reference files** covering 60+ products — larger than all of WongStack (~150 KB of skills). Its own description says it *"Biases towards retrieval from Cloudflare docs over pre-trained knowledge"*, which is the hybrid freshness strategy anyone would design, authored by the vendor. Content quality is real: `d1/gotchas.md` leads with prepared-statement injection, `no such table` → migrations + binding name, the 30 s query timeout.

Structure is consistent per product: `README · api · configuration · patterns · gotchas`. **The subset this stack touches — `workers` + `d1` + `wrangler` — is 124 KB / 15 files**, which is the vendorable slice if it's ever wanted. The repo also ships `.mcp.json` with five remote MCP servers: `docs.`, `mcp.`, `bindings.`, `builds.`, `observability.mcp.cloudflare.com`.

Dropped for now at the user's call. The unresolved tension if it's revisited: WongStack's thesis is *the repo is the shared memory*, but a marketplace/`npx skills` install is per-machine — a teammate who clones doesn't get it. The `openspec-*` precedent (a dependency the repo declares and each clone generates, deliberately not copied) is the closest existing answer.

## Things about this repo worth not rediscovering

- **`.claude` is a symlink to `.agents`**, and `CLAUDE.md` to `AGENTS.md`. Edit the `.agents/` target; `grep -r` doesn't follow symlinks so a repo-wide grep silently under-counts. Already documented at `wiki/development/repo-layout.md` — but note the corollary that bit here: **runtime paths inside skills must still say `.claude/`**, because a target repo has a real `.claude/` directory and no symlink.
- The walkthrough was already well-factored before this change — `SKILL.md` held only *when* and *what the verdict does to the merge*; `references/walkthrough.md` held *how*. That's why extraction was ~25 lines of surgery rather than a rewrite. Factoring a skill into `SKILL.md` + `references/` pays off when the skill later needs to move.
- `openspec validate` takes `--changes` (plural), not `--change`. `openspec status` takes `--change` (singular).

## Open threads

- **`/save`'s description is 1,583 chars against the 1,536 cap** — its tail (`or get a shareable preview URL of in-progress work`) is silently truncated and can no longer match. Deliberately left out of this change; wants its own one-liner. No other skill is close to the cap.
- Whether `/ship` should gain a one-line "no walk evidence on this PR" nudge. Deferred by decision, not uncertainty — revisit if walks get forgotten in practice.
- `paths` frontmatter as the context lever the dead thread actually wanted.
