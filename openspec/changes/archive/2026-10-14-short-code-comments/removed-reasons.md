# What the comment cleanup dropped

Each row is a long comment that could not keep everything it said in two lines. It names the file, the nearest name in the code, and what was dropped and why that is safe. Helpers changed comments only; the code is the same before and after.

## `.github/scripts` and `site`

114 comments kept as they were, 33 cut, 0 removed, in 19 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `.github/scripts/checks.mjs` | file header | The prose on the skill check, type regeneration, when the proof and the install-shaped test run, and the `--worktree` install and lock. Each is restated at its own function (`skillCheck`, `regenerateTypes`, `proofWanted`, `targetWanted`, `ensureInstalled`, `takeTurn`), in `USAGE`, and in `wiki/development/the-change-loop.md#the-gate`. |
| `.github/scripts/checks.mjs` | file header | The `LOCAL_CHECKS=` values and exit codes 0, 1 and 7. The code (`NO_TOOLS = 7`, `localChecks`) shows them, and the gate page now holds them. |
| `.github/scripts/checks.mjs` | `regenerateTypes` | "A pack from before `--types` skips it; the script skips a repo with no wrangler config." The one-line body shows the first; the second belongs to `cf-build.sh`. |
| `.github/scripts/loosened-checks.mjs` | file header | The why, the list of what is flagged, and how a `Check:` bullet explains a file. `wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason` holds them; the usage lines repeated `USAGE`. |
| `.github/scripts/loosened-checks.mjs` | file header | The exit codes and "an empty `--base` prints why and exits 0". Both are plain in the main block. |
| `.github/scripts/loosened-checks.mjs` | `SELF` | "This script is never read for markers, because it names every marker." The constant carries it. |
| `.github/scripts/wiki-links.mjs` | file header | The list of what the check enforces (`wiki/wiki-style.md` owns it) and the usage line. |
| `site/src/apps.tsx` | file header | "(read 2026-09-27)", a one-off date. |
| `site/src/install.ts` | file header | The list of what the file holds and "this is the one file to edit". `wiki/maintaining/landing-page.md` says both. |
| `site/src/install.ts` | `STEPS` | "The second shows the message." It restates the object. |
| `site/src/install.ts` | `AGENTS` | "As the README links them." |
| `site/src/Rotator.tsx` | file header | "The headline names only what the install steps name." A test in `App.test.tsx` asserts it. |

## `app/src`

349 comments kept as they were, 61 cut, 0 removed, in 32 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `app/src/apps/access/App.tsx` | `App` | "Connecting an assistant is Home's card." `ConnectDialog.tsx` and `AppList.tsx` say it. |
| `app/src/apps/access/Confirm.tsx` | `Confirm` | "The action is the one solid button" and "keyboard goes back after answering". `App.test.tsx`, `Roles.test.tsx` and `Leaving.test.tsx` assert both. |
| `app/src/apps/access/LevelChoice.tsx` | `LevelChoice` | The look: one row that wraps, a dot marks the current one, words in bold. `style.test.ts` asserts it. |
| `app/src/apps/access/Notices.tsx` | `Notices` | The detail of each notice. The JSX, `Roles.test.tsx` and `App.test.tsx` show it. |
| `app/src/apps/access/Page.tsx` | `Page` | The layout walk-through. `Leaving.test.tsx` and `style.test.ts` cover each point. |
| `app/src/apps/access/People.tsx` | `People` | "You and Manager sit beside the email" and "last cell counts apps and keys". `App.test.tsx` and `PersonPage.test.tsx` assert them. |
| `app/src/apps/access/RowMenu.tsx` | `RowMenu` | How the menu closes and moves. That is the ready-made menu part's own behaviour, asserted in `App.test.tsx`. |
| `app/src/apps/access/SetFields.tsx` | `SetFields` | "A ticked app does everything it was built to do", and where the step sits. The screen text and `PersonPage.test.tsx` carry them. |
| `app/src/apps/access/SetFields.tsx` | `NextStep` | Folded "on the live app the owner asks their assistant to finish" into "the owner copies a request". |
| `app/src/apps/access/style.test.ts` | file header | The pointer to `src/style.test.ts` for the "no CSS file" check. That file's header says it. |
| `app/src/apps/access/Table.tsx` | `Table` | "`actions` names a last column of row menus, for a screen reader alone." `App.test.tsx` asserts it. |
| `app/src/apps/access/Table.tsx` | `Row` | "No box goes round it" and "the row says so under the pointer". `style.test.ts` covers the first; the second is a visible class. |
| `app/src/apps/access/View.tsx` | `View` | How each tab is marked. The `TAB` comment and `style.test.ts` say it. |
| `app/src/apps/hello/App.tsx` | `App` | "The page takes the whole shared frame." Visible in the classes and checked in `src/style.test.ts`. |
| `app/src/components/AssistantSetup.tsx` | `Steps` | "Copy is the one solid button" and who gets the whole project. `AssistantSetup.test.tsx` asserts both. |
| `app/src/components/AssistantSetup.tsx` | `AssistantSetup` | What the heading and the line under it say, and the try-again branch. `AssistantSetup.test.tsx` covers both. |
| `app/src/components/ConnectDialog.tsx` | `ConnectDialog` | How the popup closes. That is the dialog part's own behaviour, tested in `App.test.tsx`. |
| `app/src/lib/access.ts` | `statusSchema` | Nine lines explaining each field (`settled`, `role`, `apps`, `unticked`, `alone`, `setup`, `saved`, `direct`). The two rules and the `project` fallback stay. The largest loss in this area. |

