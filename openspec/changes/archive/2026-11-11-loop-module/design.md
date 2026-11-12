# Design

## Context

[`wiki/maintaining/adding-a-module.md`](../../../wiki/maintaining/adding-a-module.md) (shipped with memory, v52.0.0) sets the module rules: one source folder in `.agents/plugins/<name>/`, a real folder in every install, the repo's own parts outside it, a paste-in README, a setup guide that works from GitHub, no import from outside the folder, one version, and one install-alone test.

The eight loop skills reach out of their folders in these places (checked on `main` at 3d6403f2):

| Skill | Reaches | For |
|---|---|---|
| `explore` | `daily/chats.mjs`, `daily/chief.mjs`, `hand-over/…/computer.mjs`, `schedule/…/paseo.mjs`, `schedule/workspace.mjs` (from `step-title.mjs`); `save/delivery-route.mjs` (from `other-work.mjs`); memory's `cli.mjs`, `primary-root.mjs` | chat step names, other work, question-card hooks |
| `plan` | `hand-over/reply-link.mjs` (`build-review.mjs --link`); the checkout top by folder depth (`look.mjs`); Paseo and `workspace.mjs` (`new-workspace.md`) | review link, look, new workspaces |
| `apply` | `step-title.mjs`, `reply-link.mjs`, `.github/scripts/checks.mjs`, `scripts/cf-preview.sh`, `app-untouched.sh`, `loosened-checks.mjs`; hook `helper-stop-check.mjs` in `.agents/settings.json` and `.agents/hooks.json` | pre-check, preview, guards, helper reports |
| `save` | memory's `store.mjs` (`parseEnv`), `primary-root.mjs`; `employee-bootstrap`, `worktree-secrets.mjs`; company git and Artifacts in `delivery-route.mjs`, `artifacts-*.mjs`, `app-change.mjs` | routes, keys |
| `ship` | memory's `d1/connect.mjs` (`live-look.sh`); `worktree-secrets.mjs`; `publish-artifacts.sh` | live look, Artifacts publish |
| `verify` | memory's `scan.mjs`, `store.mjs`, `d1/connect.mjs`; `cf-secrets.mjs`, `lib-wrangler-config`, `worker/walk-pictures.mjs` | staging walk, own site |
| `continue` | memory's `memory.mjs` (`pickup.mjs`) | open threads |
| `close` | `schedule/…/tidy.mjs`, `step-title.mjs`, `hand-over.mjs` | closing the workspace |

Core reaches into them too: links to `asking-the-user.md` and `openspec-cli.md`, and callers of `build-review.mjs` (`/daily`, `hand-over`) and `checkpoint.mjs`. The guide allows core to reach a module, so these keep their `.claude/skills/<name>/…` paths.

Claude Code names a skill inside a plugin `/<plugin>:<name>` (memory design §5: `/memory:dream-memory`). That is why the module's commands install beside its folder, not inside it.

## Goals / Non-Goals

**Goals:** the eight commands install alone into a repo with nothing else, keep their names, and take a change from idea to merged with or without GitHub. In WongStack they keep every behavior. They follow the module guide, plus one new rule for commands that keep their own names.

**Non-Goals:** code hosts other than GitHub, beyond local commits and merges; the staging walk outside WongStack; the question-card and helper-report hooks as module hooks; Markdown plans without OpenSpec; any change to the review page's look or its buttons.

## Decisions

### 1. Layout

```text
.agents/plugins/loop/            the module (source only)
  .claude-plugin/plugin.json     name, version, description; no hooks
  .codex-plugin/plugin.json      the same version
  README.md
  references/  setup.md, openspec-config.yaml
  scripts/     slot.mjs, lib/
  skills/
    plan/      SKILL.md, references/, scripts/ (build-review.mjs, look.mjs, prototype.mjs)
    explore/  apply/  save/  ship/  verify/  continue/  close/
.agents/skills/<name>  → ../plugins/loop/skills/<name>   (eight links, source only)
.agents/loop/                    WongStack's loop extras (ships; not in the module)
  profile.mjs
  step-title.mjs  ask-check.mjs  other-work.mjs  helper-stop-check.mjs
  routes/      company git, Artifacts (artifacts-*.mjs, app-change.mjs, publish-artifacts.sh)
  preview/     cf-preview.sh caller, app-untouched.sh, loosened-checks.mjs
  staging/     verify-staging.sh, verify-journeys.mjs, own-site.mjs, cf-secrets.mjs, walk-pictures
```

