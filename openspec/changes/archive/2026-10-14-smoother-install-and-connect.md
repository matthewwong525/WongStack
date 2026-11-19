<!-- openspec-archive v1 2026-10-14-smoother-install-and-connect -->
<!-- file proposal.md utf8 6836 -->
# Smoother install and connect

**Status:** ready-to-ship
**Branch:** improve-install-setup
**Open questions:** none

## Why

Two real runs on 2026-10-14, a fresh install and a teammate's Connect your assistant, both worked, but each hit snags a newcomer can't get past alone. On the install, the assistant improvised its own copy step, wrote 24 made-up reasons to pass a check, and restarted a stuck check run by hand. After publishing, it left the folder on an old branch. On connect, the project's own tools couldn't find the sign-in that setup had just saved, while setup said nothing else was needed.

## What Changes

- **Setup puts the files in place with one ready-made step.** The assistant no longer writes its own copy script. One step copies everything, makes the folder links, the wiki's starting pages and the ignore rules, and writes the install record, the same way on every install. The assistant still plans and reports as before; only the hand-work goes.
  ```text
      BEFORE                  AFTER
  read 5 docs ─▶ write    one install step
  a copy script ─▶ run    ─▶ files, links,
  ─▶ hand-write hubs,        wiki hubs, record
  ignore rules, record       ─▶ provision
  ─▶ provision               ─▶ first save
  ─▶ first save
  ```
- **A new install's first save passes the loosened-checks check.** Nothing existed before the first change, so nothing can have been weakened. The check says so and passes, instead of asking for a reason per settings file. Its quick run on your computer also stops crashing on brand-new files and on the folder links.
- **The first save already matches your project's settings.** Setup refreshes one generated file to fit your project, so it no longer turns up as a stray change at publish time.
- **Publishing restarts a cut-off check run by itself.** When Cloudflare cuts off the main branch's last check run, publishing starts it again, waits, and carries on. The assistant no longer stops to do that by hand.
- **After publishing, your folder is on the live version.** When you work straight in the project folder and nothing is unsaved, publishing switches it to `main`, the version that went live. Before, it stayed on the old branch.
- **A save explains a missing summary file.** A passing save deletes its summary file. A second save that reuses it now says so and asks for a new one, instead of a bare "no such file".
- **The project's own tools find your sign-in right after connect.** After the setup link signs you in and downloads the project, the project's tools work at once. Before, they said *Connect first* unless given a long hidden folder path. Setup checks this before it says nothing else is needed.
- **Connect says when it reused a sign-in, and whose.** If this computer was already signed in, the report says *Used this computer's existing sign-in as <email>*. That way a shared computer can't silently connect as someone else.
- **Listing actions says when the company ones are missing.** When you're not signed in, the list still shows memory actions, and now also prints a plain line saying the company actions are missing and how to sign in.
- **Setup asks for a new enough Node.** The tool check now asks for the Node version the app's packages accept (24.15 or later on Node 24), not just the major version. Older versions printed warnings on every install.

Non-goals: wording around Claude's safety prompts (the user said one prompt is fine); the cost of the check runs themselves; documents search setup on connect.

## Capabilities

### New Capabilities

### Modified Capabilities

- `install-onboarding`: a finished install comes from one install program; the tools check takes the Node range the app's packages need.
- `ci-tests`: a loosened-check run on a project's first change passes with nothing to compare.
- `delivery-gate`: ship restarts a cut-off default-branch run once, and moves a clean primary checkout off the merged branch onto the default branch.
- `employee-onboarding`: setup's report holds only once the project's own tools find the saved sign-in, and names a reused sign-in.
- `agent-api-discovery`: a combined list with no company sign-in says so in a plain line.

## Impact

