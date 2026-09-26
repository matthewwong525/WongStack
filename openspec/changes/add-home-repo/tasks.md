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
