<!-- openspec-archive v1 2026-09-26-consolidate-and-simplify -->
<!-- file proposal.md utf8 13232 -->
# Consolidate and simplify

**Status:** ready-to-ship
**Branch:** explore/repo-elegance
**Open questions:** none

## Why

The same rules are written in many places, and the copies drift apart. One rule appears in up to ten places, the Cloudflare login token is explained on four pages, and the release notes are ten times longer than anyone reads. Every session pays to read the repeats, and a newcomer meets two versions of one rule. Writing each thing once makes the assistant cheaper to run and easier to trust.

## What Changes

- **Each rule is written once.** The assistant's instructions keep their steps, and a rule they share lives in one place that the others link to. The ship, continue, and apply instructions get about a third shorter. About 2,500 words go.
  ```text
  before                after
  ship ─── rule copy    ship ──┐
  save ─── rule copy    save ──┤
  apply ── rule copy    apply ─┼─▶ one rule
  verify ─ rule copy    verify ┘
  ```
- **The wiki says each thing once.**
  - The Cloudflare login token gets one page.
  - The browser check is written out once.
  - Secrets live on the secrets page.
  - The main process page links out instead of repeating other pages.
  - About 3,000 words go.
- **The planning records match what ships.**
  - Two records fold into the ones they belong to.
  - Mentions of removed features are fixed: the old notes folder, the old memory Worker, and command names that no longer exist.
  - Two records that only described a one-time past move are removed.
  ```text
  specs/
  ├─ memory-store   ◀── memory-worker
  ├─ memory-capture ◀── session-notes
  ├─ delivery-gate    (stale names fixed)
  └─ 48 others
  ```
- **The old release notes move to history.** Notes before 19.0.0 are about 27,000 words, and updates never read them. One line now points to git, which still has them.
  ```text
  CHANGELOG.md
  ├─ 23.2.1 … 19.0.0   kept
  └─ 18.1.0 … 1.0.0    ─▶ 1 line: see git
  ```
- **Less repeated code.** Tests share one way to set up a throwaway repo. The deploy and preview scripts share their common steps. An unused test file goes.
- **Old names get caught.** A new check keeps a list of things that were removed or renamed. When any live file names one, the check fails and says what replaced it, so this cleanup does not quietly undo itself. Removing something from now on means adding its old name to the list.
  ```text
  change ──▶ checks ──▶ names a
                        removed thing?
                    no ─┴─ yes
                   pass    fail: "notes/
                           is gone; use
                           memory"
  ```

**Non-goals:** Nothing you use changes: every command, setup, deploy, and preview works as before. No command merges or goes away. Code where sharing would change an error message or an edge case stays as it is: finding the main checkout, the config lookup, option parsing, and the old `gh` fallback. The archive is not rewritten.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payload-checks`: Gains a retired-names check that fails on a removed name in a live file.
- `payload-single-source`: The generated-surface example names `openspec init --tools none`, not the removed `.claude/commands/opsx/`.
- `memory-store`: Gains the memory Worker requirements from `memory-worker`, unchanged. Its access requirement drops the reference to the removed capability.
- `memory-worker`: Removed; every requirement moves to `memory-store`.
- `memory-capture`: Gains the session-capture requirements from `session-notes`, unchanged.
- `session-notes`: Removed. Its capture requirements move to `memory-capture`, and its prose-save rule merges into `delivery-gate`.
- `delivery-gate`: Stale names are fixed: `openspec-archive-change`, the `walk` skill, and session notes. The prose-save rule takes the protected-branch fallback and the prose-only report from `session-notes`.
- `cloudflare-provisioning`: The memory provisioning requirement cites `memory-store`.
- `apply-completion-handoff`: Drops the removed `openspec-apply-change` and `/opsx:apply` surfaces.
- `install-onboarding`: Drops the one-time `install-wong-stack` removal requirement.
- `wiki-root`: Drops the one-time `docs/` → `wiki/` rename release requirement.
- `open-source-release`: `SECURITY.md` names the memory key, not a memory token.
- `staging-walkthrough`: The save-order requirement's title matches its body, and the verdict requirement states that `/ship` asks the user on `FAILURE`.
- `ux-wireframes`: The review-page requirement's title matches its body, and the older-page refresh is dropped, because 19.0.0 removed it.

## Impact

- **Skills:** `ship`, `continue`, `apply`, `explore`, `plan`, `save` (with `references/git-gate.md`, `named-secrets.md`, `prose-save.md`, `mini-app-save.md`, `preconditions.md`; `archived-save.md` and `spec-sync.md` fold in and are deleted), `plan/references/openspec-cli.md` and `new-plan.md`, `verify`, `memory`, `update-dependencies`, `improve`, `wong-setup/references/cloudflare.md` and `permission-groups.md`, `wong-sync/references/payload-manifest.md` and `payload-files.json`.
- **Rules:** `.agents/rules/openspec.md`, `.agents/rules/payload.md`.
- **Wiki:** `development/{the-change-loop,staging-walkthrough,memory,secrets,repo-layout,adding-a-skill}.md`, `stack/{d1-pipeline,cloudflare-access,cloudflare-credentials}.md`, and `README.md`.
- **Specs:** 14 capabilities (above). `openspec/specs/memory-worker/` and `openspec/specs/session-notes/` are deleted.
- **Code:** `scripts/lib-wrangler-config.sh`, `scripts/cf-{deploy,preview,build}.sh`, a new `scripts/check-retired-names.mjs` with `scripts/retired-names.json` and its test, `.github/workflows/payload.yml`, `.github/CONTRIBUTING.md`, `.agents/rules/payload.md`, a new `scripts/tests/fixtures/pack.mjs`, and `scripts/tests/{cf-deploy,wrangler-config,mini-apps,cf-secrets}.test.mjs`. `scripts/tests/fixtures/openspec-apply-change/` is deleted.
- **Release:** `VERSION` 24.0.2 → 24.0.3, and a `CHANGELOG.md` entry; entries before 19.0.0 are replaced by one line.

## Decision log

- **2026-09-26** — Asked how far the cleanup goes → chose **words plus safe code**: skills, wiki, specs, and release notes, plus the unused fixture, shared test setup, and the deploy scripts' shared blocks.
- **2026-09-26** — Asked whether the release notes before 19.0.0 go → chose **replace them with one line** that points to git history.
- **2026-09-26** — Asked whether to ship one release or several → chose **one release**.
- **2026-09-26** — Assumed: every command stays; no skill merges or is deleted, because the audit found each skill's steps distinct and only its prose repeated.
- **2026-09-26** — Assumed: the release is a patch, 23.2.1, because no behavior a user or target repo sees changes.
- **2026-09-26** — Assumed: the main-checkout lookup, the wrangler config lookup, skill-script option parsing, and the old-`gh` fallback in `wait-for-checks.sh` stay, because unifying them changes error wording or edge cases.
- **2026-09-26** — Assumed: `scripts/measure-usage.mjs` stays, because it is a maintainer's cost tool with a test, not dead code.
- **2026-09-26** — Assumed: moved requirements keep their text word for word, and specs are only fixed where stale or self-contradictory. Rewriting working specs to be shorter would churn the behavior contract without changing behavior.
- **2026-09-26** — Assumed: `memory-worker`'s move requirement for older installs stays, now in `memory-store`, because `/wong-sync` still performs that move.
- **2026-09-26** — Assumed: `improve`'s two small references stay separate, because merging saves about 40 words.
- **2026-09-26** — Assumed: the server setup's Node 24 against `.nvmrc`'s 22 is left for a later change, because it changes behavior.
- **2026-09-26** — Refreshed on main at 24.0.2 (`47385c9`). 24.0.0 moved mini apps into the app's Worker: `cf-mini.sh` became `cf-preview.sh`, and `deploy.yml` now publishes one preview, so the shared-publish-step item is dropped. 24.0.2 already wrote the `delivery-gate` and `secrets-convention` Purposes, so that task is dropped. The deltas were regenerated from the current live specs, and the release is now 24.0.3.
- **2026-09-26** — Asked how to keep specs and docs from drifting after this cleanup → chose **add a retired-names check** to this change. A scheduled `/improve` run was offered and not chosen.
- **2026-09-26** — Assumed: the retired-names check is meta-repo only, like `check-openspec-config.mjs`, because its list names WongStack's own removed features, which mean nothing in a target.
- **2026-09-26** — Assumed: each list entry carries the replacement and the files allowed to keep naming it, because some mentions are correct: a spec that says a removed command must stay gone, or a migration step for older installs.
- **2026-09-26** — Changed during apply: `memory/SKILL.md`'s "Background run" section stays in the skill, because `memory/scripts/run.mjs` builds the background run's prompt from that exact section and `session-start.mjs` points at it; moving it would change code for about 400 words. The default-branch rule stays in `git-gate.md#the-default-branch`, its existing owner. `new-plan.md` is under `save/references/`.
- **2026-09-26** — Changed during apply: the `.dev.vars` and secret-parity text stays whole in `wiki/stack/d1-pipeline.md` as its one owner, because four files link its anchor and `wiki/development/secrets.md` is a measured owner; `secrets.md` and `cloudflare-credentials.md` link it. The staging-is-not-production check stays in each script, because its messages differ in wording, not only prefix. `wong_ci_branch` is shared by `cf-deploy.sh` and `cf-build.sh`. `cf-deploy.test.mjs` folded into `wrangler-config.test.mjs`; its one duplicate test merged with the stricter assertions kept.
- **2026-09-26** — Changed during apply: the retired-names check found one more stale name the plan missed, the `walk` skill in `staging-walkthrough`'s "The walkthrough is a user-invoked verb", so that requirement gained a MODIFIED delta. The change sets OpenSpec's `retire_capabilities: true`, so archive syncs the deltas and deletes the emptied `memory-worker` and `session-notes` specs itself; a scratch archive confirmed it (48 specs, all strict-valid, no retired name left). The renamed `#the-memory-token` anchor was repointed in `store.mjs`, its test, `SECURITY.md`, `required-tools.md`, and `stack-pack-fragments.md`, and joined the list with `archived-save.md` and `spec-sync.md`.
- **2026-09-26** — Measured: `.agents/skills` Markdown 30,670 → 29,424 words, `wiki/` 30,521 → 28,794, `README.md` 1,603 → 1,558, `CHANGELOG.md` 31,590 → 4,214. `measure-context.mjs`: instruction words 15,744 → 14,744 on this change (18,812 baseline), owner words 10,381 → 9,116. The skill and wiki cuts are about half the plan's estimate, because owners absorbed the facts only they lacked. `node --test scripts/tests/*.test.mjs`: 259 pass, 2 skipped, 0 fail. Links, OpenSpec config, and `measure-context --check` pass.
- **2026-09-26** — Distilled facts before the archive: two repeatable OpenSpec lessons from this change went into `.agents/skills/plan/references/openspec-cli.md` (drop a scenario by REMOVED plus ADDED; retire a capability with `retire_capabilities: true`), the page that owns CLI mechanics. The other facts are open threads, kept in memory.
- **2026-09-26** — Archived and saved for CI in one checkpoint on `explore/repo-elegance`; archive synced the deltas and retired `memory-worker` and `session-notes` (48 specs, all strict-valid).
- **2026-09-27** — Merged main at 25.1.0 (`4f34ee7`) before publishing, so the release is renumbered 25.1.1. 25.0.0 changed how `/apply` completes (a host preview, no `/save`) and removed the mini-app save route. Conflicts resolved as the union of intent: `apply-completion-handoff` takes main's "Completed apply ends with a preview from the agent host", which supersedes this change's "Completed apply checkpoints through save"; `delivery-gate` keeps this change's stale-name fixes without the mini-app pull-request sentence main removed; `the-change-loop.md`, `apply`, and `ship` keep this change's shorter wording with main's new behavior. `save/references/mini-app-save.md` stays deleted, and it and `mini-app-push.sh` join `scripts/retired-names.json`. After the merge: 260 tests pass, 2 skipped; links, OpenSpec config, retired names, strict spec validation (48 specs), and `measure-context --check` pass; instruction words 18,812 → 14,178 against the baseline.
- **2026-09-27** — The first merge attempt was refused: main moved to 25.2.0 (`f0daa30`, the review page on a phone). Merged it; the release is now 25.2.1. `ux-wireframes` keeps main's new keyboard scenario and this change's renamed requirement and "Every page uses the current kit". Checks pass again: 260 tests, links, OpenSpec config, retired names, 48 strict-valid specs, and `measure-context --check`. The preview walk on `6847074` was SUCCESS (`/_memory/` answers 404 on the preview).

