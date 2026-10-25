# One live line, for the live app only

**Status:** in-progress
**Branch:** one-line-worker
**Open questions:** none

## Why

Each app runs two copies of the live line: one for the live app, and a test one for previews. The test one is rarely if ever used: your computer connects only to the live app, so nothing real ever talks to it. If the live line breaks, your computer and inbox fall back to checking every 10 seconds, so a test line guards against a slowdown, not a failure. One line is less to deploy and less to go wrong. ClaymooApp already runs this way.

## What Changes

- **One line, for the live app only.** The test copy of your app gets no line. A preview's inbox checks every few seconds instead of updating at once, and it never reaches the live line or a live computer.
  ```svg
  <svg viewBox="0 0 560 150">
    <text x="8" y="18" fill="muted">before</text>
    <rect x="8" y="28" width="120" height="32" fill="card" stroke="line"/>
    <text x="30" y="49">live app</text>
    <rect x="180" y="28" width="120" height="32" fill="card" stroke="line"/>
    <text x="206" y="49">live line</text>
    <path d="M128 44h44m-8-6 8 6-8 6" fill="none" stroke="fg"/>
    <rect x="8" y="72" width="120" height="32" fill="card" stroke="line"/>
    <text x="28" y="93">test copy</text>
    <rect x="180" y="72" width="120" height="32" fill="card" stroke="danger"/>
    <text x="206" y="93">test line</text>
    <path d="M128 88h44m-8-6 8 6-8 6" fill="none" stroke="fg"/>
    <text x="330" y="18" fill="muted">after</text>
    <rect x="330" y="28" width="100" height="32" fill="card" stroke="line"/>
    <text x="345" y="49">live app</text>
    <rect x="460" y="28" width="92" height="32" fill="card" stroke="line"/>
    <text x="472" y="49">live line</text>
    <path d="M430 44h22m-8-6 8 6-8 6" fill="none" stroke="fg"/>
    <rect x="330" y="72" width="100" height="32" fill="card" stroke="line"/>
    <text x="344" y="93">test copy</text>
    <text x="330" y="128" fill="muted">no line: checks every few seconds</text>
  </svg>
  ```
- **A change to the line is tried on this computer, then on the live app.** Today you can't: the app won't start locally, and the local stand-in sign-in is turned away by every page that needs a person, the inbox included. This change fixes both, so the app and its line run together on this computer. A small script then joins the line as your computer and prints each *look now*, so a tap in the local inbox shows it working. Your real helper still talks only to the live app. After publishing, a tap in the live inbox confirms it.
  ```mermaid
  flowchart TD
    change["line change"] --> tap["tap in the<br/>local inbox"]
    tap --> stand["stand-in prints<br/>look now"]
    stand --> publish --> live["tap in the<br/>live inbox"]
  ```
- **Setup makes no test line, and the first publish makes the live one.** A new app gets its line when it's first published, before the app itself. Setup still checks no other project already uses the line's name.
  ```mermaid
  flowchart TD
    setup --> check{"name free?"}
    check -->|yes| publish["first publish:<br/>line, then app"]
    check -->|no| ask["asks you"]
  ```
- **The update tidies up the old test line.** It removes the test line from your app's settings. After you publish, the update's last step deletes the old test line from Cloudflare. That delete can't be undone; it held only test state.
  ```mermaid
  flowchart LR
    first["small release<br/>live"] --> update["this update"] --> publish --> del["delete old<br/>test line"]
  ```