- `.agents/skills/wong-setup/scripts/install.mjs` (new), `references/seed/` (new), `SKILL.md`, `references/tools.md`, `references/cloudflare.md`, `scripts/provision.mjs`
- `scripts/check-target-app.mjs` reuses the install program's file list
- `.github/scripts/loosened-checks.mjs`
- `.agents/skills/ship/scripts/ship.mjs`, `merge.sh`; `.agents/skills/save/scripts/checkpoint.mjs`
- `scripts/employee-bootstrap.mjs`, `scripts/company-api.mjs`
- `app/package.json` engines; `.agents/skills/wong-sync/references/payload-manifest.md`, `payload-files.json` (`seededBySetup`)
- `wiki/development/loosened-checks.md`, `wiki/stack/company-api.md`, `CHANGELOG.md`

## Decision log

- **2026-10-14** — Asked whether to plan all findings as one change or start with a subset → chose one change.
- **2026-10-14** — Asked (unprompted note from the user) about Claude's safety prompts → *"don't worry that much about safety checks one is fine"*; dropped the README install-wording and the Connect popup "go ahead" hint.
- **2026-10-14** — Assumed: the install program is a source-only setup script that `/apply` runs inside setup's normal plan, because the skill requires the normal workflow and thread #997 asked for exactly this program.
- **2026-10-14** — Assumed: the project's tools find the sign-in by falling back to setup's per-company folder named by the project's recorded address, not by a new pointer file, because the git helper already finds it that way and computers already connected are fixed without running setup again.
- **2026-10-14** — Assumed: publishing switches only the primary checkout, only when it is clean and still on the merged branch, because a linked worktree holding `main` would block the primary one from it later.
- **2026-10-14** — Assumed: the missing-company-actions line goes to the error output with exit 0, because the memory actions in the same list still work.
- **2026-10-14** — Check: `.github/scripts/loosened-checks.mjs` passes a branch whose base holds no files without reading it, because an empty first commit has no check to loosen (design decision 2); its quieter Git reads and skipped folder links change no verdict.
- **2026-10-14** — Assumed: provisioning refreshes the generated binding types right after it writes the project's settings, because that is the moment they change.
- **2026-10-14** — Assumed: inside a downloaded copy, signing in to a different company without `--state` is refused, because it would overwrite the saved sign-in the copy's git updates use. Archive checkpoint: archived by /ship on branch `improve-install-setup`.

<!-- end proposal.md -->
<!-- file design.md utf8 8604 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 4231 -->
# Tasks

## 1. The install program (setup skill)

- [x] 1.1 Move `targetFiles` from `scripts/check-target-app.mjs` into `.agents/skills/wong-setup/scripts/install.mjs` and import it back; verify `scripts/tests/check-target-app.test.mjs` passes unchanged.
- [x] 1.2 Write `install.mjs` by design decision 1, with templates in `.agents/skills/wong-setup/references/seed/` (`wiki-README.md`, `wiki-development-README.md`, `gitignore`, `openspec-config.yaml`); verify by running it into an empty temp folder and seeing the JSON report, three links passing `test -L`, and the install record's version and commit.
- [x] 1.3 Write `scripts/tests/setup-install.test.mjs`: it refuses a folder with files, never overwrites, stops on a refused link, writes every `seededBySetup` path, and each seed hub links every shipped page under it; verify all cases pass.
- [x] 1.4 Point `wong-setup/SKILL.md`'s install section and the payload manifest's agent-folder and install-record sections at the program, cutting the restated steps; verify `node scripts/check-payload-links.mjs` passes.

## 2. Provisioning and tools (setup skill)

- [x] 2.1 In `provision.mjs`, refresh the binding types after writing `app/wrangler.jsonc` by design decision 3; verify in `scripts/tests/provision.test.mjs` that the types command runs after the config write, and that its failure is a warning.
- [x] 2.2 Set `app/package.json` `engines.node` to `^22.22.2 || ^24.15.0 || >=26.0.0`. Change `tools.md`'s Node row to check against the source app's `engines.node`; verify `npm ci` in `app/` on the pinned Node prints no `EBADENGINE`.

## 3. Loosened-check guard (CI scripts)

