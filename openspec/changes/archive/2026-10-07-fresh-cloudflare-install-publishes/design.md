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