## `app/worker`, `app/tests` and the app's config files

550 comments kept as they were, 71 cut, 1 removed, in 32 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `app/worker/employee-access/catalogue.ts` | `appTitle` | Removed "A built app's title": it restates the name. |
| `app/worker/access.ts` | file header | The 26-line essay on why to verify the signed assertion, and the table of claims for a person and a service token. The pointer keeps the rule; `wiki/stack/cloudflare-access.md` now holds the rest. |
| `app/worker/keys.ts` | `Forward` | The notes on `base`, `secret`, `header`, `prefix` and `headers`. The names say it and `problem()` in `api/forward.ts` enforces it. |
| `app/worker/keys.ts` | `keys` | The commented-out Notion example. `wiki/stack/company-api.md#use-a-key-directly` holds one. |
| `app/worker/employee-access/members.ts` | `accessStatus` | The `viewer` and `apps` field notes. |
| `app/worker/employee-access/start.ts` | `startPermissions` | "A preview starts with no import and no provider call." `management.ts` and `login-management.ts` say it at their `core.live` checks. |
| `app/worker/employee-access/core.ts` | file header | "No private pin exists." `core.test.ts` says it. |
| `app/worker/apps/hello/api.ts` | file header | What a handler is given. The `AppHandler` type shows it. |
| `app/worker/access.test.ts` | the verified-assertions tests | How the key pair is served and signed. The `beforeAll` code shows it. |

## `scripts` (outside `scripts/tests`)

180 comments kept as they were, 77 cut, 10 removed (all bare section headings), in 21 files. `scripts/employee-bootstrap.mjs` was put back as it was: its bytes are pinned, so its four long comments stay and the rule skips that one file.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `scripts/cf-secrets.mjs` | file header | A 57-line essay on `.env` and `.dev.vars`, what `check` compares and what `shared` reports. `wiki/stack/staging-bindings.md` owns it. |
| `scripts/cf-secrets.mjs` | section headings | Seven bare headings. |
| `scripts/cf-secrets.mjs` | `checkBindings` | The aside on the adoption steps. "Not a failure" stays. |
| `scripts/check-payload-links.mjs` | file header | Four "why this check" essays. `.agents/rules/payload.md` and `wiki/maintaining/repo-layout.md#linking` cover them. |
| `scripts/check-payload-links.mjs` | `TARGET_PROVIDED` | The story of an earlier wrong exemption. History; the rule stays. |
| `scripts/check-payload-links.mjs` | section headings | Three bare headings. |
| `scripts/lib-wrangler-config.mjs` | file header | Why a pattern can not read the config. The tests cover it. |
| `scripts/lib-wrangler-config.mjs` | `deployedWorkerName` | Why the two names are read from different files. The tests cover the behaviour. |
| `scripts/lib-wrangler-config.mjs` | command block | The command list. The `COMMANDS` object and the usage text hold it. |
| `scripts/check-runner/pipeline.mjs` | file header | The table of which stage holds which credential, and the retry rules. `wiki/stack/artifacts-route.md` and `check-runner.test.mjs` hold them. |
| `scripts/check-target-app.mjs` | file header | The six-step walk-through, exit codes and usage. `USAGE` and `wiki/maintaining/test-a-setup-change.md` hold them. |
| `scripts/check-openspec-config.mjs` | file header | The story of the release that shipped an unreadable config. `.agents/rules/payload.md` tells it. |
| `scripts/check-app-checks.mjs` | file header | How the throwaway folder is built, exit codes, usage. The code and `USAGE` say it. |
| `scripts/check-skill-actions.mjs` | file header | Every failure and exemption, exit codes, usage. `wiki/stack/company-api.md` owns the rule; `USAGE` the rest. |
| `scripts/check-app-keys.mjs` | file header | Where a key may be listed, exit codes, usage. Same owner. |
| `scripts/check-retired-names.mjs` | file header | The history. `.agents/rules/payload.md` has it. |
| `scripts/payload-checks.mjs` | file header | Docs-only scoping, output format, exit codes. `USAGE` and the rules file hold them. |
| `scripts/measure-sessions.mjs` | file header | The glossary of counted terms. `wiki/maintaining/measure-session-speed.md` and `USAGE` hold it. |
| `scripts/reset-staging-d1.mjs` | file header | Usage. It now points at `wiki/stack/d1-pipeline.md#seeded-staging-production-untouched`. |
| `scripts/fixtures/verify-eval/site.mjs` | file header | The list of five planted mistakes. `key.json` and the tests in `verify-eval.test.mjs` name each. |
| `scripts/tag-releases.mjs` | file header | How a rerun fills gaps. The comment on `create` keeps the two refusals. |
| `scripts/eval-verify.mjs` | file header | The counts and the temp-folder note. A test covers both. |

