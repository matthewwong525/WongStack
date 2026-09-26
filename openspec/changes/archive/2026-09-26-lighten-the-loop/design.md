## Context

The loop has one weight class. A one-go `/ship` runs a design subagent for HTML visuals, a browser check, two `/save` checkpoints that each wait on CI, and a `/verify` walk. A `/save` is expensive because of the session it inherits (median about 220k tokens at start), so every extra checkpoint costs a full-context turn sequence. CI itself is short: Test about 80 s, Deploy about 40 s.

PR #118 (`add-home-repo`, 20.0.0) is about to merge. It adds `request-routing` (plain requests need no verb; no repo has a mode), widens the wiki to repeatable knowledge, and rewrites `/ship`'s wiki catch-up. This change builds on it and edits several of the same files: `AGENTS.md`, `README.md`, `wiki/development/the-change-loop.md`, `wiki/development/memory.md`, `wiki/agent-knowledge-center.md`, `.agents/skills/ship/SKILL.md`, and the payload manifest.

The `main` ruleset requires the `test` and `payload` checks, and allows squash merges only.

## Goals / Non-Goals

**Goals:**

- A one-go `/ship` runs CI once, then walks the preview before the merge.
- `/plan` makes its review page with no second agent and no browser.
- A mini app goes from a request to a preview URL in under a minute, and each later tweak in seconds, however large the main app is.
- An invoked verb serves non-code work without creating git or OpenSpec records.
- A branch that leaves the main app untouched (docs or mini apps) does not install, run, or deploy the main app.

**Non-Goals:**

- A home or chat mode, or any setting that selects a verb's form.
- Connectors to email, calendar, or chat services.
- Saving review notes to a database.
- Rebuilding archived review pages, or changing an active old-format page beyond a proposal-only refresh.
- Serving mini apps at the main app's address, and porting a mini app into `app/`.

## Decisions

### 1. Take #118 in first

The first task confirms #118 is on `main` and merges `origin/main` into this branch before any shared file is edited. That keeps its catch-up, `request-routing`, and wiki scope intact, and gives this change the 21.0.0 slot. The `request-routing` delta validates against #118's spec once it is on `main`.

### 2. The builder renders content; the kit adds behavior

`build-review.mjs` parses `proposal.md` in Node and writes static, escaped HTML for the Why, the numbered items with their drawings, and the Decisions. The kit's one script only adds zoom, pan, notes, drafts, and copy. The content then reads with scripts off, the parser is unit-tested without a browser, and the kit shrinks from about 710 lines to about 300.

- Format marker `<!-- wong-review:3 -->`. A page with the `:2` marker keeps its embedded viewer: the builder splices only the proposal block between the existing markers, which is today's proposal-only path. A `review-visuals.html` beside it is left in place and unused.
- Parsing rules: a bullet runs to the next bullet or a blank line outside a fence. A fence (three backticks, optional `text`) inside a bullet belongs to it. A trailing `(review.html#/…)` is stripped from the shown text. Decision-log bullets are labeled by the first word after `**YYYY-MM-DD** — `: `Asked` → asked, `Assumed` → assumed, else log.
- Diagnostics: a missing `## Why` or `## What Changes`, an unclosed fence, a fence outside a bullet, and missing kit markers are errors that keep the old page. A drawing line over 60 code points is a warning on stderr with the item and line.
- Alternative rejected: keep parsing in the browser (today). It duplicates Markdown logic in the kit and needs jsdom for every parser test.

### 3. Fit first, then zoom and pan

Each drawing sits in a frame. On load and resize, the scale is `min(1, frameWidth / drawingWidth)`, so a narrow drawing shows at full size and a wide one shows whole. The buttons step the scale by 1.25 between fit and 4. A two-pointer pinch and a Ctrl or Cmd wheel set it too. At fit, the frame has `touch-action: pan-y`, so a vertical drag scrolls the page. Past fit, it has `touch-action: none`, and a one-pointer drag translates the drawing, clamped to its edges. The frame's height follows the scaled drawing, capped at 70% of the viewport height. The page never scrolls sideways, because the frame clips.

This resolves the conflict between "drag scrolls" and "drag pans": the drawing captures a drag only after the reader has zoomed in on purpose.

### 4. Tap to note, with no mode