<!-- end proposal.md -->
<!-- file design.md utf8 10363 -->
## Context

A read-only audit of the payload (skills, rules, wiki, specs, scripts) found three kinds of weight:

- **Restated rules.** The git boundary is written in about ten places, and the credential exclusion in five. The same loop line appears word for word in `apply`, `explore`, and `continue`. `explore/SKILL.md:19` keeps a second copy of the ask shape, which `rules/payload.md` forbids.
- **Stale text.**
  - Specs still name `notes/`, the separate memory Worker, `openspec-archive-change`, `/opsx:apply`, and the `walk` skill.
  - `new-plan.md:9` still lists browser checks and critique, which `/plan` no longer runs.
- **History nobody reads.** `CHANGELOG.md` lines 151–2262 (18.1.0 down to 1.0.0) are about 27,400 of its 31,000 words. `/wong-sync` reads only entries newer than the installed version, and installs before 19.0.0 are unsupported (`CHANGELOG.md:127`). `check-payload-links.mjs` checks only the newest entry.

`rules/payload.md` makes this a release: a `VERSION` bump, a `CHANGELOG.md` entry, and clean runs of `check-payload-links.mjs` and `check-openspec-config.mjs`.

## Goals / Non-Goals

**Goals:**
- Each rule has one owning file; every other mention is one line and a link.
- Specs describe what ships, and have no removed names or contradictions between capabilities.
- Test setup and deploy-script blocks that are copied today have one copy.

**Non-Goals:**
- No behavior change a user or target repo sees. No skill is merged or removed.
- These stay as they are:
  - the primary-checkout lookup (five copies in four styles)
  - `lib-wrangler-config.sh` against `.mjs` config lookup
  - `node:util parseArgs` adoption
  - the old-`gh` fallback in `wait-for-checks.sh`
- No rewrite of a working spec for length alone.
- No edit under `openspec/changes/archive/`.

## Decisions

### Owners for restated rules

| Rule | Owner | Copies to cut to a link |
|---|---|---|
| Git boundary (skills own git, OpenSpec never runs it) | `wiki/development/the-change-loop.md` | `rules/openspec.md:9`, `continue:15`, `apply:70`, `save:9`, `verify:28`, `update-dependencies:25`, `openspec-cli.md:49` |
| The verb loop line | `AGENTS.md` block | `apply:11`, `explore:11`, `continue:11` (delete) |
| Pull-in, "never merge to stop", gate ladder | `the-change-loop.md` | `ship:9-11`, `ship:32-44`, `apply:68-76`, `continue:9-17,100-105` |
| Ask shape and tool order | `explore/references/asking-the-user.md` | `explore:19`, `explore:44-48`; `plan:15` becomes one sentence and a link |
| "Should it be code?" | `plan/SKILL.md` | `explore:72-74` |
| `validate` / `archive` / `--skip-specs` | `plan/references/openspec-cli.md` | `ship:58`; `save/references/spec-sync.md` folds into `openspec-cli.md` |
| Credential exclusion | `save/SKILL.md:15` | `named-secrets.md:13`, `prose-save.md:5`, `mini-app-save.md:5`, `git-gate.md:30,39` |
| `UNKNOWN` is not `NONE` | `save/references/git-gate.md` | `verify:95`, `wiki/development/staging-walkthrough.md:121` |
| Default-branch sentence | `save/references/preconditions.md` | `save:27`, `ship:13`, `continue:15`, `improve:15` |
| Store unreachable → say so, continue | `memory/SKILL.md:28` | `explore:42`, `continue:43,80`, `ship:70` |
| Private-life facts | `memory/references/writing-facts.md` | `memory:59,74`, `wiki/development/memory.md:28` |
| Widen is pre-authorized | `wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized` | `wong-setup/references/cloudflare.md:28,92,240-255`, `permission-groups.md:17` |
| Mini-app flow | `wiki/stack/mini-apps.md` | `the-change-loop.md:84-86,145-155` (two lines remain) |
| Access service token | `wiki/stack/cloudflare-access.md` | `cloudflare-credentials.md:104-135`, `staging-walkthrough.md:49-62` |
| Walk mechanics | `verify/references/walkthrough.md` | `wiki/development/staging-walkthrough.md:17-35,66-137` (the page keeps only the reasons) |
| `.dev.vars` and secret parity | `wiki/development/secrets.md` | `wiki/stack/d1-pipeline.md:190-243`, `cloudflare-credentials.md:136-150` |

Also:

- `save/references/archived-save.md` folds its roughly 40 unique words into `save`'s route table and is deleted.
- `memory/SKILL.md`'s background-run section (`:65-81`) moves to `memory/references/background-run.md`, because only the hook needs it.
- `ship`'s report section (`:114-127`) says "print `merge.sh`'s lines plus checkpoint, walk, and secrets" instead of listing each line.
- `payload-manifest.md:20-36` keeps the classification rules; the routing stays in `wong-sync/SKILL.md`.
- `README.md:95-106` becomes a short list and a link to `required-tools.md`.

Every deleted or added reference is updated in `wong-sync/payload-files.json` and the payload manifest.

**Alternative rejected:** merging `continue` into `apply`, or `save` into `ship`. Each keeps distinct steps, and the audit found only their prose repeated.

### Specs: move word for word, fix only what is stale

