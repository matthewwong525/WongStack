# Mini apps

A mini app is a small page or tool that you get from one request — "make me a tip calculator" — on a preview link in under a minute, however large the main app is. It lives beside the main app on its own small Worker, so building it never builds, lints, or tests `app/`. You try it on a preview, change it by chatting, and save it straight to production when it is right.

```text
repo/
├─ app/               main app, untouched
└─ mini-apps/
   ├─ wrangler.jsonc  <repo>-mini + staging
   ├─ worker.ts       routes /<name>/api/*
   └─ apps/
      ├─ index.html   dashboard (generated)
      └─ tips/
         ├─ index.html
         ├─ app.json  title, description
         ├─ api.mjs   optional handler
         └─ api.test.mjs
```

## The rules

- **One folder per app**, `mini-apps/apps/<name>/`, with an `app.json` that holds a `title` and a one-line `description`. Copy the example app, `hello/`, to start.
- **No build step.** Pages are HTML, CSS, and plain JS modules. The optional handler, `api.mjs`, is plain JavaScript too. wrangler bundles it with the small Worker in about a second.
- **Tests live with the app.** Write tests for its logic in the same folder, runnable with `node --test` from that folder. Plain JavaScript runs on any Node with no install and no type stripping.
- **Data is shared on purpose.** The mini Worker binds the repo's own D1 databases: staging for previews, production for saved apps. A table comes from a migration in the shared `schema/migrations/`, as [the data pipeline](d1-pipeline.md) says.
- **One app never changes another**, and nothing under `mini-apps/` changes `app/`.

## Try it: a preview in seconds

[`/apply`](../../.agents/skills/apply/SKILL.md#the-mini-app-path) writes the app, then uploads a preview of the mini Worker from the agent host:

```bash
bash scripts/cf-mini.sh preview --alias mini-<name>
```

The script builds the dashboard, applies pending staging migrations, creates the staging Worker the first time, uploads a preview version under the alias, and prints the URL that wrangler reports. It never deploys production and never touches `app/`. It reads the Cloudflare credential from the environment; [the secrets convention](../development/secrets.md) says where the agent gets it.

**A preview uses staging data and expires after seven days.** Each upload carries its expiry time; after it, the preview answers "This preview expired" with HTTP 410. A new upload gives it seven more days. An idle Worker costs nothing, so the expiry is about exposure and clutter, not money. A preview link on `workers.dev` is public but unlisted, because [Cloudflare Access can not gate `workers.dev`](cloudflare-access.md#why-workersdev-cannot-be-gated): keep private data out of staging, and let the expiry close old links.

`/apply` does not save on its own. Saving puts the app live on production data, so you save when the preview is right.

## Save it: straight to production

[`/save`](../../.agents/skills/save/references/mini-app-save.md) takes a direct route, like [the prose save](../development/the-change-loop.md#the-prose-allowlist), when every changed path is inside one app's folder:

1. It runs that app's tests on the agent host. A failing test stops the save; nothing is pushed.
2. It commits the folder and pushes it to `main`, with no branch and no pull request.
3. CI on `main` runs the app's tests again and deploys only the production mini Worker. The main app's jobs skip, because [the push leaves the main app untouched](../development/the-change-loop.md#the-gate).

The app is then live on production data, and the dashboard lists it. The folder on `main` is the record; there is no OpenSpec change. Running tests on the host bends the rule that [nothing builds locally](../development/the-change-loop.md#the-gate): for this one route, the host test run is the gate that a pull request would be.

## When a save needs a pull request

Some saves fall back to save's normal route, with a branch and a pull request:

- **The diff leaves the app's folder** — a migration under `schema/migrations/`, a change to `mini-apps/worker.ts` or `mini-apps/wrangler.jsonc`. A person reviews those, because they reach the shared database or every app.
- **The push is rejected** — you can not bypass the rules, or `main` moved. The save never forces it.

[`/ship`](../../.agents/skills/ship/SKILL.md#merge-a-mini-app-pull-request) then merges that pull request after CI runs the app's tests, with no OpenSpec change, no archive, and no walk.

## The dashboard

`scripts/mini-dashboard.mjs` builds `mini-apps/apps/index.html` from every app's `app.json` each time the mini Worker is uploaded or deployed, with no model step. On production it lists every saved app; on a preview it also lists the app being previewed. A missing title or description stops the upload and names the folder.

## When to move an app into the main app

Move a mini app into `app/` when it needs the main app's login, data model, or navigation. That is an ordinary change through [the change loop](../development/the-change-loop.md), with the main app's own tests. Serving mini apps at the main app's address, through a service binding from the main Worker, is not built yet.

In the WongStack source repo, the example app `hello/` is payload, so a change to it is a release with a pull request, not a direct save.

Part of [the Cloudflare stack](README.md).