Non-goals: changing what the line does; a line for previews; the real helper talking to a local app; moving the app's link to the line to a different kind of link, as ClaymooApp's is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-line`: one line Worker, for the live app; previews have none; the update says to delete the old test line; a line change can be tried on this computer.
- `stack-pack`: deploys send the line on the default branch only; a staging app that binds any line is refused.
- `cloudflare-provisioning`: setup makes no line Worker; it writes the live line's settings, keeps the name-clash check, and strips an install's test line from its settings.

## Impact

- **App:** `app/wrangler.jsonc` (no `LIVE_LINE` under `env.staging`; `env.local` keeps it), `app/wrangler.line.jsonc` (no `env.staging`), `app/worker-configuration.d.ts` (regenerated). Local dev: `app/vite.config.ts` (the dev server may read the one script `setup-file.ts` imports), `app/worker/access.ts` (the local stand-in identity counts as a person), a new stand-in computer script in `scripts/`.
- **Pack scripts:** `scripts/cf-build.sh`, `scripts/cf-deploy.sh`, `scripts/cf-preview.sh`, `scripts/lib-wrangler-config.mjs`/`.sh` (`lineProblem`, `lineAddressProblem`, `stagingLineProblem`), `scripts/cf-secrets.mjs` (`checkDurableObjectTwins`), and their tests.
- **Setup:** `.agents/skills/wong-setup/scripts/provision.mjs` (`lineConfig`, `lineInConfig`, `liveLine`; `lineWorkers` goes), `.agents/skills/wong-sync/references/wrangler.line.template.jsonc` and `stack-pack-fragments.md`, `.agents/.wong-stack.json`.
- **Docs:** `wiki/stack/live-line.md`, `wiki/stack/d1-pipeline.md`, `wiki/stack/staging-bindings.md`, `wiki/people/matthew-wong.md`, `scripts/retired-names.json`, `CHANGELOG.md` (minor).
- **Cloudflare:** after publishing, `wongstack-line-staging` is deleted; each install deletes its `<app>-line-staging` the same way.

## Decision log

- **2026-10-25** — Asked (Matthew, in WongOS workspace "light-flamingo") whether to keep the test line → chose to remove it: nothing real tests against it, and a broken live line only slows things to a 10-second check. Accepted: a preview's inbox checks instead of updating at once, and a line change is tried on this computer, then on the live app.
- **2026-10-25** — Asked how to get past each app's live check refusing a test copy with no line → chose two releases: [staging-may-skip-the-line](../archive/2026-10-25-staging-may-skip-the-line/proposal.md) first, then this one, whose update note says to publish that one first.
- **2026-10-25** — Assumed: the staging app simply has no line binding, not ClaymooApp's in-code check of the database id, because WongStack's staging is its own Worker and Wrangler doesn't carry bindings into an environment, so leaving it out is enough and a check can see it.
- **2026-10-25** — Assumed: the app keeps its Durable Object binding, not ClaymooApp's service binding, because one binding kind for one Worker gains nothing and a switch means another rename and a new line entry point.
- **2026-10-25** — Assumed: staging may bind no Durable Object in another Worker at all, not only "not a line Worker", because the deploy already refused any but the staging line, which is gone, so a staging twin could never deploy; `secrets:check` and the deploy then say the same thing.
- **2026-10-25** — Assumed: setup stops deploying the line from this computer, and the first publish makes it, because the only reason to make it before the first save was the preview's binding to the test line; this also stops a laptop deploy to a live Worker.
- **2026-10-25** — Assumed: the old test line is deleted by hand after publishing, as an update step, not by setup, because until then the live app's older scripts redeploy it on every save of the update.
- **2026-10-25** — Assumed: an install's own line and app settings lose their test line by a text edit that keeps comments, checked by reading the file back, and restored with a to-do when the shape is unknown, as setup already edits the app's settings.
- **2026-10-25** — Assumed: Matthew's page gains the live line beside memory as staging's exceptions, because his rule says staging should mirror the live app and this is a settled exception.
- **2026-10-25** — Note: [staging-may-skip-the-line](../archive/2026-10-25-staging-may-skip-the-line/proposal.md) is live as 44.13.0 (PR #454), so this change can be built.
- **2026-10-25** — Asked whether to go on when the build found a line change can't be tried locally (the stand-in sign-in is refused, and `npm run dev` fails) → chose to fix local first.
- **2026-10-25** — Asked whether the local fix is its own release or part of this one → chose to fold it into this change.
- **2026-10-25** — Asked how "your computer" joins the line locally → chose a small stand-in script that refuses any non-local address, over letting the real helper reach a local app, which would loosen its secure-address-only rule.
- **2026-10-25** — Assumed: the local stand-in identity gains a user id and an expiry an hour ahead, and still applies only when all three local conditions hold, because the person check refuses an identity with neither, which is why every person-only route failed locally, not just the line.
- **2026-10-25** — Note: Vite 8 checks a `?raw` import's id as well as its file, so allowing the file alone still failed with `Denied ID`; `server.fs.allow` lists the file and its `?raw` id, still that one file and nothing else in `scripts/`.
- **2026-10-25** — Assumed: the stand-in computer ships with the pack, beside the line's wiki page that tells you to run it, so an install's link to it resolves.
- **2026-10-25** — Assumed: two checks wait until after publishing and live here, not as tasks, because `/ship` refuses unticked tasks. After publishing, tap a test plan in the live inbox and see it reach the chat within seconds, the tap in `~/.wong-stack/helper/log.jsonl`, then close the test item. Then ask Matthew, saying it can't be undone, before deleting `wongstack-line-staging` (`npx wrangler delete --name wongstack-line-staging` from `app/`), and confirm `wrangler deployments list --name wongstack-line-staging` finds none. If Cloudflare asks for another step, add it to the wiki and the **Updating.** note in a follow-up patch.
- **2026-10-25** — Saved: all groups built and reviewed (no findings); local checks failed only on load timeouts in untouched tests, each passing alone; the preview from this computer bound no line and deployed no line Worker.
- **2026-10-25** — Assumed: every build keeps bundling the line, previews too, because the first save's preview failed in CI: the default branch's deploy script still sends a preview's test line and found no bundle. Each install's update would hit the same, so the build bundles it and the new deploy script ignores it on a preview.
