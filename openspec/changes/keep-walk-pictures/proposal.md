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
