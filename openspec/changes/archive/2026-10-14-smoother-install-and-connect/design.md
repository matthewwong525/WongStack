# Design

## Context

See [proposal.md](proposal.md), Why. The evidence is two exported Claude Code sessions from 2026-10-14 on Matthew's Mac: an install of 43.0.0 into an empty `~/Documents/test` on the Artifacts route (27 minutes), and a Connect your assistant into an empty `~/Documents/test_connect` (2 minutes to working). The same snags showed up earlier, in the follow-ups of [the 2026-10-07 install test](../archive/2026-10-07-fresh-cloudflare-install-publishes/design.md#follow-ups-not-in-this-change) (memory threads #997 and #1389). This change closes four of them: the copy program, the summary file, the `.claude` link crash, and the silent connect.

What each snag traced to in today's code:

| Snag | Cause |
|---|---|
| Improvised copy script | `wong-setup` ships no program; [the manifest](../../../.agents/skills/wong-sync/references/payload-manifest.md) describes it in prose |
| 24 `needs a reason` | `findFlags` flags every settings path in the diff, added ones included; the base was the empty `Start the project` commit |
| `fatal: path … exists on disk, but not in <sha>` | `reader().at` runs `git show base:path` with Git's error output passed through |
| `--worktree` crash on `.claude` | `addedLines` calls `readFileSync` on an untracked link to a folder |
| `worker-configuration.d.ts` dirty at ship | `provision` writes `app/wrangler.jsonc` with new bindings; types regenerate only in CI and local checks |
| `DEFAULT_CHECKS=interrupted` | `ship.mjs` stops with restart steps for the assistant to run |
| Folder left on `wongstack-setup` | `merge.sh` updates the `main` ref only when no worktree holds `main` |
| `--summary-file: no such file` | `checkpoint.mjs` deletes the summary on a pass, by design |
| Project tools say *Connect first* | `install` keeps its sign-in in `installState(origin)`; `companyClient` without `--state` looks for a `projects/` pointer nobody writes, then a folder named by the project path |
| Silent reuse | `token(origin, true)` runs `cloudflared access login`, which exits at once on a cached session; the report doesn't say |
| Missing company actions unnoticed | `combinedList` puts `companyStatus` in the JSON only |
| Engine warnings | `tools.md` compares only the `.nvmrc` major; `jsdom` wants `^22.22.2 \|\| ^24.15.0 \|\| >=26` |

## Goals / Non-Goals

**Goals:** a newcomer's install and connect reach *done* with no improvised step, no made-up reasons, and no manual restart.

**Non-goals:** making check runs faster; changing what setup asks or the order it asks in; documents search on connect.

## Decisions

### 1. One install program, `wong-setup/scripts/install.mjs`

`node <source>/.claude/skills/wong-setup/scripts/install.mjs --source <source> --target <target>` does, in order, and prints one JSON report:

1. Refuses a target that holds anything but an empty `.git`.
2. Copies every category of `payload-files.json` through `targetFiles` (moved here from `scripts/check-target-app.mjs`, which imports it back), logical `.claude/` paths into real `.agents/`, plus `.env.example`. It never overwrites.
3. Makes `.agents/` real and links `.claude` and `.codex` to it with `symlinkSync(..., 'dir')`. It writes a real `AGENTS.md` (a short header, then the source's `WONG-STACK` block), links `CLAUDE.md` to it, and checks all three with `lstat`. A refused link (Windows without link rights) stops with the fix from [the failure map](../../../.agents/skills/wong-setup/references/failure-map.md); that matches `winsymlinks:nativestrict`.
4. Writes `seededBySetup` from templates in `wong-setup/references/seed/`: `wiki/README.md`, `wiki/development/README.md`, `.gitignore`. Each hub links every shipped page under it, which a test checks.
5. Makes `paseo.json`'s `worktree.setup` a list, as [the manifest](../../../.agents/skills/wong-sync/references/payload-manifest.md#the-paseo-project-file) says.
6. Writes `.claude/.wong-stack.json` with `version`, `commit`, `upstream.repo`, `components.skills` and `installedAt`. Provisioning adds the rest, as now.
7. Runs `openspec init --tools none` and writes `openspec/config.yaml` from `seed/openspec-config.yaml`.

It is source-only, like `provision.mjs`, so `payload-files.json` doesn't list it. `SKILL.md`'s install section names it as the `/apply` task, and the manifest's install sections point to it rather than restating it.

*Alternatives:* keep prose (today: improvised every time); ship it in the payload (an installed repo never installs again).

### 2. Loosened checks: an empty base has nothing to loosen

When `git rev-parse <base>^{tree}` is the empty tree, `main` prints `There was nothing to loosen: this is the project's first change.` and exits 0, like the existing no-base path. `reader().at` runs `git show` with its error output ignored. `addedLines` skips any untracked path that `lstat` doesn't call a regular file.

*Alternative:* exempt only added files. A new settings file can loosen a project that has older files; an empty base can't.

### 3. Binding types refresh in provisioning

Right after `provision` writes `app/wrangler.jsonc`, it runs `npm ci` in `app/` when `node_modules` is absent, then `npx wrangler types`. That is the same command `wong_regenerate_types` runs in CI. A failure is a warning in the report, not a stop, as in the shell helper.

### 4. Ship restarts a cut-off run itself

In `prepare`, an `interrupted` answer calls `restartRun` and `waitFor` from `artifacts-run.mjs` once, prints `DEFAULT_CHECKS=restarted`, and reads the answer again. `ok` continues; anything else stops with today's messages. `restartSteps` stays only for a second cut-off.

### 5. Ship moves a clean primary checkout onto the default branch

In `merge.sh`'s no-`MAIN_WT` branch, after `git fetch origin main:main` succeeds, three things must all hold: the current checkout is the primary worktree (`--git-dir` equals `--git-common-dir`), it is on `$BRANCH`, and `status --porcelain` is empty. Then it runs `git switch $DEFAULT` and says `synced=<path> (switched from <branch>)`. Otherwise it says `synced=ref`, as today. The `delivery-gate` spec's *SHALL NOT check out* gives way for this one case.

### 6. Save names a used-up summary file

`outsideFile` gets the flag's meaning: for `--summary-file`, a missing file reads `--summary-file: no such file (a passing save deletes it; write a new one)`. Same for `--message-file`.

### 7. The project's tools find setup's sign-in

`companyClient`'s `directory()` gets one more step before the per-path folder: `installState(recorded(root))` when that folder's `target.json` names the same origin. The git helper already finds the sign-in this way, and computers that are already connected work with no rerun. `install` then builds a client for the downloaded folder and checks that its `stateDirectory` equals `dir`. If not, the summary says *The project's own tools can't find this sign-in yet* in place of *Nothing else is needed*.

*Alternative:* write the `projects/<hash>.json` pointer at install. That's more files to keep safe, and it fixes nothing already installed.

### 8. Connect names a reused sign-in

`login` records whether `onLoginUrl` fired. `install`'s report gets `signIn: 'new' | 'reused'`, and `summary` starts with *Used this computer's existing sign-in as <email>.* when reused.

### 9. A combined list says company actions are missing

In `company-api.mjs`'s `list`, when `companyStatus` isn't `available`, it prints to stderr: *Company actions are missing: not signed in. <SIGN_IN_AGAIN>*. The JSON and exit code stay as they are.

### 10. Node from the app's range

`app/package.json` `engines.node` becomes `^22.22.2 || ^24.15.0 || >=26.0.0`, the range its packages accept. `tools.md`'s Node row checks the version against the source app's `engines.node`, not only the `.nvmrc` major. An older one is "missing" and joins the one install question.

## Risks / Trade-offs

- [The install program and the manifest prose drift] → the manifest's install sections link to the program instead of restating it, and `check-target-app` builds its test install through the same `targetFiles`.
- [`git switch` surprises someone mid-work] → only a clean primary checkout on the merged, now-deleted branch moves.
- [An auto-restart hides a flaky runner] → one restart only, printed as `DEFAULT_CHECKS=restarted`.
- [`npm ci` makes provisioning slower] → setup's first save runs it anyway; this only moves it earlier.

## Migration Plan

No data migration. Installs pick up the ship, save, check and sign-in fixes through `/wong-sync`. The `CHANGELOG.md` entry needs no Updating note.