Every Why paragraph, item text, drawing line, and decision carries a `data-note` id. A pointer that goes down and up within 8 px and 500 ms on one of them, and not on a link, button, or input, shows a small "Add note" chip beside it. The chip opens the editor. A drag, a pinch, a wheel, or a tap on a control never shows the chip. Enter or Space on a focused element shows it too.

- Storage key `wong-review3:<change>`, so the old kit's differently shaped notes are never parsed as new ones.
- Copy format keeps its first two lines. Locations become `#/why`, `#/<n>`, and `#/decisions/<n>`.

### 5. The planning agent draws

`/plan` writes each drawing while it writes the bullet: top to bottom, about 40 columns, plain characters, inside a fenced `text` block. The author guide, the examples file, the browser checker, and the subagent step go. The `openspec/config.yaml` rules for `proposal`, `design`, and `tasks` change to match: no anchors, a screen is sketched in its bullet, and `### Review` names the items.

### 6. One checkpoint in a one-go ship

When `/ship` invokes `/apply`, it says so in the handoff, and `/apply` returns on completion instead of invoking `/save`. `/ship` then archives in the working tree, invokes `/save` once, runs `/verify` once, and merges. On the default branch, that save cuts the feature branch from the change name, as `/save` does today for a dirty default branch. The Step 1 rule "on the default branch with uncommitted changes, invoke `/save`" applies only before a pull-in, not after one.

Standalone `/apply` still saves on completion. A task-driven `/save` inside `/apply` still runs when a task needs the gate.

### 7. One merge script

`ship/scripts/merge.sh` runs today's Step 5 and Step 6: squash merge with `--match-head-commit`, confirm `MERGED`, retarget open PRs based on the branch, delete the remote branch (after `git ls-remote --exit-code --heads`), `git fetch --prune`, then fast-forward the checkout that has `main` out, or advance the `main` ref when none has it. It prints `key=value` lines for the report. Exit 0 means merged (a skipped sync is reported, not an error). Exit 1 means not merged and nothing deleted. Exit 2 means merged, but a retarget failed and the branch was kept. A test drives it with fake `gh` and `git` on `PATH`, like `wait-for-checks.test.mjs`.

### 8. Mini apps live on their own small Worker

A mini app must preview in seconds even when `app/` is a 1M-line codebase, so it never touches the main app's build.

```text
repo/
├─ app/               main app, untouched
└─ mini-apps/
   ├─ wrangler.jsonc  <repo>-mini + staging
   ├─ worker.ts       /<name>/api/* router
   └─ apps/           static assets root
      ├─ .assetsignore  *.ts
      ├─ index.html     dashboard (generated)
      ├─ routes.gen.ts  (generated)
      └─ tips/
         ├─ index.html
         ├─ app.json    title, description
         └─ api.mjs     optional handler
```

- **No build step.** A page is HTML, CSS, and plain JS modules, and a handler is plain JavaScript. wrangler bundles `worker.ts`, the generated route table, and each `api.mjs` with esbuild, which takes about a second. The generated files are git-ignored.
- **One Worker, one staging twin.** Both bind the repo's D1: production and staging, with the same ids as the main app, as `wongos` shares `wong-db`. A mini app that needs a table adds a migration to the shared `schema/migrations/`.
- **`scripts/cf-mini.sh`**, a pack script:
  - `preview [--alias <name>]` (host): `/apply` passes `--alias mini-<name>`, because a mini app has no branch of its own; without it, derive the alias from the branch and refuse the default branch. Then run `scripts/mini-dashboard.mjs`, which validates each `app.json` and writes `index.html` and `routes.gen.ts`; apply pending staging migrations; `wrangler deploy --env staging` only when the staging twin does not exist; `wrangler versions upload --env staging --preview-alias <alias>`; harvest and print the URL. It uses the same alias rule as `cf-deploy.sh`, so `mini/tips` becomes `mini-tips`.
  - `ci`: when `mini-apps/` changed, deploy staging plus the alias on a feature branch, or production on the default branch.
  - Both modes stop when the staging name resolves to the production name. They never touch `app/`.
