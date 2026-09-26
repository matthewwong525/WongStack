## Context

See proposal.md, Why. Today:

- The `WONG-STACK` block (between the markers in `AGENTS.md`) is one text that every install gets. The preflight compares only that text. This fits the user's rule that every repo behaves the same: the new rules are unconditional.
- `memory.mjs` works on one store: `repoContext(cwd)` finds the repo, `loadConfig` reads `.claude/.wong-stack.json`, and `loadEnv` reads the primary worktree's `.env`. `search --branch <b>` already joins facts to `sessions.branch`.
- `session-start.mjs` fetches the digest in one D1 batch within a 1.5 s budget, against a 5 s hook timeout, and falls back to a cached digest.
- `facts.session_id` references `sessions (id)`, and a session row lives only in the store of the repo that ran it.
- agent-browser 0.33.2 reads `~/.agent-browser/config.json`, then `./agent-browser.json`, then environment variables (`AGENT_BROWSER_PROFILE`), then flags. `/verify` drives it only through `verify/scripts/verify-runner.sh`, with `--session`.
- The vendored `agent-browser` skill is never hand-edited, and only `/verify` calls it.

## Goals / Non-Goals

**Goals:**

- One set of rules in every repo, with no mode. Home differs only in being the machine's recorded personal repo.
- The wiki grows from use: no section is seeded.
- Every cross-repo read goes through the one memory script, with a bounded cost at session start.
- Code selects facts and loads pages. A model decides only where a fact goes in the wiki.

**Non-Goals:**

- No sync of wiki pages between repos. A work repo reads home's page; it never copies it.
- No new command that lists or edits people pages. They are ordinary wiki pages.

## Decisions

### The new rules are unconditional lines in the shared block

The block's verbs rule narrows to "build or change code through the verbs; do a plain request directly". The "Don't edit `wiki/` mid-task" rule becomes "write repeatable knowledge to the wiki when you learn it; a change's specifics stay in its proposal". A browser line and the short-reply line join the rules. None of them reads the install record.

- *Alternative:* a `"mode": "home"` field that switches rules. Rejected by the user in plan review: every repo should work the same and grow from its use.

### Home's location is one machine file, read by one helper

`~/.wong-stack/machine.json` holds `{"home": "<absolute path>"}`. A new helper `homeContext()` in `lib/store.mjs` reads it, resolves `repoContext(home)`, and checks that home's install record has a memory store. It returns `null` for a missing file, a missing folder, or a record with no store, and marks when the current repo is home. `WONG_MACHINE_FILE` overrides the path, for tests.

- *Alternative:* a fixed `~/home`. The user chose the recorded path.
- *Alternative:* an environment variable. Rejected, because hooks and Paseo runs do not share one shell profile.

### `--home` opens home's store and changes nothing else

`search`, `show`, `gate`, and `put-facts` accept `--home`. The script swaps the context for `homeContext()` and uses home's own config and `.env`, so no token is copied. On a home write, the script sets `session` to null, because the session row is in the work repo's store and the foreign key would fail. It also sets `author` to home's git email. Without a home, `--home` exits non-zero with `no home recorded`, and the capture runbook reads that as "drop". When home's store does not answer, the facts go to home's spool (`homeContext().stateDir`), and home's next session start sends them through the gate, as any spooled fact.

- *Alternative:* copy home's token into each work repo's `.env`. Rejected, because it spreads a secret for no gain.

### The home part of the digest is a second, parallel batch

`session-start.mjs` starts home's fetch beside the repo's own fetch, with the same 1.5 s budget:

- It runs one batch for live `user` and `feedback` facts (limit 15), from `homeContext()`.
- It reads the person's page from home's wiki on disk. The page is the file under home's `wiki/people/` that lists home's `git config user.email`, found by a plain text match.
- It prints the result after the repo digest, under `## From home (<path>)`, with its own caps: 4 KB for the page and 15 lines or 3 KB for the facts. With no machine record it prints nothing; with no page yet, it shows only the facts.
- The page read needs no network, so it is shown even when home's store is offline.
- Home's digest is cached in home's own state folder, as a normal digest is. The work repo does not cache home's facts.

### Where each fact goes at capture

`writing-facts.md` gains a private-life rule. The candidate stays in the same `gate`, then `put-facts`, flow, with `--home` added. Both `/save` and the background run follow the runbook. The runbook can send two `put-facts` calls: one for the repo, and one `--home` call. For the second call, the run counts private facts as `added` or `dropped`.

### `/ship` distill uses the existing branch search

It is the catch-up for what sessions did not write when they learned it. The step runs `show "$CHANGE_NAME"` and `search --branch "$BRANCH" --limit 200`, with the branch from the proposal's `**Branch:**` line, and removes duplicate ids. It applies the repeatable test and the four writing rules, then edits pages as today. No new query code is needed.

### `/verify` pins a throwaway profile by environment variable

`verify-runner.sh` makes a temporary folder with `mktemp -d` per run, exports `AGENT_BROWSER_PROFILE` to it, and removes it on exit. The environment variable wins over `~/.agent-browser/config.json`, so the walk never reads the personal profile.

- *Alternative:* no global config, with personal tasks passing `--profile`. Rejected, because every ad-hoc agent-browser call would need the flag, and one missed flag logs in to a fresh profile.

### The browser profile is set at the first login

`wiki/development/home.md` owns the login steps. When a task meets a login and the config has no `profile`, the agent reads `~/.agent-browser/config.json` (or starts `{}`), adds `"profile": "~/.wong-stack/browser-profile"` as an absolute path, and writes it back. The block states this permission next to the browser rule, because the agent would otherwise ask each time before it touches a file outside the repo. Setup does not write the file.

### The people hub is created by use, not seeded

`wiki/people/` is target-owned content that the first person fact creates, so it is neither payload nor `seededBySetup`, and the link check never expects it. The shape rules live in `wiki/wiki-style.md` (payload). The home and browser how-to lives in a new payload page, `wiki/development/home.md`, which the block links.

## Risks / Trade-offs

- [The model misclassifies a private fact as a work fact] → The writing rule lists the categories (health, family, money, personal plans). `#private` still removes a whole session. Consolidation cannot move facts between stores, so a miss stays until someone supersedes it.
- [Session start grows by up to about 7 KB] → The home part has its own caps, and it is absent on machines without home. Most of it is the person's own page, which is the point of the change.
- [Home's store is on another Cloudflare account] → Home's token is account-scoped and read from home's `.env`, so it works across accounts.
- [Writing when learned fills the wiki with weak pages] → The repeatable test and the writing rules gate each write; a shared repo reviews edits through git; `/improve` already gardens the wiki.
- [Work repos change behavior: plain requests skip `/explore`] → Code work still runs the full loop. This is the user's rule, and 20.0.0 marks the change.
- [A shared persistent profile holds live sessions for mail and bank sites] → It lives in the person's home folder on a one-person machine. The rule forbids storing passwords, and `/verify` never uses the profile.
- [Two emails on one person page could collide with a teammate's email] → A match needs the exact email, and a page lists only emails the person uses.

## Migration Plan

1. Existing installs get the new block, rules, and pages through `/wong-sync`. They gain direct requests and writing-when-learned at once. Without a machine record, nothing reads home.
2. To add home to a machine, the person runs `/wong-setup` in an empty folder and answers that it is home. An existing repo can become home by writing its path to `~/.wong-stack/machine.json`.
3. Rollback: delete `~/.wong-stack/machine.json`, and every repo stops reading home. Remove `profile` from `~/.agent-browser/config.json` to stop keeping logins.
