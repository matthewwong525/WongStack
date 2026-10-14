# Let a teammate save through the app

**Status:** ready-to-ship
**Branch:** lavish-crocodile
**Open questions:** none

## Why

A teammate who connects through *Connect your assistant* can read the project and use the apps, but their work stays on their own computer. To send it up they need a GitHub account, an invitation from the owner, and GitHub's tool installed. On a project kept in Cloudflare they can not send it up at all. Matthew asked that the app do this for them, so a teammate needs nothing but their app sign-in.

## What Changes

- **A teammate's assistant saves their work through the app.** The work goes up as a change. The app starts its checks, and gives back the result and a link to look at, as a save does today. The teammate needs no GitHub account, no invitation and no GitHub tool: their app sign-in is the only login.
  ```text
  teammate       the app      project
   │── save ──────▶│             │
   │               │── change ──▶│
   │               │◀── checks ──│
   │◀── preview ───│             │
  ```
- **Saving never publishes.** The app takes a change and nothing else. It refuses anything aimed at the live project, and it refuses to delete. The owner or an Admin looks at the change and publishes it, the way they publish today. The teammate's assistant ends with *saved, and here is who publishes it*, never *publish it?*
- **Everyone who can install the project can save.** There is no second tick. *Can install the project* now gives both, and the panel says so under it. Unticking it stops that person's next save at once. People who hold the tick today can save once the update is in.
  ```text
    BEFORE                     AFTER
  ┌ Project ─────────────┐   ┌ Project ─────────────┐
  │ [x] Can install the  │   │ [x] Can install the  │
  │     project          │   │     project          │
  └──────────────────────┘   │ +They can save       │
                             │ +changes too.        │
                             └──────────────────────┘
  ```
- **A project kept in Cloudflare, the usual install, needs nothing from the owner.** The app already reaches its own project there, so there is no key to make. After the next update and publish, saving works. A teammate can save there for the first time.
- **Only on GitHub, the owner makes one key.** A new GitHub install is asked for one key that both installs and saves, at the same moment it is asked for a key today. An install that already holds the read-only key keeps handing the project out; under the tick, Access says saving needs one more step and gives the owner a request to copy for their assistant. Once the new key is in, the old one is no longer needed. Deleting the old key on GitHub can't be undone; it is optional.
  ```text
  ┌ Project ─────────────────────────┐
  │ [x] Can install the project      │
  │ Saving needs one more step: a    │
  │ GitHub key that can save.        │
  │ [Copy the request]               │
  └──────────────────────────────────┘
  ```
- **What a teammate who can save is trusted with.** Their change runs through the checks and gets a preview, like the owner's own. They can add to any change that is not published yet, not only their own. They can not change the files that define the checks on GitHub. On GitHub the change shows under the owner's name, with a line saying who saved it.
- **The owner's own computer is untouched.** It keeps saving and publishing the way it does today. On GitHub, nothing changes for teammates until the owner adds the new key.

**Non-goals:** publishing through the app; changing how the owner's own first setup saves; telling the owner inside the app that a change is waiting; letting a teammate read review comments left on GitHub; a teammate on Windows where the project is kept in Cloudflare.

## Decision log