- **Expiry.** Every non-production upload or deploy passes `--var PREVIEW_EXPIRES:<epoch ms, now + 7 days>`. `worker.ts` checks it first and answers 410 with a short "This preview expired — ask to rebuild it" page when it has passed. The production deploy passes no such var. An idle Worker costs nothing, so this is for exposure and clutter, not cost.
- **Credential.** The skill sources the primary worktree's `.env`, as [the secrets convention](../../../wiki/development/secrets.md) says.
- **Access.** Access can not gate `workers.dev`, so a preview link is public but unlisted, like the main app's previews; the seven-day expiry closes it. A repo with a custom domain adds the mini Worker's hostnames the same way as the app's; [the Access guide](../../../wiki/stack/cloudflare-access.md) says so.
- **Provisioning.** Like `app/wrangler.jsonc`, `mini-apps/wrangler.jsonc` carries live ids, so it is excluded from the payload; setup creates it from a new fragment in `stack-pack-fragments.md` with the names and the same D1 ids. This repo keeps its own real copy, so its CI can deploy the mini Worker. The first host preview creates the staging twin; the first merge creates production.
- **Save: straight to `main`.** A new `save/references/mini-app-save.md` is the second direct route beside the prose route. When the whole save diff is inside `mini-apps/apps/<name>/` and the commits ahead of `origin/main` touch only that folder:
  1. Run `(cd mini-apps/apps/<name> && node --test)` on the host. A failure stops the save with nothing pushed. A folder with no test file says so and goes on; `/apply` writes tests whenever the app has logic.
  2. Commit the folder's paths with `feat(mini): <name> — <what changed>` and push `HEAD:main`, as the prose route does. The admin ruleset bypass allows it.
  3. Report in two lines: the commit on `main`, and that the app goes live on production data at its production URL once CI deploys. No `SAVE_GATE_RESULT` line; nothing waited.

  CI on `main` runs the app's tests again (the `test` job) and deploys only the production mini Worker (§10). The route table row: the session built a mini app, and every changed path is inside one app's folder.
- **Fallback: a pull request.** A diff outside the folder (a migration under `schema/migrations/`, `mini-apps/worker.ts`, `mini-apps/wrangler.jsonc`) or a rejected push (no bypass, not fast-forward — never forced) takes save's normal PR route, with the body from `render-pr-body.mjs` in its `mini-app` mode. `/ship` on that branch skips the change selection, the archive, and the walk, invokes `/save` once to update the PR and wait for CI, and merges with `merge.sh`.
- **Tests.** `/apply` writes `mini-apps/apps/<name>/*.test.mjs` with `node:test` for the app's logic. A handler is plain JavaScript, `api.mjs`, so a test imports it directly and `node --test` runs it from the app's folder on any Node, with no install and no type stripping. (A distro Node 22 on the agent host had no type stripping, and Node 22 reads a folder argument to `--test` as a file.) The host runs them before a direct save; CI runs them after the push.
- **No branch and no fact.** `/apply` passes `--alias mini-<name>` to the preview, so no branch is needed. The folder on `main` and the dashboard are the record. `/apply` does not save on its own: a save goes live on production, so the person saves when the preview is right.
- **Later, not here.** The main app can mount `/apps/*` onto the mini Worker through a service binding, so mini apps share its address. Porting a mini app into `app/` is an ordinary change.

### 9. Non-code verbs

- `/plan` writes a numbered to-do in chat and marks outward steps with `(outward)`.
- `/apply` asks before each outward step in [the shared ask format](../../../.agents/skills/explore/references/asking-the-user.md), showing the exact payload.
- `/save` writes a `thread` fact with a topic slug.
- `/continue`'s menu adds open threads from `memory.mjs search --type thread --state conversation`, beside active changes.
- `/ship` says the work finishes in `/apply`.

`request-routing` keeps plain requests verb-free; this only defines what an invoked verb does.

### 10. The main-app-untouched check

`.github/scripts/app-untouched.sh` is core payload, so both `test.yml` (core) and `deploy.yml` (pack) can call it. The base is:

- on `pull_request`, `origin/$GITHUB_BASE_REF`;
- on a push to another branch, the merge base with `origin/<default>`;
- on a push to the default branch, `github.event.before`.

With an all-zero `before`, a failed fetch, or an empty diff, it prints `untouched=false`. Otherwise it prints `true` only when every path matches `wiki/*`, `openspec/*`, `mini-apps/*`, or `*.md`. It also prints `mini_apps=<names>`, the folders under `mini-apps/apps/` that the diff touches. When the main app is untouched, `test.yml` runs `node --experimental-strip-types --test mini-apps/apps/<name>/` for each named app, inside the same required `test` job. Both workflows check out with `fetch-depth: 0`, run it first, and gate the main app's steps on it. The job still reports, so the required check is satisfied. The mini Worker step in `deploy.yml` has its own condition (`mini-apps/` changed) and runs even when the main app is untouched. `payload.yml` does not use the check.

