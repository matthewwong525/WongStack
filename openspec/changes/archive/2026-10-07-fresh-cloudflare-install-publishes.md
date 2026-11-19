<!-- openspec-archive v1 2026-10-07-fresh-cloudflare-install-publishes -->
<!-- file proposal.md utf8 12504 -->
# A new Cloudflare-only install saves and publishes the first time

**Status:** ready-to-ship

**Branch:** wongstack-install-team-access

**Open questions:** none

## Why

On 2026-10-07 a real test install of the published version, kept in Cloudflare alone, was set up correctly and then could not go live. Its first save failed, and so would everyone's: four separate faults stood between a new owner and their site, and each needed a fix by hand that no newcomer could make.

## What Changes

- **A new install's first save gives a preview, and its first publish goes live, with no fix by hand.** The four faults below are what stopped it.
  ```text
    BEFORE
  install ─▶ save ─▶ checks ─▶ preview
                       │ fail, every time
                       ▼
                    stuck

    AFTER
  install ─▶ save ─▶ checks ─▶ preview ─▶ live
  ```
- **The new install passes its own tests.** Today its tests look for two sample apps and a sample skill that only WongStack's own copy has, so they fail on day one. The tests an install receives will need only what the install receives.
- **The preview builds on an install kept in Cloudflare.** Today the last step before a preview rejects the part of the app that hands the project to a teammate, because two descriptions of the same Cloudflare connection disagree. The part works when it runs; the description is what gets fixed. The earlier checks will also catch this kind of disagreement, so it fails early and says why.
- **A change that passed its checks is not failed by the checker's own lost files.** Today the checker sometimes loses some of the app's packages between checking a change and building its preview, a different one each time. It will fetch the packages again before it builds.
- **A check run that Cloudflare cuts off is run again, not counted as a failure.** Today one cut-off run on the brand-new project blocks every publish for good, because nothing can start that run again. A cut-off run will be tried again by itself, reported as *cut off* and not *failed* if it still does not finish, and your assistant will be able to start it again.
  ```text
    BEFORE                AFTER
  run ─▶ cut off        run ─▶ cut off
           │                     │
           ▼                     ▼
        "failed"          +tries again ─▶ result
           │                     │ still cut off
           ▼                     ▼
     publish blocked      +"cut off", and can
       for good            +be started again
  ```
- **WongStack tests itself as an install does.** A new check builds the app from exactly the files an install receives, set up as a Cloudflare-only install, and runs its tests. Two of the four faults could not be seen from WongStack's own copy; this check is what would have caught them before release.

**Non-goals:** The smaller stumbles the same test found, listed in the design as follow-ups. The reason the checker loses files, which sits in Cloudflare's own tool; this change stops depending on it and does not repair it. Installs kept on GitHub, whose saves and publishes already work. Giving the sample apps to new installs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `artifacts-install`: a new install's first save and publish succeed unaided; a passing commit's preview is built from freshly installed packages; an interrupted check run is retried, reported apart from a failure, and can be started again.
- `app-scaffold`: the tests a target receives pass with only the files a target receives.
- `payload-checks`: WongStack's own checks build and test the app as an Artifacts-route target receives it.

## Impact

