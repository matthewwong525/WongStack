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