## `scripts/tests`

598 comments kept as they were, 68 cut, 79 removed (all bare section headings), in 52 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `scripts/tests/fixtures/fake-camofox-server.mjs` | file header | The 12-line list of control files. Each is named where the file reads it. |
| `scripts/tests/fixtures/fake-view-tools.mjs` | file header | What each fake tool does and its control files. The fake scripts show it. |
| `scripts/tests/fixtures/fake-view-tools.mjs` | `upgrade` | What each returned method does. The bodies are short. |
| `scripts/tests/fixtures/cloudflare.mjs` | `fakeCloudflare` | The 17-line list of options and `state` fields. Each is read by one handler, and the tests that set them say why. |
| `scripts/tests/fixtures/fake-tunnel.mjs` | file header | The three kinds `fakePaseo` takes. They are one visible line in the function. |
| `scripts/tests/fixtures/pack.mjs` | `pack` | What leaving out `config` does, and what `subdir` is for. |
| `scripts/tests/hand-over.test.mjs` | `fixture` | What `set`, `unset`, `checkout` and `view` do. Each has its own line. |
| `scripts/tests/provision.test.mjs` | `fakeTools` | The shape of `ran` and the list of git commands. The body lists them. |
| `scripts/tests/tools-on-path.test.mjs` | file header | The two shipped texts under test and why each child starts clean. `wiki/development/required-tools.md` now holds the reason. |
| `scripts/tests/install-cost.test.mjs` | file header | "Reads three files and installs nothing", and how the guide came to disagree. |
| `scripts/tests/other-work.test.mjs` | `setup` | Each worktree's state, squeezed to a word or two. The setup code shows it. |
| `scripts/tests/ship-publish-artifacts.test.mjs` | `FAKE_GIT` | "No env name here is one the scripts set themselves." |
| `scripts/tests/check-runner.test.mjs` | `standIn` | "With the step it was chained from." |

## `.agents/skills`: `hand-over`, `wong-setup`, `browser`

