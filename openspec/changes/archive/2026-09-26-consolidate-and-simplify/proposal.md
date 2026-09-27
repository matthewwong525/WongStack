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
