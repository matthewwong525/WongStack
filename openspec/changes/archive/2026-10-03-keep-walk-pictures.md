<!-- openspec-archive v1 2026-10-03-keep-walk-pictures -->
<!-- file proposal.md utf8 11662 -->
# Keep the pictures from a preview check

**Status:** ready-to-ship

**Branch:** idiotic-turkey

**Open questions:** none

## Why

A preview check takes a picture of each page it tests, shows them in the chat, then deletes them. Its report on GitHub names files that are already gone, so none of the last six passed checks left a picture anyone can open. A reviewer who wasn't in the chat has only the check's word.

## What Changes

- **A check's pictures are kept.** They go into the private Cloudflare storage that already holds the chat transcripts, and stay there the same way.
  ```text
    WHERE A CHECK'S PICTURES GO
    ════════════════════════════════════
         check takes pictures
                  │
                  ▼
        private storage, beside
        the chat transcripts
                  │
          ┌───────┴────────┐
          ▼                ▼
    report on GitHub   asked for in
    links each one     chat, any time
          │                │
          ▼                ▼
    log in to the      shown in the
    app to open it     chat again
  ```
- **Only people who can log in to your app can open them.** A picture's link asks for the app's login first. Anyone else sees nothing.
- **The report on GitHub links each picture.** One link per picture, named for what it shows. The picture itself can't sit in the report: GitHub can't show one that needs a login.
  ```text
    THE REPORT ON GITHUB
    ═══════════════════════════════════════
    BEFORE
    ┌─────────────────────────────────────┐
    │ Passed: an empty title is rejected  │
    │ The message appears.                │
    │ /tmp/wong-verify-x3/03-after.png    │
    │ (a file already deleted)            │
    └─────────────────────────────────────┘
    AFTER
    ┌─────────────────────────────────────┐
    │ Passed: an empty title is rejected  │
    │ The message appears.                │
    │ Pictures (log in to open):          │
    │ landing · empty form · after submit │
    └─────────────────────────────────────┘
  ```
- **You can ask for a past check's pictures in chat.** *Show me the pictures from the check on change 244* brings them up, for any check made after this is live.
- **A check says plainly when its pictures weren't kept, and why.** With no payment method on the Cloudflare account there is no storage to keep them in. A site with no login yet keeps none either, because they would be open to anyone. The verdict is unaffected, and the report no longer names a deleted file.
- **A public picture folder still works.** An install that set one up keeps its pictures showing inside the report, as today.
- **Nothing new to set up.** It uses the storage and the login that setup already makes. Pictures are kept from the first check after this is live; other installs get it with their next update.

**Non-goals:** Pictures from checks made before this (they are gone). Checks run from a hosted cloud workspace, which keep their evidence their own way. Deleting old pictures automatically. Video. Changing who can read chat transcripts. Making the check honest about partly shown promises and scanning its evidence for the access token: both belong to PR #244.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: screenshots are kept in the repo's private store and linked from the comment; a walk says when and why they were not kept, never citing a deleted local path; a past walk's pictures can be shown in chat; the public media bucket keeps working.

## Impact