- `memory-worker`'s five requirements move to `memory-store`, and `session-notes`' capture requirements move to `memory-capture`, unchanged. This keeps the behavior contract identical, and one capability per topic.
- `session-notes`' prose-save rule merges into `delivery-gate`, which already owned the allowlist. Its two scenarios that `delivery-gate` lacked (protected-branch fallback, the report without a PR link) move with it.
- OpenSpec refuses a MODIFIED block that drops a scenario. Where a stale scenario must go, the requirement is REMOVED and ADDED under a new name: `apply-completion-handoff`'s "Completed apply checkpoints through save" and `ux-wireframes`' "Every page uses the current kit".
- `memory-worker` and `session-notes` lose every requirement, so the change sets OpenSpec's `retire_capabilities: true` marker. `openspec archive` then syncs the deltas and deletes both emptied specs itself, and refuses if either holds content the merge can not account for.

### CHANGELOG cut

Keep every entry from 19.0.0 upward. Replace 18.1.0…1.0.0 with one line, in this form:

    Entries before 19.0.0: `git show <sha>:CHANGELOG.md`

`<sha>` is the last commit before this change, so the full history stays one command away. The duplicate `16.7.0` headings go with the cut.

### Code

- **`scripts/tests/fixtures/pack.mjs`**
  - It owns the throwaway pack repo: copy the scripts, write a wrangler config, add a fake `npx` that logs its calls, then run and read the log. It is modeled on `fixtures/memory/harness.mjs`.
  - `cf-deploy.test.mjs`, `wrangler-config.test.mjs`, `mini-apps.test.mjs`, and `cf-secrets.test.mjs` import it.
  - `cf-deploy.test.mjs` folds into `wrangler-config.test.mjs`. Its staging-resolves-to-production case duplicates `wrangler-config.test.mjs:117`.
- **`scripts/lib-wrangler-config.sh`** gains the blocks that `cf-deploy.sh` and `cf-preview.sh` copy:
  - the preview alias rule (`cf-deploy.sh:96-106`, `cf-preview.sh:50-58`, whose comment says "keep the two in step")
  - the preview URL extraction from the upload log (`cf-deploy.sh:177-180`, `cf-preview.sh:171-174`)
  - the staging-is-not-production Worker check (`cf-deploy.sh:137-148`, `cf-preview.sh:~95-105`)

  `cf-build.sh` shares the branch setup where it matches. Each script keeps its exit codes and messages, and the library already ships beside the scripts.
- **`scripts/tests/fixtures/openspec-apply-change/`** is deleted. No test has read it since commit `58ad225`.

### The retired-names check

- **`scripts/retired-names.json`** lists entries of `{ "name", "replacement", "allow": [paths] }`. The name is matched as a literal string.
- **`scripts/check-retired-names.mjs`** runs `git ls-files` and skips `CHANGELOG.md`, `openspec/changes/**`, and the list itself. It prints `file:line: <name> — retired; use <replacement>` for each hit outside `allow`, and exits 1 on any hit. It uses Node built-ins only and follows the `scripts/lib-cli.mjs` convention.
- **CI and docs.** It runs in `payload.yml`'s release checks, beside `check-openspec-config.mjs`. `CONTRIBUTING.md` lists it. `.agents/rules/payload.md` gains one bullet: removing or renaming a payload feature adds its old name to the list.
- **Meta-only.** Neither file is in `payload-files.json`.
- **Seed list.** Each name is checked against the tree after this change's cleanup. It either gets no hits or an allowed path with a reason:
  - `openspec-apply-change`, `openspec-archive-change`, `/opsx:`, `session-notes`, `install-wong-stack`, `.wong-framework.json`, `cf-mini.sh`, `<repo>-mini`, `wong-memory-keys`, and the `walk` skill.
  - Allowed today, pending review: `openspec-cli.md:3` and `openspec-cli-workflow` (both say no `/opsx:*` command is needed), `wong-sync` spec `:77` (a scenario for an old install record), and `wong-setup/references/cloudflare.md:161-164` with `stack-pack` spec `:537` (moving older mini apps). `payload-single-source` spec `:97` still calls `.claude/commands/opsx/` live; this change's delta fixes it rather than allowing it.
  - Names that are also live code identifiers stay off the list: `memory-worker` is `memory/worker/memory-worker.mjs`, and `wong-memory` is a temp-folder prefix. A plain `notes/` is too broad for a literal match.

**Alternative rejected:** a scheduled `/improve` run. It catches drift a word list cannot, but it costs a model run every time and runs after the drift lands. The user chose the list.

## Risks / Trade-offs

- **A trim drops a rule instead of moving it** → The owner table is the checklist. Each cut copy is checked against its owner before it goes, and `check-payload-links.mjs` catches a broken link.
- **A shell refactor changes deploy behavior** → The existing tests in `wrangler-config.test.mjs` and `mini-apps.test.mjs` already assert the alias rule and the staging guard. CI runs the full suite and deploys a preview through the changed scripts before merge.
- **A cut to `CHANGELOG.md` hides history** → git keeps every entry, and the pointer line names the exact command.
- **The list blocks a legitimate mention** → the failure names the entry, so the author either rewords or adds the path to `allow` with a reason, in the same change.
- **Skill instructions get shorter, so a model may miss a rule it used to see inline** → Each link is placed at the step where the rule applies, not in a list at the end. `scripts/measure-context.mjs` records the before and after counts in the Decision log.

<!-- end design.md -->
<!-- file tasks.md utf8 5787 -->
## 1. Skills and rules

- [x] 1.1 Record the before counts: run `node scripts/measure-context.mjs` and note instruction and owner words in the Decision log
- [x] 1.2 Trim `ship/SKILL.md`: link the change loop for the pull-in and gate (`:9-11`, `:32-44`), link `openspec-cli.md` for validate/archive (`:58`), shorten the report to `merge.sh`'s lines plus checkpoint, walk, and secrets (`:114-127`)
- [x] 1.3 Trim `continue/SKILL.md` (`:9-17`, `:31`/`:78` status list, `:100-105`) and move pasted-review handling (`:96`) to `plan/SKILL.md`
- [x] 1.4 Trim `apply/SKILL.md` Boundaries (`:68-76`) to about 90 words, and delete the loop line from `apply`, `explore`, and `continue`
- [x] 1.5 Trim `explore/SKILL.md`: remove the ask-shape copy (`:19`, `:44-48`), the "should it be code" section (`:72-74`, owned by `plan`), and the restated CLI contract (`:76-78`). Cut `plan/SKILL.md:15` to one sentence and a link
- [x] 1.6 Replace the git-boundary copies with a link, per the design's owner table (`rules/openspec.md`, `continue`, `apply`, `save`, `verify`, `update-dependencies`, `openspec-cli.md`)
- [x] 1.7 `save` references:
  - Cut the credential-exclusion copies in `named-secrets.md`, `prose-save.md`, `mini-app-save.md`, and `git-gate.md` to a link to `save/SKILL.md`.
  - Trim `git-gate.md:78-88`.
  - Keep the default-branch rule in `git-gate.md#the-default-branch`, its existing owner, and link it.
  - Fold `archived-save.md` into `save/SKILL.md`, and `spec-sync.md` into `plan/references/openspec-cli.md`, then delete both files.
- [x] 1.8 Delete the stale "browser checks, critique, and revision" phrase in `save/references/new-plan.md:9`
- [x] 1.9 `memory`: link the owner for the private-life rule and for store-unreachable handling (`explore`, `continue`, `ship`)
- [x] 1.10 `verify/SKILL.md:83-102`: keep the verdict meanings and link `git-gate.md` for `UNKNOWN` vs `NONE`
- [x] 1.11 `wong-setup/references/cloudflare.md`: delete the Hard rules (`:240-255`) and the widen restatements (`:28`, `:92`, `permission-groups.md:17`) in favor of a link to the credentials page
- [x] 1.12 `wong-sync/references/payload-manifest.md:20-36`: keep the classification rules and link the routing in `wong-sync/SKILL.md`. Update `payload-files.json` and the manifest for every added or deleted reference

## 2. Wiki

- [x] 2.1 `development/the-change-loop.md`: replace `:51-71`, the mini-app passages (`:84-86`, `:145-155`), and `:167` with short links to their owners
- [x] 2.2 `development/staging-walkthrough.md`: keep only the reasons (SPA fallback, "What it is not", "Why this engine"), and link `verify/references/walkthrough.md`, `required-tools.md`, and `stack/cloudflare-access.md` for the rest
- [x] 2.3 `stack/cloudflare-access.md` owns the Access service token: cut `stack/cloudflare-credentials.md:104-135` to a link
- [x] 2.4 Move `stack/d1-pipeline.md:190-243` (`.dev.vars` and secret parity) into `development/secrets.md`, and cut `cloudflare-credentials.md:136-150` to a link
- [x] 2.5 `stack/cloudflare-credentials.md`:
  - Cut the widen section `:74-102` to the standing authorization and the trade-off, plus a link to `permission-groups.md`.
  - Fix `:82`: memory uses a key, not a minted token.
