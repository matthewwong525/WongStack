# Add a home repo

**Status:** ready-to-ship
**Branch:** explore/home-mode
**Open questions:** none

## Why

WongStack runs every request through the change verbs, and each repo remembers only its own sessions. A person can not use it as a personal assistant: errands get a question round, and what one repo learns about the person stays in that repo. The wiki also holds only process, so it can not keep repeatable knowledge about people, the company, or the project.

## What Changes

- **Every repo does plain requests directly.** Research, errands, reminders, and questions get done with no verb and no question round, in every repo. The verbs stay for building or changing code. There is no home or work mode: every repo follows the same rules, and grows from what it is used for. (review.html#/request-routing/after/changed)
- **Home is the person's own repo, recorded once per machine.** Home is an ordinary full install with Cloudflare, used for the person's life. `/wong-setup` asks whether the new repo is the person's home, and if so writes its absolute path to `~/.wong-stack/machine.json`. Nothing else about home is different.
- **One wiki format that grows with use.** The wiki holds **repeatable knowledge**, not only process: the test is "will this help with a future task that is not this one?". Sections appear when the first fact needs them. The first fact about a person creates `wiki/people/README.md` (who is who) and that person's `wiki/people/<name>.md`, with their git emails and how they like work done. The agent matches the current person by `git config user.email`, and writes a short page when none lists it. Four writing rules apply: one person → their page, everyone → a topic page. Different preferences are both kept, each on its own page. Private life goes in home only. A shared repo merges wiki edits through git. (review.html#/wiki-shape/changed)
- **Repeatable knowledge reaches the wiki when it is learned.** In every repo, when a request teaches something repeatable, the agent writes it to the wiki then, including "read this and remember it" and answers worth keeping. It cites sources by URL and stores no copies. A wiki-only save goes straight to `main`; during a change, the edit rides in the change's PR. `/ship` still catches what was missed: it reads every live fact from the sessions on the change's branch, not only the change's slug, and places the repeatable ones by progressive disclosure. (review.html#/knowledge-flow/after/changed)
- **The person's memory reaches every repo.** At session start, every repo on the machine also loads the person's `people/` page from home and their live `user` and `feedback` facts from home's store, in a small separate part of the digest. Capture writes facts about the person's private life to home's store, and drops them when no home is recorded. No new database.
- **Saved browser logins.** The first time a task needs a login, the agent points agent-browser at one persistent profile through `~/.agent-browser/config.json`, if none is set, and hands the browser to the person once. Later tasks reuse the saved session. Personal browsing runs one at a time, because Chrome locks a profile. `/verify` always uses its own temporary profile, so a preview check never uses personal logins or waits for the lock.
- **Short chat replies.** The `WONG-STACK` block tells the agent to answer in a few lines and give more detail only when asked.

**Non-goals:** No home or work mode. No ready-made routines. No change to Paseo's app, voice, push delivery, or the Claude sign-in. No MCP connectors for email or calendar. No `index.md` or `log.md` in the wiki. No new database or token. No change to raw transcript upload. The hosted service `wongstack-cloud` plans its own changes.

## Capabilities

### New Capabilities

- `request-routing`: Plain requests are done directly in every repo, and the verbs handle code.
- `people-wiki`: The repeatable-knowledge scope of the wiki, sections that grow with use, the `people/` section, matching a person by git email, the four writing rules, and writing what is learned.
- `browser-logins`: The persistent agent-browser profile set at first login, the one-time login handoff, and one personal browsing task at a time.

### Modified Capabilities

- `memory-recall`: Each machine records where home is. Session start also loads the person's page and personal facts from home.
- `memory-capture`: Private-life facts go to home's store, never to another repo's store.
- `ship-full-cycle`: The distill step reads the facts of every session on the change's branch and keeps repeatable knowledge.
- `install-onboarding`: Setup asks whether the new repo is the person's home and records it for the machine.
- `staging-walkthrough`: `/verify` drives the browser with a temporary profile.
- `simplified-technical-english`: Chat replies are short by default.
- `agent-knowledge-center`: The wiki is long-term memory written when knowledge is learned; `/ship` is the catch-up, not the only path.

## Impact

- **Block and rules:** the `WONG-STACK` block in `AGENTS.md` (request routing, writing what is learned, the "Where context lives" table, short replies), `.agents/rules/wiki.md`.
- **Wiki (payload):** `wiki/wiki-style.md`, `wiki/agent-knowledge-center.md`, `wiki/development/memory.md`, `wiki/development/the-change-loop.md`; a new `wiki/development/home.md`.
- **Skills:** `ship/SKILL.md`, `memory/SKILL.md` and `references/writing-facts.md`, `memory/scripts/memory.mjs`, `lib/store.mjs`, `lib/digest.mjs`, `session-start.mjs`, `verify/scripts/verify-runner.sh`, `wong-setup/SKILL.md`, `wong-sync/references/payload-manifest.md` and `payload-files.json`.
- **Tests:** memory script tests for the machine record, the home part of the digest, and `--home` writes; a `/verify` test for the temporary profile.
- **Release:** `VERSION` 20.0.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-26** — The brief fixed these decisions, and exploration did not reopen them: Cloudflare is required in home. Home is its own repo, and work repos are separate. One person uses each computer. One wiki format for one person or many. D1 facts are short-term memory, and the wiki holds only repeatable knowledge. Take ingest and saved answers from Karpathy's LLM wiki, but no `index.md` or `log.md`. Paseo pushes reach the person, and accounts go through agent-browser, not MCP.
- **2026-09-26** — Asked how a machine knows where home is → chose **record it once**: `~/.wong-stack/machine.json` holds `{"home": "<absolute path>"}`, and setup suggests `~/home`.
- **2026-09-26** — Asked what happens when a git email matches no `people/` page → chose **create a stub** (name and git email) in the next wiki save.
- **2026-09-26** — Asked the scope → chose **all seven items** in one release.
- **2026-09-26** — Asked whether to hold back a work-repo session's raw transcript when it carries private-life talk → the user said teammates can not read other teammates' transcripts, only admins can. So the upload does not change. This conflicts with `wiki/development/memory.md`, which says everyone with the memory token can read every transcript. It is true only when admins alone hold `CLOUDFLARE_MEMORY_TOKEN`. This change does not touch token handout; the conflict is recorded here for the user.
- **2026-09-26** — Found: the repo is at 19.0.1, not 18.1.0 as the brief says. This change builds on 19.0.1.
- **2026-09-26** — Assumed: `/verify` sets `AGENT_BROWSER_PROFILE` to a temporary folder for each run. A profile in `~/.agent-browser/config.json` applies to every agent-browser call on the machine, so without this a preview walk would carry the person's logins, and two walks would fight over Chrome's profile lock. The environment variable overrides the config file.
- **2026-09-26** — Assumed: the login rule lives in WongStack-owned text (`wiki/development/home.md` and the block), not in `agent-browser/SKILL.md`. The vendored skill is never hand-edited, and it has `disable-model-invocation: true`.
- **2026-09-26** — Assumed: a person's page can list more than one git email, because work and home emails usually differ. A work repo finds the home owner's page with home's own git email, because one person uses each computer.
- **2026-09-26** — Assumed: `/ship` uses the existing `memory.mjs search --branch <branch>` together with `show <slug>`. The selection is code; only the placement needs a model.
- **2026-09-26** — Assumed: `memory.mjs` gains a `--home` flag for `search`, `gate`, and `put-facts`. It opens home's store with home's install record and home's `.env` token. Home-routed facts carry no session id, because the session row lives in the work repo's store.
- **2026-09-26** — Assumed: without a recorded home, capture drops private-life facts. A shared store must never hold them, and there is nowhere else to put them.
- **2026-09-26** — Assumed: the home part of the digest is capped at 15 lines and 3 KB of facts, and the page at 4 KB. Home's store is fetched in parallel within the same 1.5 s budget. An offline or missing home adds one line.
- **2026-09-26** — Assumed: 20.0.0, a major release. The wiki's scope and the block's request routing change what an agent writes and does in every install.
- **2026-09-26** — Revised after plan review: the user said there should be no difference between home and work mode; every repo should work the same and grow from its use. So the install record gets no `mode` field, direct requests and writing-when-learned apply in every repo, and home remains only as the machine's recorded personal repo, for private facts and the person's memory in other repos.
- **2026-09-26** — Revised after plan review: the user removed the ready-made routines. `/routine` does not change.
- **2026-09-26** — Assumed: "grow based on usage" also means no section is seeded. Setup creates no `wiki/people/`; the first fact about a person creates the hub and the page. The browser profile is set at the first login, not at setup.
- **2026-09-26** — Assumed: the block's "Don't edit `wiki/` mid-task" rule becomes "write repeatable knowledge when you learn it; a change's specifics stay in its proposal". During a change, the wiki edit rides in the change's PR; otherwise the prose route takes it to `main`.
- **2026-09-26** — Assumed: setup still asks whether the new repo is home, because nothing else can tell a machine which repo holds the person's private facts. The answer writes only the machine record.
- **2026-09-26** — Assumed: this repo gets no people page now. Under the stub rule, the first wiki save here that learns about a person creates one, with the git email already public in commits.
- **2026-09-26** — Changed during apply: the branch is `explore/home-mode` (renamed from `magical-chicken`), fast-forwarded to `main` at 19.0.2 before any commit.
- **2026-09-26** — Changed during apply: added an `agent-knowledge-center` delta. Its spec named `/ship` as the only automatic path into the wiki, which writing-when-learned makes false; `/ship` is now the catch-up.
- **2026-09-26** — Changed during apply: with a home recorded but no people page yet, the From-home part shows the facts alone, instead of nothing. Hiding the person's facts because a page is missing helped no one.
- **2026-09-26** — Changed during apply: `/verify` gives each journey its own folder under one temporary profile root, removed on exit, because each journey is its own agent-browser session.
- **2026-09-26** — Changed during apply: the memory test harness keys fake D1 databases by id, so a work repo and its home share one fake API with separate stores and a per-database offline switch. `envFor` points `WONG_MACHINE_FILE` into the test's temp folder, so a real `~/.wong-stack/machine.json` never leaks into tests.
- **2026-09-26** — Changed during apply: the 19.0.2 `CHANGELOG.md` entry on `main` held a copy of the file's header where "`$`" belonged (a `$` substitution artifact). Repaired from the archived proposal's wording, because this release edits the same file.