264 comments kept as they were, 112 cut, 36 removed (35 bare section headings, one that restated `report()`), in 18 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `.agents/skills/browser/scripts/browse.mjs` | file header | The usage block (in `USAGE`) and the essay on install, server start, tabs, login results and test settings. The code, each function's comment and `wiki/development/required-tools.md` say it. |
| `.agents/skills/hand-over/scripts/hand-over.mjs` | file header | 94 lines: usage, each mode's walk-through, the result lines and test settings. `USAGE`, each mode's own file, and `wiki/development/browsing.md`, `live-view.md` and `secrets.md` cover it. |
| `.agents/skills/hand-over/scripts/hand-over.mjs` | `report` | The list of lines printed. The six print lines show it. |
| `.agents/skills/hand-over/scripts/hand-over.mjs` | `servePage`, `openView`, `keyConfig` | What each returns. The code shows it. |
| `.agents/skills/hand-over/scripts/form.mjs` | file header | The form file's shape, limits and routes. `LIMITS`, `FORM_FAULTS`, `BOX_FAULTS` and `form.test.mjs` state them. |
| `.agents/skills/hand-over/scripts/form-page.mjs`, `keys-page.mjs`, `passwords-page.mjs`, `view-page.mjs` | file headers | Screen-by-screen descriptions. The page tests describe the same behaviour. |
| `.agents/skills/hand-over/scripts/keys.mjs` | file header | The contracts and limits of `resolveKeys`, `checkGuide` and the routes. `LIMITS`, `GUIDE_FAULTS` and each function's comment hold them. |
| `.agents/skills/hand-over/scripts/keys.mjs` | `keyRoutes`, `resolveKeys` | Notes on `closesAt`, `fetch` and the returned shape. |
| `.agents/skills/hand-over/scripts/lib/tunnel.mjs`, `lib/wake.mjs` | file headers | The names of the test settings. Each is read a few lines below. |
| `.agents/skills/hand-over/scripts/lib/ws-bridge.mjs` | file header | The status codes and frame handling. `refusal()` and `takeFrames()` show them; `ws-bridge.test.mjs` covers them. |
| `.agents/skills/hand-over/scripts/passwords.mjs` | file header | The save request's shape, limits and naming rule. `LIMITS`, `chooseName` and `checkLogins` carry them. |
| `.agents/skills/hand-over/scripts/reply-link.mjs` | file header | Usage, routes and limits. It points to `wiki/development/reply-links.md`. |
| `.agents/skills/hand-over/scripts/view.mjs` | file header | A 41-line tour. The two tool gotchas moved to `startSource` and `pageWindows`, and to `wiki/development/required-tools.md`. |
| `.agents/skills/hand-over/scripts/view.mjs` | `liveView` | The parameter notes. The sums are in `fitted()` and `measureBar`. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | file header | The command line and the notes on the Artifacts route and the token. `USAGE` says them. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `widen` | "Later Access probes get one try each." The loop shows it. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `wranglerConfig` | Which lines are dropped from the config. Two `dropLines` calls do exactly that. |
| `.agents/skills/wong-setup/scripts/provision.mjs` | `provision`, `accessSetup`, `artifactsDelivery`, `projectCode`, `setVar`, `closeOpenConfig` | Step lists. The bodies read in the same order. |
| `.agents/skills/wong-setup/scripts/lib/cloudflare.mjs` | `scopedToken`, `installRunner`, `widenBy` | Parameter notes. |
| `.agents/skills/wong-setup/scripts/private-access.mjs` | `workerKey` | "`policies` builds the key's permissions" and the stored fields. |

## `.agents/skills`: the other skills

About 440 comments kept as they were, 82 cut, 40 removed (38 bare section headings, 2 folded into the comment beside them), in 38 files.