### 11. Release

22.0.0, with a newest-first `CHANGELOG.md` entry. `payload-files.json` adds `.github/scripts/app-untouched.sh` (core), `scripts/cf-mini.sh`, `scripts/mini-dashboard.mjs`, and `wiki/stack/mini-apps.md` (pack), and `mini-apps/` (scaffold). The plan skill directory drops three files. `scripts/fixtures/context-baseline.json` and the inventory in `scripts/measure-context.mjs` drop the visual-author route and add the mini-app save route. The main-spec Purpose lines of `ux-wireframes`, `staging-walkthrough`, and `ship-full-cycle` are edited directly, because a delta can not change a Purpose.

## UX

### Brief

- **Who:** the person who asked for the change, often on a phone, sometimes a teammate on a laptop.
- **Job:** read what will change and why, see the drawings, check each decision (above all the assumed ones), leave notes, and paste them back into `/continue`.
- **Done:** the reviewer has read every item and decision and copied their notes, or has found nothing to change.
- **Context:** opened from a file in a mobile or desktop browser, often offline, for two to ten minutes per plan.
- **Common case:** three to eight items, one or two drawings, five to twenty decisions.
- **Edge cases:** a drawing wider than the phone; no Decision log; a page refreshed after notes were saved.
- **Closest screen:** today's `review.html`; this keeps its note and copy behavior and drops its panel, stage, and sheet.

### Flow

Open the file. Scroll through Why, the items, and the decisions. Tap an item or a decision, choose "Add note", type, and save. Pinch or press + on a drawing to read a detail, drag to pan, and press Fit to return. Press Copy notes and paste the block into `/continue`.

### Hierarchy

The one primary action is Copy notes, in a bar that stays at the bottom. Item text comes before its drawing. Decisions come last, each with an `asked`, `assumed`, or `log` label in text, not color alone.

### Components

- Header with the change name, the note count, and jump links to Why, Changes, and Decisions.
- Item cards, numbered, holding the full text and an optional drawing frame with −, Fit, and + controls.
- Decision rows with a text label.
- An "Add note" chip, the note editor (beside the target on desktop, docked on a phone), numbered pins, and a notes list with Draft indicators.
- The bottom bar with the note count and Copy notes.

### Review

[review.html](review.html) shows the sketch of the new page in What Changes item 3, and the verbs' paths after this change in item 1.

## Risks / Trade-offs

- **One big diff.** → The tasks are grouped by area. A partial `/save` after each group leaves a coherent checkpoint.
- **A host upload deploys code that CI has not tested.** → Only the mini Worker's staging twin and its preview aliases. The guard blocks production, and production still deploys only from a merge.
- **Staging migrations run from the host.** → The same migrations CI would apply to the same seeded staging database. Production's database is never touched.
- **ASCII can not show a real screen layout.** → The drawings are low fidelity by design. For UI work, the mini-app preview shows the real thing.
- **A mini-app save runs tests on the host and pushes to `main` with no PR.** → This bends "nothing builds locally": for this one route, the host test run replaces the PR gate. It is scoped to one app's folder, it runs only that app's tests with no install, CI runs them again on `main`, and the app runs on its own Worker, so it can not break the main app. A save goes live on production data, so the person tries the change on the staging preview first.
- **A mini-app PR has no walk.** → Its own tests gate the merge, the person has already used its preview, and the app can not break the main app.
- **Mini apps share the main app's database.** → On purpose, as `wongos` does. Previews write only to staging. A migration from a mini app always takes the fallback PR, so a person reviews it.
- **Label parsing depends on how decisions are written.** → `/plan` writes each decision as its own bullet starting with `Asked` or `Assumed`. Anything else shows as `log`, so nothing is lost.
- **The untouched check trusts path patterns.** → A `.md` file that code reads at build time would skip tests. In WongStack's layouts, only the payload does that, and Payload checks always run in this repo. A mini app under `mini-apps/` can not change `app/`, so skipping the main app's suite for it is safe.
- **Targets with an active old-format change.** → Those pages get a proposal-only refresh and keep working. The next plan uses the new kit.
