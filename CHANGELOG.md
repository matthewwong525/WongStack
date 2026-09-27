# Changelog

`/wong-sync` reads the entries newer than your installed version
(`.claude/.wong-stack.json`) as context for planning the update. Newest first.

## 25.8.1 — Fixes from a repo check

- **Teammates can't change or hide each other's memory.** The memory route now refuses three writes it let through. A fact tag or supersede without the member's own new fact before it in the same batch is refused, so a replacement is always visible and credited. So is a session upsert onto a row another author holds, or one written before keys. The read check now looks at the whole SQL text, so a quoted name like `[']` can't hide a `DELETE`. A malformed `%` in an object path is a 400, not a crash. The statements are unchanged, so member checkouts need no update.
- **`.env` values are read correctly.** `parseEnv` drops the quotes from a quoted value followed by spaces or a `# comment`. Before, it kept them, so a memory key failed and the transcript redactor looked for the wrong text. `writeEnvKey` replaces every `CLOUDFLARE_MEMORY_TOKEN=` line, so a stale duplicate can't win.
- **The check wait needs a settled pass.** `wait-for-checks.sh` reports `SUCCESS` only when two polls agree. A list of only skipped checks keeps it waiting until the grace period ends, so the instant pull-request copies no longer pass a save before the tests are registered. `FAILURE` stays immediate.
- **`merge.sh` fails closed.** A failed `gh pr list` keeps the branch instead of deleting it and closing stacked PRs. A delete that loses the race to GitHub's own delete at merge reports `deleted-at-merge`, not an error.
- **Smaller fixes.**
  - `search --state` filters before `--limit`.
  - Preview discovery's PR-comment method takes the newest comment naming the head commit.
  - The test, payload, and deploy workflows run on branch pushes only, so a release tag no longer redeploys staging. The mini-app tests run after a red suite.
  - A preview alias starts with a letter and fits beside the staging Worker's name.
  - `npm run deploy` in `app/` runs `scripts/cf-deploy.sh`, which deploys nothing outside CI.
  - `/verify`'s request probes time out after 30 seconds (`VERIFY_REQUEST_TIMEOUT`), and `HEAD` uses `curl -I`.
  - `server/setup.sh` pins OpenSpec 1.13.2.
  - The background run's instructions allow `finish-run --counts`.
  - The `/improve` survey skips `CHANGELOG.md`.
  - The memory scripts `run.mjs` and `session-start.mjs` answer `--help`.

**Updating.** `/wong-sync` brings the fixes. The memory route's fix takes effect on the next production deploy from `main`.

## 25.8.0 — Offers to make a task easier next time