- **App (payload)**: `app/worker/employee-access/code.ts` (the binding's declared type); the shipped tests that name `tips`, `sample` or `sample-report`, among them `app/worker/index.test.ts`, `app/worker/employee-access/seed.test.ts`, `app/src/pages/home/AppList.test.tsx`.
- **Check runner (payload)**: `scripts/check-runner/pipeline.mjs` and `worker.mjs`; existing Artifacts installs get the new runner when `/wong-sync` reinstalls it.
- **Shared checks (payload)**: `.github/scripts/checks.mjs` or `scripts/cf-build.sh`, so the checks stage builds against freshly generated binding types on both routes.
- **Verbs (payload)**: `.agents/skills/save/scripts/artifacts-run.mjs`, `.agents/skills/ship/scripts/ship.mjs` and `publish-artifacts.sh` read and restart a cut-off run.
- **Meta-only**: a new `scripts/check-target-app.mjs` with its test, wired into the workflow that runs when `app/` or the payload inventory changes.
- **Wiki**: `wiki/stack/artifacts-route.md` (the check runner, a cut-off run), `wiki/maintaining/test-a-setup-change.md` (what the new check covers and what still needs a real install).
- **Release**: a `patch` changelog entry. An install kept in Cloudflare takes the new checker on its next update, with nothing to do by hand.
- **Proof**: one throwaway Artifacts install in a real Cloudflare account, removed afterwards; it needs the owner's Cloudflare token.

## Decision log

- **2026-10-07** — Asked whether to plan the fixes for the four blockers as one change → chose yes, one plan.
- **2026-10-07** — Assumed: new installs still do not receive the sample apps or the sample skill, because the payload inventory leaves them out on purpose and says so; the tests change, not what ships.
- **2026-10-07** — Assumed: the checker fetches the app's packages again before every preview and live build, because the files it carries between steps arrived incomplete twice in two runs, and five runs in a row passed in the test install once it did.
- **2026-10-07** — Assumed: the package fetch runs without the publishing key in reach, because that step holds the key and a package's install script must not see it.
- **2026-10-07** — Assumed: a cut-off run is tried again up to three times inside the same run before it is reported as cut off, because the existing single retry was used up on the test install's first run.
- **2026-10-07** — Assumed: a run that is still cut off reads as *could not be checked*, so a save carries on and a publish stops, because that is the existing rule for a result that can not be read.
- **2026-10-07** — Assumed: starting a cut-off run again restarts the same run under the same name, because a result must keep belonging to one exact commit; whether the saved Cloudflare token may do that is checked on the real install first, and the widen gains the permission if not.
- **2026-10-07** — Assumed: the new self-test runs only when the app or the list of shipped files changed, because a check runs only when its kind of file changed.
- **2026-10-07** — Assumed: this is a `patch` release, because every shipped edit repairs behaviour that was already promised.
- **2026-10-07** — Assumed: the smaller stumbles from the same test stay out of this plan, because the four blockers were what was asked for; the design lists them as follow-ups.
- **2026-10-07** — Asked what to do with the finished plan → chose to build and publish.
- **2026-10-07** — Assumed: the check of whether the saved token may restart a run moves from the start of the verb work to the real test install at the end, because it needs a live install and all source and tests are written before any check runs; the restart is built as designed and the permission added there if refused.
- **2026-10-07** — Shipped tests that needed a source-only app or skill, found by reading each test that names `tips`, `sample` or `sample-report`: `app/worker/employee-access/seed.test.ts` (the seeded areas, sets and the sample skill), `app/src/apps/access/App.test.tsx` (the tip calculator's title, and its greyed card on Home), `app/src/components/AssistantSetup.test.tsx` (the tip calculator's title), `app/worker/index.test.ts` (asset paths under `/apps/tips/`, which passed either way and now name `hello`), and `app/src/pages/home/Home.test.tsx` (it pressed the first greyed card, and an install has none; the new self-test found this one). Each now reads the app registry or names `hello` and `access`; the sample cases moved to `app/worker/apps/sample/seed.test.ts`, inside an excluded folder. Left alone as fixtures that only reuse the name: `app/src/pages/home/AppList.test.tsx`, `app/worker/api/contract.test.ts`, `app/worker/api/discovery.test.ts`, and the Access screens' status fixtures (`Grants`, `Roles`, `PersonPage`, `Skills`, `Leaving`, `levels`, `subjects`).
- **2026-10-07** — Assumed: a check run whose Workflow errored or was terminated, and one that never got its turn, read as *cut off* too and not *failed*, because none of them shows the commit failing a check and the plan's own acceptance terminates a run and expects *cut off*; only a run the checker itself reported as interrupted is started again by the waiter, so a run stopped by hand stays stopped until asked.
- **2026-10-07** — Assumed: the package fetch in the build step runs with every `CLOUDFLARE_*` setting removed, not only the two named, because the promise is that no Cloudflare credential is readable there.
- **2026-10-07** — Assumed: the new self-test runs from the shared check command on both the online run and the pre-check on this computer, not from a new workflow step, because that command already runs WongStack's other own checks that way and one place keeps the two runs from disagreeing.
- **2026-10-07** — Assumed: the binding types are regenerated only in the online checks, never in the pre-check on this computer, because regenerating there would rewrite a committed file in the working folder.
- **2026-10-07** — The earlier gates in tasks 2.1, 2.3 and 3.x that said to run a test moved to the final verification, with every acceptance kept.
- **2026-10-07** — Check: `.github/scripts/checks.mjs` gains two steps and loosens none: it regenerates the binding types before the app suite in CI, and runs the app as an install receives it, because two faults in 37.2.3 were invisible to the checks as they stood.
- **2026-10-07** — Assumed: the install-shaped check is proven by one run each way, because against 37.2.3's app it ended `TARGET_APP=fail (tests)` on `worker/index.test.ts(26,79): error TS2345`, and against the fixed app `TARGET_APP=pass`; the type check stops the unfixed run before its tests, so the sample-app fault was shown by the same check during the build, on `Home.test.tsx`.
- **2026-10-07** — Saved after the build: every source and test task is done and the local checks pass; left is the real test install in a Cloudflare account, which needs the owner's token.
- **2026-10-07** — Asked for a new Cloudflare token for the proof install → chose "can you generate one yourself and try it". Cloudflare refuses a token that makes token-managing tokens (`sub-token is not allowed to have permissions to manage other tokens`), so the install used the token saved for WongStack; setup added no permission to it.
- **2026-10-07** — Assumed: the proof install (`wong-e2e-test2`, since removed) proves the change, because its first save passed in one run with no hand edit (deploy stage 99 s), it published and went live private, a second change published, and a terminated run read as cut off, restarted with the user token (HTTP 200, `queued`) and then passed for the same commit. No permission is added to the widen.
- **2026-10-07** — Assumed: a command that ran to its end is also known by `[diagnostic truncated]`, the output headings and the wrapped error, because on the proof install a failing test with long output read as cut off: the SDK keeps only the last 20,000 characters, and the exit-code line goes with the start. With the fix on the same install a failing test read `FAILURE` with its output, and its restart was refused.
- **2026-10-07** — Assumed: a run still going is waited for when Cloudflare flags its answer, because the proof install answered HTTP 200 with error 10001 beside `status: running` and the save gave up; a flagged answer still never counts as a pass.
- **2026-10-07** — Archived for publishing: every task is done, the checks passed on the saved work, and the proof install saved, published and was removed.
- **2026-10-07** — Archive checkpoint: another release took 37.2.4 while this was checked, so the main line was brought in and this became 37.2.5; five app tests timed out locally under load and passed when run alone.

<!-- end proposal.md -->
<!-- file design.md utf8 10086 -->
# Design

## Context

See proposal.md for the motivation. The evidence is one throwaway Artifacts-route install of 37.2.3 (`wong-e2e-test`, 2026-10-07, since removed), walked by [test a setup change](../../../wiki/maintaining/test-a-setup-change.md). What it showed:

1. **Tests need excluded files.** `payload-files.json`'s `scaffold.exclude` drops `app/src/apps/tips`, `app/worker/apps/tips` and `app/worker/apps/sample`, and the `sample-report` skill is unlisted, yet shipped tests need them: `Test Files 4 failed | 44 passed`, such as `expected [ 'Hello', 'tips' ] to deeply equal [ 'Hello', 'Tip calculator' ]`, and `seed.test.ts` `expected [] to deeply equal [ { id: 'sample-report', … } ]`. No check builds the app from the target's file set.
2. **Binding type conflict.** Provisioning adds the `ARTIFACTS` binding to the target's `app/wrangler.jsonc`. The deploy stage's `cf-build.sh` runs `wrangler types`, so `Env.ARTIFACTS` becomes Cloudflare's `Artifacts`, whose `ArtifactsRepo` declares no `info()`. `code.ts` declares `ARTIFACTS?: CodeBinding` with `info()`, so `tsc -b` fails: `worker/index.test.ts(26,79): error TS2345 … Property 'info' is missing in type 'ArtifactsRepo'`. The checks stage and the local pre-check compile against the committed `worker-configuration.d.ts`, which has no such binding, and pass. `repo.info()` works at runtime: a teammate's Connect download went through it.
3. **Lost packages.** The deploy stage starts from the snapshot the checks stage left (`@cloudflare/ci` 0.2.0, `@cloudflare/sandbox` 0.12.5, `createBackup` then `restoreBackup`). Two runs of one passing commit failed there on different packages: `Cannot find module 'cn'`, then `Cannot find module 'react'`. The SDK checks tracked source out again after a restore, so only untracked files, `node_modules` above all, are exposed.
4. **A cut-off first run.** The empty first commit's run on `main` ended `checks failed: OperationInterruptedError: The sandbox container stopped while the operation was pending.` `pipeline.mjs` allows one interruption retry a run, shared by its stages. `ship.mjs prepare` then stops on `DEFAULT_CHECKS=failure`, and a run's id is its commit and branch, so nothing starts it again.

## Goals / Non-Goals

**Goals:**

- A fresh Artifacts install reaches a checked preview and a live site with no hand edit.
- Each fault has a test that fails without its fix.
- The meta-repo, a GitHub install, can see faults that only an Artifacts target has.

**Non-Goals:**

- Repairing the SDK's snapshot. It is reported upstream as a follow-up.
- Changing the GitHub route's workflows beyond the shared checks.
- The follow-ups listed at the end.

## Decisions

### The binding is declared as what the code checks, not what Cloudflare types

`CodeEnv.ARTIFACTS` becomes `unknown`. `codeSource` already reads it with `Reflect.get` and narrows it through the `binding()` guard, so the declared type adds nothing, and `Env & object` is assignable whatever `wrangler types` generates. `CodeBinding` stays as the guard's result type.

*Over `CodeBinding | Artifacts`* (the test's workaround): that names a generated global, and breaks again the day Cloudflare's type changes shape.

### The checks stage compiles against freshly generated binding types

The types are regenerated before the app suite and the plain build in the checks stage, on both routes, when the app has a wrangler config. `cf-build.sh` already does so for the deploy build; the regeneration moves to one function both paths call. A mismatch then fails in checks, where the save reports it, and the deploy stage can no longer fail on types the checks passed.

The committed `worker-configuration.d.ts` is untouched: the regenerated file lives in the run's workspace only. `wrangler types` reads the config and needs no credential.

### The deploy stage installs packages again, without the credential

`DEPLOY` runs `npm ci` in the app folder before `cf-secrets.mjs check`, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` removed from that one command's environment. Install scripts are project code; the spec's line between the deploy credential and the project's own code holds for them.

*Over checking the restored tree and reinstalling only when it is short*: no cheap check proves a tree complete, and the two failures lost different files. *Over dropping the snapshot between checks and deploy*: the SDK chains runners through it, and the built output is not needed since deploy rebuilds.

Cost: one install inside the 10-minute deploy bound. The five passing runs of the test install took it without nearing the bound; the unit test pins the order and the scrubbed environment, and the real install measures the time.

### An interruption gets three tries, then its own result

`pipeline.mjs` raises the shared interruption budget from one to three. When a stage still ends interrupted, the outcome is `result: 'interrupted'` with its stage, not `failure`. `artifacts-run.mjs` maps it to `UNKNOWN` with the line *the check run was cut off*, so by the existing rule a save carries on and a publish stops. `ship.mjs prepare` treats an interrupted `main` as unreadable, not failing, and its `NEXT:` names the restart.

The 30-minute promise becomes *30 minutes of stages, plus the stages an interruption repeats*; `artifacts-route.md` says so.

### A cut-off run is restarted under its own name

`artifacts-run.mjs restart <sha> <ref>` restarts that run's Workflow instance through Cloudflare's instance-status call, refusing any run that is not `interrupted`, `errored` or `terminated`. The id is unchanged, so every reader still finds the run by commit and branch. The waiter restarts an interrupted run once by itself before reporting `UNKNOWN`.

*Over a new id per attempt*: every reader would need to follow a chain, and a result would stop belonging to one name. *Over pushing an empty commit*, the test's workaround: it moves `main`, which made the pending publish refuse and cost another save.

The restart call's permission is the one fact not yet observed. The first task of that group checks it against a real install; if the user token is refused, `widen --route artifacts` gains the missing group, reported with the rest.

### Shipped tests name only shipped apps

Each failing shipped test is rewritten against `hello` and `access`, or against the app registry itself, and the cases that need `tips`, `sample` or `sample-report` move into test files under those apps' own excluded folders, or beside the unlisted skill. No shipped test imports from an excluded path. The 100% coverage gate must still pass in both shapes: the meta-repo with the sample apps, a target without.

*Over shipping the sample apps*: the inventory leaves them out on purpose, and a newcomer's home page would open with two apps to delete.

### One meta-only check builds the target's app

`scripts/check-target-app.mjs` copies the files `payload-files.json` lists, minus its excludes, into a temporary folder, writes the Artifacts-route wrangler config with placeholder ids through the same function provisioning uses, links the meta-repo's installed `app/node_modules`, regenerates the binding types, and runs the app's `npm test`. It reaches nothing live and leaves nothing behind.

It runs in the workflow that already runs the app suite, when `app/` or the payload inventory changed. Its own test proves it refuses: a fixture with a test that imports an excluded path, and one whose binding type conflicts.

*Over a step in the payload workflow*: that workflow installs no app dependencies, and the app workflow already has them.

## Risks / Trade-offs

- [The restart call needs a permission the token lacks] → checked first on the real install; the widen gains it, and existing installs get it on the update's re-provision.
- [`npm ci` in deploy slows every save by its install time] → measured on the real install; the lost-file failure it removes cost a whole run each time.
- [Regenerated types differ between routes, so a GitHub install could fail its checks on a type the committed file hid] → that is the fault class this closes; the target check runs the GitHub shape's suite too if the first run shows a difference.
- [A test moved into an excluded folder stops guarding the shipped registry] → the registry-driven rewrite keeps the shipped assertion; the target check proves the suite still passes at 100% coverage without the sample apps.
- [The real install is the only proof of the runner changes] → it is a named task with the owner's token as its prerequisite; without it the change stays unpublished.

## Migration Plan

A `patch` release. A new install gets everything at setup. An existing Artifacts install gets the app and verb changes through `/wong-sync`, which reinstalls the runner when its files change. Nothing is migrated and nothing is removed. Rolling back is reverting the release; a runner already reinstalled keeps working with the older verbs, which read `interrupted` as an unknown result word and report it unverifiable.

## Follow-ups, not in this change

From the same test, each its own small change:

- Setup's `/explore` and `/plan` steps name scripts under the target, which has none yet.
- Nothing ships to copy the payload, write the install record, or seed the two wiki hubs; the assistant improvised all three.
- The provision report: two keys (`-access`, `-cloudflare-read`) missing from `names` and from the Artifacts teardown list, no `access.mode` field, and `appUrl` printed with a one-use login value.
- `cf-preview.sh` from the host returns no link on a new install.
- `checkpoint.mjs` deletes its summary file, so a second run stops on `--summary-file: no such file`.
- `loosened-checks.mjs --worktree` ends `EISDIR` on an uncommitted `.claude` link.
- The live look reports HTTP 503 seconds after a first deploy.
- A refused company action reads *Invalid live company operation*.
- Connect signs in silently when the computer holds a sign-in to the same Cloudflare login.
- Report the snapshot's lost files to Cloudflare.

<!-- end design.md -->
<!-- file tasks.md utf8 5929 -->
# Tasks

## 1. App: the binding type and the shipped tests

- [x] 1.1 In `app/worker/employee-access/code.ts`, declare `CodeEnv.ARTIFACTS` as `unknown` and keep `CodeBinding` as the `binding()` guard's result; add a type-level test that an `Env` whose `ARTIFACTS` is Cloudflare's generated `Artifacts` is accepted where `ConnectionEnv` is asked for. Verify by source review that no other file declares the binding's shape.
- [x] 1.2 List every shipped test that names `tips`, `sample` or `sample-report` and needs the app or skill to exist (start from `app/worker/index.test.ts`, `app/worker/employee-access/seed.test.ts`, `app/src/pages/home/AppList.test.tsx`, `app/worker/api/contract.test.ts`); record the list in the Decision log. A fixture string that only reuses the name is left alone.
- [x] 1.3 Rewrite each listed test against `hello`, `access`, or the app registry itself, and move the cases that need a source-only app or skill into test files inside that app's excluded folders, or beside the unlisted skill. Verify by source review that no shipped test imports an excluded path.
- [x] 1.4 Update `payload-files.json` and the payload manifest's mini-apps line for any test file added or moved, so every new file is either listed or under an excluded folder.

## 2. Check runner: packages, interruptions

- [x] 2.1 In `scripts/check-runner/pipeline.mjs`, make `DEPLOY` install the app's packages before `cf-secrets.mjs check`, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` removed from that command; extend `scripts/tests/check-runner.test.mjs` to pin the order and the scrubbed environment.
- [x] 2.2 Raise the shared interruption budget to three, and return `result: 'interrupted'` with its stage when a stage still ends interrupted; add tests for one, three and four interruptions, and for a non-zero exit that is never retried.
- [x] 2.3 Regenerate the binding types before the app suite and the plain build in the checks stage on both routes, through one function `scripts/cf-build.sh` also calls; add a test that the checks stage regenerates and that a repo with no wrangler config skips it.
- [x] 2.4 Update `wiki/stack/artifacts-route.md`: the check runner's stages, the three tries, what *cut off* means and how a run is started again, and the 30-minute bound's new wording.

## 3. Verbs: read and restart a cut-off run

- [x] 3.1 In `.agents/skills/save/scripts/artifacts-run.mjs`, read `interrupted` as `UNKNOWN` with the line *the check run was cut off*, add `restart <sha> <ref>` that refuses any run not interrupted, errored or terminated, and have `wait` restart an interrupted run once; extend `scripts/tests/artifacts-run.test.mjs` for each, the refusal included.
- [x] 3.2 In `.agents/skills/ship/scripts/ship.mjs` and `publish-artifacts.sh`, treat an interrupted `main` as unreadable, not failing, with a `NEXT:` that names the restart; extend `scripts/tests/ship-publish-artifacts.test.mjs`.
- [x] 3.3 Say in the ship skill's Artifacts lines what to do on a cut-off `main`, within the context budget (`node scripts/measure-context.mjs --check`), cutting words elsewhere on the same route if needed.

## 4. Meta-only: test the app as a target receives it

- [x] 4.1 Write `scripts/check-target-app.mjs`: copy the inventory's files minus its excludes to a temporary folder, write the Artifacts-route wrangler config with placeholder ids through provisioning's own function, link the installed `app/node_modules`, regenerate the binding types, run the app's `npm test`, and remove the folder.
- [x] 4.2 Add `scripts/tests/check-target-app.test.mjs` with two fixtures that must fail: a shipped test importing an excluded path, and a binding type that conflicts with the generated one.
- [x] 4.3 Run the check in the workflow that runs the app suite, only when `app/` or `payload-files.json` changed, and add it to `scripts/payload-checks.mjs`'s list or its app-side twin so the local pre-check and the workflow agree.
- [x] 4.4 Add to `wiki/maintaining/test-a-setup-change.md` what this check covers and what still needs a real install, plus two lessons from the 2026-10-07 walk: name the throwaway folder so it cannot match a real install in the same account (never `~/wongstack` on a machine that holds WongStack), and play a teammate under a separate `HOME`, since a saved sign-in to the same Cloudflare login connects silently as the owner.

## 5. Release

- [x] 5.1 Add the `## Next (patch) — …` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: an install kept in Cloudflare gets a new checker on its next update, nothing to do by hand.

## 6. Verification

- [x] 6.1 Run `node .github/scripts/checks.mjs --worktree`; every step passes, the target check included.
- [x] 6.2 Confirm the target check fails on 37.2.3's `code.ts` and tests (the two faults it exists for) by running it against the unfixed files once, then passes on the fixed ones; record both in the Decision log.
- [x] 6.3 `/save`: CI passes on the pushed commit.
- [x] 6.4 With the owner's Cloudflare token, walk one throwaway Artifacts install from this branch by `wiki/maintaining/test-a-setup-change.md`: first save returns a private preview with no hand edit, a deliberately failing test comes back failed with no preview, publish goes live, a second change publishes. Record the deploy stage's time.
- [x] 6.5 On that install, try the Workflow instance restart with the user token and record the answer in the Decision log; if refused, add the missing permission group to `widen --route artifacts` and `permission-groups.md`, with its test, and save again. Then terminate a run mid-stage, confirm it reads as cut off and not failed, restart it, and confirm a result for the same commit; then confirm a restart of a failed run is refused.
- [x] 6.6 Remove the throwaway install by the Artifacts teardown, the `-access` and `-cloudflare-read` keys included, and read each resource back as gone.

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 644 -->
# Spec Delta

## ADDED Requirements

### Requirement: A target's tests need only what a target receives

The tests an install receives SHALL pass with only the files an install receives. No shipped test SHALL depend on an app, skill, or file the payload inventory leaves out.

#### Scenario: A fresh install runs its tests

- **WHEN** `npm test` runs in a freshly installed app, before the person changes anything
- **THEN** every test and quality gate passes

#### Scenario: A source-only app is tested

- **WHEN** a test covers an app that only WongStack's own repository holds
- **THEN** the test lives with that app and is left out with it

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/artifacts-install/spec.md utf8 2260 -->
# Spec Delta

## ADDED Requirements

### Requirement: A new install's first save and publish succeed

A newly set up Artifacts install SHALL pass its own checks, return a preview for its first save, and go live on its first publish, with no edit made by hand to any file setup put there.

#### Scenario: The first save

- **WHEN** a person saves a freshly set up Artifacts install without changing it
- **THEN** its checks pass and the save returns a private preview

#### Scenario: A project kept in Cloudflare is built

- **WHEN** the preview of an install whose project is kept in Cloudflare is built
- **THEN** the build succeeds with the connection to the project's repository in place

### Requirement: A passing commit is built from complete packages

The step that builds a preview or the live site SHALL install the project's packages itself, and SHALL never fail a commit because files carried over from the checks arrived incomplete. The credential that deploys SHALL not be readable while the packages install.

#### Scenario: Carried-over files are incomplete

- **WHEN** a commit passed its checks and the files carried to the build step are missing a package
- **THEN** the build still succeeds and the preview is published

#### Scenario: A package runs a script while installing

- **WHEN** a package's install script reads its environment in the build step
- **THEN** no Cloudflare credential is in it

### Requirement: An interrupted check run is not a failed commit

A check run that Cloudflare interrupts SHALL be tried again without the person asking. A run that still does not finish SHALL be reported as interrupted, never as the commit failing its checks, and the person's assistant SHALL be able to start that same run again.

#### Scenario: The first run of a new project is interrupted

- **WHEN** the check run of a new install's first commit is interrupted and its retries are used up
- **THEN** the result reads as interrupted, a publish says the run was cut off and can be started again, and starting it again produces a result for that same commit

#### Scenario: A run that failed its checks is started again

- **WHEN** a restart is asked for a run whose commit failed a check
- **THEN** it is refused and the failure stands

<!-- end specs/artifacts-install/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 816 -->
# Spec Delta

## ADDED Requirements

### Requirement: The app is tested as an install receives it

WongStack's own checks SHALL build the app from exactly the files a target receives, configured as an install whose project is kept in Cloudflare, and run its tests. The check SHALL run when the app or the payload inventory changed, reach nothing live, and never ship.

#### Scenario: A shipped test needs a file that does not ship

- **WHEN** a change makes a shipped test depend on a file the inventory leaves out
- **THEN** the check fails and names the test

#### Scenario: The app does not build with a Cloudflare-kept project

- **WHEN** a change makes the app fail to compile once the project's repository connection is configured
- **THEN** the check fails, though WongStack's own copy has no such connection

<!-- end specs/payload-checks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-07

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 46198 fence=~~~ -->
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
<title>Review · 2026-10-07-fresh-cloudflare-install-publishes</title>
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-07-fresh-cloudflare-install-publishes">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-07-fresh-cloudflare-install-publishes</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">On 2026-10-07 a real test install of the published version, kept in Cloudflare alone, was set up correctly and then could not go live. Its first save failed, and so would everyone's: four separate faults stood between a new owner and their site, and each needed a fix by hand that no newcomer could make.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A new install's first save gives a preview, and its first publish goes live, with no fix by hand.</b> The four faults below are what stopped it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">install ─▶ save ─▶ checks ─▶ preview</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                     │ fail, every time</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                     ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                  stuck</span>

<span class="ln" data-note="item-1-line-7" tabindex="0">  AFTER</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">install ─▶ save ─▶ checks ─▶ preview ─▶ live</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The new install passes its own tests.</b> Today its tests look for two sample apps and a sample skill that only WongStack's own copy has, so they fail on day one. The tests an install receives will need only what the install receives.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The preview builds on an install kept in Cloudflare.</b> Today the last step before a preview rejects the part of the app that hands the project to a teammate, because two descriptions of the same Cloudflare connection disagree. The part works when it runs; the description is what gets fixed. The earlier checks will also catch this kind of disagreement, so it fails early and says why.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A change that passed its checks is not failed by the checker's own lost files.</b> Today the checker sometimes loses some of the app's packages between checking a change and building its preview, a different one each time. It will fetch the packages again before it builds.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A check run that Cloudflare cuts off is run again, not counted as a failure.</b> Today one cut-off run on the brand-new project blocks every publish for good, because nothing can start that run again. A cut-off run will be tried again by itself, reported as <i>cut off</i> and not <i>failed</i> if it still does not finish, and your assistant will be able to start it again.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">  BEFORE                AFTER</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">run ─▶ cut off        run ─▶ cut off</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">         │                     │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">         ▼                     ▼</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">      &quot;failed&quot;          +tries again ─▶ result</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">         │                     │ still cut off</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">         ▼                     ▼</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">   publish blocked      +&quot;cut off&quot;, and can</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">     for good            +be started again</span></pre></div></details></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>WongStack tests itself as an install does.</b> A new check builds the app from exactly the files an install receives, set up as a Cloudflare-only install, and runs its tests. Two of the four faults could not be seen from WongStack's own copy; this check is what would have caught them before release.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> The smaller stumbles the same test found, listed in the design as follow-ups. The reason the checker loses files, which sits in Cloudflare's own tool; this change stops depending on it and does not repair it. Installs kept on GitHub, whose saves and publishes already work. Giving the sample apps to new installs.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked whether to plan the fixes for the four blockers as one change → chose yes, one plan.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: new installs still do not receive the sample apps or the sample skill, because the payload inventory leaves them out on purpose and says so; the tests change, not what ships.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the checker fetches the app's packages again before every preview and live build, because the files it carries between steps arrived incomplete twice in two runs, and five runs in a row passed in the test install once it did.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the package fetch runs without the publishing key in reach, because that step holds the key and a package's install script must not see it.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a cut-off run is tried again up to three times inside the same run before it is reported as cut off, because the existing single retry was used up on the test install's first run.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a run that is still cut off reads as <i>could not be checked</i>, so a save carries on and a publish stops, because that is the existing rule for a result that can not be read.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: starting a cut-off run again restarts the same run under the same name, because a result must keep belonging to one exact commit; whether the saved Cloudflare token may do that is checked on the real install first, and the widen gains the permission if not.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the new self-test runs only when the app or the list of shipped files changed, because a check runs only when its kind of file changed.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: this is a <code>patch</code> release, because every shipped edit repairs behaviour that was already promised.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the smaller stumbles from the same test stay out of this plan, because the four blockers were what was asked for; the design lists them as follow-ups.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked what to do with the finished plan → chose to build and publish.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the check of whether the saved token may restart a run moves from the start of the verb work to the real test install at the end, because it needs a live install and all source and tests are written before any check runs; the restart is built as designed and the permission added there if refused.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Shipped tests that needed a source-only app or skill, found by reading each test that names <code>tips</code>, <code>sample</code> or <code>sample-report</code>: <code>app/worker/employee-access/seed.test.ts</code> (the seeded areas, sets and the sample skill), <code>app/src/apps/access/App.test.tsx</code> (the tip calculator's title, and its greyed card on Home), <code>app/src/components/AssistantSetup.test.tsx</code> (the tip calculator's title), <code>app/worker/index.test.ts</code> (asset paths under <code>/apps/tips/</code>, which passed either way and now name <code>hello</code>), and <code>app/src/pages/home/Home.test.tsx</code> (it pressed the first greyed card, and an install has none; the new self-test found this one). Each now reads the app registry or names <code>hello</code> and <code>access</code>; the sample cases moved to <code>app/worker/apps/sample/seed.test.ts</code>, inside an excluded folder. Left alone as fixtures that only reuse the name: <code>app/src/pages/home/AppList.test.tsx</code>, <code>app/worker/api/contract.test.ts</code>, <code>app/worker/api/discovery.test.ts</code>, and the Access screens' status fixtures (<code>Grants</code>, <code>Roles</code>, <code>PersonPage</code>, <code>Skills</code>, <code>Leaving</code>, <code>levels</code>, <code>subjects</code>).</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a check run whose Workflow errored or was terminated, and one that never got its turn, read as <i>cut off</i> too and not <i>failed</i>, because none of them shows the commit failing a check and the plan's own acceptance terminates a run and expects <i>cut off</i>; only a run the checker itself reported as interrupted is started again by the waiter, so a run stopped by hand stays stopped until asked.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the package fetch in the build step runs with every <code>CLOUDFLARE_*</code> setting removed, not only the two named, because the promise is that no Cloudflare credential is readable there.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the new self-test runs from the shared check command on both the online run and the pre-check on this computer, not from a new workflow step, because that command already runs WongStack's other own checks that way and one place keeps the two runs from disagreeing.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the binding types are regenerated only in the online checks, never in the pre-check on this computer, because regenerating there would rewrite a committed file in the working folder.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>The earlier gates in tasks 2.1, 2.3 and 3.x that said to run a test moved to the final verification, with every acceptance kept.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-07</p>Check: <code>.github/scripts/checks.mjs</code> gains two steps and loosens none: it regenerates the binding types before the app suite in CI, and runs the app as an install receives it, because two faults in 37.2.3 were invisible to the checks as they stood.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the install-shaped check is proven by one run each way, because against 37.2.3's app it ended <code>TARGET_APP=fail (tests)</code> on <code>worker/index.test.ts(26,79): error TS2345</code>, and against the fixed app <code>TARGET_APP=pass</code>; the type check stops the unfixed run before its tests, so the sample-app fault was shown by the same check during the build, on <code>Home.test.tsx</code>.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Saved after the build: every source and test task is done and the local checks pass; left is the real test install in a Cloudflare account, which needs the owner's token.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-07</p>Asked for a new Cloudflare token for the proof install → chose &quot;can you generate one yourself and try it&quot;. Cloudflare refuses a token that makes token-managing tokens (<code>sub-token is not allowed to have permissions to manage other tokens</code>), so the install used the token saved for WongStack; setup added no permission to it.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: the proof install (<code>wong-e2e-test2</code>, since removed) proves the change, because its first save passed in one run with no hand edit (deploy stage 99 s), it published and went live private, a second change published, and a terminated run read as cut off, restarted with the user token (HTTP 200, <code>queued</code>) and then passed for the same commit. No permission is added to the widen.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a command that ran to its end is also known by <code>[diagnostic truncated]</code>, the output headings and the wrapped error, because on the proof install a failing test with long output read as cut off: the SDK keeps only the last 20,000 characters, and the exit-code line goes with the start. With the fix on the same install a failing test read <code>FAILURE</code> with its output, and its restart was refused.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-07</p>Assumed: a run still going is waited for when Cloudflare flags its answer, because the proof install answered HTTP 200 with error 10001 beside <code>status: running</code> and the save gave up; a flagged answer still never counts as a pass.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Archived for publishing: every task is done, the checks passed on the saved work, and the proof install saved, published and was removed.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-07</p>Archive checkpoint: another release took 37.2.4 while this was checked, so the main line was brought in and this became 37.2.5; five app tests timed out locally under load and passed when run alone.</li>
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
    if (act === 'save') {
      const n = data.notes.length;
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

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
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
