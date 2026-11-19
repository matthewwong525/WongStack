<!-- openspec-archive v1 2026-09-26-add-home-repo -->
<!-- file proposal.md utf8 13247 -->
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
- **2026-09-26** — Saved the implementation (22 of 22 tasks) with the deltas reconciled into `openspec/specs/`, and merged `main` at 19.1.0 (secrets files per role). Conflicts in `VERSION`, `CHANGELOG.md`, and `wiki/agent-knowledge-center.md` were resolved as the union: 20.0.0 above 19.1.0, and 19.1.0's path-scoped-rules surface kept beside the widened wiki line. All 176 script tests pass locally, with 5 skipped.
- **2026-09-26** — Distilled facts before the archive: no repeatable fact left to move. #175 (no mode; grow from use) is already in `wiki/wiki-style.md` and `wiki/development/home.md`. #177 (JS `String.replace` expands `$` patterns) is a general coding pitfall, not WongStack knowledge, so it stays in the store. #176 is an open question. The session's facts sat under the branch's old name, `magical-chicken`, because the branch was renamed mid-session, so `search --branch explore/home-mode` found none; `show add-home-repo` covered them.
- **2026-09-26** — Archived after CI passed on PR #118, with the deltas already reconciled into `openspec/specs/` and confirmed equal, so the archive used `--skip-specs`.

<!-- end proposal.md -->
<!-- file design.md utf8 8645 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5060 -->
## 1. Block and rules (AGENTS.md)