- **A task that will come back ends with one offer.** When the agent finishes a task it did by hand and there is a clear sign it recurs, its closing next-step question adds one option: run it on a schedule through `/routine`, or build a mini app for it. A clear sign is the person saying it recurs, or a memory fact showing they asked before; never a guess. Judgment on each run means a routine; fixed steps mean a mini app. [Offer a routine or an app](wiki/development/the-change-loop.md#offer-a-routine-or-an-app) owns the rule, the `WONG-STACK` block states it, and [the ask convention](.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step) links it.
- **A no is final.** The agent records a decline as a `feedback` memory fact and never offers again for that task. No offer comes after a code change, in an unattended run, or for a routine where `paseo` is not installed.

**Updating.** `/wong-sync` brings the block rule and the two page edits. Nothing else to do.

## 25.7.0 — Labelled releases, and a plain guide to API keys

- **Every version gets a GitHub Release.** `.github/workflows/release.yml` runs `scripts/tag-releases.mjs` on each push to `main`. It gives every `CHANGELOG.md` version with no Release a `v<version>` tag and a Release whose notes are its entry. The tag goes on the first commit that set `VERSION` to that version, not the one a commit title names. Its first run fills in 19.0.1 through 25.6.0. Both files are meta-only.
- **A plain guide to API keys.** [API keys](wiki/stack/api-keys.md) tells a non-developer how to get a key, paste it into the chat with what it's for, and replace one that leaked. It explains how keys differ from website logins. [Getting started](wiki/stack/getting-started.md), the [stack hub](wiki/stack/README.md), and [the secrets convention](wiki/development/secrets.md) link it.
- **One lookup finds the primary worktree.** `.agents/skills/memory/scripts/lib/primary-root.mjs` replaces five separate lookups in `store.mjs`, `worktree-secrets.mjs`, `routine.mjs`, `cf-secrets.mjs`, and `verify-staging.sh`, and the copies in setup's runbook and `named-secrets.md`. Git must confirm the answer. In a bare repository's worktree it fails instead of guessing: saving a secret stops there, while reading one falls back to the current checkout as before. `routine.mjs` no longer reads `git worktree list`.
- **A steadier test.** `wait-for-checks.test.mjs` gives its grace-period test 3 seconds instead of 1. The script's whole-second deadline could leave it less than a second on a busy machine.

**Updating.** `/wong-sync` brings the new page and the shared lookup. `routine.mjs`, `worktree-secrets.mjs`, `verify-staging.sh`, and `cf-secrets.mjs` now load it from `.claude/skills/memory/`. If you renamed the memory skill, those scripts fail on load until the path matches.
## 25.6.0 — Checks the AI loosens are caught

- **A loosened check fails the Test check unless a reason is written.** `.github/scripts/loosened-checks.mjs` compares the branch with the base `app-untouched.sh` finds. It flags a file when the change adds a skip comment (Stryker, coverage, lint, or TypeScript), adds a skipped, focused, or to-do test, deletes a test file, or changes a check's settings: a test, coverage, mutation, lint, type, duplicate-code, or unused-code config, a `package.json` `test` script or a script it runs, `test.yml`, or a script under `.github/scripts/`. A flagged file passes when a proposal the branch adds or edits names it in a Decision-log bullet that starts with `Check:`. [A loosened check needs a reason](wiki/development/the-change-loop.md#a-loosened-check-needs-a-reason) owns the rule.
- **The Test workflow runs it on every push**, after the suite and on docs-only branches too, so one run reports a red suite and a missing reason together. The job summary lists each flagged file as explained or not, and the failure says exactly which bullet to add.
- **`app-untouched.sh` prints a fourth line, `base`**: the commit the change is compared with, or empty when there is none.
- **You see each loosened check before publishing.** `/apply` runs the check on the working tree, fixes what it flags without asking, and lists every `Check:` bullet in plain words above *publish it?*. `/ship`'s report carries the same list, and the review page tags those decisions `check`.
- **The code rule says it once.** `.claude/rules/code.md` links the new gate section.

**Updating.** `/wong-sync` brings the script, the workflow step, and the skill edits. The sync itself changes `test.yml` and `.github/scripts/`, so its change needs `Check:` bullets for them; CI's failure names each file, and the agent adds them. After that, only a branch that loosens a check needs one.

## 25.5.0 — Memory access comes from GitHub

- **A teammate joins memory on their own.** `memory.mjs join` sends the person's `gh` token to the production Worker's new `/_memory/join` route. The route asks GitHub about the repository CI deployed it from, never one the request names. A private repo lets in anyone who can read it, a public one anyone who can push, and the key's email is one GitHub has verified. The session-start hook runs `join` in the background when there is no key, and memory loads from the next session: [joining through GitHub](wiki/development/memory.md#joining-through-github). No key goes in the repo.
- **One key per machine, expiring.** A joined key lasts 30 days, and the hook renews it when 7 or fewer are left. A second laptop no longer replaces the first. `member list` shows each machine and expiry; `member remove` revokes every key of an email; `member add` replaces only the key it made. The admin's key from setup, and every key made before this release, never expire.
- **A member key adds facts under its own name.** The route runs only the memory script's own writes for a member, with the key's email as the author, plus plain reads. A member can no longer change, delete, or hide a fact, or drop the store's guards. The script writes facts under the key's email.
- **Team mode comes from the store.** The route says on every answer whether more than one email holds a key, and the script remembers it, so the owner's digest filters personal facts once a teammate joins.
- **Production knows its repository.** `cf-deploy.sh` passes `--var GITHUB_REPOSITORY:<owner/repo>` on the production deploy, from `GITHUB_REPOSITORY` or the `origin` remote.
- **Teammates need one more `gh` scope.** `user:email`, to read verified emails: [required tools](wiki/development/required-tools.md#gh-needs-the-useremail-scope-for-memory).

**Updating.** `/wong-sync` brings the route, the script, the deploy change, and migration `0003_key_machines.sql`. After the update merges and production deploys, the admin runs `node .claude/skills/memory/scripts/memory.mjs migrate` once. Until then, old keys keep working and `join` is refused.
## 25.4.1 — Installs skip npm's audit

- **No install waits on npm's audit.** `test.yml`'s and `deploy.yml`'s `Install` step and `scripts/cf-preview.sh`'s first-run install now run `npm ci --no-audit --no-fund`. npm is retiring the audit endpoint `npm ci` calls, and on one CI run it held the install for 5 minutes instead of the usual 8 seconds. Nothing read the audit summary or the funding notice.

WongStack's own checks now fail on any `npm ci` in a workflow or `scripts/` file that drops either flag.

**Updating.** `/wong-sync` brings the new lines. If you changed your own `Install` step, add `--no-audit --no-fund` to it. Installs you run by hand keep npm's defaults.

## 25.4.0 — Review notes update the plan and stop

- **Copy notes is a plain request.** `review.html` copies `Update the plan <name> with these notes from the review page. Don't build yet.`, then one bullet per note: `- Change #2 ("<quote>"): <note>`, with `Why, paragraph <n>`, `Change #<n>, drawing line <k>`, or `Decision #<n>` for the other spots. It no longer starts with `/continue`. The toast says *Paste them into chat to update the plan.* Saved notes and their labels are unchanged.
- **Pasted notes stop at the plan.** [`/plan`'s review-notes step](.agents/skills/plan/SKILL.md#review-notes) recognizes the new header with no verb, skips the explore round, goes by the quote when a number moved, rebuilds the page, and ends with the review link and *build it now?* It never builds from the notes. The skill's description names pasted notes, so it loads without `/plan`. `/continue` drops its review-block bullet.
- **The old marker is retired.** `Review notes from review.html` joins `scripts/retired-names.json`.

**Updating.** An active change's page picks up the new copy on its next build. A page built before 25.4.0 still copies `/continue`; rebuild it (`/plan` rebuilds on any edit) before copying notes from it.

## 25.3.0 — Tests that guard AI-written code

- **The app carries no browser.** The review page's browser test moves from `app/review/` to WongStack's own checks (`scripts/tests/review-browser.test.mjs`), on `playwright-core` and the CI runner's Google Chrome. The scaffold drops `playwright`, `review/*.test.mjs` leaves its `test` script and `knip.jsonc`, and `test.yml` no longer installs Chromium, about 19 seconds per run.
- **Mutation testing skips static mutants.** `app/stryker.conf.json` sets `ignoreStatic`. A static mutant changes code that runs once when a module loads, so testing it reruns every test; in one repo they were 17% of the mutants and 81% of the time. The 100% break threshold stays for every other mutant.
- **The login check is tested with a real signature.** `app/worker/access.test.ts` signs tokens with a key generated in the test instead of mocking `crypto.subtle`, and a token signed by another key is refused. `access.ts` drops its base64 padding code, which `atob` never needed, and marks two mutants that change nothing observable with a `Stryker disable` comment and its reason.
- **The walkthrough cleanup deletes only its own temp folders.** `verify-staging.sh cleanup` resolves the path and accepts only a `wong-verify-*` or `wong-walk-*` directory directly inside the system temp directory.
- **Memory reports real supersedes.** `memory.mjs put-facts` counts a supersede only when the store marked the old fact; one that names a missing or already-superseded fact counts as added.
- **Scripts pass shellcheck.** `scripts/lib-wrangler-config.sh` declares that its callers read the variables it sets; two small lint fixes in the memory and routine scripts. No behavior changes.

WongStack's own checks, which no repo receives, now test each guard script's refusal path, lint the scripts, run shellcheck, and hold script coverage to a floor that only rises.

**Updating.** `/wong-sync` removes `app/review/` and `playwright` from `app/package.json` and the browser step from `test.yml`, and adds `ignoreStatic`. The first CI run after it tests every mutant once, because the Stryker config changed. If you added your own browser tests to the app, keep `playwright` and add your own install step.

## 25.2.1 — Each rule written once, and old names caught

- **Each rule has one owner.** Skills, references, and wiki pages that restated a rule now link its owner: the git boundary, the gate, the ask format, credential exclusion, the widen, the Access service token, the walk mechanics, and the mini-app flow. `save/references/archived-save.md` folds into `save/SKILL.md` ([the archived handoff](.agents/skills/save/SKILL.md#the-archived-handoff)), and `save/references/spec-sync.md` into [the CLI contract](.agents/skills/plan/references/openspec-cli.md#reconcile-deltas). Pasted review notes move from `/continue` to [`/plan`](.agents/skills/plan/SKILL.md#review-notes). No step, command, or behavior changes.
- **The wiki says each thing once.** [The staging walkthrough](wiki/development/staging-walkthrough.md) keeps only its reasons. [Cloudflare Access](wiki/stack/cloudflare-access.md) owns the service token, and [the D1 pipeline](wiki/stack/d1-pipeline.md) owns `.dev.vars` and secret parity. The memory page's "The memory token" heading is now [The memory key](wiki/development/memory.md#the-memory-key).
- **Specs match what ships.** `memory-worker` folds into `memory-store`, and `session-notes` into `memory-capture` and `delivery-gate`, word for word; archive retires both. Stale names are fixed: `openspec-archive-change`, `/opsx:apply`, the `walk` skill, and the memory token.
- **A retired-names check.** `scripts/check-retired-names.mjs` fails CI when a live file names something in `scripts/retired-names.json`, and says what replaced it. It is meta-repo only. [The payload rule](.agents/rules/payload.md) adds the old name to the list whenever a change removes or renames something.
- **Deploy scripts share their helpers.** `scripts/lib-wrangler-config.sh` gains `wong_preview_alias`, `wong_preview_url`, and `wong_ci_branch`, used by `cf-deploy.sh`, `cf-preview.sh`, and `cf-build.sh`. Exit codes and messages are unchanged.
- **Entries before 19.0.0 are in git history.** This file drops from about 31,600 words to 4,200.

**Updating.** `/wong-sync` brings the edited skills, references, wiki pages, and scripts. A link in your own pages to `memory.md#the-memory-token`, `save/references/archived-save.md`, or `save/references/spec-sync.md` needs the new target above.

## 25.2.0 — The review page works on a phone

- **One tap to comment.** Every Why paragraph, item, and decision on `review.html` shows a **+ Note** button that opens the note box. A saved note's pin takes its place. A mouse click on the text still offers "Add note"; a touch tap on text does nothing, so a stray tap while scrolling opens nothing.
- **Drawings fold and use the full width.** `build-review.mjs` writes each drawing as a `<details class="drawing">` after the item's text column, so it starts folded and spans the whole card when opened. The fold row counts the notes on the drawing's lines. The page fits a drawing by font size and has no zoom buttons; a drag scrolls the page.
- **A full-screen view zooms and moves the drawing.** A tap on a drawing, or **Full screen**, opens it bigger. −, Fit, +, a pinch, and a Ctrl or Cmd wheel zoom it; the browser's own scrolling moves it, so a host app such as Paseo should no longer take the drag for a sidebar swipe. Tap a line to note it. Escape or Close returns to the page.
- **The phone note box stays on screen.** It is placed from the top of the visible screen and capped at its height, so a keyboard never pushes its top out of view. Its location line is one line, and "Discard draft" is now "Discard".

Note ids, labels, storage, and the copy format do not change, so saved notes stay attached. An active change picks up the new kit on its next page build; archived pages are not rebuilt.

## 25.1.0 — Learn the development loop by chatting

- **A new tutorial.** The starter landing page opens with *Learn the development loop*: one plain message and a **Copy** button. The message asks the agent to remove the tutorial and explain each step, so the first change teaches the plan, the preview, and publishing in the chat. When the browser blocks copying, the button says to copy the message by hand. The tutorial's test moves to `app/src/Tutorial.test.tsx`, so removing the tutorial takes its test with it.
- **One home page.** The build no longer writes the `/apps/` list page; `mini-apps/router.mjs` redirects `/apps/` to `/`, and the home page is the list. The example app's back link reads *Home* and points at `/`. When the list does not load, the home page says to reload instead of linking to `/apps/`.
- **The home page looks like the mini apps.** `app/src/index.css` and `App.css` drop the Vite template's purple theme for the mini apps' plain style: `system-ui`, `color-scheme: light dark`, system colors, and 1px outlines.
- **Setup points to it.** The closing report of [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#step-5--the-closing-report) ends on the site's address and the message to copy.

**Updating.** `/wong-sync` replaces the old tutorial message only when your landing page still shows it. If you removed it, it stays removed. If your own landing page does not list the mini apps, the plan adds the list, because `/apps/` now opens your home page. Your own mini apps keep their *All mini apps* link; it still works, and lands on the home page.

## 25.0.0 — One route for every change, with a preview right after building

**Breaking.** A mini app no longer has its own route, and `/apply` no longer saves when it finishes.

- **`/apply` ends with a preview from this machine.** When every task is done, it asks `.github/scripts/app-untouched.sh --worktree` whether the app changed. If it did, it runs `scripts/cf-preview.sh --alias <change-name>` and reports the link. Then it asks *publish it?*, *change it more*, or *save it*. It never invokes `/save` on completion. A change that leaves the app untouched gets no upload: the agent does the task and reports. Inside `/ship`, `/apply` still returns with no upload, and task-driven saves still run mid-list.
- **Only `/save` and `/ship` push.** `/save` opens the pull request when you want a checkpoint. `/ship` saves once, waits for CI, walks the preview, and merges, as before.
- **A mini app takes the same loop.** "Make me a …" gets a plan with a review link and *build it now?*, then the host preview at `/apps/<name>/`, then *publish it?*. It goes live only through `/ship`, and CI still runs only the changed app's tests.
- **`app-untouched.sh` gains `--worktree`.** It answers for the uncommitted work, untracked files included, against the merge base with `origin/<default>`. The CI mode does not change.
- **Removed:** `save/references/mini-app-save.md`, `save/scripts/mini-app-push.sh`, the `mini-app` mode of `save/scripts/render-pr-body.mjs`, `/apply`'s mini-app path, and `/ship`'s mini-app merge. The `WONG-STACK` block's mini-app rule no longer mentions a direct save.

**Updating.** Finish or save a half-built mini app before you sync: a save after the update opens a pull request instead of pushing to `main`. `/wong-sync` deletes the removed files. Apps you already saved stay live and unchanged.

## 24.0.2 — OpenSpec 1.13.2

- **OpenSpec 1.13.2 replaces 1.8.0.** The install command in `save/references/preconditions.md`, the CI install, and the docs name 1.13.2. The commands WongStack uses (`init --tools none`, `context`, `list`, `status`, `instructions`, `validate`, `archive`) keep their JSON shape; `instructions apply` adds `taskTrackingConfigured`.
- **CI validates every spec strictly.** The `payload` check runs `openspec validate --specs --strict`, which since 1.11.0 fails a Purpose still left as the archive's `TBD` placeholder. `delivery-gate` and `secrets-convention` get a real Purpose.

**Updating.** Run `npm install -g @fission-ai/openspec@1.13.2`. In your own repo, `openspec validate --specs --strict` names any spec whose Purpose still says `TBD`; write what it is for.

## 24.0.1 — The Worker runs first for all its routes

- **Memory and the API work again in production.** 24.0.0 set `run_worker_first` to `["/apps/*"]`. With a list, every path not in it gets the single-page fallback, so `POST /_memory/*` and `POST /api/*` answered 405. The `wrangler.jsonc` fragment and the app config now list `["/api/*", "/_memory/*", "/apps/*"]`, and a script test holds that list. An install on 24.0.0: add the two missing entries to `run_worker_first` in `app/wrangler.jsonc`; `/wong-sync` plans it.

## 24.0.0 — Your app serves the mini apps

**Breaking.** There is no separate mini-app Worker any more. Your app's Worker serves every mini app at `/apps/<name>/`, and the old `<repo>-mini` address stops working.

- **One Worker per repo.** `app/worker/index.ts` sends `/apps/*` to the new `mini-apps/router.mjs`, the same way it sends `/_memory/*` to memory. `mini-apps/routes.mjs` finds each app's `api.mjs` with a Vite glob, so a new app needs no edit. A handler gets only `DB`, never the memory bindings. The `wrangler.jsonc` fragment gains `assets.binding: "ASSETS"` and `run_worker_first: ["/apps/*"]`, so an app's API wins over the single-page fallback.
- **The build copies the apps in.** After `build:app`, `cf-build.sh` runs `mini-dashboard.mjs --into <assets>`. It copies each app's pages, never `api.mjs`, tests, or TypeScript, to `/apps/<name>/`, and writes the list page `/apps/` and its data `/apps/apps.json`. The assets folder comes from the new `assets-dir` read in `lib-wrangler-config`.
- **A preview builds the whole app.** `scripts/cf-preview.sh --alias mini-<name>` replaces `cf-mini.sh preview`. It installs `app/` when it has no `node_modules`, migrates staging, builds for staging, and uploads a preview version of the staging Worker. It is slower than before, and previews no longer expire.
- **A mini-app save deploys your app.** The direct save to `main` does not change. CI still runs only the changed app's tests, but it now builds and deploys the main Worker. `app-untouched.sh` counts only `mini-apps/apps/*` as untouched, so a change to the router runs the main suite. The mini-app deploy block and its `staging-mini` preview are gone from `deploy.yml`.
- **A new landing page.** The starter app's Vite template page becomes a tutorial message and a list of your mini apps. The tutorial's one task is to remove itself: say `remove the tutorial message`, and the agent walks you through the plan, the preview, and publishing.
- **Removed:** `mini-apps/wrangler.jsonc` and its fragment, `mini-apps/worker.ts`, `mini-apps/tsconfig.json`, `mini-apps/.gitignore`, `mini-apps/apps/.assetsignore`, `scripts/cf-mini.sh`, and the seven-day preview expiry.

**Updating.** `/wong-sync` plans the move through [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#4c-the-two-app-databases-and-the-config):
1. The sync change adds the `/apps/` route to `app/worker/index.ts` and the two `assets` keys to `app/wrangler.jsonc`, and deletes the mini Worker's files. Your landing page stays as it is; `/apps/` lists the apps.
2. After it merges and production deploys, open `/apps/` and each saved app.
3. Only then, delete the `<repo>-mini` and `<repo>-mini-staging` Workers.

## 23.2.0 — The assistant comes first, in short plain messages

- **Short, plain messages replace STE100.** The `WONG-STACK` block no longer asks for ASD-STE100 Simplified Technical English. One rule, *keep messages short and plain*, replaces it and "Answer in a few lines": the point first, a few lines, everyday words. The agent names git, OpenSpec, or CI only when the person asks or must act. Code, commands, identifiers, and quotations stay exact. [`wiki/voice.md`](wiki/voice.md) owns the rule and gains an everyday-words line. `asking-the-user.md` points to it.
- **Plain requests come first.** "Do a plain request directly" is now the first rule in the block, before the change loop.
- **The README and wiki welcome a newcomer.** The README opens with what the assistant does, example requests, three setup steps, and where to chat, with no developer terms. The commands, comparison, requirements, and layout sit under "For developers". [`wiki/README.md`](wiki/README.md) opens with the assistant and links [getting started](wiki/stack/getting-started.md), which now shows asking for anything before the change loop.

**Updating.** `/wong-sync` brings the new rule, `voice.md`, and the reference line. Nothing else to do. Your own wiki pages keep their prose until you next edit them.

## 23.1.0 — Plans a non-technical person can read

- **Plans are written for the person who asked.** A person page in `wiki/people/` can hold one line, `**Technical level:** technical` or `non-technical`. With no line, the agent assumes non-technical. A plan's Why and What Changes then say what the person will see, get, or be able to do, and file names, code, and commands move into the design, specs, and tasks. [The ask convention](.agents/skills/explore/references/asking-the-user.md#write-at-the-readers-level) owns the rule, and `openspec/config.yaml` gives it to every draft. A technical reader's plan does not change.
- **Questions and reports name outcomes.** Every ask, blocker report, and next-step question uses the reader's level. A skill tries the fixes its rules allow before it asks, and `/ship`'s failed-walk question becomes *fix it first, or publish anyway?* for a non-technical reader. `/apply` and `/ship` start their reports with the outcome.
- **You just ask.** A code change asked for with no command stops twice: at the plan (*build it now?*) and after the preview (*publish it?*). `/ship` and `/apply` keep their reach when you type them. [The change loop](wiki/development/the-change-loop.md#just-ask) owns the rule, and the `WONG-STACK` block states it.
- **Every plan ends with a link to its review page.** `build-review.mjs` prints the page's absolute path after its status line, and a standalone `/plan` ends with *Click here to see the plan:* and that link, just above the next-step question.

**Updating.** `/wong-sync` takes the new text and script. Nothing to migrate: with no level line, plans become plain. An engineer says once that they are technical, and the agent records it on their page.

## 23.0.1 — A mini-app save retries once when main moved

- **A moved `main` gets one rebase, not a pull request.** A mini-app save now pushes through the new `save/scripts/mini-app-push.sh`. It runs the app's tests and pushes. When the push is rejected only because `main` moved, it rebases once, runs the tests again, and pushes again. It never forces a push. It falls back to a pull request when the rebase conflicts, the tests fail on the new `main`, the second push is rejected, or the push is refused for another reason, such as branch rules. It prints `pushed`, `rebased`, and `reason`, and a real-git test covers each path. Before this, any rejected push fell back to a pull request, as the first saved mini app did when another release landed during its save.

## 23.0.0 — Memory lives in your app's production Worker

**Breaking.** There is no separate memory Worker any more. Your app's production Worker serves session memory, and CI deploys it with the app.

- **One Worker per repo.** `app/worker/index.ts` sends `/_memory/*` to the memory skill's route module, on the production Worker's `MEMORY_DB` and `MEMORY_BUCKET` bindings. The staging Worker and previews bind neither and answer 404. The route keeps the same requests, keys, roles, and transcript rules as 21.0.0. The shared `wong-memory` Worker and its `wong-memory-keys` database are gone.
- **`memory.mjs worker deploy` is removed.** A merge to `main` deploys a memory change. `member add`, `member remove`, and `member list` stay, with `CLOUDFLARE_API_TOKEN`.
- **Keys live in the memory database.** Migration `0002` adds a `memory_keys` table. The route refuses every statement that names it, so no key can read or change keys.
- **The token picks the route.** A memory key (`wongm_...`) goes to `components.memory.worker`, now `https://<worker>.<subdomain>.workers.dev/_memory`. Any other token goes to the Cloudflare API, as before. Before production first deploys the route, a key's facts wait in the spool.
- **The pipeline knows the memory bindings.** `secrets:check` does not ask staging to twin a `MEMORY_*` binding, and `cf-build.sh` never reads `MEMORY_DB` as the app's database. The [`wrangler.jsonc` fragment](.agents/skills/wong-sync/references/stack-pack-fragments.md#wranglerjsonc--the-worker-entry-bindings-and-envstaging) gains both bindings at the top level only.
- **Access.** Keep `workers.dev` on for the production Worker, or bypass `/_memory/*`: [the Access page](wiki/stack/cloudflare-access.md#4-bypass-the-public-surface).

**Updating.** `/wong-sync` plans the move through [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store):
1. The sync change adds the route to `app/worker/index.ts`, the memory bindings to `app/wrangler.jsonc`, and `worker` to the install record. It runs `memory.mjs migrate`, and gives `<repo>-deploy` R2 access when the store has a bucket.
2. After it merges and production deploys, run `memory.mjs member add <your git email> --admin --env`, then `memory.mjs digest`.
3. Only then, delete the old `<repo>-memory` Cloudflare token.

Until step 2, the store keeps working with the old token. Teammates who held that token need a member key from the admin.
## 22.0.1 — Only the mini-app scaffold ships, not every mini app

- **The scaffold lists what ships.** `payload-files.json` named the whole `mini-apps/` folder, so an app made in the WongStack source repo would have reached every repo that installs or syncs WongStack. It now lists the mini Worker (`worker.ts`, its editor config, and its ignore files) and the example app `mini-apps/apps/hello/`, and nothing else. `mini-apps/wrangler.jsonc` stays out, as before. A sync test with the real manifest checks that a second app folder is never selected. A repo on 22.0.0 already has these files, so its next `/wong-sync` changes nothing.

## 22.0.0 — A lighter loop, mini apps, and verbs for any work

**Breaking.** `/plan`'s review page, `/ship`'s checkpoints, and `/apply`'s completion inside `/ship` change their contracts.

- **The review page is one scrolling document with text drawings.** `/plan` draws each visual as a fenced `text` block inside its What Changes bullet, top to bottom and about 40 columns wide, with no design subagent and no browser check. The page shows Why, the items with their drawings, and the Decision log labeled *asked*, *assumed*, or *log*. A drawing opens fitted to the screen; pinch or press + to zoom, and drag to pan. Tap an item to add a note: there is no annotate mode, and a drag still scrolls. Removed: `plan/references/review-author.md`, `plan/references/review-examples.html`, `plan/scripts/check-review.js`, and the per-change `review-visuals.html`. An active change planned in the old format keeps its page with a proposal-only refresh; archived pages are not rebuilt. Each Decision-log bullet now holds one decision and starts with *Asked* or *Assumed*.
- **A one-go `/ship` runs CI once.** When `/ship` pulls in `/apply`, `/apply` returns without `/save`; `/ship` archives, saves once, walks the preview with `/verify`, and merges. The new `ship/scripts/merge.sh` does the merge, the retarget, the branch delete, and the checkout sync. A standalone `/apply` still saves when it completes.
- **Mini apps.** "Make me a …" builds `mini-apps/apps/<name>/` on a small Worker beside the main app, with no build step, a plain-JavaScript handler, and its own `node --test` tests, so a preview never builds `app/`. `scripts/cf-mini.sh preview` uploads a preview from the agent host in seconds, on staging data, and the preview expires after seven days. `/save` then takes a second direct route beside the prose route: it runs the app's tests on the host and pushes straight to `main`, where CI runs them again and deploys only the production mini Worker. A diff outside the app's folder, such as a migration, or a rejected push falls back to a pull request, which `/ship` merges with no change record and no walk. `scripts/mini-dashboard.mjs` lists every saved app. New: the `mini-apps/` scaffold, [mini apps](wiki/stack/mini-apps.md), `save/references/mini-app-save.md`, and a `mini-app` mode in the PR body renderer. Setup creates `mini-apps/wrangler.jsonc` from a new fragment; an existing repo adds it through `/wong-sync`. The pack's config resolver now skips `mini-apps/`.
- **A verb you invoke serves any work.** Work that changes no repo file gets a to-do from `/plan`, a confirm before each outward action in `/apply`, a memory thread from `/save`, and a resume from `/continue`. `/ship` stays for repo changes. A plain request still needs no verb.
- **CI skips the main app when a branch leaves it untouched.** The new core `.github/scripts/app-untouched.sh` compares the whole branch with the default branch. On a docs-only branch (`wiki/`, `openspec/`, or `.md` files) or a mini-apps-only branch, `test.yml` and `deploy.yml` skip the main app's steps inside the job, so a required check still reports. A mini-app branch runs only the changed apps' tests.

## 21.0.0 — Team memory: every memory call goes through one memory Worker per account

**Breaking.** Every install changes how it reaches its memory store. No person holds a Cloudflare token for memory any more, because D1 permissions reach every database in the account, the app's production database included.

- **One memory Worker per Cloudflare account.** `wong-memory` serves every repo's memory store in the account, home included. It is separate from every app Worker, and it can reach only the memory databases and buckets. `memory.mjs worker deploy` deploys it, attaches this repo, keeps every other repo's attachment, drops attachments to deleted stores, and records the URL as `components.memory.worker`.
- **Memory keys, not tokens.** `CLOUDFLARE_MEMORY_TOKEN` now holds a memory key (`wongm_...`). Each key opens one repo's store, as admin or member. The `wong-memory-keys` database holds only key hashes, and no key can reach it. `member add <email> [--admin] [--env]`, `member remove`, and `member list` manage keys with `CLOUDFLARE_API_TOKEN`. `migrate` also runs with that token.
- **Transcripts are private to their author.** New uploads go to `sessions/<author email>/<agent>/<session-id>.jsonl`. A member reads only their own; the admin reads all, including older transcripts.
- **Personal facts in a team.** Once a repo has a member (`components.memory.team`), the digest and search show only your own `user` and `feedback` facts, matched on every email on your people page. `project` and `thread` facts come from everyone. `search --everyone` shows all. A solo repo does not change.

**Moving an existing install.** `/wong-sync` plans it through [setup's provisioning runbook](.agents/skills/wong-setup/references/cloudflare.md#4b-the-memory-store):
1. Run `memory.mjs worker deploy`.
2. Run `memory.mjs member add <your git email> --admin --env`.
3. Check `memory.mjs digest`.
4. Only then, delete the old `<repo>-memory` Cloudflare token.

Until you move, the store keeps working with the old token. Teammates who held that token need a member key from the admin.

## 20.2.0 — A server setup script you can fork

- **`server/setup.sh` turns a fresh Ubuntu 24.04 server into a workspace for agents.** Run it as root: it makes the workspace user (`WORKSPACE_USER`, default `wong`), installs Node.js 24, `git`, `gh`, OpenSpec, Paseo, Claude Code, Codex, OpenCode, and agent-browser with its Chrome, and runs Paseo as a service for that user. It checks its own result last and prints `missing: <name>` on a gap. It is safe to run again.
- **[`server/README.md`](server/README.md) is the contract a host relies on:** the command, the input, the end state, the paths it never touches, and a 12 KiB size budget, so a host can embed the script in first-boot data. A new test holds the script to the budget, checks its syntax, and checks that the final check covers every promised tool.
- **Your fork is your template.** Edit the script in your fork to change what every server gets; a host that runs a pinned commit of your fork builds your servers, and you own the template.
- **Source-only.** `server/` is not payload, so `/wong-sync` adds nothing to installed repos. [Required tools](wiki/development/required-tools.md) now names the script as the one place WongStack installs Paseo.

## 20.1.1 — Override the vulnerable qs in the app scaffold

- **`qs` resolves to 6.16.0.** `app/package.json` gets `"overrides": { "qs": "^6.16.0" }`. Stryker 10.0.0 pins `typed-rest-client ~2.3.0`, which pins the vulnerable `qs` 6.15.1, so no normal update could fix it. Only Stryker's dashboard reporter uses `qs`; the app's runtime does not change. Remove the override when Stryker moves to `typed-rest-client` 3.

## 20.1.0 — Mutation testing re-tests only what changed

- **Stryker is incremental.** The scaffold's `app/stryker.conf.json` sets `"incremental": true`. Stryker keeps each mutant's result in `app/reports/stryker-incremental.json` (git-ignored) and reuses it when the mutant's code and the test that killed it did not change; it tests every other mutant. The 100% break threshold and the one `npm test` command stay. `npx stryker run --force` tests every mutant.
- **The Test workflow keeps the result file between runs.** [`test.yml`](.github/workflows/test.yml) restores the file before "Test" and saves it after, also after a red run. A branch starts from its own newest file, else the default branch's. The key hashes the suite's lockfile, Stryker config, and Vitest config, so a dependency or config change tests every mutant. A suite with no Stryker config runs no cache step.
- **Why:** a full mutation run grows with the app. In one downstream repo it took 14 of the Test check's 15 minutes, on every push. The first run after this update has no file and tests every mutant; later pushes re-test only what changed. If you edited your own `stryker.conf.json`, `/wong-sync` adapts the one-line change.

## 20.0.0 — An assistant in every repo: direct requests, a wiki that grows from use, and home

**Breaking.** Every install changes how it handles requests and what it writes to the wiki. There is no mode: every repo follows the same rules.

- **Plain requests are done directly.** The `WONG-STACK` block now says: do research, errands, reminders, and questions with no verb and no question round; build or change code through the verbs. `/explore` still runs before every plan.
- **The wiki holds repeatable knowledge and grows from use.** Its scope widens from "general, reusable processes" to process, people, the company, and the project. The test: will this help with a future task that is not this one? The agent writes such knowledge when it learns it, including "read this and remember it" and answers worth keeping, citing sources by URL. The block's "Don't edit `wiki/` mid-task" rule is replaced. [Wiki style](wiki/wiki-style.md#repeatable-knowledge) owns the rules: `wiki/people/<name>.md` pages matched by git email and created on first use, four writing rules, and no seeded sections.
- **`/ship` is the catch-up.** Its distill step reads every live fact from the sessions on the change's branch (`search --branch`), not only the change's slug, and places repeatable facts by progressive disclosure, people pages included.
- **Home.** A person can record one repo per machine as their home in `~/.wong-stack/machine.json`; `/wong-setup` asks. Every other repo then loads the person's `people/` page and live `user` and `feedback` facts from home at session start, in a capped **From home** part of the digest. Facts about private life go to home's store through the new `memory.mjs --home` option (on `search`, `show`, `gate`, `put-facts`), wait in home's spool when home is offline, and are dropped when no home is recorded. No new database or token. [Home](wiki/development/home.md) owns the details.
- **Saved browser logins.** The first login points agent-browser at one persistent profile in `~/.agent-browser/config.json`; the person logs in once, and later tasks reuse the session. Personal browsing runs one task at a time. `/verify` now runs each browser journey in its own temporary profile, so a walk never carries personal logins.
- **Short chat replies.** The block tells the agent to answer in a few lines and give more detail when asked.
- **Tests:** the memory harness keys its fake databases by id; new tests cover `--home`, the home spool, the From-home part, and the `/verify` profile. The garbled 19.0.2 entry below is repaired.

## 19.1.0 — one file per secrets role, and branch copies in worktrees

- Two live secrets files, one role and one place each. The root `.env` holds what you and the scripts use to reach Cloudflare, and never reaches a Worker. `app/.dev.vars` holds the secrets the Worker reads at runtime. [Which file holds what](wiki/stack/d1-pipeline.md#env-and-devvars-are-not-interchangeable).
- `.dev.vars.example` moves from the repo root to `app/.dev.vars.example`, beside `app/wrangler.jsonc`. `secrets:push` and `secrets:check` always read that folder, so the root copy was never read. **If your repo has a root `.dev.vars`, move it to `app/.dev.vars`** (beside your wrangler config) by hand, and move the example with it.
- A linked worktree works on its own branch copy of each live file. The new [`worktree-secrets.mjs`](.agents/skills/ship/scripts/worktree-secrets.mjs) `seed` copies the primary's files into a new worktree and records a baseline of key-name hashes in the worktree's Git directory. Wire it into your worktree tool's setup; this repo's `paseo.json` does. [The secrets convention](wiki/development/secrets.md#worktrees-and-branch-copies) owns the lifecycle.
- A branch writes an add or a rotation to both copies now, and keeps a deletion or a branch-only value in its own copy. [`/ship`](.agents/skills/ship/SKILL.md) runs `worktree-secrets.mjs promote` after the merge. It applies only what the branch changed, skips and names a key both sides changed, and prints key names, never values. Like the post-merge sync, it cannot fail a merged ship.
- The [secrets rule](.agents/rules/secrets.md) now loads for `.dev.vars*` too. It says which file holds what and how each kind of edit reaches the primary. `/save`'s named-secret step writes an add or a rotation to the seeded branch copy as well as the primary.
- `secrets:push` in a linked worktree that has no `app/.dev.vars` reads the primary checkout's copy, and says so. A local copy still wins, and the `.env` refusal is unchanged.
- [The agent knowledge center](wiki/agent-knowledge-center.md#what-each-surface-owns) lists path-scoped rules as a surface, and says to prefer a rule to a hook for an edit-time convention.

## 19.0.2 — Background capture works in don't-ask mode

- **Memory:** background capture no longer fails under `dontAsk`. Claude Code denied the 19.0.0 heredoc when a fact held characters such as `<`, `>`, `|`, or `$`. Each run now makes one temp folder outside the repo, grants writes to it alone (`Edit(...)` and `--add-dir`), and passes `--file <path>` to `memory.mjs`. The folder is deleted when the run ends. Codex gets the same folder as a writable root. Interactive sessions keep the stdin heredoc.
- **`/ship`** no longer prints a delete error when GitHub already deleted the branch at merge. It checks `git ls-remote --heads` first, and the report says "deleted at merge".
- This source repo's Dependabot ignores `@types/node` major versions, which follow `.nvmrc`. Not shipped to installs.

## 19.0.1 — Records from the old notes migration stay readable

- The memory-store spec states that records from an earlier notes migration stay readable: `migration:<slug>` sessions, facts with source `migration`, and `migration/<slug>.md` objects in R2. `memory.mjs source <fact-id>` prints the note text behind a migrated fact. A new test guards this, and a second test checks that no command imports `notes/`.
- The write-gate requirement no longer names the migration as a writer. No shipped behavior changes.

## 19.0.0 — A fresh start: safer edge cases, no legacy paths, an open-source surface

**Breaking.** Installs from before 19.0.0 are not supported. `/wong-sync` no longer migrates `notes/`, the `.claude/` folder layout, the CI secret, the generated `openspec-*` layer, the `.wong-framework.json` record, or the `components.stackPack`, `appScaffold`, and `ui` flags. Set such a repo up again in an empty folder with [`/wong-setup`](.agents/skills/wong-setup/SKILL.md).

- **Safer failure paths:**
  - `/ship` merges with `--match-head-commit` and deletes the branch only after the PR state is `MERGED`. It retargets stacked PRs to the real default branch.
  - The CI gate waits for the pushed commit's checks. `NONE` means that the repo has no workflow files. A failed `gh` call is `UNKNOWN`, and `UNKNOWN` never merges.
  - `/save`, `/continue`, and `/ship` check [shared preconditions](.agents/skills/save/references/preconditions.md) first. A dirty default branch goes to `/save`.
  - Setup creates the GitHub repository and `origin`.
- **Pack scripts read the wrangler config with one JSONC parser** in `scripts/lib-wrangler-config.mjs`. The production guard in `cf-deploy.sh` can no longer be passed by a `database_name` key or by a comment. A Worker with no D1 builds and deploys. The staging reset refuses the production database. TOML config is refused with a clear message. New pack file: `scripts/lib-cli.mjs`.
- **Memory:**
  - The session-start hook exits within its 5 s timeout when the store cannot be reached.
  - Background capture passes JSON on stdin, so it no longer fails in don't-ask mode.
  - `migrate` applies each migration once. The digest is capped at 40 lines and 6 KB, with open threads first, and it loads only on startup and resume.
- **Less to read:**
  - Each rule has one owner. The change-selection order has named rungs in [the evidence contract](.agents/skills/save/references/checkpoint-evidence.md#selection-rungs).
  - `/ship` and `/verify` are about half their size, and skill instructions are about 3,200 words shorter.
  - The vendored `agent-browser` skill no longer triggers on its own.
- **Open-source surface:**
  - Markdown links name the real `.agents/` paths, so they open on github.com, and the link checker fails on a link through a symlink.
  - The README states the problem first, and it has a layout table and correct requirements.
  - New files: `CODE_OF_CONDUCT.md`, `.github/CONTRIBUTING.md`, issue and PR templates, `CODEOWNERS`, `.gitattributes`, `.editorconfig`, and `.nvmrc` (Node 22).
  - Workflow actions are pinned by SHA and have job timeouts. Production deploys run in a `production` environment.
  - This source repo also gets Dependabot, which is not shipped to installs.
- Each release is now tagged `v<VERSION>` and published as a GitHub Release, starting with this one.

## Before 19.0.0

Entries for 18.1.0 and earlier are in git history: `git show 47385c9:CHANGELOG.md`. Installs from before 19.0.0 are not supported, so `/wong-sync` never reads them.