| File | Symbol | What was dropped, and why that is fine |
| --- | --- | --- |
| `.agents/skills/dream-memory/scripts/dream.mjs` | file header | Usage, the fact format, output columns, drift rules, exit codes. `USAGE`, the skill's own steps and the comments on `isShipped`, `stalePaths` and `planDrift` hold them. |
| `.agents/skills/explore/scripts/other-work.mjs` | file header | Usage, what counts as live work, the output shape, exit codes. `USAGE`, `isLive`, `foldPullRequests` and `savedBranches` say it. |
| `.agents/skills/memory/scripts/before-edit.mjs` | file header | "Eight lines at most, once per area per session", and the silent cases. The code states the limits. |
| `.agents/skills/memory/scripts/lib/digest.mjs` | `buildDigest` | Notes on `personal` and `admin`, and detail of the ranking. |
| `.agents/skills/memory/scripts/lib/links.mjs` | `linksIn`, `checkWiki` | The field-by-field description and the full list of problems. |
| `.agents/skills/memory/scripts/lib/primary-root.mjs` | file header | The usage line and "skills import this by path". |
| `.agents/skills/memory/scripts/lib/upkeep.mjs` | file header | The 30-day figure. It is a constant in the code. |
| `.agents/skills/memory/scripts/memory.mjs` | `NOT_TYPED` | The line of flags. The comments on `partsText` and `chatParts` cover it. |
| `.agents/skills/memory/scripts/memory.mjs` | `migrate` | Why migrations go round the Worker. The `openStore` comment keeps it. |
| `.agents/skills/memory/worker/memory-worker.mjs` | file header | Where key hashes live and who manages grants. The comments on `KEYS_GUARD` and `findGrant` say it. |
| `.agents/skills/memory/worker/statements.mjs` | file header | "`owner` is the ownership parameter; author fields are attribution only." |
| `.agents/skills/save/scripts/artifacts-credential.mjs` | file header | The git config example, the install command, the cache path and its one-day life. The comments on `helperConfig`, `install` and `cacheFile` cover them. |
| `.agents/skills/save/scripts/artifacts-run.mjs` | file header | What each command does, the restart rules, where the token comes from. |
| `.agents/skills/save/scripts/artifacts-run.mjs` | `verdict` | When a pass needs a preview address, and what counts as cut off. |
| `.agents/skills/save/scripts/checkpoint.mjs` | file header | Usage, printed keys, and the table of exit codes 0 to 6. The codes now show only at each `Stop(code, …)` call. One of the two largest losses. |
| `.agents/skills/save/scripts/delivery-route.mjs` | file header | Usage and the exact test. `ARTIFACTS_HOST`, `routeOf` and `wiki/stack/artifacts-route.md` hold it. |
| `.agents/skills/schedule/scripts/lib/paseo.mjs` | file header | The exit codes. The `EXIT` constant below is the same list. |
| `.agents/skills/schedule/scripts/presets.mjs` | file header | How the home folder is found, the safe write, output shape, exit codes. |
| `.agents/skills/schedule/scripts/tidy.mjs` | file header | 31 lines: what each command does (`USAGE`), the ownership tests (`ownWorkspace`, `orphanPids`, `isOldTemp`), exit codes. |
| `.agents/skills/schedule/scripts/workspace.mjs` | file header | Exit codes, what the new agent copies, and why the rename follows. `wiki/development/required-tools.md` now holds the two Paseo quirks. |
| `.agents/skills/ship/scripts/number-release.mjs` | file header | Usage and output lines. `USAGE` and the inline comments hold them. |
| `.agents/skills/ship/scripts/ship.mjs` | file header | 37 lines: the steps of `prepare` and `finish`, printed keys, and the table of exit codes 0 to 7. The codes now show only at each `Stop(code, …)` call. One of the two largest losses. |
| `.agents/skills/ship/scripts/worktree-secrets.mjs` | file header | What each command does and the three-way compare. `classify`, `loadBase` and `wiki/development/secrets.md` hold it. |
| `.agents/skills/update-dependencies/scripts/update.mjs` | file header | "Node built-ins." |
| `.agents/skills/verify/scripts/verify-journeys.mjs` | file header | The file format, command descriptions, the four result words. `wiki/development/kept-checks.md` has the result words. |
| `.agents/skills/verify/worker/walk-pictures.mjs` | file header | Who hands this the bucket. The comment on `handleWalkPictures` covers it. |
| `.agents/skills/wong-sync/scripts/merge-check.mjs` | file header | "The report names where to look, never file bodies." |

## Rules that became tests

Two long comments that stated a rule had no test, and a short one fit:

- `scripts/tests/cf-secrets.test.mjs`, *check with no wrangler config, or a config with no staging section, skips and passes*: replaces the notes in `scripts/cf-secrets.mjs`.
- `scripts/tests/provision.test.mjs`, *the read-only look-up key holds no write permission and no data store*: replaces the note on `CLOUDFLARE_READ_KEY`.

Every other rule the helpers found already had a test, among them: `scripts/tests/landing-site.test.mjs` and `install-cost.test.mjs` for the install message and its cost; `app/worker/access.test.ts` for sign-in failing closed; `app/worker/apps/index.test.ts`, `keys.test.ts` and `screenless.test.ts` for what a mini app is handed; `scripts/tests/wrangler-config.test.mjs` and `check-runner.test.mjs` for the scripts; `scripts/tests/view.test.mjs` for the screen source's flags and the viewer's version; `scripts/tests/payload-checks.test.mjs` for the step list staying in step with the workflow.

Left without a test, and still stated in a short comment, because a test would not fit in about 15 lines: only `browse.mjs`'s `login` reads a saved password; only `passwords.mjs` writes the logins file; `wake.mjs` is the one place that names the chat host's wake command; `view-page.html` loads the viewer before its script.

No rename or extract was made: the code is unchanged.

## Facts moved to the wiki

- `wiki/development/the-change-loop.md`: the last line and exit 7 of the local checks, from `.github/scripts/checks.mjs`.
- `wiki/stack/cloudflare-access.md`: no email header for a service token, and rotating signing keys, from `app/worker/access.ts`.
- `wiki/stack/artifacts-route.md`: a long output losing its ending, a finished run with an error flag, and the storage key's two halves.
- `wiki/stack/cloudflare-credentials.md`: a widened token refused for a short while.
- `wiki/development/required-tools.md`: the two screen-tool gotchas, the clean shell a path test needs, and two Paseo quirks.
- `wiki/development/live-view.md`: the 5-minute idle close, and the secret sent as the WebSocket subprotocol.