- [x] 3.1 Add the empty-base pass, the quiet `git show`, and the regular-files-only untracked read to `.github/scripts/loosened-checks.mjs` by design decision 2; verify the new cases in `scripts/tests/loosened-checks.test.mjs`: settings added onto an empty first commit pass with the line, a `--worktree` run with an untracked `.claude` folder link and a new `package.json` prints no `fatal:` and does not crash, and the existing cases still fail where they did.
- [x] 3.2 Add the first-change rule to `wiki/development/loosened-checks.md`; verify the wiki check passes.

## 4. Save and ship (delivery skills)

- [x] 4.1 In `ship.mjs` `prepare`, restart and wait for a cut-off default run once by design decision 4; verify in `scripts/tests/ship-publish-artifacts.test.mjs` that cut-off then pass continues to archive, and cut-off then fail stops.
- [x] 4.2 In `merge.sh`, switch a clean primary checkout off the merged branch by design decision 5; verify in `scripts/tests/ship-merge.test.mjs` the three cases: clean primary is switched, dirty primary is left with `synced=ref`, linked worktree is left.
- [x] 4.3 In `checkpoint.mjs`, give the missing message and summary files the plain cause by design decision 6; verify in `scripts/tests/checkpoint.test.mjs` that the error names the deleted-on-pass cause.

## 5. Connect and company actions (employee scripts)

- [x] 5.1 In `scripts/employee-bootstrap.mjs`, add the install-state fallback and the post-install check by design decision 7; verify in `scripts/tests/employee-bootstrap.test.mjs` that after `install`, a client rooted in the downloaded folder with no `--state` reads the saved origin, and a mismatched state keeps *Nothing else is needed* out of the summary.
- [x] 5.2 Report a reused sign-in by design decision 8; verify a test where no login link fires gives `signIn: 'reused'` and a summary naming the email, and one where it fires gives `new`.
- [x] 5.3 In `scripts/company-api.mjs`, print the missing-company line by design decision 9; verify in `scripts/tests/company-api.test.mjs` that a list with no sign-in writes the line to stderr, exits 0, and still lists memory actions.
- [x] 5.4 Name the fallback and the reuse line in `wiki/stack/company-api.md`; verify the wiki check passes.

## 6. Release