An install gets real folders:

```text
.claude/skills/loop/     plugin files, README, references, scripts; no skills/, no SKILL.md
.claude/skills/plan/     and the seven other commands, each its own folder
```

- **One plugin folder, one version, like memory.** Both `plugin.json` files hold the version and stay equal; `check-module-versions.mjs` reads them as it does memory's, with no change. Neither names hooks.
- **Commands install beside the module, not inside it.** A plugin's nested skill is named `/<plugin>:<name>` (memory design §5: `/memory:dream-memory`), so each `skills/<name>/` installs as `.claude/skills/<name>/` and keeps its name. The module folder installs at `.claude/skills/loop/` without `skills/`. With no `SKILL.md` it adds no command; Claude Code and Codex load it as a plugin with nothing in it.
- **In the source, only the eight commands are linked** into `.agents/skills/`. A `.agents/skills/loop` link would load each command a second time as `/loop:<name>`. The Codex marketplace gets no `loop` entry, for the same reason.
- **`payload-files.json` `mapped`** gains `.claude/plugins/loop → .claude/skills/loop` and `.claude/plugins/loop/skills/<name> → .claude/skills/<name>` for each command. The sync learns one rule: a nested mapped entry wins over its parent's, so the parent's copy skips that folder.
- **Shared module code lives at the root.** Skill text calls `$(git rev-parse --show-toplevel)/.claude/skills/loop/scripts/slot.mjs`; a command's script imports `../../loop/scripts/lib/…` in an install. Both are inside the module's own folders.
- **Moved WongStack scripts keep working by path.** `.agents/settings.json`, `.agents/hooks.json`, and every caller point at `.agents/loop/…`. The old paths go in `scripts/retired-names.json`.
- **Scripts find the checkout top with `git rev-parse --show-toplevel`**, or by walking up to `.git`, never by folder depth: Node resolves a source link to the real path, which is two levels deeper.

### 2. Slots

`.agents/loop/profile.mjs` default-exports optional parts. `loop/scripts/slot.mjs <name> [args…]` loads the profile, if there is one, and runs the part. When the part is missing it prints `SLOT=<name> empty` and exits 0, so skill text can always run it and branch on the line.

| Slot | Called by | Empty |
|---|---|---|
| `stepTitle({ step, task })` | every `SKILL.md` that names its step | nothing |
| `otherWork()` → JSON | `/explore`'s *Check for other work* | the step is skipped |
| `reviewLink({ file, header, actions })` → URL | `build-review.mjs --link` | the local file; `REVIEW_IN_CHAT` text |
| `newWorkspace({ name, prompt })` | `new-workspace.md`, `/continue` | the chat says to open one by hand |
| `closeWorkspace()` | `/close` | the chat says the person can close it |
| `schedule` (bool) | `/plan` and `/close` offers | not offered |
| `route()` → `github` \| `artifacts` \| `app` \| … | `delivery-route.mjs` | `github` when `gh` works and `origin` is GitHub, else `local` |
| `routeRun({ route, step, … })` | `checkpoint.mjs`, `ship.mjs` for a route the module doesn't own | the route is unknown; stop and say so |
| `precheck()` → command | `/apply`, `checkpoint.mjs` | the project's test command from setup, else none |
| `guards({ base })` | `/apply` (loosened checks, app untouched) | skipped |
| `preview({ head })` → URL | `/apply`, `checkpoint.mjs` | no preview; say why |
| `verify({ head, change })` | `/verify`, `ship.mjs` | CI evidence only; with no CI, *unverified* |
| `liveLook({ url })` | `ship.mjs` after merge | skipped |
| `keys()` → env | `checkpoint.mjs`, `ship.mjs` | the process environment |

WongStack's `profile.mjs` fills each slot from today's code. Memory has no slot. A step uses memory when `.claude/skills/memory/` exists, because memory is another module and the guide bars a dependency.

### 3. Routes without GitHub

`delivery-route.mjs` keeps `github` and adds `local`:

- **`/save` on `local`:** commit on the change's branch, run `precheck`, print `SAVE_GATE_RESULT=LOCAL` and the commit. No push.
- **`/ship` on `local`:** archive the change, run `precheck` on the branch, then `git merge --squash` into the default branch and commit. Ask before any push. A failing `precheck` stops the merge.
- **`github` with no CI** stays as today: `NONE` means PR review is the gate, and asking to ship is the approval.

`artifacts` and `app` move to `.agents/loop/routes/` and run through `routeRun`. `number-release.mjs` stays in the module; it prints `release=none` when there is no `## Next` entry.

### 4. Own helpers

`loop/scripts/lib/` holds copies of what the module uses from memory: `cli.mjs` (three helpers), `primary-root.mjs`, `env.mjs` (`parseEnv`, `loadEnv`, `repoContext`), and the key scan. `scripts/tests/cli-conventions.test.mjs` fails when a copy differs from memory's for those exports, so a copy never goes stale silently. Every module script imports from the module's `scripts/lib/` or its own folder, never from outside the module.

### 5. Setup and update

`references/setup.md` at the module root, following memory's:

1. Stop in a WongStack install (`.claude/.wong-stack.json`).
2. Copy the module folder from GitHub to `.claude/skills/loop/` without `skills/`, and each `skills/<name>/` to `.claude/skills/<name>/`, as real folders. When a command's folder is already there and is not the module's, stop and name it.
3. OpenSpec: when `openspec --version` fails, ask, then install it at the version pinned in the guide. Run `openspec init --tools none` when the repo has no `openspec/`. Write the module's `openspec-config.yaml` there when the repo has none. The seed moves out of `wong-setup`, and `wong-setup` reads it from the module.
4. Profile: find the test command (`package.json` `test`, `Makefile` `test`, `pytest`, `cargo test`, …) and ask to confirm it. Write `.agents/loop/profile.mjs` with only `precheck`. Every other slot stays empty; the guide names each one and its WongStack example by link.
5. Check: build a sample change's review page in a temporary folder with `build-review.mjs --require-current --link`; the link must be the local file. Then, in a scratch repo, run `/save`'s `local` route on a one-line change and confirm the commit.
6. Commit, and ask before any push.

`## Update` three-way merges the module folder and the eight command folders from the version in `.claude/skills/loop/.claude-plugin/plugin.json`, like memory's. It stops on a clash and names each file. It never touches `.agents/loop/`.

### 6. Checks

- `module-install.test.mjs`: for each module, copy it into an empty repo's `.agents/skills/` by its `mapped` entries, then run the module's check. The memory branch keeps its stand-in-store profile. The loop branch runs setup step 5 with a profile that has only `precheck: "true"`. Both fail on an import from outside the module's folders.
- The save, ship, verify, apply, and step-title tests follow the moves. New tests: `slot.mjs` with no profile, a profile missing a part, and a full one; `delivery-route.mjs` picks `local` with no `gh` or a non-GitHub origin; `ship.mjs` on `local` merges after a passing `precheck` and stops on a failing one.
- `measure-context.mjs --check`: the slot lines replace the WongStack command lines in skill text, so the total stays within budget.

## Risks / Trade-offs

- [The move touches eight skills, two hook files, and many callers at once] → one rename commit first, with links, then the slot work; `check-payload-links.mjs`, `memory.mjs areas`, and the script tests find every missed path.
- [A loop-only project's review page has no buttons] → it says to reply in the chat (`REVIEW_IN_CHAT`).
- [A loop-only project has no helper-report hook] → a helper that stops early is not sent back; `/apply` still reads each helper's result before it goes on.
- [Copies of memory helpers] → a test keeps them equal; the guide bars the shared import.
- [The `local` route merges with no review] → `/ship` is the person's yes, and `precheck` must pass; nothing leaves the computer without a second yes.
- [`openspec/config.yaml`'s rules name `.agents/skills/<name>/…`] → those paths stay valid in every install, and through the links in the source.
- [A plugin folder with no command may confuse a host] → task 5.5 loads it in Claude Code and Codex; if either warns, the module folder gets a short `SKILL.md` that only points at the eight commands.
- [Old installs] → `/wong-sync` brings the move in one update. Installs get real folders at the same paths, so their own links keep working.
