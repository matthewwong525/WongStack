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