- [x] 2.6 Fix stale wording:
  - Rename the `development/memory.md:36` heading "The memory token" to "The memory key".
  - Change `.claude/` links in `the-change-loop.md:179` and `adding-a-skill.md:3,7` to `.agents/`, per `repo-layout.md`.
- [x] 2.7 `README.md:95-106`: a short list and a link to `wiki/development/required-tools.md`

## 3. Specs

- [x] 3.1 Set `retire_capabilities: true` in `.openspec.yaml`, so `openspec archive` syncs the deltas and deletes the emptied `memory-worker` and `session-notes` specs itself
- [x] 3.2 Grep live specs, skills, and wiki for the `memory-worker` and `session-notes` capability names, and point each hit at `memory-store` or `memory-capture`
- [x] 3.3 Check that no skill or wiki page still offers `/opsx:*` or an `openspec-*` skill, per the `payload-single-source` delta

## 4. Code

- [x] 4.1 Delete `scripts/tests/fixtures/openspec-apply-change/`
- [x] 4.2 Add `scripts/tests/fixtures/pack.mjs`, move the throwaway-repo setup of `wrangler-config.test.mjs`, `mini-apps.test.mjs`, and `cf-secrets.test.mjs` onto it, and fold `cf-deploy.test.mjs` into `wrangler-config.test.mjs`. Every existing assertion is kept
- [x] 4.3 Move the shared blocks of `cf-deploy.sh` and `cf-preview.sh` into `scripts/lib-wrangler-config.sh`: the preview alias rule, preview URL extraction, and staging-is-not-production check. Share `cf-build.sh`'s branch setup where it matches. Exit codes and messages stay the same
- [x] 4.4 Add `scripts/check-retired-names.mjs` and `scripts/retired-names.json` with the seed list from the design, and a test covering a hit, an allowed path, the history exemptions, and `--help`. Run it in `payload.yml`'s release checks, list it in `.github/CONTRIBUTING.md`, and add the "retire the old name" bullet to `.agents/rules/payload.md`. Keep both files out of `payload-files.json`
- [x] 4.5 Run `node --test scripts/tests/*.test.mjs` for the pack and fixture tests. CI runs the full suite and deploys a preview through the changed scripts on `/save`

## 5. Release

- [x] 5.1 `CHANGELOG.md`: replace entries 18.1.0…1.0.0 with one line naming `git show <sha>:CHANGELOG.md`, and add the 24.0.3 entry
- [x] 5.2 Bump `VERSION` to 24.0.3
- [x] 5.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict`, and `node scripts/measure-context.mjs`, and record the after counts in the Decision log
- [x] 5.4 `openspec validate consolidate-and-simplify --strict --no-interactive`, then `/save` for CI and the preview

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 2644 -->
## REMOVED Requirements

### Requirement: Completed apply automatically checkpoints

**Reason**: It named `openspec-apply-change` and `/opsx:apply`, which 19.0.0 removed.
**Migration**: Replaced by "Completed apply checkpoints through save", the same rule without the removed surfaces.

## ADDED Requirements

### Requirement: Completed apply checkpoints through save

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete, except in two cases. When `/ship` invoked `/apply`, `/apply` SHALL return to `/ship` without invoking `/save`, because `/ship`'s archive checkpoint is the one save of that run. When the work changes no repo file, `/apply` SHALL report the result and SHALL NOT invoke `/save`, as `work-verbs` defines. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

This SHALL hold for **every payload surface that fronts the apply step**, including `.claude/skills/apply/SKILL.md` and every page that links it. No surface SHALL describe a completion path that ends in anything other than these outcomes — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete
- **THEN** it invokes `/save` for the completed change
- **AND** it reports completion using the checkpoint result from `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it invokes `/save` so any completed but uncheckpointed work receives the normal durable handoff

#### Scenario: No surface suggests archiving

- **WHEN** a reader follows any payload surface that describes finishing `/apply`
- **THEN** it ends in `/save`, a return to `/ship`, or a non-code report
- **AND** none suggests archiving as the completion step

#### Scenario: A surface references a command that does not exist

- **WHEN** a payload surface directs the user to a command
- **THEN** that command exists in the payload

#### Scenario: Ship pulled apply in

- **WHEN** `/ship` invoked `/apply` and the final task completes
- **THEN** `/apply` returns to `/ship` without invoking `/save`

#### Scenario: Non-code work completes

- **WHEN** `/apply` finishes a to-do that changed no repo file
- **THEN** it reports the result and does not invoke `/save`

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 3127 -->
## MODIFIED Requirements

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, bind them in the production part of the app's wrangler config as `MEMORY_DB` and `MEMORY_BUCKET`, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-store` requires. It SHALL NOT bind them in `env.staging`. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the production Worker's memory URL under `components.memory` in `.claude/.wong-stack.json`. It SHALL NOT deploy a separate memory Worker. It SHALL check the digest through the Worker once production has deployed, as part of the smoke test. A run that finds the store already provisioned SHALL change nothing. Creating the key is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket, bind it in the production config, and give the `<repo>-deploy` token `Workers R2 Storage Write`; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the app's production Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: The memory store is bound in production only

- **WHEN** provisioning writes the app's wrangler config
- **THEN** the top level binds `MEMORY_DB`, and `MEMORY_BUCKET` when R2 is enabled
- **AND** `env.staging` binds neither, and no `wong-memory` Worker is created

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, binds it in the production config, gives the deploy token R2 access, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, its bindings, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 10340 -->
## MODIFIED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, archive the change with `openspec archive`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, fact capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag. A mini-app pull request has no change to archive: `/ship` SHALL instead invoke `/save` once in its mini-app pull-request form, as `mini-apps` defines, and SHALL NOT walk it.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/verify` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/verify`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

The walk step SHALL check that the `verify` skill is present before invoking it. When the skill is absent, `/ship` SHALL report the walk as unavailable in one line and continue to the merge, consistent with the gate ladder's rule that a rung the repo lacks is skipped rather than failed. `/ship` SHALL NOT install, copy, or offer the skill to repair its absence.

Before deleting the merged branch from the remote, `/ship` SHALL find every open pull request that targets that branch as its base and retarget each to the default branch. Only then SHALL the branch be deleted, and the ship report SHALL name any pull request it retargeted. Deleting a base branch that an open pull request still targets closes that pull request, and the loss is unrecoverable: the forge will neither reopen a pull request whose base branch is gone nor retarget a closed one. `/ship` SHALL NOT rely on the forge retargeting dependents on its own, because that is a race with no completion signal. The merge, retarget, delete, and checkout sync SHALL run as one deterministic script.

When the forge deletes the head branch itself at merge, `/ship` SHALL still retarget every open pull request that targets the branch. It SHALL then check whether the remote still has the branch, and delete it only when it does. A branch that is already gone SHALL NOT be reported as an error; the ship report SHALL say that the forge deleted it at merge. When `/ship` cannot tell whether the branch exists, because the remote query itself fails, it SHALL stop and report that failure as for any other delete failure.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation and any safe example declaration land in the pushed checkpoint
- **AND** the commit tested by the resulting CI run is the commit `/ship` will merge

#### Scenario: Save recognizes the archived branch change

- **WHEN** `/save` runs for `/ship` after `openspec/changes/<name>/` moved into the archive
- **THEN** it resolves and mirrors the single archived record matching the current branch
- **AND** it does not invoke fallback planning or create a new active `openspec/changes/<name>/`

#### Scenario: Save returns a mergeable gate result

- **WHEN** the delegated save finishes with `SUCCESS` or `NONE`
- **THEN** `/ship` proceeds through the walk evidence step and, absent a walk `FAILURE`, merges without reopening the PR or waiting on the same checks itself

#### Scenario: Save returns an unmergeable result

- **WHEN** the delegated ordinary save returns `UNKNOWN`, `TIMEOUT`, or a checkpoint failure
- **THEN** `/ship` stops before merge and reports that result
- **AND** it does not bypass, repeat, or reinterpret the gate

#### Scenario: A failed ship-time walk pauses for the user

- **WHEN** the ship-time walk returns `FAILURE` with its fix attempts exhausted
- **THEN** `/ship` stops before merging, presents the evidence, and asks whether to fix or merge anyway
- **AND** merging anyway remains available and is recorded in the report

#### Scenario: An unrunnable ship-time walk never blocks

- **WHEN** the ship-time walk returns `UNKNOWN` or `TIMEOUT`
- **THEN** `/ship` reports the walk as unverified and merges on the save-gate result alone

#### Scenario: The walk skill is not present

- **WHEN** `/ship` reaches the walk step in a repo that does not have the `verify` skill
- **THEN** it reports the walk as unavailable in one line and proceeds to the merge
- **AND** it does not install, copy, or offer the skill

#### Scenario: A dependent pull request is retargeted before deletion

- **WHEN** `/ship` merges a branch that one open pull request uses as its base
- **THEN** that pull request is retargeted to the default branch before the branch is deleted
- **AND** the ship report names the retargeted pull request