- **2026-10-13** — Asked "we should be able to push to github via through the api through the server so the user doesn't need to install github" → chose plan it as its own part.
- **2026-10-13** — Asked what a teammate may do through the app without GitHub → chose Save only: the work goes up as a change with its checks and preview, and the owner or an Admin publishes. Save and publish, and Leave saving for later, were offered and not chosen.
- **2026-10-13** — Asked whether a project kept in Cloudflare is covered → chose yes.
- **2026-10-13** — Assumed: this is for teammates who connect through Connect your assistant, not the owner's own first setup, because it was stated to Matthew and not objected to.
- **2026-10-13** — Assumed: the app passes the save on itself and never hands a teammate's computer a key, because the rule today is that the project's key never leaves the server.
- **2026-10-13** — Assumed: the new GitHub key gets its own name beside the read-only one, because the app can then tell with no call whether saving is possible, and an install that never ticks the box is never asked for a wider key.
- **2026-10-13** — Assumed: the key may not change the files that define the checks, because a key that could would let a saved change rewrite its own checks.
- **2026-10-13** — Assumed: a teammate may add to any unpublished change, because that is what an invited GitHub teammate can do today, and tracking who started each change needs new stored data.
- **2026-10-13** — Assumed: the teammate's assistant gets the failing check's output through the app, because without it the assistant can not fix a failed save.
- **2026-10-13** — Assumed: a save takes one change at a time, because that is all a save sends, and it keeps the app's check on what it lets through simple.
- **2026-10-13** — Assumed: the check before publishing sends one throwaway change to this project through the preview app and removes it after, because nothing else shows the whole path working.
- **2026-10-13** — Assumed: the Cloudflare half is tried on a real paid account before it is called working, and is reported as unverified if no such trial runs, because no stand-in shows a real save landing there.
- **2026-10-13** — Asked, in a review note on the new tick, "By default should be on if they have access to repo no need for this" → chose no second tick: everyone who can install the project can save. This replaces the earlier choice of one new tick.
- **2026-10-13** — Asked, in a review note on the GitHub key, "Only if they use github. But by default it should be cloudflare artifacts which shouldnt need this" → chose Cloudflare first with nothing to do, and the key as the GitHub-only step.
- **2026-10-13** — Assumed: people who already hold the install tick can save after the update with no new yes from the owner, because the note says saving comes with access to the project.
- **2026-10-13** — Assumed: the tick keeps its name and gains a line under it, because renaming it would change a label people already know.
- **2026-10-13** — Assumed: a new GitHub install is asked for one key that does both, because the note wants no extra step, and two keys would be two.
- **2026-10-13** — Read GitHub's page of what each fine-grained key permission allows (https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) → the five permissions in the design stand as written: Contents (write) for the push, Pull requests (read to find a change, write to open and update it), Actions (read) for a commit's runs, their jobs and a job's log, Commit statuses (read), Deployments (read) for a deployment and its statuses. Reading the repository's default branch needs only Metadata (read), which every such key carries. Workflows is its own permission, for writing workflow files, and the key is made without it. The page lists no Checks permission, so reading checks from Actions, as designed, is the only way. No fallback was needed.
- **2026-10-13** — Read Cloudflare's Workflows page for Workers (https://developers.cloudflare.com/workflows/build/workers-api/) → the design stands: a Workflow binding with `script_name` reaches a Workflow defined in another Worker, and offers the same calls as any binding: `get(id)`, then `status()` (which carries the run's state, error and output) and `restart()`. The page names no limit on a binding to another Worker. The service-binding fallback is not built. This is the documentation's word only: the first real proof is the trial on a paid account (task 7.6).
- **2026-10-14** — Built in one pass: every source task ticked, the connection tool re-pinned, and the local checks green. A refused save answers in Git's own words so the plain line reaches the person. Still to do: the new GitHub key for WongStack's own apps, the checks on the preview, and the try on a real Cloudflare account. The saved check for a refused publish names the old message and waits for the walk to record it again.
- **2026-10-14** — Assumed: the refusal for a person without the tick is shown by the app's own tests, not on the preview, because a preview lets the checker act only as the owner.
- **2026-10-14** — Asked how to prove the Cloudflare half → chose try it on Matthew's paid account: a throwaway project kept in Cloudflare, one save through the app as a teammate, then everything it made removed.
- **2026-10-14** — Asked whether to give the new GitHub key before publishing → chose publish without it. No real save through the app to GitHub was tried; the app's own tests stand behind that half, and WongStack's own apps hold no `WONG_CODE_WRITE` yet.
- **2026-10-14** — Tried on Matthew's paid Cloudflare account with a throwaway install, `wsave-trial-1014`: a save through its preview app landed the branch where the project is kept, the app read that commit's check run back as passed with its preview, a failing test came back failed with its output, and a push at `main`, a delete, a tag and two branches at once were each refused with the plain line. The checker stood in for the owner, so a real teammate's sign-in, the live app and a person holding only the tick were not walked. Everything the install made was then removed and read back as gone.
- **2026-10-14** — Archived for publishing as 41.2.0: every task settled, the Cloudflare half seen passing on a real account, the GitHub half carried by tests alone by Matthew's choice.
- **Check:** `.agents/verification/journeys/employee-onboarding/a-person-tries-to-publish-through-the-app.json` no longer checks the refusal's wording on a preview. The old line, *This copy is for reading*, is gone by design, and WongStack's preview holds no save key, so it refuses a push earlier with *Saving through the app is not set up yet*. The check still shows a download works and that the app reports its save step; `code.test.ts` and the router's tests hold the refusal of `main`, a delete and a tag.
- **Check:** `.agents/verification/journeys/key-access/the-project-can-be-handed-out.json` is re-recorded for the reworded scenario: it now also expects *They can save changes too.* under the tick, and keeps every earlier expectation.
- **Check:** `scripts/retired-names.json` drops its entry for `app/worker/employee-access/github.ts`, because this change brings a file of that name back, to open a change on GitHub and read its checks. The three sibling entries stay.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: Project code keeps its one level, which now also lets a person save changes through the app; on GitHub the step it names asks for a key that can save.
- `employee-onboarding`: the copy a person installs is no longer read-only: they can send a change up through the app, and nobody publishes through it.
- `delivery-gate`: `/save` runs in a copy installed through the app with no `gh`, opens no change on the default branch, and never offers to publish from there.

## Impact

- **App server:** `app/worker/employee-access/code.ts` forwards Git's two write calls for one non-default branch; a new handler beside it opens or updates the change and reads its checks, failing output and preview; `router.ts` judges a save like a download; `keys.ts` gives Project code a second secret, `WONG_CODE_WRITE`; `members.ts` reports the save step.
- **Access screen:** `app/src/apps/access/SetFields.tsx`, `ProjectStep.tsx`, `status.ts`.
- **Save scripts:** `delivery-route.mjs` gains a third route, `app`; a new `app-change.mjs` beside `artifacts-run.mjs`; `checkpoint.mjs`, `wait-for-checks.sh`, `preview-url.sh`, `saved-revision.mjs`, `ship.mjs` and `other-work.mjs` ask the route.
- **Connection tool:** `scripts/employee-bootstrap.mjs` gains one call that runs Git against the app with the person's session; `bootstrap-release.json` is re-pinned. The change `one-connect-message` rewrites the same file, so this one catches up with it at publish.
- **Setup:** `provision.mjs` binds the app to the check runner on an Artifacts install; `app/.dev.vars.example` declares `WONG_CODE_WRITE`.
- **Docs:** `wiki/stack/employee-project.md`, `artifacts-route.md`, `access-screens.md`, `employee-access.md`, `wiki/development/the-change-loop.md`, the save preconditions, and a `CHANGELOG.md` minor entry.
- **Outside this repo:** one new GitHub token for WongStack's own staging and live apps, given by Matthew through a key link. No database change.