- [x] 1.1 In the `WONG-STACK` block, narrow the verbs rule: build or change code through the verbs; do a plain request (research, errand, reminder, question) directly, with no verb and no question round. No rule reads a mode (review.html#/request-routing/after/changed)
- [x] 1.2 In the block, replace "Don't edit `wiki/` mid-task" with "write repeatable knowledge to the wiki when you learn it; a change's specifics stay in its proposal", and change the "Where context lives" `wiki/` row to "repeatable knowledge — process, people, the company, the project"
- [x] 1.3 In the block, add the browser rule (one personal browsing task at a time; set the profile at the first login, with the explicit permission to edit `~/.agent-browser/config.json`) linking `wiki/development/home.md`, and the short-reply rule
- [x] 1.4 In `.agents/rules/wiki.md`, state the repeatable-knowledge scope and link the writing rules in `wiki/wiki-style.md`

## 2. Wiki pages (payload)

- [x] 2.1 In `wiki/wiki-style.md`, widen "Keeping it tidy" from "general, reusable processes only" to repeatable knowledge; add the test, writing when learned (ingest and saved answers, cite by URL), sections that grow from use, the `people/` section with git-email matching and the stub rule, and the four writing rules (review.html#/wiki-shape/changed)
- [x] 2.2 Add `wiki/development/home.md`: home as the machine's recorded personal repo, the machine record, the person's memory in every repo, private-fact routing, and saved browser logins with the first-login profile, the one-time handoff, and the one-task-at-a-time rule. Link it from `wiki/development/README.md`
- [x] 2.3 Update `wiki/development/memory.md`: the home part of the digest, `--home`, the home spool, and private-fact routing. Link `home.md`
- [x] 2.4 Update `wiki/agent-knowledge-center.md` where it defines the wiki's scope, and `wiki/development/the-change-loop.md` where it says what writes the wiki and which requests go through the verbs

## 3. Memory scripts

- [x] 3.1 In `lib/store.mjs`, add `homeContext()`: read `~/.wong-stack/machine.json` (`WONG_MACHINE_FILE` overrides), check home's install record has a memory store, return `null` otherwise, and mark when the current repo is home
- [x] 3.2 In `memory.mjs`, add `--home` to `search`, `show`, `gate`, and `put-facts`: open home's store with home's config and `.env`, write with a null session and home's git email as author, spool to home's state folder when home does not answer, and exit non-zero with `no home recorded` when there is none (review.html#/knowledge-flow/after)
- [x] 3.3 In `session-start.mjs` and `lib/digest.mjs`, add the home part: a parallel batch for the person's live `user` and `feedback` facts (15 lines, 3 KB), the page matched by home's git email (4 KB), shown under `## From home`; one line when home's store is offline; nothing when no home is recorded or no page exists; page only when the repo is home
- [x] 3.4 Extend `scripts/tests/memory-store.test.mjs` and `memory-capture.test.mjs`: machine record present, missing, and pointing at a folder with no store; `--home` writes carry no session id; an offline home spools; the home part stays in its caps; offline home gives one line and the hook ends inside its timeout

## 4. Memory skill text

- [x] 4.1 In `memory/references/writing-facts.md`, add the private-life rule: private facts go to `put-facts --home`, and are dropped when that exits with `no home recorded`
- [x] 4.2 In `memory/SKILL.md`, document `--home` under Read and Write, and add the home call to the background run's step 2

## 5. Ship

- [x] 5.1 In `ship/SKILL.md`, rewrite "Distill the change's facts into the wiki" as the catch-up: read `show "$CHANGE_NAME"` and `search --branch "$BRANCH"`, remove duplicate ids, keep repeatable knowledge under the wiki-style rules, and place each fact by progressive disclosure, including people pages (review.html#/knowledge-flow)

## 6. /verify

- [x] 6.1 In `verify/scripts/verify-runner.sh`, make a temporary profile folder per run, export `AGENT_BROWSER_PROFILE` to it, and remove it on exit; cover it in `scripts/tests/verify-scripts.test.mjs`
- [x] 6.2 Leave the vendored `agent-browser/SKILL.md` unchanged; the login rules live in `home.md` and the block

## 7. Setup and sync

- [x] 7.1 In `wong-setup/SKILL.md`, add the home question to the `/explore` intent: write `~/.wong-stack/machine.json` with the absolute path when the answer is yes, suggest `~/home`, and ask before replacing another home. The install and its record stay the same
- [x] 7.2 In `wong-sync/references/payload-files.json`, add `wiki/development/home.md` to core; in `payload-manifest.md`, say that `wiki/people/` is target content made by use, and that the machine record lives outside the repo

## 8. Release

- [x] 8.1 Bump `VERSION` to 20.0.0 and add a newest-first `CHANGELOG.md` entry
- [x] 8.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 8.3 Reconcile the deltas and pass CI through `/save`

<!-- end tasks.md -->
<!-- file specs/agent-knowledge-center/spec.md utf8 1236 -->
## MODIFIED Requirements

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and session facts SHALL be presented as the mechanisms that let each project leave more useful context for the next person or agent. Sessions without `/save` SHALL be presented as captured by the background run that the session start begins, and the digest SHALL be presented as how the next session starts with that context. The wiki SHALL be presented as long-term memory for repeatable knowledge, written when a session learns it. `/ship` SHALL be presented as the catch-up that moves a change's remaining repeatable facts into the wiki, with its wiki edits reviewed in the ship pull request.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context
- **AND** they see that repeatable knowledge reaches the wiki when it is learned, and that `/ship` catches what a session missed

<!-- end specs/agent-knowledge-center/spec.md -->
<!-- file specs/browser-logins/spec.md utf8 2279 -->
## Purpose

Let the agent use the person's own web accounts through agent-browser, with a login done once by the person and reused after, and keep personal logins out of preview checks.

## ADDED Requirements

### Requirement: The first login sets one persistent browser profile

The first time a task needs a login and `~/.agent-browser/config.json` sets no `profile`, the agent SHALL set `"profile"` there to an absolute folder path, so every agent-browser call on the machine keeps cookies and site data across restarts. It SHALL keep every other key in the file, and SHALL NOT change a `profile` that is already set. Setup SHALL NOT write this file.

#### Scenario: No config yet

- **WHEN** a task needs a login on a machine with no `~/.agent-browser/config.json`
- **THEN** the file exists with a `profile` path, and the folder exists

#### Scenario: An existing config

- **WHEN** the config file already has other keys and no `profile`
- **THEN** the agent adds `profile` and keeps the other keys

### Requirement: The person does each login once

When a site needs a login, the agent SHALL hand the browser to the person once, for example through agent-browser's `stream enable` or `dashboard start`, and SHALL continue after the person says the login is done. Later tasks SHALL reuse the saved session. The agent SHALL NOT ask for a password in chat or store one in a file.

#### Scenario: First time on a site

- **WHEN** a task opens a mail site that shows a login form
- **THEN** the agent gives the person a way to log in in that browser, waits, and continues the task

#### Scenario: Later visits

- **WHEN** a later task opens the same site
- **THEN** the agent uses the saved session with no login step

### Requirement: Personal browsing runs one task at a time

Because Chrome lets only one browser use a profile at a time, the rules SHALL tell the agent that personal browsing tasks and scheduled runs must not use the profile at the same moment. A task that finds the profile in use SHALL wait or report it, and SHALL NOT delete the profile's lock.

#### Scenario: A scheduled run during a task

- **WHEN** a scheduled run needs the browser while another task uses the profile
- **THEN** the run reports that the browser is busy and does not remove the lock

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 883 -->
## ADDED Requirements

### Requirement: Setup records the person's home

Setup's exploration SHALL ask whether the new repo is the person's home. When it is, setup SHALL write `~/.wong-stack/machine.json` with the repo's absolute path, and SHALL suggest `~/home` as the folder. The install itself SHALL be the same full install with Cloudflare as any other, and the install record SHALL NOT change. When the machine already records a different home, setup SHALL ask before it replaces the record.

#### Scenario: Creating home

- **WHEN** the person runs setup in an empty `~/home` and says it is their home
- **THEN** the machine record names `~/home` by absolute path, and the install is the same as any install

#### Scenario: A second home

- **WHEN** setup creates a home on a machine that already records another home
- **THEN** setup asks before it changes the machine record

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/memory-capture/spec.md utf8 1111 -->
## ADDED Requirements

### Requirement: Private-life facts go to home's store

Capture in any repo other than home, by `/save` or by the background run, SHALL write a fact about the person's private life (health, family, money, personal plans) to home's store, not to the repo's own store. The memory script SHALL offer this as a `--home` option on its read and write commands. A fact written to home's store SHALL carry no session id. When home's store can not be reached, the fact SHALL wait in home's local spool, and home's next session start SHALL send it. When the machine records no home, capture SHALL drop the fact. In both cases it SHALL NOT write the fact to the repo's own store. The raw transcript upload SHALL NOT change.

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session records that the person's daughter starts school on 2026-10-05
- **THEN** that fact is in home's store and not in the work repo's store

#### Scenario: No home recorded

- **WHEN** the same session runs on a machine with no home
- **THEN** the fact is dropped, and the run counts it as dropped

<!-- end specs/memory-capture/spec.md -->
<!-- file specs/memory-recall/spec.md utf8 2237 -->
## ADDED Requirements

### Requirement: Each machine records where home is

Each machine SHALL record the absolute path of the person's home repo once, in `~/.wong-stack/machine.json` as `{"home": "<absolute path>"}`. Every repo on the machine SHALL read home's location from that file only. A missing file, a missing `home` key, or a path with no WongStack memory store SHALL mean the machine has no home, and nothing SHALL fail because of it.

#### Scenario: Home was set up

- **WHEN** setup created home at `/Users/ana/home`
- **THEN** `~/.wong-stack/machine.json` holds `{"home": "/Users/ana/home"}`

#### Scenario: No home on this machine

- **WHEN** a session starts and `~/.wong-stack/machine.json` does not exist
- **THEN** the session starts as before

### Requirement: Session start loads the person's memory from home in every repo

When the machine records a home, the session-start hook in every other repo SHALL add a separate part to the digest with the person's `wiki/people/` page from home, matched by home's `git config user.email`, and their live `user` and `feedback` facts from home's store. In home itself, the part SHALL hold only the page, because home's facts are already in the digest. The hook SHALL use home's install record and home's `.env` token, and SHALL add no database or token. The page SHALL be capped at 4 KB and the facts at 15 lines and 3 KB, with a pointer to the rest. The fetch SHALL run in parallel with the repo's own digest, within the same budget. When home can not be read, the part SHALL be one line saying so, and the rest of the digest SHALL be unchanged. When no home is recorded, the part SHALL be absent. When home has no page for the person yet, the part SHALL hold only the facts, and SHALL be absent when there are none.

#### Scenario: A work repo on a machine with home

- **WHEN** a session starts in a work repo and home's store holds the person's `feedback` facts
- **THEN** the digest includes the person's page and those facts, marked as coming from home

#### Scenario: Home's store is offline

- **WHEN** home's store does not answer within the budget
- **THEN** the digest says in one line that home's facts were not loaded, and the hook still ends inside its timeout

<!-- end specs/memory-recall/spec.md -->
<!-- file specs/people-wiki/spec.md utf8 4787 -->
## Purpose

Give every WongStack repo one wiki format that holds repeatable knowledge about process, people, the company, and the project, grows from use, and works for a team of one or many.

## ADDED Requirements

### Requirement: The wiki holds repeatable knowledge

The wiki rules SHALL define the wiki's scope as repeatable knowledge: facts that stay true and apply again, about process, people, the company, or the project. The test SHALL be "will this help with a future task that is not this one?". A one-off fact (a single decision, a date, one change's details) SHALL stay in the memory store or the change's records. The rules SHALL be the same in every repo.

#### Scenario: A repeatable preference

- **WHEN** a session learns that a teammate wants PRs under 300 lines
- **THEN** the fact is repeatable and belongs on that teammate's page

#### Scenario: A one-off decision

- **WHEN** a session decides to ship a fix on Friday
- **THEN** the fact stays in the memory store and no wiki page changes

### Requirement: The agent writes what it learns

In every repo, when a request teaches something repeatable, the agent SHALL write it to the wiki during that request. This SHALL include "read this and remember it" requests and answers worth keeping. It SHALL cite a source by URL or path and SHALL NOT store a copy of the source in git. A wiki-only save SHALL go to the default branch through the prose allowlist. During a change, the edit SHALL ride in the change's pull request. The block's rule about editing `wiki/` mid-task SHALL say to write repeatable knowledge when it is learned, and to keep a change's specifics in its proposal.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the agent writes the repeatable points to the page that owns the topic, with the URL, and saves it straight to `main`

#### Scenario: A one-off answer

- **WHEN** the person asks for today's weather
- **THEN** no wiki page changes

### Requirement: Sections grow from use

No wiki section beyond the hubs that setup already creates SHALL be seeded. A new fact SHALL extend the page that owns its topic, or SHALL get a new page linked from its hub. A folder SHALL be added only when a topic grows into several pages. The wiki SHALL NOT gain an `index.md` or a `log.md`: hub READMEs are the index, and git history is the log.

#### Scenario: A new install

- **WHEN** setup completes
- **THEN** the wiki has only the hubs setup already creates, and no `people/` folder

#### Scenario: A new customer

- **WHEN** a session learns repeatable facts about a new customer
- **THEN** the facts go on one customer page linked from its hub, not in a new folder

### Requirement: People pages are matched by git email

Knowledge about one person SHALL go on `wiki/people/<name>.md`, linked from the hub `wiki/people/README.md`. The first such page SHALL create the hub and link it from `wiki/README.md`. A person page SHALL list every git email the person uses, and SHALL hold their preferences and how they like work done. The agent SHALL find the current person's page as the page that lists the value of `git config user.email`. When no page lists it, the agent SHALL write a short page with the name and the email in the next wiki save, and SHALL NOT ask first.

#### Scenario: The first person fact

- **WHEN** a repo with no `people/` folder learns a teammate's review preference
- **THEN** the save adds `wiki/people/README.md`, links it from `wiki/README.md`, and adds the teammate's page with their git email

#### Scenario: A person with two emails

- **WHEN** a person commits at work as `ana@corp.com` and at home as `ana@mail.com`
- **THEN** their page in home lists both emails

### Requirement: Four writing rules place each fact

Every wiki write SHALL follow four rules:

1. A fact about one person SHALL go on that person's page. A fact about everyone SHALL go on a topic page.
2. Different preferences of different people SHALL NOT be treated as a contradiction. Each SHALL stay on its own page. Newest wins SHALL apply only between facts about the same person, or about the whole team.
3. A fact about private life (health, family, money) SHALL go only to home, never to another repo. A work preference MAY go in a work repo.
4. In a shared repo, wiki edits SHALL merge through git like code.

#### Scenario: Two people disagree

- **WHEN** one teammate wants squash merges and another wants merge commits for their own PRs
- **THEN** each preference stays on its owner's page, and neither supersedes the other

#### Scenario: A private fact in a work session

- **WHEN** a work-repo session learns that the person has a medical appointment every Tuesday
- **THEN** no page in the work repo records it

<!-- end specs/people-wiki/spec.md -->
<!-- file specs/request-routing/spec.md utf8 1380 -->
## Purpose

Let every WongStack repo act as an assistant: do plain requests directly, and keep the change verbs for building or changing code, with the same rules in every repo.

## ADDED Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL use the change verbs only when a request builds or changes code, and then the verbs SHALL work as before. The rule SHALL live in the `WONG-STACK` block.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to add a page to the repo's app
- **THEN** the agent runs the change loop, starting at `/explore`

### Requirement: No repo has a mode

No install record field, flag, or file SHALL change how a repo handles requests or writes its wiki. A home repo and a work repo SHALL follow the same rules. Home SHALL differ only in that the machine records it as the person's own repo.

#### Scenario: The same request in home and at work

- **WHEN** the same errand is asked in home and in a work repo
- **THEN** both handle it the same way

<!-- end specs/request-routing/spec.md -->
<!-- file specs/ship-full-cycle/spec.md utf8 1669 -->
## MODIFIED Requirements

### Requirement: Ship distills the change's facts into the wiki

Before it archives a change, `/ship` SHALL read the live facts of every session on the change's recorded branch, together with the live facts on the change's slug, from the memory store. It SHALL keep only repeatable knowledge, under the `people-wiki` test and writing rules. It SHALL place each kept fact by progressive disclosure: extend the page that owns it, or add a page linked from its hub. It SHALL make these edits in the same pull request as the change, and SHALL record in the Decision log which pages changed, or that no fact was repeatable. This step SHALL catch what the session did not write when it learned it, as `people-wiki` requires. When the store is unreachable, `/ship` SHALL record that the step was skipped and continue.

#### Scenario: A reusable convention

- **WHEN** a change's facts record a convention that applies to future work
- **THEN** the ship pull request edits the wiki page that owns that topic
- **AND** the Decision log names the page

#### Scenario: A preference learned on another slug

- **WHEN** a session on the change's branch recorded a teammate's review preference under a topic slug
- **THEN** the ship pull request adds it to that teammate's `people/` page

#### Scenario: Nothing reusable

- **WHEN** a change's facts hold only change-specific context
- **THEN** no wiki file changes and the Decision log states that no fact was repeatable

#### Scenario: The store is unreachable at ship time

- **WHEN** `/ship` cannot read the memory store
- **THEN** it records the skipped step in the Decision log and continues to merge

<!-- end specs/ship-full-cycle/spec.md -->
<!-- file specs/simplified-technical-english/spec.md utf8 461 -->
## ADDED Requirements

### Requirement: Chat replies are short

The `WONG-STACK` block SHALL tell the agent to answer in chat in a few lines, and to give more detail only when the person asks. This SHALL NOT shorten the content that a verb's own reply format requires, such as a closing report or a question.

#### Scenario: A simple question

- **WHEN** the person asks which branch a change is on
- **THEN** the reply is a few lines, with no extra background

<!-- end specs/simplified-technical-english/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 760 -->
## ADDED Requirements

### Requirement: The walk uses a throwaway browser profile

Every browser journey of `/verify` SHALL run with a temporary agent-browser profile made for that run, overriding any profile in the machine's agent-browser config, and SHALL remove it when the run ends. A walk SHALL NOT use the person's saved logins, and SHALL NOT wait on the personal profile's lock.

#### Scenario: A machine with a personal profile

- **WHEN** `~/.agent-browser/config.json` sets a personal profile and `/verify` runs a browser journey
- **THEN** the journey runs in a fresh profile with no personal cookies

#### Scenario: Two walks at once

- **WHEN** two worktrees run `/verify` at the same time
- **THEN** neither waits for the other's browser profile

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 12129 fence=~~~ -->
~~~html
<section class="visual flow" id="request-routing" data-kind="flow" data-states="after today">
  <p class="caption">How the agent routes a request in any repo, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="route-request"><h3>A request arrives <span class="tag">Same</span></h3><p>The person asks for research, an errand, a reminder, an answer, or a code change.</p><details><summary>Details</summary><p>Actor: the person. Action: types or speaks a request. Result: the agent reads it.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="route-classify" data-mark="changed"><h3>Classify the request <span class="tag">New</span> <i class="callout">1</i></h3><p>Is it a plain request, or does it build or change code?</p><details><summary>Details</summary><p>Actor: agent. Action: reads the request. Result: one of two paths. The same rule applies in every repo; there is no mode to read.</p></details></div>
      <p class="flow-connector">↓ Choose one path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="route-plain" data-mark="changed"><h3>Plain request → do it directly <span class="tag">New</span> <i class="callout">2</i></h3><p>Research, an errand, a reminder, or a question. No verb, no question round.</p><details><summary>Details</summary><p>Actor: agent. Action: does the task and answers. Result: a short reply. Anything repeatable it learned goes to the wiki.</p></details></div>
        <div class="flow-branch" data-target-id="route-code"><h3>Build or change code <span class="tag">Same</span></h3><p>The change loop, from <code>/explore</code>.</p><details><summary>Details</summary><p>Actor: agent. Action: <code>/explore → /plan → /apply → /save → /ship</code>. Result: a reviewed, shipped change.</p></details></div>
      </div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-request"><h3>A request arrives</h3><p>Research, an errand, a reminder, an answer, or a code change.</p><details><summary>Details</summary><p>Actor: the person. Action: asks. Result: the agent reads it.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-verbs"><h3>Go through the verbs</h3><p><code>/explore → /plan → /apply → /save → /ship</code>, for every request.</p><details><summary>Details</summary><p>Actor: agent. Action: explores, then asks a question round before it plans. Result: an errand gets the same ceremony as a code change.</p></details></div>
    </div></div>
  </div>
  <div class="notes">
    <ol>
      <li>The classification is the only new step. It needs no new file or install field, so every repo gets the same behavior and grows from what it is used for.</li>
      <li>Only plain requests skip the verbs. Code is still planned, reviewed, and shipped. What a plain request teaches goes to the wiki, as the knowledge flow shows.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="wiki-shape" data-kind="tree">
  <p class="caption">The wiki shape every repo can grow. Setup seeds none of the new sections; each appears when the first fact needs it.</p>
  <div class="frame">
    <div class="label">Hub</div>
    <ul>
      <li class="edit" data-mark="changed">wiki/README.md <span class="why">scope is now repeatable knowledge, not only process; links each section when it appears</span> <i class="callout">1</i></li>
    </ul>
    <div class="label">People · grows from use</div>
    <ul>
      <li class="add" data-mark="changed">wiki/people/README.md <span class="why">who is who; created by the first fact about a person</span></li>
      <li class="add" data-mark="changed">wiki/people/&lt;name&gt;.md <span class="why">one per person: git emails, how they like work done</span> <i class="callout">2</i></li>
    </ul>
    <div class="label">Topic pages · grow from use</div>
    <ul>
      <li class="add" data-mark="changed">wiki/&lt;topic&gt;.md <span class="why">how we do X, the product, customers, recurring tasks; created when first needed</span> <i class="callout">3</i></li>
    </ul>
    <div class="label">Development</div>
    <ul>
      <li class="edit">wiki/development/ <span class="why">process pages stay; memory, the change loop, and required tools get edits</span></li>
      <li class="add" data-mark="changed">wiki/development/home.md <span class="why">home as the machine's recorded personal repo, cross-repo memory, private-fact routing, browser logins</span> <i class="callout">4</i></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>The test for a wiki page: will this help with a future task that is not this one? A one-time detail stays in memory or in the change.</li>
      <li>The agent finds the current person by <code>git config user.email</code>. When no page lists that email, it writes a short page. A page can list more than one email.</li>
      <li>One person's preference goes on their page. A rule for everyone goes on a topic page. Different preferences are both kept, each on its own page. Private life goes in home only.</li>
      <li>The format is the same in every repo. Home is only the repo the machine record names; its wiki has no other shape.</li>
    </ol>
  </div>
</section>

<section class="visual flow" id="knowledge-flow" data-kind="flow" data-states="after today">
  <p class="caption">Where a session's knowledge goes in any repo, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="kf-session"><h3>A session runs <span class="tag">Same</span></h3><p>Capture writes facts to this repo's D1 store.</p><details><summary>Details</summary><p>Actor: <code>/save</code> or the background run. Action: writes facts through the write gate. Result: live facts in the repo's store.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-learn" data-mark="changed"><h3>Write the wiki when it learns <span class="tag">New</span> <i class="callout">1</i></h3><p>A repeatable lesson goes to the wiki now, in every repo.</p><details><summary>Details</summary><p>Actor: agent. Action: ingests "read this and remember it", or saves an answer worth keeping. It cites sources by URL and stores no copies. Result: see the two routes below.</p></details></div>
      <p class="flow-connector">↓ Choose one route</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="kf-wiki-only" data-mark="changed"><h3>Wiki-only save <span class="tag">New</span></h3><p>The edit goes straight to <code>main</code>.</p><details><summary>Details</summary><p>Actor: <code>/save</code>. Action: the prose allowlist applies, because the whole diff sits in <code>wiki/**</code>. Result: the lesson is on <code>main</code> with no PR.</p></details></div>
        <div class="flow-branch" data-target-id="kf-in-change" data-mark="changed"><h3>During a change <span class="tag">New</span></h3><p>The edit rides in the change's PR.</p><details><summary>Details</summary><p>Actor: <code>/save</code>. Action: commits the wiki edit with the change. Result: it merges when the change ships.</p></details></div>
      </div>
      <p class="flow-connector">↓ At ship time</p>
      <div class="step flow-card" data-target-id="kf-ship" data-mark="changed"><h3>/ship catches what was missed <span class="tag">Changed</span> <i class="callout">2</i></h3><p>Reads every live fact from the branch's sessions, and places the repeatable ones.</p><details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: <code>memory.mjs search --branch &lt;branch&gt;</code> plus <code>show &lt;slug&gt;</code>. Result: each repeatable fact goes to its page by progressive disclosure, in the ship PR.</p></details></div>
      <p class="flow-connector">↓ Private life, from any repo other than home</p>
      <div class="step flow-card" data-target-id="kf-private" data-mark="changed"><h3>Route private-life facts to home <span class="tag">New</span> <i class="callout">3</i></h3><p>Capture writes them to home's store, never to this repo's store.</p><details><summary>Details</summary><p>Actor: capture. Action: finds home in <code>~/.wong-stack/machine.json</code> and runs <code>memory.mjs put-facts --home</code>. Result: the fact is in home's store. Home offline: the fact waits in the spool. No home recorded: the fact is dropped.</p></details></div>
      <p class="flow-connector">↓ Next session, in any repo on the machine</p>
      <div class="step flow-card" data-target-id="kf-digest"><h3>Load this repo's digest <span class="tag">Same</span></h3><p>Open threads, then live facts, capped as today.</p><details><summary>Details</summary><p>Actor: the <code>SessionStart</code> hook. Action: one query on this repo's store. Result: the usual digest.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-home-digest" data-mark="changed"><h3>Load the person from home <span class="tag">New</span> <i class="callout">4</i></h3><p>The person's <code>people/</code> page from home, and their live <code>user</code> and <code>feedback</code> facts from home's store.</p><details><summary>Details</summary><p>Actor: the <code>SessionStart</code> hook. Action: finds home through the machine record and reads home's store in parallel. Result: a small separate part of the digest. Offline or no home adds one line.</p></details></div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="kf-today-session"><h3>A session runs</h3><p>Capture writes facts to this repo's D1 store.</p><details><summary>Details</summary><p>Actor: <code>/save</code> or the background run. Action: writes facts. Result: all facts stay in this repo's store, private life included.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-today-no-wiki"><h3>No wiki edit mid-task</h3><p>"Don't edit <code>wiki/</code> mid-task" holds the lesson back.</p><details><summary>Details</summary><p>Actor: agent. Action: none. Result: a lesson from a plain request reaches the wiki only if a fact carries it to ship.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-today-ship"><h3>/ship distills</h3><p>Reads only <code>show &lt;change-slug&gt;</code>. Keeps process facts.</p><details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: reads the facts on the change's slug. Result: facts on other slugs from the same sessions never reach the wiki.</p></details></div>
      <p class="flow-connector">↓ Next session</p>
      <div class="step flow-card" data-target-id="kf-today-digest"><h3>Load this repo's digest</h3><p>Only this repo's facts.</p><details><summary>Details</summary><p>Actor: the <code>SessionStart</code> hook. Action: one query. Result: what another repo learned about the person is not loaded.</p></details></div>
    </div></div>
  </div>
  <div class="notes">
    <ol>
      <li>Every repo writes what it learns when it learns it. The block's mid-task rule becomes: write repeatable knowledge when you learn it; a change's specifics stay in its proposal.</li>
      <li>Ship is now the safety net, not the only route. The selection is code, because the branch search already exists; only the placement needs a model.</li>
      <li>A shared store must never hold private life, so capture routes it to home. With no home recorded, there is nowhere safe to keep it.</li>
      <li>The home part is capped at 15 lines and 3 KB of facts, and the page at 4 KB, within the same 1.5 s budget. No new database.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 59310 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-26-add-home-repo</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-26-add-home-repo</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
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
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="request-routing" data-kind="flow" data-states="after today">
  <p class="caption">How the agent routes a request in any repo, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="route-request"><h3>A request arrives <span class="tag">Same</span></h3><p>The person asks for research, an errand, a reminder, an answer, or a code change.</p><details><summary>Details</summary><p>Actor: the person. Action: types or speaks a request. Result: the agent reads it.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="route-classify" data-mark="changed"><h3>Classify the request <span class="tag">New</span> <i class="callout">1</i></h3><p>Is it a plain request, or does it build or change code?</p><details><summary>Details</summary><p>Actor: agent. Action: reads the request. Result: one of two paths. The same rule applies in every repo; there is no mode to read.</p></details></div>
      <p class="flow-connector">↓ Choose one path</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="route-plain" data-mark="changed"><h3>Plain request → do it directly <span class="tag">New</span> <i class="callout">2</i></h3><p>Research, an errand, a reminder, or a question. No verb, no question round.</p><details><summary>Details</summary><p>Actor: agent. Action: does the task and answers. Result: a short reply. Anything repeatable it learned goes to the wiki.</p></details></div>
        <div class="flow-branch" data-target-id="route-code"><h3>Build or change code <span class="tag">Same</span></h3><p>The change loop, from <code>/explore</code>.</p><details><summary>Details</summary><p>Actor: agent. Action: <code>/explore → /plan → /apply → /save → /ship</code>. Result: a reviewed, shipped change.</p></details></div>
      </div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="today-request"><h3>A request arrives</h3><p>Research, an errand, a reminder, an answer, or a code change.</p><details><summary>Details</summary><p>Actor: the person. Action: asks. Result: the agent reads it.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="today-verbs"><h3>Go through the verbs</h3><p><code>/explore → /plan → /apply → /save → /ship</code>, for every request.</p><details><summary>Details</summary><p>Actor: agent. Action: explores, then asks a question round before it plans. Result: an errand gets the same ceremony as a code change.</p></details></div>
    </div></div>
  </div>
  <div class="notes">
    <ol>
      <li>The classification is the only new step. It needs no new file or install field, so every repo gets the same behavior and grows from what it is used for.</li>
      <li>Only plain requests skip the verbs. Code is still planned, reviewed, and shipped. What a plain request teaches goes to the wiki, as the knowledge flow shows.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="wiki-shape" data-kind="tree">
  <p class="caption">The wiki shape every repo can grow. Setup seeds none of the new sections; each appears when the first fact needs it.</p>
  <div class="frame">
    <div class="label">Hub</div>
    <ul>
      <li class="edit" data-mark="changed">wiki/README.md <span class="why">scope is now repeatable knowledge, not only process; links each section when it appears</span> <i class="callout">1</i></li>
    </ul>
    <div class="label">People · grows from use</div>
    <ul>
      <li class="add" data-mark="changed">wiki/people/README.md <span class="why">who is who; created by the first fact about a person</span></li>
      <li class="add" data-mark="changed">wiki/people/&lt;name&gt;.md <span class="why">one per person: git emails, how they like work done</span> <i class="callout">2</i></li>
    </ul>
    <div class="label">Topic pages · grow from use</div>
    <ul>
      <li class="add" data-mark="changed">wiki/&lt;topic&gt;.md <span class="why">how we do X, the product, customers, recurring tasks; created when first needed</span> <i class="callout">3</i></li>
    </ul>
    <div class="label">Development</div>
    <ul>
      <li class="edit">wiki/development/ <span class="why">process pages stay; memory, the change loop, and required tools get edits</span></li>
      <li class="add" data-mark="changed">wiki/development/home.md <span class="why">home as the machine's recorded personal repo, cross-repo memory, private-fact routing, browser logins</span> <i class="callout">4</i></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>The test for a wiki page: will this help with a future task that is not this one? A one-time detail stays in memory or in the change.</li>
      <li>The agent finds the current person by <code>git config user.email</code>. When no page lists that email, it writes a short page. A page can list more than one email.</li>
      <li>One person's preference goes on their page. A rule for everyone goes on a topic page. Different preferences are both kept, each on its own page. Private life goes in home only.</li>
      <li>The format is the same in every repo. Home is only the repo the machine record names; its wiki has no other shape.</li>
    </ol>
  </div>
</section>

<section class="visual flow" id="knowledge-flow" data-kind="flow" data-states="after today">
  <p class="caption">Where a session's knowledge goes in any repo, today and after this change.</p>
  <div class="frame">
    <div class="state state-after"><h2>After</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="kf-session"><h3>A session runs <span class="tag">Same</span></h3><p>Capture writes facts to this repo's D1 store.</p><details><summary>Details</summary><p>Actor: <code>/save</code> or the background run. Action: writes facts through the write gate. Result: live facts in the repo's store.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-learn" data-mark="changed"><h3>Write the wiki when it learns <span class="tag">New</span> <i class="callout">1</i></h3><p>A repeatable lesson goes to the wiki now, in every repo.</p><details><summary>Details</summary><p>Actor: agent. Action: ingests "read this and remember it", or saves an answer worth keeping. It cites sources by URL and stores no copies. Result: see the two routes below.</p></details></div>
      <p class="flow-connector">↓ Choose one route</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="kf-wiki-only" data-mark="changed"><h3>Wiki-only save <span class="tag">New</span></h3><p>The edit goes straight to <code>main</code>.</p><details><summary>Details</summary><p>Actor: <code>/save</code>. Action: the prose allowlist applies, because the whole diff sits in <code>wiki/**</code>. Result: the lesson is on <code>main</code> with no PR.</p></details></div>
        <div class="flow-branch" data-target-id="kf-in-change" data-mark="changed"><h3>During a change <span class="tag">New</span></h3><p>The edit rides in the change's PR.</p><details><summary>Details</summary><p>Actor: <code>/save</code>. Action: commits the wiki edit with the change. Result: it merges when the change ships.</p></details></div>
      </div>
      <p class="flow-connector">↓ At ship time</p>
      <div class="step flow-card" data-target-id="kf-ship" data-mark="changed"><h3>/ship catches what was missed <span class="tag">Changed</span> <i class="callout">2</i></h3><p>Reads every live fact from the branch's sessions, and places the repeatable ones.</p><details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: <code>memory.mjs search --branch &lt;branch&gt;</code> plus <code>show &lt;slug&gt;</code>. Result: each repeatable fact goes to its page by progressive disclosure, in the ship PR.</p></details></div>
      <p class="flow-connector">↓ Private life, from any repo other than home</p>
      <div class="step flow-card" data-target-id="kf-private" data-mark="changed"><h3>Route private-life facts to home <span class="tag">New</span> <i class="callout">3</i></h3><p>Capture writes them to home's store, never to this repo's store.</p><details><summary>Details</summary><p>Actor: capture. Action: finds home in <code>~/.wong-stack/machine.json</code> and runs <code>memory.mjs put-facts --home</code>. Result: the fact is in home's store. Home offline: the fact waits in the spool. No home recorded: the fact is dropped.</p></details></div>
      <p class="flow-connector">↓ Next session, in any repo on the machine</p>
      <div class="step flow-card" data-target-id="kf-digest"><h3>Load this repo's digest <span class="tag">Same</span></h3><p>Open threads, then live facts, capped as today.</p><details><summary>Details</summary><p>Actor: the <code>SessionStart</code> hook. Action: one query on this repo's store. Result: the usual digest.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-home-digest" data-mark="changed"><h3>Load the person from home <span class="tag">New</span> <i class="callout">4</i></h3><p>The person's <code>people/</code> page from home, and their live <code>user</code> and <code>feedback</code> facts from home's store.</p><details><summary>Details</summary><p>Actor: the <code>SessionStart</code> hook. Action: finds home through the machine record and reads home's store in parallel. Result: a small separate part of the digest. Offline or no home adds one line.</p></details></div>
    </div></div>
    <div class="state state-today"><h2>Today</h2><div class="flow-sequence">
      <div class="step flow-card" data-target-id="kf-today-session"><h3>A session runs</h3><p>Capture writes facts to this repo's D1 store.</p><details><summary>Details</summary><p>Actor: <code>/save</code> or the background run. Action: writes facts. Result: all facts stay in this repo's store, private life included.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-today-no-wiki"><h3>No wiki edit mid-task</h3><p>"Don't edit <code>wiki/</code> mid-task" holds the lesson back.</p><details><summary>Details</summary><p>Actor: agent. Action: none. Result: a lesson from a plain request reaches the wiki only if a fact carries it to ship.</p></details></div>
      <p class="flow-connector">↓</p>
      <div class="step flow-card" data-target-id="kf-today-ship"><h3>/ship distills</h3><p>Reads only <code>show &lt;change-slug&gt;</code>. Keeps process facts.</p><details><summary>Details</summary><p>Actor: <code>/ship</code>. Action: reads the facts on the change's slug. Result: facts on other slugs from the same sessions never reach the wiki.</p></details></div>
      <p class="flow-connector">↓ Next session</p>
      <div class="step flow-card" data-target-id="kf-today-digest"><h3>Load this repo's digest</h3><p>Only this repo's facts.</p><details><summary>Details</summary><p>Actor: the <code>SessionStart</code> hook. Action: one query. Result: what another repo learned about the person is not loaded.</p></details></div>
    </div></div>
  </div>
  <div class="notes">
    <ol>
      <li>Every repo writes what it learns when it learns it. The block's mid-task rule becomes: write repeatable knowledge when you learn it; a change's specifics stay in its proposal.</li>
      <li>Ship is now the safety net, not the only route. The selection is code, because the branch search already exists; only the placement needs a model.</li>
      <li>A shared store must never hold private life, so capture routes it to home. With no home recorded, there is nowhere safe to keep it.</li>
      <li>The home part is capped at 15 lines and 3 KB of facts, and the page at 4 KB, within the same 1.5 s budget. No new database.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