#### Scenario: No dependent pull request exists

- **WHEN** `/ship` merges a branch that no open pull request targets
- **THEN** the branch is deleted directly with no retargeting step

#### Scenario: The forge already deleted the branch at merge

- **WHEN** `/ship` merges a pull request in a repository that deletes head branches on merge
- **THEN** it retargets any open pull request that still targets the branch, skips the delete, and prints no error
- **AND** the ship report says the branch was deleted at merge

#### Scenario: A mini-app pull request

- **WHEN** `/ship` merges a mini-app pull request
- **THEN** it archives nothing, runs one `/save` in its mini-app form, runs no walk, and merges on that save's result

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Prose exception.** A `/save` whose entire diff falls inside the **prose allowlist** SHALL bypass the branch-and-PR gate and commit directly to the default branch. The allowlist is exactly one path prefix: `wiki/**`. The carve-out is decided by **path scope only** — never by file extension, and never by a judgment of how consequential the edit is. It is exact: if any path outside the allowlist appears in the diff, the normal branch + PR flow applies in full to the whole save.

Routing SHALL NOT key on file extension. Markdown outside the allowlist — `.claude/**` (the shipped payload, whose edit is a release), `openspec/**` (the specs), `AGENTS.md`/`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and any config file — keeps the full gate.

The gate is not weakened by this. A wiki page is prose reviewed in the diff that produced it, and nothing in it executes, deploys, or changes what the tooling does. Session facts are not in the repository, so they need no route.

A prose-only save SHALL report the changed prose paths and that they landed on the default branch, and SHALL omit the PR, CI, and preview sections rather than report them as missing. If the direct push is rejected (protected default branch, required reviews, non-fast-forward), `/save` SHALL NOT force or retry; it SHALL fall back to the normal branch + PR flow and say why.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Wiki-only save bypasses the gate

- **WHEN** `/save` runs and every changed path is under `wiki/`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-allowlisted path restores the gate

- **WHEN** a save's diff contains `wiki/<page>.md` plus any path outside the allowlist
- **THEN** the normal branch + PR flow applies and the prose rides along on that branch

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and its only output is facts
- **THEN** the facts go to the memory store, and no commit, PR, or `/ship` is involved

#### Scenario: A leftover notes file keeps the gate

- **WHEN** a save's diff contains a path under `notes/`
- **THEN** the normal branch + PR flow applies, because `notes/**` is not in the allowlist

#### Scenario: Markdown payload keeps the gate

- **WHEN** a save's diff touches `.claude/skills/save/SKILL.md`, `CLAUDE.md`, or `openspec/changes/<name>/proposal.md` — markdown, but not in the allowlist
- **THEN** the normal branch + PR flow applies in full

#### Scenario: Prose-only save reports without a PR link

- **WHEN** a prose-only save completes
- **THEN** the report names the changed prose paths and states they landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

#### Scenario: Protected default branch falls back

- **WHEN** a prose-only save's direct push to the default branch is rejected
- **THEN** `/save` cuts a branch, opens a PR whose body is the prose change, and states that the default branch is protected
- **AND** it never force-pushes

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 253 -->
## REMOVED Requirements

### Requirement: install-wong-stack is removed outright

**Reason**: A one-time removal that shipped in 6.0.0; the skill and its references are long gone, and release history before 19.0.0 now lives in git.
**Migration**: None.

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/memory-capture/spec.md utf8 4475 -->
## ADDED Requirements

### Requirement: Session capture excludes credential values

When `/save` or the background capture turns a session into facts, it SHALL exclude every real credential value supplied, rotated, read, or written during the session. It MAY preserve the variable name, the fact that it changed, its purpose, where it is obtained, and any non-secret operational decision. The same exclusion SHALL apply to the change's Status, Decision log, tasks, commit message, PR body, `/save` report, and background-run counts.

#### Scenario: A token was rotated during the session

- **WHEN** `/save` captures a session in which `SERVICE_TOKEN` was rotated
- **THEN** a fact may record that `SERVICE_TOKEN` rotated and its non-secret sourcing guidance
- **AND** neither the old nor new value appears in a fact or another handoff surface

#### Scenario: A pasted credential appears in surrounding conversation

- **WHEN** a credential value is present in conversation context used to write facts
- **THEN** the writer omits the value rather than treating verbatim user text as automatically durable
- **AND** the facts remain useful by retaining the non-secret decision and variable name

### Requirement: A conversation-only session does not produce an OpenSpec change

`/save` SHALL NOT author an OpenSpec change for a session that produced no code and no plan. It SHALL write the session's facts, and report that no change was created.

#### Scenario: No fake proposal

- **WHEN** `/save` runs after a session with no diff and no plan
- **THEN** no `openspec/changes/<name>/` folder is created
- **AND** no proposal describing nothing changing and no empty `tasks.md` are written

### Requirement: Session context lives as facts in the memory store

Session context SHALL live as facts in the repo's memory store, not in the repository. A fact's slug SHALL be the OpenSpec change name for change work, or a kebab-case topic slug for a conversation-only session. No session SHALL write a file under `notes/`.

#### Scenario: Facts are keyed to their line of work

- **WHEN** a session's work is tracked as change `add-po-search` on any branch
- **THEN** its facts have slug `add-po-search` in the memory store
- **AND** no file under `notes/` is written

#### Scenario: A conversation-only session still leaves facts

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** facts with a topic slug are written to the memory store
- **AND** no OpenSpec change folder is created for them

### Requirement: `/save` is the deliberate capture point

`/save` SHALL extract facts from the conversation since the session's last capture and pass each through the write gate, with the current session id and tags. It SHALL write no fact when the session produced nothing beyond the diff and the change's Decision log, and SHALL say so in its report. Its report SHALL state how many facts were added, superseded, and dropped, and whether they were stored or spooled. The background capture SHALL be the automatic capture point for sessions that end without `/save`.

#### Scenario: A second save supersedes

- **WHEN** `/save` runs again on a change and one new fact corrects an earlier one
- **THEN** the new fact supersedes the earlier one, and the earlier fact's body is unchanged

#### Scenario: A save with nothing new to capture

- **WHEN** the session produced nothing beyond the diff and the Decision log
- **THEN** `/save` writes no fact and reports that it skipped capture

### Requirement: Facts keep what a cold reader needs

A session's facts SHALL keep what the user stated (facts, constraints, preferences, corrections), decisions with their reason, options ruled out with their reason, and concrete specifics (names, repo-relative paths, numbers, versions, error strings). An unresolved question SHALL become a `thread` fact. Facts SHALL omit tool-call mechanics, file dumps, the assistant's reasoning, the path taken to a conclusion, and anything already true in the repo or in the change's Decision log. A reason SHALL stay in the same fact as its decision.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** one fact records the rejected option and why it was rejected

#### Scenario: A question stays open

- **WHEN** a session ends with a question that nobody answered
- **THEN** a `thread` fact records it, and it stays live until a later fact supersedes it

<!-- end specs/memory-capture/spec.md -->
<!-- file specs/memory-store/spec.md utf8 9263 -->
## ADDED Requirements

### Requirement: Every memory call uses a memory key

The memory script SHALL send every store call made with a memory key to the Worker URL recorded under `components.memory.worker`, with the memory key from `CLOUDFLARE_MEMORY_TOKEN`. Only `migrate` and the admin commands SHALL instead use the admin's `CLOUDFLARE_API_TOKEN`, straight to Cloudflare. The Worker SHALL answer the same D1 query and R2 object requests, in the same shapes, that the memory script sends to the Cloudflare REST API. Each key SHALL open one repo's store, as `admin` or `member`. The Worker SHALL refuse a key it does not know with HTTP 401. The key hashes SHALL be kept in a table in the memory database, and the Worker SHALL refuse, with HTTP 403 and without running it, any statement that names that table or changes the schema's write protection, so that no key can read or change a key. A `CLOUDFLARE_MEMORY_TOKEN` that is not a memory key SHALL keep using the Cloudflare REST API with the same requests, until the store is moved. When the Worker URL answers 404, the script SHALL treat the store as not yet reachable, so that facts wait in the spool.

#### Scenario: A member searches facts

- **WHEN** a member runs `memory.mjs search deploy`
- **THEN** the result is the same as the admin's search on the same store, before the personal-fact filter

#### Scenario: A key for another repo

- **WHEN** a key made for `billing`'s store is sent to `home`'s production Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: An unknown key

- **WHEN** a request carries a key that is not in the store's key table
- **THEN** the Worker answers 401 and does nothing

#### Scenario: A key tries to read the keys

- **WHEN** an admin or member key sends a statement that names the key table, in any letter case or quoting
- **THEN** the Worker answers 403, and no statement in the batch runs

#### Scenario: An older store's token

- **WHEN** `CLOUDFLARE_MEMORY_TOKEN` holds a Cloudflare token, not a memory key, and a Worker URL is recorded
- **THEN** the script calls the Cloudflare REST API with that token, as before the move

#### Scenario: Production has not deployed the route yet

- **WHEN** a fact is written with a memory key and the Worker URL answers 404
- **THEN** the fact waits in the local spool, and the next run sends it

### Requirement: A member reads only their own transcripts

A `member` key SHALL write and read R2 objects only under `sessions/<member email>/`. Any other key SHALL be refused with HTTP 403. An `admin` key SHALL read every object in its repo's bucket, including keys with no email. When the memory script is refused a transcript, it SHALL state that only the author and the admin can read it.

#### Scenario: A member follows their own fact to its source

- **WHEN** a member asks for the source of a fact from their own session
- **THEN** they get the session's reduced text

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a fact from a teammate's session
- **THEN** no transcript is shown, and the script states that only the author and the admin can read it

#### Scenario: The admin reads an old transcript

- **WHEN** the admin asks for a transcript stored at `sessions/<agent>/<session-id>.jsonl`
- **THEN** they get its reduced text, and a member asking for the same key is refused

### Requirement: Existing installs move behind the memory Worker

`/wong-sync` SHALL move an install whose `CLOUDFLARE_MEMORY_TOKEN` is still a Cloudflare token to the app's production Worker. Its planned change SHALL add the memory bindings and the memory route to the app, record the Worker URL, apply the memory migrations, and, when the store has a bucket, give the `<repo>-deploy` token `Workers R2 Storage Write`. After that change merges and production deploys, the admin SHALL create an admin key for their git email with `member add --admin --env`, and SHALL delete the old `<repo>-memory` Cloudflare token only after a store call through the Worker succeeds. Until then the old token SHALL keep working. The move SHALL tell the admin that teammates who held the old token need a member key.

#### Scenario: A solo install is moved

- **WHEN** the sync change has merged, production has deployed, and the admin finishes the move
- **THEN** `.env` holds an admin key, the digest loads through the app's production Worker, and the old token no longer exists

#### Scenario: Before production deploys

- **WHEN** the sync change is on a branch and not yet deployed to production
- **THEN** memory calls still use the old token through the Cloudflare REST API and succeed

#### Scenario: The Worker call fails during the move

- **WHEN** the first store call through the Worker fails
- **THEN** the old token and `.env` value stay as they were, and the move reports the failure

### Requirement: The app's production Worker serves the memory store

Each repo's memory store SHALL be served by the repo's own production app Worker, under the path prefix `/_memory/`. The production Worker SHALL bind the memory database as `MEMORY_DB` and, when the store has one, the bucket as `MEMORY_BUCKET`. The staging Worker and every preview SHALL bind neither, and SHALL answer every `/_memory/` request with HTTP 404. The bindings SHALL be declared in the app's wrangler config and deployed by CI with the app; no separate memory Worker and no person's deploy command SHALL exist. The memory request handling SHALL ship with the memory skill, so that `/wong-sync` updates it, and the app's Worker SHALL reach it through one route. The Worker URL recorded under `components.memory.worker` SHALL be the production Worker's `workers.dev` address followed by `/_memory`.

#### Scenario: Production serves memory

- **WHEN** a member runs `memory.mjs search deploy` in a repo whose production Worker has deployed the memory route
- **THEN** the request goes to `https://<worker>.<subdomain>.workers.dev/_memory/...` and returns the facts

#### Scenario: A preview has no memory

- **WHEN** any request reaches `/_memory/` on the staging Worker or a preview alias
- **THEN** the Worker answers 404 and reads no memory database

#### Scenario: A merge deploys a memory change

- **WHEN** a change to the memory request handling merges to `main`
- **THEN** CI's production deploy carries it, and nobody runs a separate memory deploy

### Requirement: The admin manages memory keys with the memory script

The memory script SHALL have `member add <email> [--admin]`, `member remove <email>`, and `member list` commands. They SHALL run with the admin's `CLOUDFLARE_API_TOKEN`, straight to the memory database. `member add` SHALL create a random key for the email on this repo's store, store only its hash, and print the key once, and SHALL NOT write it to any file. With `--env`, it SHALL instead write the key to this clone's `.env` as `CLOUDFLARE_MEMORY_TOKEN`, and SHALL NOT print it. Adding an email again SHALL replace its earlier key. The first member who is not an admin SHALL set `components.memory.team` to `true`. `member remove` SHALL revoke the email's key on this repo at once. `member list` SHALL print this repo's emails and roles, and no key or hash. The script SHALL have no command that deploys a Worker. When the admin's token lacks a permission a command needs, the command SHALL stop, name the permission, and change nothing.

#### Scenario: A teammate joins

- **WHEN** the admin runs `member add ana@example.com`
- **THEN** a key is printed once, no file holds it, and `components.memory.team` is `true`

#### Scenario: A member is removed

- **WHEN** the admin runs `member remove ana@example.com`
- **THEN** the next call with Ana's key is refused with 401

#### Scenario: The token cannot write D1

- **WHEN** `member add` runs with a `CLOUDFLARE_API_TOKEN` that lacks `D1 Write`
- **THEN** the command stops, names that permission, and changes nothing

#### Scenario: No deploy command

- **WHEN** someone runs `memory.mjs worker deploy`
- **THEN** the script stops with its usage, and nothing is deployed

## MODIFIED Requirements

### Requirement: Access uses a dedicated memory token

The store SHALL be read and written through the app's production Worker with a memory key named `CLOUDFLARE_MEMORY_TOKEN`, stored in the git-ignored `.env` under the secrets convention. The requirements below define how the production Worker serves it. The key SHALL open only this repo's store. It SHALL NOT be set as a CI secret, and it SHALL NOT be the widened provisioning token. No person SHALL hold a Cloudflare token for memory, except an older store's token until its move finishes.

#### Scenario: CI cannot read transcripts

- **WHEN** a reviewer inspects the repository's CI secrets after provisioning
- **THEN** `CLOUDFLARE_MEMORY_TOKEN` is not among them

#### Scenario: The token is missing

- **WHEN** a memory command runs on a machine whose `.env` has no `CLOUDFLARE_MEMORY_TOKEN`
- **THEN** the command stops with a message that names the variable and the page that owns it
- **AND** no value is printed

#### Scenario: A teammate joins

- **WHEN** a teammate needs memory access
- **THEN** the admin gives them a member key, not a Cloudflare token

<!-- end specs/memory-store/spec.md -->
<!-- file specs/memory-worker/spec.md utf8 1250 -->
## REMOVED Requirements

### Requirement: Every memory call uses a memory key

**Reason**: Moved word for word into `memory-store`, which owns the memory store; one capability per topic.
**Migration**: None; the requirement is unchanged under `memory-store`.

### Requirement: A member reads only their own transcripts

**Reason**: Moved word for word into `memory-store`, which owns the memory store; one capability per topic.
**Migration**: None; the requirement is unchanged under `memory-store`.

### Requirement: Existing installs move behind the memory Worker

**Reason**: Moved word for word into `memory-store`, which owns the memory store; one capability per topic.
**Migration**: None; the requirement is unchanged under `memory-store`.

### Requirement: The app's production Worker serves the memory store

**Reason**: Moved word for word into `memory-store`, which owns the memory store; one capability per topic.
**Migration**: None; the requirement is unchanged under `memory-store`.

### Requirement: The admin manages memory keys with the memory script

**Reason**: Moved word for word into `memory-store`, which owns the memory store; one capability per topic.
**Migration**: None; the requirement is unchanged under `memory-store`.

<!-- end specs/memory-worker/spec.md -->
<!-- file specs/open-source-release/spec.md utf8 836 -->
## MODIFIED Requirements

### Requirement: The repository carries an open-source license and a security policy

The repository root SHALL contain an MIT `LICENSE` with the copyright holder and year, and a `SECURITY.md`. `SECURITY.md` SHALL say how to report a vulnerability privately, and SHALL name each Cloudflare credential WongStack uses, where it is stored, and what it can do. The README SHALL link both files.

#### Scenario: A reader checks reuse terms

- **WHEN** a reader opens the repository on GitHub
- **THEN** GitHub detects the MIT license
- **AND** the README links `LICENSE` and `SECURITY.md`

#### Scenario: A reader finds the credential powers

- **WHEN** a reader opens `SECURITY.md`
- **THEN** it names the user token, the deploy token, and the memory key, where each is stored, and which one can mint other tokens

<!-- end specs/open-source-release/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 1464 -->
## ADDED Requirements

### Requirement: The retired-names check fails on a removed name

The payload checks SHALL include a retired-names check. A list kept beside the check SHALL name each removed or renamed thing, its replacement, and the files allowed to keep naming it. The check SHALL fail when any tracked file names a listed thing outside its allowed files, and each failure SHALL name the file, the line, the retired name, and its replacement. `CHANGELOG.md` and `openspec/changes/**` SHALL be exempt, because they record history. The check and its list SHALL be meta-repo only and SHALL NOT be in the payload manifest. Removing or renaming a payload feature SHALL add its old name to the list in the same change.

#### Scenario: A live file names a removed thing

- **WHEN** a skill page mentions a command the list retires
- **THEN** the check fails, naming the file, the line, the retired command, and its replacement

#### Scenario: An allowed file keeps its mention

- **WHEN** a spec listed as allowed for a retired name states that the removed command must stay gone
- **THEN** the check passes for that file

#### Scenario: History is exempt

- **WHEN** `CHANGELOG.md` or an archived change names a retired thing
- **THEN** the check passes

#### Scenario: A target receives no retired-names check

- **WHEN** `/wong-sync` or `/wong-setup` installs the payload into a target
- **THEN** neither the check nor its list is among the files it receives

<!-- end specs/payload-checks/spec.md -->
<!-- file specs/payload-single-source/spec.md utf8 1242 -->
## MODIFIED Requirements

### Requirement: A generated surface is described as what the generator actually produces

Where the payload documents files produced by an external tool rather than copied from the payload, that description SHALL match what the currently supported version of the tool produces, and SHALL be re-checked when the tool's version moves. A claim that a file is generated is a claim a reader will act on — by expecting a command to exist, or by not copying something they then lack.

`openspec init --tools none` is the live instance: setup runs it, and it generates no `openspec-*` skills and no `/opsx:*` commands. Payload prose SHALL NOT offer either as an available surface.

#### Scenario: The manifest matches the generator

- **WHEN** the payload states that a directory or file is produced by an external tool
- **THEN** running that tool at the supported version produces it
- **AND** where it does not, the payload states what is actually produced

#### Scenario: A promised command surface exists

- **WHEN** payload prose tells a reader a command is available to them
- **THEN** a repo set up by following the payload has that command
- **AND** prose does not offer an entry point that a fresh setup lacks


<!-- end specs/payload-single-source/spec.md -->
<!-- file specs/session-notes/spec.md utf8 1712 -->
## REMOVED Requirements

### Requirement: Session capture excludes credential values

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: A conversation-only session does not produce an OpenSpec change

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: Session context lives as facts in the memory store

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: `/save` is the deliberate capture point

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: Facts keep what a cold reader needs

**Reason**: Moved word for word into `memory-capture`, which owns session capture. `session-notes` described the removed `notes/` folder.
**Migration**: None; the requirement is unchanged under `memory-capture`.

### Requirement: A prose-only save commits directly to the default branch

**Reason**: Merged into `delivery-gate`'s "The gate is CI-when-present, else PR review", which already owned the prose allowlist.
**Migration**: None; the protected-branch fallback and the prose-only report are kept there.

<!-- end specs/session-notes/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 7123 -->
## RENAMED Requirements

- FROM: `### Requirement: /verify begins by invoking /save`
- TO: `### Requirement: /verify scouts before it invokes /save`

## MODIFIED Requirements

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached by invoking `/verify`, or by `/ship`, which invokes `/verify` once as a non-gating evidence step between its delegated `/save` checkpoint and its merge. No other skill SHALL run it: `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/verify` SHALL be invocable at any point in a change's life and any number of times. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error. `/ship`'s invocation SHALL be an ordinary walk — same scout, same verdicts, same PR evidence — not a variant.

`/verify` SHALL ship in the payload's **core** category, so every repo receives it regardless of `components.stackPack`. It SHALL NOT be gated on the stack pack, on Cloudflare, or on any hosting provider, and no capability of the walk SHALL require an account with any vendor.

The browser tool the walk uses SHALL also be available for ordinary browser work outside the walk. `/verify` SHALL remain the only surface that produces graded merge evidence; using the browser to look at a page, fill a form, or check a rendered result SHALL NOT require invoking `/verify`.

#### Scenario: Shipping walks as evidence

- **WHEN** `/ship` runs in a repo with probe-reachable scenarios
- **THEN** `/verify` runs once after the delegated `/save` and before the merge, and its evidence lands on the PR
- **AND** a `NONE`, `UNKNOWN`, or `TIMEOUT` verdict changes nothing about the merge

#### Scenario: A repo with no stack pack receives the skill

- **WHEN** WongStack is installed or synced into a repo whose `components.stackPack` is absent or false
- **THEN** the `verify` skill is copied in with the rest of the core category
- **AND** no Cloudflare file, script, or config fragment is copied with it

#### Scenario: A repo in any language walks

- **WHEN** `/verify` runs in a repo with no `package.json`, no Node toolchain, and no vendor account
- **THEN** the walk drives its journeys and grades them normally
- **AND** nothing is added to the repository to make it possible

#### Scenario: The browser serves ordinary work

- **WHEN** a user asks to open a page or check something rendered, outside any change
- **THEN** the browser tool is available directly
- **AND** no walk is started, no journey is graded, and no PR comment is posted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/verify` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/verify` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **`/verify` SHALL block, delay, or condition nothing**, because it performs no merge. Only `/ship` consults a verdict: on `FAILURE` it asks the user whether to fix or merge anyway, as `delivery-gate` defines, and the user decides.

- **NONE** — this change has no scenario any probe can reach. Report why, in one line. `NONE` SHALL NOT be used to mean "not adopted": adoption no longer exists.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted after any permitted heal attempt: the browser could not be obtained, the preview URL is undiscoverable, staging is unreachable, or an access block survived or could not attempt its single heal-and-retry.
- **TIMEOUT** — the walk did not finish in its budget.

When the walk lands on a Cloudflare Access challenge, the heal SHALL be gated on the observed block rather than on the repo's category. With `CLOUDFLARE_API_TOKEN` available and no service-token pair in the durable store, `/verify` SHALL heal itself once before concluding `UNKNOWN`: mint a deterministically named service token through the Cloudflare Access API (widening into the Access permission groups first if needed, under the same standing authorization), ensure the Access policy accepts it, store the pair in the primary worktree's durable `.env` per the secrets convention without printing a value, apply it as request headers on the browser session, and retry. Without that token the heal SHALL be unavailable and the verdict SHALL be `UNKNOWN`, naming the Access wall and the missing credential. There SHALL be exactly one mint-and-retry per invocation.

`UNKNOWN` SHALL NOT be reported as `NONE`. A walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted
- **AND** `/verify` prevents no merge, push, or other skill from running afterwards

#### Scenario: Nothing to walk

- **WHEN** the scout finds no scenario any probe can reach
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk
- **AND** the report does not describe the repo as unadopted

#### Scenario: An Access challenge heals once

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial, `CLOUDFLARE_API_TOKEN` is available, and the durable store has no service-token pair
- **THEN** `/verify` mints the service token, applies it as request headers, and retries the walk once
- **AND** no credential value is printed or committed

#### Scenario: An Access challenge with no Cloudflare credential

- **WHEN** a walk meets an Access interstitial and no `CLOUDFLARE_API_TOKEN` is available
- **THEN** the verdict is `UNKNOWN`, naming the Access wall and the credential that would allow the heal
- **AND** the interstitial is not reported as a rendered page or a failing journey

#### Scenario: An Access challenge that survives the heal

- **WHEN** the retry after the mint still lands on the Access interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the mint attempt and the surviving challenge

#### Scenario: Unverified is reported as unverified

- **WHEN** a walk cannot run because the browser could not be obtained
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 887 -->
## RENAMED Requirements

- FROM: `### Requirement: A UI-bearing change carries one wireframe file`
- TO: `### Requirement: Every change carries one review page`

## REMOVED Requirements

### Requirement: The revised kit applies to newly created pages

**Reason**: Its older-page refresh was removed in 19.0.0.
**Migration**: Replaced by "Every page uses the current kit"; archived pages are still never rebuilt.

## ADDED Requirements

### Requirement: Every page uses the current kit

Every assembled page SHALL use the current kit. Archived pages SHALL NOT be rebuilt.

#### Scenario: A new review is generated

- **WHEN** a plan builds a review from the current kit
- **THEN** the page is one scrolling document with text visuals, decisions, and tap-to-note

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt

<!-- end specs/ux-wireframes/spec.md -->
<!-- file specs/wiki-root/spec.md utf8 287 -->
## REMOVED Requirements

### Requirement: The rename is a payload release

**Reason**: A one-time release requirement for the `docs/` → `wiki/` move; `path-scoped-rules` owns the release ritual for every payload change.
**Migration**: None; archived changes are still never rewritten.

<!-- end specs/wiki-root/spec.md -->
<!-- file .openspec.yaml utf8 66 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26
retire_capabilities: true

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 45126 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-26-consolidate-and-simplify</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-26-consolidate-and-simplify">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-26-consolidate-and-simplify</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The same rules are written in many places, and the copies drift apart. One rule appears in up to ten places, the Cloudflare login token is explained on four pages, and the release notes are ten times longer than anyone reads. Every session pays to read the repeats, and a newcomer meets two versions of one rule. Writing each thing once makes the assistant cheaper to run and easier to trust.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each rule is written once.</b> The assistant's instructions keep their steps, and a rule they share lives in one place that the others link to. The ship, continue, and apply instructions get about a third shorter. About 2,500 words go.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">before                after</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">ship ─── rule copy    ship ──┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">save ─── rule copy    save ──┤</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">apply ── rule copy    apply ─┼─▶ one rule</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">verify ─ rule copy    verify ┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The wiki says each thing once.</b> - The Cloudflare login token gets one page. - The browser check is written out once. - Secrets live on the secrets page. - The main process page links out instead of repeating other pages. - About 3,000 words go.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The planning records match what ships.</b> - Two records fold into the ones they belong to. - Mentions of removed features are fixed: the old notes folder, the old memory Worker, and command names that no longer exist. - Two records that only described a one-time past move are removed.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">specs/</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">├─ memory-store   ◀── memory-worker</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">├─ memory-capture ◀── session-notes</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">├─ delivery-gate    (stale names fixed)</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">└─ 48 others</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The old release notes move to history.</b> Notes before 19.0.0 are about 27,000 words, and updates never read them. One line now points to git, which still has them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">CHANGELOG.md</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">├─ 23.2.1 … 19.0.0   kept</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">└─ 18.1.0 … 1.0.0    ─▶ 1 line: see git</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Less repeated code.</b> Tests share one way to set up a throwaway repo. The deploy and preview scripts share their common steps. An unused test file goes.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Old names get caught.</b> A new check keeps a list of things that were removed or renamed. When any live file names one, the check fails and says what replaced it, so this cleanup does not quietly undo itself. Removing something from now on means adding its old name to the list.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">change ──▶ checks ──▶ names a</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">                      removed thing?</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">                  no ─┴─ yes</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">                 pass    fail: &quot;notes/</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">                         is gone; use</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">                         memory&quot;</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> Nothing you use changes: every command, setup, deploy, and preview works as before. No command merges or goes away. Code where sharing would change an error message or an edge case stays as it is: finding the main checkout, the config lookup, option parsing, and the old <code>gh</code> fallback. The archive is not rewritten.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how far the cleanup goes → chose <b>words plus safe code</b>: skills, wiki, specs, and release notes, plus the unused fixture, shared test setup, and the deploy scripts' shared blocks.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether the release notes before 19.0.0 go → chose <b>replace them with one line</b> that points to git history.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether to ship one release or several → chose <b>one release</b>.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: every command stays; no skill merges or is deleted, because the audit found each skill's steps distinct and only its prose repeated.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the release is a patch, 23.2.1, because no behavior a user or target repo sees changes.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the main-checkout lookup, the wrangler config lookup, skill-script option parsing, and the old-<code>gh</code> fallback in <code>wait-for-checks.sh</code> stay, because unifying them changes error wording or edge cases.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>scripts/measure-usage.mjs</code> stays, because it is a maintainer's cost tool with a test, not dead code.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: moved requirements keep their text word for word, and specs are only fixed where stale or self-contradictory. Rewriting working specs to be shorter would churn the behavior contract without changing behavior.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>memory-worker</code>'s move requirement for older installs stays, now in <code>memory-store</code>, because <code>/wong-sync</code> still performs that move.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>improve</code>'s two small references stay separate, because merging saves about 40 words.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the server setup's Node 24 against <code>.nvmrc</code>'s 22 is left for a later change, because it changes behavior.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Refreshed on main at 24.0.2 (<code>47385c9</code>). 24.0.0 moved mini apps into the app's Worker: <code>cf-mini.sh</code> became <code>cf-preview.sh</code>, and <code>deploy.yml</code> now publishes one preview, so the shared-publish-step item is dropped. 24.0.2 already wrote the <code>delivery-gate</code> and <code>secrets-convention</code> Purposes, so that task is dropped. The deltas were regenerated from the current live specs, and the release is now 24.0.3.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how to keep specs and docs from drifting after this cleanup → chose <b>add a retired-names check</b> to this change. A scheduled <code>/improve</code> run was offered and not chosen.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the retired-names check is meta-repo only, like <code>check-openspec-config.mjs</code>, because its list names WongStack's own removed features, which mean nothing in a target.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: each list entry carries the replacement and the files allowed to keep naming it, because some mentions are correct: a spec that says a removed command must stay gone, or a migration step for older installs.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Changed during apply: <code>memory/SKILL.md</code>'s &quot;Background run&quot; section stays in the skill, because <code>memory/scripts/run.mjs</code> builds the background run's prompt from that exact section and <code>session-start.mjs</code> points at it; moving it would change code for about 400 words. The default-branch rule stays in <code>git-gate.md#the-default-branch</code>, its existing owner. <code>new-plan.md</code> is under <code>save/references/</code>.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Changed during apply: the <code>.dev.vars</code> and secret-parity text stays whole in <code>wiki/stack/d1-pipeline.md</code> as its one owner, because four files link its anchor and <code>wiki/development/secrets.md</code> is a measured owner; <code>secrets.md</code> and <code>cloudflare-credentials.md</code> link it. The staging-is-not-production check stays in each script, because its messages differ in wording, not only prefix. <code>wong_ci_branch</code> is shared by <code>cf-deploy.sh</code> and <code>cf-build.sh</code>. <code>cf-deploy.test.mjs</code> folded into <code>wrangler-config.test.mjs</code>; its one duplicate test merged with the stricter assertions kept.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Changed during apply: the retired-names check found one more stale name the plan missed, the <code>walk</code> skill in <code>staging-walkthrough</code>'s &quot;The walkthrough is a user-invoked verb&quot;, so that requirement gained a MODIFIED delta. The change sets OpenSpec's <code>retire_capabilities: true</code>, so archive syncs the deltas and deletes the emptied <code>memory-worker</code> and <code>session-notes</code> specs itself; a scratch archive confirmed it (48 specs, all strict-valid, no retired name left). The renamed <code>#the-memory-token</code> anchor was repointed in <code>store.mjs</code>, its test, <code>SECURITY.md</code>, <code>required-tools.md</code>, and <code>stack-pack-fragments.md</code>, and joined the list with <code>archived-save.md</code> and <code>spec-sync.md</code>.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Measured: <code>.agents/skills</code> Markdown 30,670 → 29,424 words, <code>wiki/</code> 30,521 → 28,794, <code>README.md</code> 1,603 → 1,558, <code>CHANGELOG.md</code> 31,590 → 4,214. <code>measure-context.mjs</code>: instruction words 15,744 → 14,744 on this change (18,812 baseline), owner words 10,381 → 9,116. The skill and wiki cuts are about half the plan's estimate, because owners absorbed the facts only they lacked. <code>node --test scripts/tests/*.test.mjs</code>: 259 pass, 2 skipped, 0 fail. Links, OpenSpec config, and <code>measure-context --check</code> pass.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Distilled facts before the archive: two repeatable OpenSpec lessons from this change went into <code>.agents/skills/plan/references/openspec-cli.md</code> (drop a scenario by REMOVED plus ADDED; retire a capability with <code>retire_capabilities: true</code>), the page that owns CLI mechanics. The other facts are open threads, kept in memory.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Archived and saved for CI in one checkpoint on <code>explore/repo-elegance</code>; archive synced the deltas and retired <code>memory-worker</code> and <code>session-notes</code> (48 specs, all strict-valid).</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Merged main at 25.1.0 (<code>4f34ee7</code>) before publishing, so the release is renumbered 25.1.1. 25.0.0 changed how <code>/apply</code> completes (a host preview, no <code>/save</code>) and removed the mini-app save route. Conflicts resolved as the union of intent: <code>apply-completion-handoff</code> takes main's &quot;Completed apply ends with a preview from the agent host&quot;, which supersedes this change's &quot;Completed apply checkpoints through save&quot;; <code>delivery-gate</code> keeps this change's stale-name fixes without the mini-app pull-request sentence main removed; <code>the-change-loop.md</code>, <code>apply</code>, and <code>ship</code> keep this change's shorter wording with main's new behavior. <code>save/references/mini-app-save.md</code> stays deleted, and it and <code>mini-app-push.sh</code> join <code>scripts/retired-names.json</code>. After the merge: 260 tests pass, 2 skipped; links, OpenSpec config, retired names, strict spec validation (48 specs), and <code>measure-context --check</code> pass; instruction words 18,812 → 14,178 against the baseline.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>The first merge attempt was refused: main moved to 25.2.0 (<code>f0daa30</code>, the review page on a phone). Merged it; the release is now 25.2.1. <code>ux-wireframes</code> keeps main's new keyboard scenario and this change's renamed requirement and &quot;Every page uses the current kit&quot;. Checks pass again: 260 tests, links, OpenSpec config, retired names, 48 strict-valid specs, and <code>measure-context --check</code>. The preview walk on <code>6847074</code> was SUCCESS (<code>/_memory/</code> answers 404 on the preview).</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item' };
    return { at: '#/decisions/' + m[2], kind: 'decision' };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a /continue instruction ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from review.html (' + data.notes.length + '):'];
    data.notes.forEach(function (n, i) { lines.push((i + 1) + '. ' + where(n.id).at + ' · ' + n.label + ' — ' + n.text.replace(/\s*\n\s*/g, ' ')); });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