- [x] 6.1 Write the `## Next (minor)` entry at the top of `CHANGELOG.md` in plain words; verify it names each person-visible change in the proposal.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` as the pre-check (done; `/save` left to /ship), then `/save`; verify the gate passes and the preview opens.

<!-- end tasks.md -->
<!-- file specs/agent-api-discovery/spec.md utf8 1544 -->
## MODIFIED Requirements

### Requirement: One helper describes company and memory operations without combining authority

The helper SHALL provide one bounded, filterable catalogue and selected-operation descriptions for live company actions and installed memory read operations. Every description SHALL identify its source, transport, required authentication, input/output schemas, effect and contract revision. Installed-client operations SHALL NOT be presented as deployed HTTP endpoints in OpenAPI. Company operations SHALL NOT override the memory namespace or select arbitrary local commands. Memory discovery and calls SHALL remain usable independently of company login; knowing a schema SHALL NOT establish an authorized connection. A combined list that could not reach the company SHALL also say so in one plain line outside its result, naming the sign-in step.

#### Scenario: A task needs both company information and remembered context

- **WHEN** an agent lists and describes company and memory operations through the helper
- **THEN** it receives the relevant contracts through one interface with distinct sources and authentication requirements, without loading every schema or receiving credentials

#### Scenario: Company login is unavailable

- **WHEN** the agent lacks company login but its installed memory credential is valid
- **THEN** it can still discover and use the described memory reads, the unavailable company connection is reported separately, and a plain line says company actions are missing and how to sign in

<!-- end specs/agent-api-discovery/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 3009 -->
## MODIFIED Requirements

### Requirement: A loosened check needs a recorded reason

The test check SHALL fail when a branch turns a check off, deletes a test without moving it, changes a check's settings, or changes the steps or expectations of a kept check or removes one, unless a proposal the branch adds or changes, active or archived, names that file in a `Check:` Decision-log bullet. Every workflow file and every file of a shared workflow action SHALL count as a check's settings. A kept check SHALL NOT be flagged when the branch adds it, moves it unchanged, changes only its recording details, or rewrites or removes the promise it points at. A branch whose base holds no files SHALL pass with a line saying there was nothing to loosen. The run on uncommitted work SHALL read only regular files, skipping links and folders, and SHALL print no Git error for a file that is new. Its failure SHALL name each unexplained file and how to pass.

#### Scenario: A skip with no reason

- **WHEN** a branch adds a mutation-testing skip comment to a source file with no `Check:` bullet naming it
- **THEN** the check fails and names the file

#### Scenario: A recorded reason passes

- **WHEN** the Decision log adds a `Check:` bullet naming that file
- **THEN** the check passes and lists the file as explained

#### Scenario: A workflow other than the test workflow

- **WHEN** a branch removes a lint step from the payload workflow with no `Check:` bullet naming it
- **THEN** the check fails and names that workflow file

#### Scenario: A kept check loses an expectation

- **WHEN** a branch removes one expectation from a kept check whose promise it leaves alone, with no `Check:` bullet naming the file
- **THEN** the check fails and names the kept check's file

#### Scenario: A kept check is deleted

- **WHEN** a branch deletes a kept check whose promise still stands in the specs, with no `Check:` bullet naming the file
- **THEN** the check fails and names the kept check's file

#### Scenario: A kept check follows its rewritten promise

- **WHEN** a branch rewrites a scenario's `THEN` and re-records that scenario's kept check
- **THEN** the check does not flag the kept check's file

#### Scenario: A new kept check

- **WHEN** a branch adds a kept check, or re-keeps one with the same steps and expectations
- **THEN** the check does not flag the file

#### Scenario: A shared workflow action

- **WHEN** a branch edits a file of a shared workflow action with no `Check:` bullet naming it
- **THEN** the check fails and names that file

#### Scenario: A new install's first change

- **WHEN** a branch adds every settings file onto an empty first commit
- **THEN** the check passes, says there was nothing to loosen, and asks for no reason

#### Scenario: Uncommitted work with folder links

- **WHEN** the check runs on uncommitted work that holds a new `.claude` link to a folder and new settings files
- **THEN** it reads past the link, prints no Git error, and reports only real findings

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 1945 -->
## MODIFIED Requirements

### Requirement: Ship leaves the checkout in sync

After the merge, `/ship` SHALL fast-forward the default branch of the primary checkout and prune stale remote refs. When no checkout holds the default branch and the primary checkout is clean and still on the merged branch, `/ship` SHALL switch it to the updated default branch. It SHALL NOT otherwise check out or switch a branch, and SHALL never stash, reset, force, or delete a local branch. A sync that cannot finish SHALL be one line in the report, never a failed ship.

#### Scenario: The checkout cannot fast-forward

- **WHEN** the checkout that owns the default branch is dirty, on another branch, or diverged
- **THEN** it is left untouched and the ship still reports success with the reason

#### Scenario: Work done straight in the project folder

- **WHEN** a person shipped from the primary checkout on the change's branch, with nothing unsaved
- **THEN** the folder is on the default branch at the merged commit when the ship reports

#### Scenario: A linked worktree on the merged branch

- **WHEN** the ship ran from a linked worktree on the change's branch
- **THEN** that worktree's branch is left as it is

## ADDED Requirements

### Requirement: Ship starts a cut-off default-branch run again

When the default branch's last check run was cut off rather than failed, `/ship` SHALL start it again once, wait for it, and continue on a pass, with no step left for the assistant. A second cut-off or a failure SHALL stop the ship with the reason.

#### Scenario: The empty first commit's run was cut off

- **WHEN** a new install publishes its first change and the default branch's only run reads cut off
- **THEN** the ship restarts it, waits, and goes on to archive and save without stopping

#### Scenario: The restarted run fails

- **WHEN** the restarted run ends failed
- **THEN** the ship stops and says the default branch's checks are failing

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/employee-onboarding/spec.md utf8 1439 -->
## MODIFIED Requirements

### Requirement: Setup ends with memory and project updates working

Setup SHALL leave the person's copy with memory, plain git and the project's own company tools working through the same sign-in, with no option to pass. Its final report SHALL say in plain words who is signed in, which apps work, that memory and updates work, and that nothing else is needed, and SHALL say *nothing else is needed* only after the copy's own tools find the saved sign-in. When setup reused a sign-in this computer already held, the report SHALL say so and name its email. The report SHALL NOT tell the assistant to run a further command, and SHALL NOT mention an environment file or a key.

#### Scenario: A teammate finishes setup

- **WHEN** a teammate with Project code finishes setup in an empty folder
- **THEN** the report says they are done, memory loads in their next chat, and a new worktree starts from the newest version

#### Scenario: The project's tools right after setup

- **WHEN** setup has downloaded the project and the person runs the project's own status, list or call command in it with no extra option
- **THEN** the command uses the sign-in setup saved

#### Scenario: A computer already signed in

- **WHEN** setup runs on a computer that already holds a valid sign-in to the business
- **THEN** no sign-in link is shown, and the report says it used this computer's existing sign-in and names its email

<!-- end specs/employee-onboarding/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 3887 -->
## MODIFIED Requirements

### Requirement: Setup readies the computer first

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. A Node.js older than the version range the source app's packages accept SHALL count as missing, and the question SHALL offer to update it. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged. A tool setup installed in the person's own folder SHALL be found by a later chat in the installed repo, in Claude Code and in Codex, however the assistant was started, with no command typed and nothing removed from the person's own files.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

#### Scenario: The helpers come with the one question

- **WHEN** setup runs where the browser tool and the tunnel tool are absent and the person says yes to its install question
- **THEN** both are installed, and no later step asks to install either

#### Scenario: A helper fails to install

- **WHEN** the browser tool or the tunnel tool fails to install during setup
- **THEN** setup names it, says it will be offered again at first need, and continues

#### Scenario: Tools in the person's own folder, in a later chat

- **WHEN** setup installed its tools in the person's own folder on Linux, and a new chat opens in the installed repo from an app that was started before the install
- **THEN** that chat's commands find the tools, and its memory loads

#### Scenario: Node is the right major but too old for the app

- **WHEN** the computer has Node 24.13 and the app's packages accept Node 24 only from 24.15
- **THEN** setup's one install question offers a newer Node, and the install that follows prints no engine warning

### Requirement: A finished install is whole and recorded

A completed install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit. One install program shipped with setup SHALL put the payload, the links, the hubs, the ignore rules, the rules file and the install record in place, the same on every install, and SHALL stop with nothing half-written reported as done when a link can not be made or a source file is missing. The first save SHALL carry the app's generated binding types as they match the project's own settings.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

#### Scenario: The assistant writes no copy step of its own

- **WHEN** setup installs into an empty folder
- **THEN** the files arrive through the shipped install program, and the wiki link check passes on the result

#### Scenario: Publishing finds nothing left over

- **WHEN** the first change is published after provisioning
- **THEN** no generated file shows as changed in the folder

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-14

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 50622 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-14-smoother-install-and-connect</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .tag.check { border:2px dotted #333; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-14-smoother-install-and-connect">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-14-smoother-install-and-connect</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Two real runs on 2026-10-14, a fresh install and a teammate's Connect your assistant, both worked, but each hit snags a newcomer can't get past alone. On the install, the assistant improvised its own copy step, wrote 24 made-up reasons to pass a check, and restarted a stuck check run by hand. After publishing, it left the folder on an old branch. On connect, the project's own tools couldn't find the sign-in that setup had just saved, while setup said nothing else was needed.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Setup puts the files in place with one ready-made step.</b> The assistant no longer writes its own copy script. One step copies everything, makes the folder links, the wiki's starting pages and the ignore rules, and writes the install record, the same way on every install. The assistant still plans and reports as before; only the hand-work goes.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">    BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">read 5 docs ─▶ write    one install step</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">a copy script ─▶ run    ─▶ files, links,</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">─▶ hand-write hubs,        wiki hubs, record</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">ignore rules, record       ─▶ provision</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">─▶ provision               ─▶ first save</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">─▶ first save</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A new install's first save passes the loosened-checks check.</b> Nothing existed before the first change, so nothing can have been weakened. The check says so and passes, instead of asking for a reason per settings file. Its quick run on your computer also stops crashing on brand-new files and on the folder links.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The first save already matches your project's settings.</b> Setup refreshes one generated file to fit your project, so it no longer turns up as a stray change at publish time.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Publishing restarts a cut-off check run by itself.</b> When Cloudflare cuts off the main branch's last check run, publishing starts it again, waits, and carries on. The assistant no longer stops to do that by hand.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>After publishing, your folder is on the live version.</b> When you work straight in the project folder and nothing is unsaved, publishing switches it to <code>main</code>, the version that went live. Before, it stayed on the old branch.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A save explains a missing summary file.</b> A passing save deletes its summary file. A second save that reuses it now says so and asks for a new one, instead of a bare &quot;no such file&quot;.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The project's own tools find your sign-in right after connect.</b> After the setup link signs you in and downloads the project, the project's tools work at once. Before, they said <i>Connect first</i> unless given a long hidden folder path. Setup checks this before it says nothing else is needed.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Connect says when it reused a sign-in, and whose.</b> If this computer was already signed in, the report says <i>Used this computer's existing sign-in as &lt;email&gt;</i>. That way a shared computer can't silently connect as someone else.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>Listing actions says when the company ones are missing.</b> When you're not signed in, the list still shows memory actions, and now also prints a plain line saying the company actions are missing and how to sign in.</div></div></li>
<li class="item card" id="item-10"><span class="num">10</span><div class="body"><div class="text" data-note="item-10" tabindex="0"><b>Setup asks for a new enough Node.</b> The tool check now asks for the Node version the app's packages accept (24.15 or later on Node 24), not just the major version. Older versions printed warnings on every install.</div></div></li>
</ol>
<p class="aside">Non-goals: wording around Claude's safety prompts (the user said one prompt is fine); the cost of the check runs themselves; documents search setup on connect.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked whether to plan all findings as one change or start with a subset → chose one change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-14</p>Asked (unprompted note from the user) about Claude's safety prompts → <i>&quot;don't worry that much about safety checks one is fine&quot;</i>; dropped the README install-wording and the Connect popup &quot;go ahead&quot; hint.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the install program is a source-only setup script that <code>/apply</code> runs inside setup's normal plan, because the skill requires the normal workflow and thread #997 asked for exactly this program.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the project's tools find the sign-in by falling back to setup's per-company folder named by the project's recorded address, not by a new pointer file, because the git helper already finds it that way and computers already connected are fixed without running setup again.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: publishing switches only the primary checkout, only when it is clean and still on the merged branch, because a linked worktree holding <code>main</code> would block the primary one from it later.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: the missing-company-actions line goes to the error output with exit 0, because the memory actions in the same list still work.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-14</p>Check: <code>.github/scripts/loosened-checks.mjs</code> passes a branch whose base holds no files without reading it, because an empty first commit has no check to loosen (design decision 2); its quieter Git reads and skipped folder links change no verdict.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: provisioning refreshes the generated binding types right after it writes the project's settings, because that is the moment they change.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-14</p>Assumed: inside a downloaded copy, signing in to a different company without <code>--state</code> is refused, because it would overwrite the saved sign-in the copy's git updates use. Archive checkpoint: archived by /ship on branch <code>improve-install-setup</code>.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
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
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
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
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
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
    fit(d); bar();
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

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
