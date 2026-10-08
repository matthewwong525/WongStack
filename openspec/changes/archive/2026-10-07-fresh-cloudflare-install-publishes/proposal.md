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
