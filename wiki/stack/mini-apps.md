# Mini apps

A mini app is a small page or tool that you get from one request — "make me a tip calculator". It lives in its own folder, and the main app serves it at `/apps/<name>/`. You try it on a preview, change it by chatting, and save it straight to production when it is right.

```text
repo/
├─ app/               main app; its Worker serves /apps/*
└─ mini-apps/
   ├─ router.mjs      routes /apps/<name>/api/*
   ├─ routes.mjs      finds each apps/*/api.mjs
   └─ apps/
      └─ tips/
         ├─ index.html
         ├─ app.json  title, description
         ├─ api.mjs   optional handler
         └─ api.test.mjs
```

The main app's Worker, `app/worker/index.ts`, sends every request under `/apps/` to `mini-apps/router.mjs`. The router sends `/apps/<name>/api/*` to that app's `api.mjs`, and serves every other path from the build's static assets. `routes.mjs` finds the handlers when Vite bundles the Worker, so a new app needs no edit outside its folder.

## The rules

- **One folder per app**, `mini-apps/apps/<name>/`, with an `app.json` that holds a `title` and a one-line `description`. The folder name is the URL path: lowercase letters, digits, and hyphens. Copy the example app, `hello/`, to start.
- **No build step of its own.** Pages are HTML, CSS, and plain JS modules. The optional handler, `api.mjs`, is plain JavaScript too. The main app's build bundles it into the main Worker.
- **Tests live with the app.** Write tests for its logic in the same folder, runnable with `node --test` from that folder. Plain JavaScript runs on any Node with no install and no type stripping.
- **Data is shared on purpose.** A handler gets the app's D1 database, `DB`, and nothing else: staging for previews, production for saved apps. It never gets the memory bindings, because a saved app reaches production with no review. A table comes from a migration in the shared `schema/migrations/`, as [the data pipeline](d1-pipeline.md) says.
- **One app never changes another.** A change to a shared file under `mini-apps/` outside `mini-apps/apps/`, such as `router.mjs`, is main-app code. It runs the main app's tests and takes a pull request.

## Try it on a preview

[`/apply`](../../.agents/skills/apply/SKILL.md#the-mini-app-path) writes the app, then uploads a preview of the whole main app from the agent host:

```bash
bash scripts/cf-preview.sh --alias mini-<name>
```

The script installs the dependencies of `app/` when it has no `node_modules`. It applies pending staging migrations. It builds the whole app for staging, with every mini app in it. It uploads a preview version of the staging main Worker under the alias, and prints the URL that wrangler reports. It never deploys production. It reads the Cloudflare credential from the environment; [the secrets convention](../development/secrets.md) says where the agent gets it.

**A preview builds the whole app, so it is slower than an upload of one file.** The first preview in a worktree also waits for the install. Open the app at `/apps/<name>/` on the preview URL.

**A preview uses staging data.** A preview link on `workers.dev` is public but unlisted, because [Cloudflare Access can not gate `workers.dev`](cloudflare-access.md#why-workersdev-cannot-be-gated). Keep private data out of staging.

`/apply` does not save on its own. Saving puts the app live on production data, so you save when the preview is right.

## Save it: straight to production

[`/save`](../../.agents/skills/save/references/mini-app-save.md) takes a direct route, like [the prose save](../development/the-change-loop.md#the-prose-allowlist), when every changed path is inside one app's folder:

1. It runs that app's tests on the agent host. A failing test stops the save; nothing is pushed.
2. It commits the folder and pushes it to `main`, with no branch and no pull request. When `main` moved during the save, it rebases once, runs the tests again, and pushes again.
3. CI on `main` runs the app's tests again. It skips the main app's test suite, because [the push leaves the main app untouched](../development/the-change-loop.md#the-gate). It still builds and deploys the main Worker, because that Worker serves the app.

When that deploy finishes, the app is live at `/apps/<name>/` on production data, and the app list shows it. The folder on `main` is the record; there is no OpenSpec change. Running tests on the host bends the rule that [nothing builds locally](../development/the-change-loop.md#the-gate): for this one route, the host test run is the gate that a pull request would be.

## When a save needs a pull request

Some saves fall back to save's normal route, with a branch and a pull request:

- **The diff leaves the app's folder** — a migration under `schema/migrations/`, a change under `app/`, or a change to a shared file under `mini-apps/` outside `mini-apps/apps/`. A person reviews those, because they reach the shared database, the main app, or every app.
- **The push is refused** — you can not bypass the rules, or `main` moved and one rebase could not fix it: the rebase conflicted, the tests failed on the new `main`, or the second push was rejected too. The save never forces a push.

[`/ship`](../../.agents/skills/ship/SKILL.md#merge-a-mini-app-pull-request) then merges that pull request after CI runs the app's tests, with no OpenSpec change, no archive, and no walk.

## The app list

`scripts/cf-build.sh` runs `scripts/mini-dashboard.mjs` after each build of the main app, with no model step. The script reads every app's `app.json` and writes three things into the build's assets:

- `/apps/<name>/` — each app's pages. It never copies `api.mjs`, tests, TypeScript files, or dotfiles.
- `/apps/index.html` — the list page, with each app's title, description, and link.
- `/apps/apps.json` — the same list as data.

The starter landing page, `app/src/App.tsx`, reads `/apps/apps.json` and lists the apps at the top. Below the list, a four-step tutorial teaches the loop. Its last step tells you to say `remove the tutorial`.

On production the list shows every saved app; on a preview it also shows the app that you preview. A bad folder name, or a missing title or description, stops the build and names the folder.

## When to move an app into the main app

Move a mini app into `app/` when it needs the main app's login, data model, or navigation. That is an ordinary change through [the change loop](../development/the-change-loop.md), with the main app's own tests. A mini app already shares the main app's hostname, so [Cloudflare Access](cloudflare-access.md) on the main app gates it too.

In the WongStack source repo, only the example app `hello/` is payload, so a change to it is a release with a pull request. Any other app there saves like in any repo, and never ships to other repos.

Part of [the Cloudflare stack](README.md).
