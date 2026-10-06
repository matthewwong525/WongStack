# Mini apps

A mini app is a small page or tool that you get from one request, such as "make me a tip calculator". It is part of the main app, in folders of its own, and lives at `/apps/<name>/`. It takes [the same loop as any change](../development/the-change-loop.md#mini-apps): a plan, a preview, then *publish it?*

```text
app/
├─ src/apps/
│  ├─ index.ts        finds and checks every app
│  ├─ AppPage.tsx     shows the app the address names
│  └─ hello/
│     ├─ App.tsx      the page, exporting App
│     ├─ App.test.tsx
│     └─ app.json     title, description
└─ worker/apps/
   ├─ index.ts        sends /apps/<name>/api/* to the app
   └─ hello/          only when the app has a server side
      ├─ api.ts       the route list, exporting routes
      ├─ greeting.ts  one handler
      └─ api.test.ts
```

An app has two folders because the main app splits its pages from its server code: `app/src/` runs in the browser and `app/worker/` runs in the Worker, each type-checked for its own side. Vite finds every app's `App.tsx`, `app.json`, and `api.ts` when it builds, so a new app needs no edit outside its folders.

## The rules

- **One folder per app**, `app/src/apps/<name>/`, with an `app.json` that holds a `title` and a one-line `description`. The folder name is the address: lowercase letters, digits, and hyphens. Copy the example app, `hello/`, in both folders, to start.
- **Written like any page.** The page is React and TypeScript, inside the main app's frame. Build it from the ready-made parts in `app/src/components/ui/`, such as a button, a field or a card, with Tailwind classes for its spacing, as Hello does. When a screen needs a part the app lacks, add it from `app/` with `npx shadcn@latest add <part>`, and leave the part as written. An app brings no CSS file: a check fails and names one. [The code rule](../../.agents/rules/code.md#where-things-go) owns where each thing goes.
- **The same checks as the main app.** An app's tests sit beside its code and run in the main app's suite, with the same limits: every line tested. The copied parts are the one exception: that folder skips the every-line-tested, unused-code and repeated-code checks, and a screen's tests cover what it uses. A change to one app runs the whole suite, so it takes a few minutes, not seconds. Keep `app/.jscpd.json` free of comments: with one, the repeated-code check ignores the whole file and passes everything.
- **It reaches everything but memory, and only the keys it lists.** A handler listed in `api.ts` is called as `(request, env, { url, route, identity })`. `env` holds the Worker's bindings, such as `DB`, and the saved keys the app lists: `export const keys = ["stripe"]` in `api.ts`, or `keys` on one action. A key the app does not list is absent, and Access shows the owner that same list ([list the keys a route uses](company-api.md#list-the-keys-a-route-uses)). `identity` says who is calling: a person's email or a service token's name, or `null` on a workspace open without login. A preview uses staging data and staging keys; a published app uses production's. A table comes from a migration in the shared `schema/migrations/`, as [the data pipeline](d1-pipeline.md) says.
- **Describe approved actions once.** The supplied [greeting definition](../../app/worker/apps/hello/greeting.ts) uses the [shared contract](../../app/worker/api/contract.ts) for request/output checks and generated discovery. [Company actions](company-api.md) owns the pattern, employee helper and authentication. Bare handlers keep working until deliberately described; a real service still needs a specific implemented action.
- **Memory stays out of reach.** A handler's bindings leave out `MEMORY_DB` and `MEMORY_BUCKET` (beyond memory, only [a preview check's picture route](../development/staging-walkthrough.md#what-a-walk-needs) is handed the bucket, and it reaches only `walks/`), and the Worker's `disallow_importable_env` flag stops it importing them. That stops a mistake, not code written to get around it: a handler runs in the same Worker as [the memory store](../development/memory-key.md), so review its code before it publishes, like any Worker code.
- **People management stays in core.** A handler is handed no `WONG_ACCESS_LOGIN_MANAGEMENT`, [the live app's key for its sign-in list](employee-access.md#the-key). The Access mini app calls a few fixed core routes that check the owner's signed sign-in; a shared Worker still needs code review before it publishes.
- **The checks name a bad app.** A folder name that is not an address, a page with no `app.json`, or an `app.json` with no title or description fails the `test` check and names the folder.

## Build, preview, publish

A mini app goes through [the change loop](../development/the-change-loop.md) like any change.

- **Plan.** [`/plan`](../../.agents/skills/plan/SKILL.md) writes the change, with a task for the app's tests, and asks [the finished-plan question](../../.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step).
- **Preview.** When [`/apply`](../../.agents/skills/apply/SKILL.md#finish-with-a-preview) finishes, it uploads a preview of the whole main app from the agent host. Open the app at `/apps/<name>/` on that link. Each further change uploads again to the same link.
- **Publish.** [`/ship`](../../.agents/skills/ship/SKILL.md) saves, waits for CI, and merges. CI runs the main app's suite and deploys it with the app inside, as [the gate](../development/the-change-loop.md#the-gate) says.

**A preview builds the whole app, so the first one in a worktree waits for the install.** Preview links use the same [native Worker Access protection](cloudflare-access.md#the-hostnames-to-add) as the main app. Use allowed email login or the saved machine credential, and keep staging data separate from production.

## The home page lists the apps

The home page, `app/src/pages/home/Home.tsx`, is the list: there is no page of its own at `/apps/`, which goes home. Each card shows an app's title and description and links to it; the example, Hello, is labeled *Example*. With no apps yet, the page offers a first request to copy into your chat. Manifests come from the build; current app-permission readback decides which cards open. Loading/error states withhold the whole list.

Once [Access permissions start](employee-access.md#the-first-open), an employee sees every app: the ones they hold as links, and each one they lack greyed, marked *No access*. A greyed card opens nothing; a click or the keyboard shows *Ask your admin for access to <title>.* under it. So every employee can read every app's title and description. The server still refuses a direct visit and the app's API, by the same current permissions. Nothing is greyed for the employer, or for anyone before permissions start. An employee with no business apps reads to contact their employer, above the greyed cards.

The list ends with a *Connect your assistant* card for every signed-in person, before and after permissions start; Home has no setup box. Once the app can [hand the project out](employee-project.md#who-gets-what), a person who lacks Project code sees the card greyed and marked *No access*: a press opens nothing and says to ask their admin. The card opens the steps, with *Copy setup prompt*, in a popup over the page, and *Close* returns to the list. The popup is `app/src/components/ConnectDialog.tsx`, which [Access](employee-access.md#one-frame-on-every-screen) opens from its own button. Missing reviewed bootstrap pins show setup guidance; failed clipboard copying leaves selectable text, which wraps inside the popup. Once permissions have started, an employee sees the list without the employer's welcome. The employer retains the removable welcome and custom branding.

Above the list sit a workspace heading and a removable welcome, *Make it yours*. Copy its one request into your chat: the agent asks before skimming your recent Claude Code and Codex chats, asks a few short rounds of questions, saves short notes about you, then names the workspace, updates the heading, and removes the guide, with an explanation and a preview before publishing. The heading stays above the apps when the guide is gone. Update the tutorial files only while the target's `Home.tsx` still renders `<Tutorial />`; a finished guide stays removed.

Every page, each app's included, shares one look from the app's one stylesheet, `app/src/index.css`: the device's font, light or dark to match the device, a narrow column, neutral surfaces, black or white primary actions, and visible keyboard focus. Every screen is built from one set of ready-made parts, [shadcn](https://ui.shadcn.com)'s, on [Tailwind](https://tailwindcss.com); [the pieces](core-stack.md#the-pieces) says what each is. The frame is a bar across the screen on every page: the editable WongStack name and colored W mark, which return home, and [*Sign out*](cloudflare-access.md#signing-out) where the site has a sign-in. Ask in chat to change this default identity. A reviewed update preserves or explicitly adapts your own branding. Hello is a card built from those parts, with the name label above the field and the greeting below the action.

In the WongStack source repo, the example app `hello` and [`access`](employee-access.md) are payload, so a change to it is a release. Any other app there, such as `tips`, is built like in any repo and never ships to other repos.

Part of [the Cloudflare stack](README.md).