- **New, payload:** `.agents/skills/verify/worker/walk-pictures.mjs` and its `.d.mts`, the route module the production Worker serves at `/_walk/`, reading and writing only the `walks/` folder of `MEMORY_BUCKET`.
- **Edited, payload:** `app/worker/index.ts` (one import and one branch, after the login check), `.agents/skills/verify/scripts/verify-staging.sh` (`publish`, a new `pictures` subcommand), `.agents/skills/verify/references/walkthrough.md` section f, `.agents/skills/verify/SKILL.md` (one line, offset by a cut), `.env.example`, `.agents/skills/wong-sync/references/payload-manifest.md`, `wiki/development/staging-walkthrough.md`, `wiki/development/memory-key.md`, `wiki/stack/mini-apps.md`, `wiki/development/memory.md`, and `CHANGELOG.md` (a minor entry).
- **Edited, meta-repo only:** `.agents/skills/wong-setup/references/cloudflare.md` (the card list's cost line).
- **Tests:** `scripts/tests/walk-pictures.test.mjs` (new), `scripts/tests/verify-scripts.test.mjs`, `app/worker/index.test.ts`.
- **No change:** the memory store's API, keys, schema, and who reads transcripts; setup's provisioning; `WALK_MEDIA_BUCKET` and `WALK_MEDIA_BASE_URL`; any dependency.
- **Other open work:** PR #244 edits the same reference section and script and publishes first. PR #242 rewrites the memory store and edits `app/worker/index.ts`; this change calls none of the memory store's API. PR #238 gives hosted workspaces their own evidence route.

## Decision log

- **2026-10-03** — Asked where a check's pictures should be kept → chose the private Cloudflare storage that holds the chat transcripts, "like part of the transcript", over a side area on GitHub or keeping them on the machine.
- **2026-10-03** — Asked whether this part should be its own change in its own workspace → chose yes.
- **2026-10-03** — Assumed: a picture opens with the app's login, not a memory key, because a reviewer follows a link in a browser, and the browser holds the login, never a key.
- **2026-10-03** — Assumed: the report links each picture and shows none inline, because GitHub fetches a picture without the reader's login and would get nothing.
- **2026-10-03** — Assumed: the check uploads with the access token it already uses to get into the preview, not through the memory store, because PR #242 is rewriting the memory store's calls and this keeps the two changes apart.
- **2026-10-03** — Assumed: pictures share the transcripts' storage in their own folder, not a second storage area, because setup already makes this one and a second would need every install to run setup again.
- **2026-10-03** — Assumed: the picture route can reach only its own folder, never a transcript, because the wiki keeps every other route away from the memory storage and this is its one exception.
- **2026-10-03** — Assumed: only the check's own machine can add a picture, and none can be replaced, because a logged-in person has no reason to upload and a kept picture is evidence.
- **2026-10-03** — Assumed: pictures are kept with no end date, like transcripts, because a check adds about 2 MB and the free allowance is 10 GB; automatic deletion can come later if it fills.
- **2026-10-03** — Assumed: a site with no login keeps no pictures even when storage exists, because without a login they would be open to anyone with the link.
- **2026-10-03** — Assumed: when pictures aren't kept the report says so and names no file, because the files are deleted right after and a path to nothing reads as evidence.
- **2026-10-03** — Assumed: an install with a public picture folder keeps today's behavior and its setting names, because ignoring a setting people already use breaks them silently.
- **2026-10-03** — Assumed: a past check's pictures are found from the links in its report on GitHub, not a separate index, because the report already lists them.
- **2026-10-03** — Assumed: checks from a hosted cloud workspace are left out, because PR #238 gives them their own evidence route with no report on GitHub.
- **2026-10-03** — Assumed: PR #244's check fixes publish first and this change builds on top, because its owner agreed that order: it keeps section d, the summary line, and the evidence scrub; this change keeps section f's publish block, its result lines, and the picture lines, and uploads only after the scrub.
- **2026-10-03** — Assumed: no order is fixed with PR #242, because its chat was busy and the only shared lines are the Worker's entry file and two wiki sentences; whichever publishes second brings the other in.
- **2026-10-03** — Asked what to do with the finished plan → chose to build it now.
- **2026-10-03** — Assumed: the picture route is built first and the rest waits, because PR #244 is not published yet and the route is the one part that shares no file with it.
- **2026-10-03** — Built the picture route (tasks 1.1 to 1.3): the live site keeps and shows a check's pictures behind the login, with seven tests passing on this machine. The app's own new test first runs on GitHub. The check does not upload or link pictures yet: tasks 2.1 onward wait for PR #244 to publish.
- **2026-10-03** — Assumed: the automatic code-style check should also cover the picture route's folder, because today it reads only the memory route's folder and the new code went unchecked; added as task 5.5.
- **2026-10-03** — Asked whether to keep waiting for PR #244 → chose to build the rest now. Its fixes are not published yet, and the cost is a clash in two spots that whichever publishes second sorts out.
- **2026-10-03** — Check: `.github/workflows/payload.yml` now runs the code-style check on every skill's `worker` folder, because the picture route's folder went unchecked. The check covers more, not less.
- **2026-10-03** — Assumed: when the live site turns the pictures away for a reason the plan did not list (it does not answer, or it takes none of them), the report still gives a reason, because a report with no pictures must say why.
- **2026-10-03** — Assumed: a public picture folder with no web address set also reports its pictures as not kept, with that reason, because the report may no longer name a deleted file.
- **2026-10-03** — Built the rest (tasks 2.1 to 5.5): the check uploads its pictures, links them in its report or says why none were kept, and brings a past check's pictures up in chat. Its tests pass on this machine. Left: the checks on GitHub, a check of this change's own preview, and a live check after the merge (tasks 6.1 to 6.3).
- **2026-10-03** — Checked this change's own preview (tasks 6.1 and 6.2): the checks on GitHub pass, and the report says the pictures were not kept because the live site does not serve them yet, naming no file. With no login the picture address goes to the login page. Left: the live check after the merge (task 6.3).
- **2026-10-03** — Asked whether to publish → chose to publish it.
- **2026-10-03** — PR #244 was published just before this one, so its edits were brought in: its scrub now runs at the top of the publish step, above the upload, and both sets of report lines sit together. The shared promise about posting evidence was not changed by it. Its tests and this change's tests pass together here.
- **2026-10-03** — Assumed: the live check that needs the merge is kept as an open thread and run right after publishing, not as an unticked task, because a change can not be archived with a task that only a published change can finish.
- **2026-10-03** — Archived for publishing as 29.13.0, on top of PR #244's 29.12.0.

<!-- end proposal.md -->
<!-- file design.md utf8 10862 -->
# Design

## Context

See `proposal.md` for why. The facts that shape the approach:

- `verify-staging.sh publish` uploads a run's PNGs with `wrangler r2 object put` to `WALK_MEDIA_BUCKET` and prints `<local-path>\t<public-url>` lines. With no bucket it prints `RESULT: NONE`, the comment cites local paths, and `cleanup` then deletes them. No install sets the variables unless a person makes a public bucket by hand.
- The memory store keeps redacted transcripts in a private R2 bucket. The production Worker binds it as `MEMORY_BUCKET`; staging and previews bind no memory. `app/worker/index.ts` hands `/_memory/*` to the memory skill's route module, which authenticates with a memory key and lets a member touch only `sessions/<own email>/`.
- Every other request to the Worker passes `getAccessIdentity` first. It yields `kind: "user"` for a person and `kind: "service"` for the Access service token, which the walk already holds as `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` to get into a preview. One Access application covers the production and staging Workers, so that token is accepted on production too.
- The production address is the origin of `loadConfig(ctx).worker` in the memory skill's `store.mjs`. PR #242 changes where the install record holds it but keeps that field.
- A site can be open (`WORKSPACE_LOGIN=off`, no Access ids) while R2 is on.
- PR #244's follow-up scrubs every text file in the run folder at the end of `run` and at the start of `publish`, before the bucket check. PR #242 replaces `store.putObject` with a machine-grant transcript protocol.

## Goals / Non-Goals

**Goals:**

- Kept pictures with no new setting, bucket, binding, or setup step.
- A link a browser can open with the app's login.
- No call into the memory store's API, so PR #242's rewrite and this change stay apart.
- The route cannot reach a transcript.

**Non-Goals:**

- A second bucket or binding. A page that lists past walks. Expiry. A change to `mayTouch`, memory keys, or the memory schema. The hosted route's evidence.

## Decisions

### The route lives in the verify skill and is served behind the login

A new module, `.agents/skills/verify/worker/walk-pictures.mjs` with a `.d.mts`, exports `WALK_PREFIX = "/_walk/"` and `handleWalkPictures(request, bucket, identity)`. `app/worker/index.ts` gains one import and one branch, placed after the identity check and before the mini-app branch:

```ts
if (url.pathname.startsWith(WALK_PREFIX)) {
  return handleWalkPictures(request, env.MEMORY_BUCKET, identity);
}
```

The module sits in the skill, as the memory route does, so `/wong-sync` keeps it current and an installed app carries only the import and the branch. It receives the bucket, never `env`, and no memory database.

*Alternatives.* Extending the memory route's `object` and `mayTouch` with a `walks/` prefix: a browser has no memory key, so a second login-gated route would still be needed, and it lands in the middle of PR #242's rewrite. A handler under `/api/`: that router is the install's own file and gets no identity. A separate bucket: every install would have to run provisioning again, and `provision.mjs` is also being rewritten.

### What the route accepts

- **Path.** `/_walk/<sha>/<run>/<journey>/<file>.png`, matched whole by one pattern: `<sha>` 7 to 40 hex, `<run>` a UTC stamp `YYYYMMDDTHHMMSSZ`, `<journey>` and `<file>` `[a-z0-9][a-z0-9._-]*`. The object key is `walks/` plus the four matched parts. The route never decodes or joins a caller's raw path, so no request maps outside `walks/`. Anything else is `404`.
- **No identity** (an open site, or `identity` is null): `404` with `{ "error": "no_login" }` on a PUT, a plain `404` on a GET. The entry file's own check already answers `401` on a private site; this covers the open one.
- **No bucket:** `404` with `{ "error": "no_bucket" }`.
- **GET**, any identity: the object with `Content-Type: image/png`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, `Cache-Control: private, max-age=31536000, immutable`. Missing: `404`.
- **PUT**, `identity.kind === "service"` only, else `403`: body up to 10 MB (`413` over), must begin with the PNG signature (`415` otherwise), stored with `onlyIf: { etagDoesNotMatch: "*" }` so an existing key answers `409` and is left as it was. Success: `201` with `{ "kept": true }`.
- Any other method: `405`.

Uploaded bytes are served from the app's origin, so the signature check, the fixed content type, `nosniff`, and the empty content policy together stop a stored file acting as a page.

### `publish` picks one of three outcomes

In this order (PR #244's scrub, when it lands, runs above all three):

1. **`WALK_MEDIA_BUCKET` set:** today's path, unchanged, including `UNKNOWN` when `WALK_MEDIA_BASE_URL` is missing. It adds `MEDIA=public`.
2. **Else, private:** resolve the production origin with a `node` one-liner on the memory skill's `loadConfig`, as `load_credentials` already borrows `parseEnv`. Call `load_credentials`, then PUT each PNG under `$RUN_DIR/evidence` with `curl --data-binary` and the two Access headers to `<origin>/_walk/<short-sha>/<run-stamp>/<journey>/<file>`. Print `<local-path>\t<url>` per kept file, then `RESULT: WALKED` and `MEDIA=private`.
3. **Nothing kept:** `RESULT: NONE`, `MEDIA=none`, and one `REASON=` line the comment repeats:

| What `publish` saw | `REASON=` |
| --- | --- |
| no origin recorded, or `loadConfig` throws | `no memory store is set up for this repo` |
| no `CF_ACCESS_CLIENT_ID` or secret | `this machine has no access token for the site` |
| `404` `no_bucket` | `the Cloudflare account has no storage (it needs a payment method)` |
| `404` `no_login` | `the site has no login yet, so pictures would be open to anyone` |
| any other `404` on the first PUT | `the live site does not serve pictures yet (it does after the next publish)` |
| `401` or `403` | `the live site refused the access token` |

The first PUT decides: a failing one stops the loop with its reason. A later failure costs that picture only, counted in a note as today. The run stamp is taken once per `publish`, so a repeat walk of the same commit gets its own folder and never meets a `409`. No evidence directory or no PNG is `RESULT: NONE`, `MEDIA=none`, with no reason: there was nothing to keep.

The script never prints the service token, and the URL carries none.

### The comment and the chat

`walkthrough.md` section f's publish block becomes three bullets keyed on `MEDIA`:

- `public`: substitute the URLs into `![…](…)`, as today.
- `private`: replace each journey's picture lines with one line, `Pictures (log in to open): [landing](…) · [empty form](…) · [after submitting empty](…)`, labels from the file names.
- `none` with a `REASON`: one line under the comment's summary, `Pictures were not kept: <reason>.`, the same line in the chat report, and no picture lines. Never a local path.

The comment template's two `![…](<url-or-path>)` lines change to match. Section d, the summary line, the `◐` block, and the scrub lines belong to PR #244 and are not edited here.

### A past walk's pictures

A new `pictures <pr>` subcommand: reads the pull request's comments with `gh pr view <pr> --json comments`, keeps the `/_walk/` links whose origin equals the recorded production origin, downloads each with the Access headers into a fresh `mktemp -d "${TMPDIR:-/tmp}/wong-verify-XXXXXX"` under `evidence/`, and prints `RUN_DIR=` and `<local-path>\t<label>` lines. `RESULT: WALKED` with files, `NONE` when the comments hold no kept picture, `UNKNOWN` when the download is refused. The origin check stops a crafted comment sending the token to another host.

`/verify` shows them with the image tool, as [show what the browser is doing](../../../wiki/development/browsing.md#show-what-the-browser-is-doing) says, then runs `cleanup`. `SKILL.md`'s plain-checks paragraph gains one sentence naming the subcommand, paid for by a cut of equal size, because `measure-context.mjs --check` holds the skills' word count at its baseline.

### Docs own the exception

`wiki/development/memory-key.md` and `wiki/stack/mini-apps.md` say every other route stays away from the memory bindings. Both get the exception in one clause: the picture route is handed the bucket alone and reaches only `walks/`. `wiki/development/staging-walkthrough.md` owns the full account under "What a walk needs", replacing the public-bucket bullet; `wiki/development/memory.md`'s "Without R2" and setup's card list add that a check's pictures are not kept either.

## Risks / Trade-offs

- **The picture route shares the transcripts' bucket** → it is passed only the bucket, builds keys from a whole-path match, and a test asks for `sessions/…` through it in plain, encoded, and `..` forms and gets `404`.
- **A leaked service token can add pictures** → it can add only PNGs up to 10 MB under `walks/`, replace none, and read no transcript. The token already opens every page of the app.
- **The first walk after this ships keeps nothing**, because production serves the route only after the merge → the report says so with the "does not serve pictures yet" reason. This change's own `/ship` walk will show it.
- **An install takes the update but its `index.ts` lacks the branch** → `/_walk/` falls through to the page shell, which is not JSON, so `publish` reads it as "does not serve pictures yet". The changelog's Updating note names the two lines.
- **Storage grows without end** → about 2 MB a walk against a 10 GB free allowance. Expiry is left out until it matters.
- **PR #244 and PR #242 touch the same files** → see the migration plan.

## Migration Plan

1. PR #244's follow-up: its owner agreed on 2026-10-03 to publish first, then the person chose to build this change without waiting. Whichever publishes second brings `main` in. This change keeps to the `publish` case below its opening lines, the `pictures` case, and section f's publish block, result bullets, and picture lines; PR #244's scrub goes at the top of `publish`, above the upload. If `main` changes "Evidence is posted on every verdict" first, copy the new text into this change's MODIFIED block and reapply the screenshot sentences.
2. PR #242: no agreed order. This change imports nothing from the memory Worker and edits two wiki sentences and one entry-file branch that PR #242 also touches. Whichever publishes second brings `main` in and keeps both branches in `app/worker/index.ts`; the `/_walk/` branch stays after the identity check.
3. Rollback is a revert: kept objects stay in the bucket, unreachable, and `publish` reports "does not serve pictures yet".

Installed repos take it through `/wong-sync`: the skill files update, the sync plan adds the import and branch to `app/worker/index.ts`, and pictures are kept after their next production publish.

<!-- end design.md -->
<!-- file tasks.md utf8 5994 -->
# Tasks

## 1. The picture route (Worker)

- [x] 1.1 Add `.agents/skills/verify/worker/walk-pictures.mjs` and its `.d.mts`, exporting `WALK_PREFIX` and `handleWalkPictures(request, bucket, identity)` as the design's "What the route accepts" says; verify the module imports nothing from the memory skill or `app/`.
- [x] 1.2 Add `scripts/tests/walk-pictures.test.mjs` on a fake bucket; verify it covers: a service PUT then a user GET returns the same bytes with the fixed headers; a user PUT is `403`; a second PUT to one key is `409` and the first bytes stay; a non-PNG body is `415`; over 10 MB is `413`; no bucket is `404 no_bucket`; no identity is `404` (`no_login` on PUT); and `sessions/…` asked through `/_walk/` in plain, percent-encoded, and `..` forms is `404` with the bucket never read.
- [x] 1.3 Add the import and the `/_walk/` branch to `app/worker/index.ts` after the identity check, and declare nothing new in `app/wrangler.jsonc`; verify a new case in `app/worker/index.test.ts` shows a logged-in GET reaching the route, an anonymous request on a private site answering `401` before it, and a mini app's env still lacking `MEMORY_BUCKET`.

## 2. Build on the agreed base

- [x] 2.1 Build on `main` as it stands: the person chose on 2026-10-03 not to wait for PR #244. Keep this change's edits to the `publish` case below its opening lines, the new `pictures` case, and section f's publish block, result bullets, and picture lines, so PR #244's scrub (the top of `publish`) and its section d and summary-line edits can merge beside them; verify the finished diff touches neither section d nor the `run` case.
- [x] 2.2 Re-copy "Evidence is posted on every verdict" from the main spec into this change's MODIFIED block if `main` changed it, reapplying the screenshot sentences and the third scenario; verify `openspec validate "keep-walk-pictures" --strict --no-interactive` passes.

## 3. The walk script

- [x] 3.1 Rework `publish` in `.agents/skills/verify/scripts/verify-staging.sh` into the design's three outcomes, leaving the `WALK_MEDIA_BUCKET` path as it is and adding the `MEDIA=` and `REASON=` lines; verify the script's header comment and usage line describe them.
- [x] 3.2 Add the `pictures <pr>` subcommand as the design's "A past walk's pictures" says; verify it downloads only links on the recorded production origin and that `cleanup` removes its run folder.
- [x] 3.3 Extend `scripts/tests/verify-scripts.test.mjs` with a local HTTP server standing in for production and a fake `gh`; verify it covers: private upload prints one URL line per PNG, sends both Access headers, and never prints the secret; each `REASON=` row of the design's table; `WALK_MEDIA_BUCKET` set still takes the public path with a fake `wrangler`; two `publish` runs on one commit use different run folders; `pictures` skips a link on another host and reports `NONE` for a comment with no picture.

## 4. The skill's instructions

- [x] 4.1 Edit `.agents/skills/verify/references/walkthrough.md` section f only where this change owns it: the comment template's two picture lines, the "Publish the screenshots" block, and its result bullets, now keyed on `MEDIA`; verify section d and the comment's summary line are byte-identical to `main`.
- [x] 4.2 Add one sentence to the plain-checks paragraph of `.agents/skills/verify/SKILL.md` for a past walk's pictures, with an offsetting cut; verify `node scripts/measure-context.mjs --check` passes.

## 5. Docs and release

- [x] 5.1 Rewrite the bucket bullet under "What a walk needs" in `wiki/development/staging-walkthrough.md` (kept privately by default, who can open them, when they are not kept, the public bucket as the inline option) and add one "why" bullet for links over inline pictures; add the one-clause exception to `wiki/development/memory-key.md` and `wiki/stack/mini-apps.md`; add pictures to "Without R2" in `wiki/development/memory.md`; verify each fact sits on one page and the others link to it.
- [x] 5.2 Update the walkthrough block in `.env.example` (no variable is needed for private pictures; `WALK_MEDIA_*` stay, for inline public ones), the app-scaffold paragraph in `.agents/skills/wong-sync/references/payload-manifest.md` (`index.ts` also sends `/_walk/` to the verify skill's route module), and the card list's cost line in `.agents/skills/wong-setup/references/cloudflare.md`; verify no variable was renamed.
- [x] 5.3 Add the `## Next (minor) — Keep the pictures from a preview check` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: the update adds two lines to the app's entry file, pictures are kept after the next publish, and a public picture folder keeps working; verify `VERSION` is untouched.
- [x] 5.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; verify all three pass.
- [x] 5.5 Widen the script lint's path from `.agents/skills/memory/worker` to `.agents/skills/*/worker` wherever `main` then keeps the check list (today `.github/workflows/payload.yml`; PR #238 moves it to `.github/scripts/checks.mjs`), so the picture route is linted; verify the lint step names the new folder and passes.

## 6. Gate and live check

- [x] 6.1 Run `/save` for the CI gate; verify the script tests, the app's `npm test` chain, and the payload checks pass on the pushed commit.
- [x] 6.2 Run `/save` then `/verify` on this change's preview; verify the comment says the pictures were not kept because the live site does not serve them yet, names no local path, and the verdict stands on its own.
- [x] 6.3 Leave an open thread, tagged `verify`, for the live check that can only run once the merge is live: one `/verify` on a pull request with a browser journey, whose comment links each picture, a link that opens after the app's login and answers no picture without one, and that pull request's pictures shown in chat on request; `/ship` runs it right after the merge and records the result on the thread.

<!-- end tasks.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 3949 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Evidence is posted on every verdict

Each `/verify` SHALL post one new pull-request comment, whatever its verdict, covering each journey's probe, steps, `THEN`, and verdict, where the probes ran, and each unverified scenario by name. A repeat SHALL add a comment, never edit one. Screenshots that were kept SHALL be linked from the comment, and when none were kept the comment SHALL say so and why. The comment SHALL NOT cite a local path the walk deletes.

#### Scenario: A walk that could not run

- **WHEN** a walk returns `UNKNOWN`
- **THEN** a comment says the change was not verified, and why

#### Scenario: Two walks

- **WHEN** `/verify` runs twice on one pull request
- **THEN** two comments exist, in order, and the first is unchanged

#### Scenario: A walk whose pictures were not kept

- **WHEN** a browser journey passes on a repo whose store has no bucket
- **THEN** the comment says the pictures were not kept and why, and names no local file

## ADDED Requirements

### Requirement: A walk's screenshots are kept privately

With a memory bucket and a login on the app, a walk SHALL keep its screenshots in the repo's private store with no expiry, and the comment SHALL carry one link per screenshot. A link SHALL open only for a caller the app's login accepts, and SHALL never show a transcript or any other object in the store. Only the walk's own machine credential SHALL add a screenshot, and a kept screenshot SHALL NOT be replaced. Keeping screenshots SHALL need no setting and no setup step beyond the memory bucket and the login.

#### Scenario: A reviewer opens a picture

- **WHEN** a person logged in to the app opens a screenshot's link from the comment
- **THEN** the picture shows

#### Scenario: A caller with no login

- **WHEN** a request with no accepted login asks for a kept screenshot, or for a transcript's path through the picture address
- **THEN** nothing from the store is returned

### Requirement: A walk says when its pictures were not kept

When a walk's screenshots cannot be kept privately, `/verify` SHALL say so in the chat and in the comment, with the reason in plain words: no bucket on the store, no login on the app, the production site not yet serving pictures, or no machine credential. It SHALL NOT keep them anywhere a person with no login can reach, and the missing pictures SHALL NOT change the verdict.

#### Scenario: No payment method on the Cloudflare account

- **WHEN** a walk passes on a repo whose Cloudflare account has no R2
- **THEN** the verdict is unchanged, and the chat and the comment say the pictures were not kept because the account has no storage

#### Scenario: Storage but an open site

- **WHEN** a walk passes on a repo with a bucket whose app has no login yet
- **THEN** no screenshot is stored, and the report says pictures are kept once the site has a login

### Requirement: A past walk's pictures can be shown in the chat

When a person asks for the pictures of a past walk on a pull request, `/verify` SHALL show that walk's kept screenshots in the chat, each with a line saying what it shows, and SHALL leave nothing on the machine afterwards. When that walk kept none, it SHALL say so.

#### Scenario: Pictures from last week's walk

- **WHEN** a person asks for the pictures from the walk on a pull request merged last week
- **THEN** each kept screenshot from that walk's comment appears in the chat, and the working tree is unchanged

### Requirement: A public media bucket keeps working

An install that sets `WALK_MEDIA_BUCKET` and `WALK_MEDIA_BASE_URL` SHALL keep publishing screenshots to that bucket and showing them inline in the comment, under those names.

#### Scenario: An install with a public bucket updates

- **WHEN** a repo with both `WALK_MEDIA_` variables set takes this update and runs a walk
- **THEN** its comment shows the screenshots inline from the public bucket, as before

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-03

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 46575 fence=~~~ -->
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
<title>Review · 2026-10-03-keep-walk-pictures</title>
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
<body data-change="2026-10-03-keep-walk-pictures">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-03-keep-walk-pictures</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A preview check takes a picture of each page it tests, shows them in the chat, then deletes them. Its report on GitHub names files that are already gone, so none of the last six passed checks left a picture anyone can open. A reviewer who wasn't in the chat has only the check's word.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A check's pictures are kept.</b> They go into the private Cloudflare storage that already holds the chat transcripts, and stay there the same way.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  WHERE A CHECK'S PICTURES GO</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">  ════════════════════════════════════</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">       check takes pictures</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                ▼</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">      private storage, beside</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">      the chat transcripts</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">        ┌───────┴────────┐</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">        ▼                ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">  report on GitHub   asked for in</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">  links each one     chat, any time</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">        │                │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">        ▼                ▼</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">  log in to the      shown in the</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">  app to open it     chat again</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Only people who can log in to your app can open them.</b> A picture's link asks for the app's login first. Anyone else sees nothing.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The report on GitHub links each picture.</b> One link per picture, named for what it shows. The picture itself can't sit in the report: GitHub can't show one that needs a login.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">  THE REPORT ON GITHUB</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">  ═══════════════════════════════════════</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">  BEFORE</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">  ┌─────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">  │ Passed: an empty title is rejected  │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">  │ The message appears.                │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">  │ /tmp/wong-verify-x3/03-after.png    │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">  │ (a file already deleted)            │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">  └─────────────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">  AFTER</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">  ┌─────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">  │ Passed: an empty title is rejected  │</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">  │ The message appears.                │</span>
<span class="ln" data-note="item-3-line-14" tabindex="0">  │ Pictures (log in to open):          │</span>
<span class="ln" data-note="item-3-line-15" tabindex="0">  │ landing · empty form · after submit │</span>
<span class="ln" data-note="item-3-line-16" tabindex="0">  └─────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>You can ask for a past check's pictures in chat.</b> <i>Show me the pictures from the check on change 244</i> brings them up, for any check made after this is live.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A check says plainly when its pictures weren't kept, and why.</b> With no payment method on the Cloudflare account there is no storage to keep them in. A site with no login yet keeps none either, because they would be open to anyone. The verdict is unaffected, and the report no longer names a deleted file.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A public picture folder still works.</b> An install that set one up keeps its pictures showing inside the report, as today.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Nothing new to set up.</b> It uses the storage and the login that setup already makes. Pictures are kept from the first check after this is live; other installs get it with their next update.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Pictures from checks made before this (they are gone). Checks run from a hosted cloud workspace, which keep their evidence their own way. Deleting old pictures automatically. Video. Changing who can read chat transcripts. Making the check honest about partly shown promises and scanning its evidence for the access token: both belong to PR #244.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked where a check's pictures should be kept → chose the private Cloudflare storage that holds the chat transcripts, &quot;like part of the transcript&quot;, over a side area on GitHub or keeping them on the machine.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked whether this part should be its own change in its own workspace → chose yes.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: a picture opens with the app's login, not a memory key, because a reviewer follows a link in a browser, and the browser holds the login, never a key.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the report links each picture and shows none inline, because GitHub fetches a picture without the reader's login and would get nothing.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the check uploads with the access token it already uses to get into the preview, not through the memory store, because PR #242 is rewriting the memory store's calls and this keeps the two changes apart.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: pictures share the transcripts' storage in their own folder, not a second storage area, because setup already makes this one and a second would need every install to run setup again.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the picture route can reach only its own folder, never a transcript, because the wiki keeps every other route away from the memory storage and this is its one exception.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: only the check's own machine can add a picture, and none can be replaced, because a logged-in person has no reason to upload and a kept picture is evidence.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: pictures are kept with no end date, like transcripts, because a check adds about 2 MB and the free allowance is 10 GB; automatic deletion can come later if it fills.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: a site with no login keeps no pictures even when storage exists, because without a login they would be open to anyone with the link.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: when pictures aren't kept the report says so and names no file, because the files are deleted right after and a path to nothing reads as evidence.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: an install with a public picture folder keeps today's behavior and its setting names, because ignoring a setting people already use breaks them silently.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: a past check's pictures are found from the links in its report on GitHub, not a separate index, because the report already lists them.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: checks from a hosted cloud workspace are left out, because PR #238 gives them their own evidence route with no report on GitHub.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: PR #244's check fixes publish first and this change builds on top, because its owner agreed that order: it keeps section d, the summary line, and the evidence scrub; this change keeps section f's publish block, its result lines, and the picture lines, and uploads only after the scrub.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: no order is fixed with PR #242, because its chat was busy and the only shared lines are the Worker's entry file and two wiki sentences; whichever publishes second brings the other in.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked what to do with the finished plan → chose to build it now.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the picture route is built first and the rest waits, because PR #244 is not published yet and the route is the one part that shares no file with it.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Built the picture route (tasks 1.1 to 1.3): the live site keeps and shows a check's pictures behind the login, with seven tests passing on this machine. The app's own new test first runs on GitHub. The check does not upload or link pictures yet: tasks 2.1 onward wait for PR #244 to publish.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the automatic code-style check should also cover the picture route's folder, because today it reads only the memory route's folder and the new code went unchecked; added as task 5.5.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked whether to keep waiting for PR #244 → chose to build the rest now. Its fixes are not published yet, and the cost is a clash in two spots that whichever publishes second sorts out.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-03</p>Check: <code>.github/workflows/payload.yml</code> now runs the code-style check on every skill's <code>worker</code> folder, because the picture route's folder went unchecked. The check covers more, not less.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: when the live site turns the pictures away for a reason the plan did not list (it does not answer, or it takes none of them), the report still gives a reason, because a report with no pictures must say why.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: a public picture folder with no web address set also reports its pictures as not kept, with that reason, because the report may no longer name a deleted file.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Built the rest (tasks 2.1 to 5.5): the check uploads its pictures, links them in its report or says why none were kept, and brings a past check's pictures up in chat. Its tests pass on this machine. Left: the checks on GitHub, a check of this change's own preview, and a live check after the merge (tasks 6.1 to 6.3).</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Checked this change's own preview (tasks 6.1 and 6.2): the checks on GitHub pass, and the report says the pictures were not kept because the live site does not serve them yet, naming no file. With no login the picture address goes to the login page. Left: the live check after the merge (task 6.3).</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-03</p>Asked whether to publish → chose to publish it.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>PR #244 was published just before this one, so its edits were brought in: its scrub now runs at the top of the publish step, above the upload, and both sets of report lines sit together. The shared promise about posting evidence was not changed by it. Its tests and this change's tests pass together here.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-03</p>Assumed: the live check that needs the merge is kept as an open thread and run right after publishing, not as an unticked task, because a change can not be archived with a task that only a published change can finish.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-03</p>Archived for publishing as 29.13.0, on top of PR #244's 29.12.0.</li>
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
