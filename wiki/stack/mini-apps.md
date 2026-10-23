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
- **Written like any page.** The page is React and TypeScript, inside [the main app's frame](#the-home-page-lists-the-apps). Every page fills the frame, as Home, Hello and Access do: put cards in a grid and a form's fields on one line, not in a narrow column. A page never narrows itself, sets a width from the screen's, or uses a negative margin: a check names one that does. Build it from the ready-made parts in `app/src/components/ui/`, such as a button, a field or a card, with Tailwind classes for its spacing, as Hello does. When a screen needs a part the app lacks, add it from `app/` with `npx shadcn@latest add <part>`, and leave the part as written. An app brings no CSS file: a check fails and names one. [The code rule](../../.agents/rules/code.md#where-things-go) owns where each thing goes.
- **The same checks as the main app.** An app's tests sit beside its code and run in the main app's suite, with the same limits: every line tested and every type read, test files included. Lint also fails on a comment longer than two lines, or a comment line wider than 120 characters, by [the comment-length rule](../../scripts/lint-comment-length.mjs): say why in two lines, and put a longer reason in a test, a name, or the wiki. The copied parts are the one exception: that folder skips the every-line-tested, unused-code and repeated-code checks, and a screen's tests cover what it uses. A change to one app runs the whole suite, so it takes a few minutes, not seconds. Keep `app/.jscpd.json` free of comments: with one, the repeated-code check ignores the whole file and passes everything. A check proves it can still fail, which catches that: when a change touches a check's settings, the app's packages, or the proof itself, [`npm run test:checks`](../../scripts/check-app-checks.mjs) hands each check of `npm test` a piece of code that is wrong on purpose, and [the Test check](../development/the-change-loop.md#the-gate) fails and names any check that lets it through. Other changes skip the proof and say so; one with no base to compare runs it.
- **An app keeps to its own folder.** Its page imports its own files, the shared parts and helpers in `app/src/components/` and `app/src/lib/`, and installed packages. Its server side imports its own files and [the shared contract](../../app/worker/api/contract.ts). An import of another app's files, a main page, or the Worker's core fails the lint check, which names the file. Test files are exempt, since a test opens its app inside the main app. A file in an app's subfolder can not yet import upward within its own app: add an allow for `@/apps/<name>/**` to the rule in `app/.oxlintrc.json` when the first app needs one.
- **It reaches everything but memory, and only the keys it lists.** A handler listed in `api.ts` is called as `(request, env, { url, route, identity })`. `env` holds the Worker's bindings, such as `DB`, and the saved keys the app lists: `export const keys = ["stripe"]` in `api.ts`, or `keys` on one action. A key the app does not list is absent, and Access shows the owner that same list ([list the keys a route uses](company-api.md#list-the-keys-a-route-uses)). `identity` says who is calling: a person's email or a service token's name, or `null` on a workspace open without login. A preview uses staging data and staging keys; a published app uses production's. A table comes from a migration in the shared `schema/migrations/`, as [the data pipeline](d1-pipeline.md) says.
- **Describe approved actions once.** The supplied [greeting definition](../../app/worker/apps/hello/greeting.ts) uses the [shared contract](../../app/worker/api/contract.ts) for request/output checks and generated discovery. [Company actions](company-api.md) owns the pattern, employee helper and authentication. Bare handlers keep working until deliberately described; a real service still needs a specific implemented action.
- **Memory stays out of reach.** A handler's bindings leave out `MEMORY_DB` and `MEMORY_BUCKET` (beyond memory, only [a preview check's picture route](../development/staging-walkthrough.md#what-a-walk-needs) is handed the bucket, and it reaches only `walks/`), and the Worker's `disallow_importable_env` flag stops it importing them. That stops a mistake, not code written to get around it: a handler runs in the same Worker as [the memory store](../development/memory.md#sign-in-and-expiry), so review its code before it publishes, like any Worker code.
- **People management stays in core.** A handler is handed no `WONG_ACCESS_LOGIN_MANAGEMENT`, [the live app's key for its sign-in list](employee-access.md#the-key). The Access mini app calls a few fixed core routes that check the owner's signed sign-in; a shared Worker still needs code review before it publishes.
- **The checks name a bad app.** A folder name that is not an address, a page with no `app.json`, or an `app.json` with no title or description fails the `test` check and names the folder.

### Work with no screen

Work built for skills and assistants alone needs no page of its own. Nobody is given it by itself: it sits inside an app or behind a key.

- **Inside an app:** add the action to that app's server folder. [The app's tick](employee-access.md#apps) covers it.
- **Behind a key:** give it a server folder, `app/worker/apps/<name>/`, with no folder under `app/src/apps/`. Each route lists a saved key, in the folder's `keys` export or the action's own, and [the caller's level for that key](employee-access.md#a-key-with-no-app) decides. The folder is no app: Access and Home don't list it, and its `api.ts` exports no `title` or `description`.

```ts
export const keys = ["stripe"];
export const routes = new Map<string, Route>([["GET lookup", lookup]]);
```

- **A folder with no screen and a route that lists no key fails `npm test`**, before a publish. The error names the `api.ts` and the two fixes: give the folder a screen, or list a key. So does a main route [mapped to a name](company-api.md#map-business-routes-before-employee-policy) nobody built.
- **A skill reaches it through the helper**: [build a skill on actions](company-api.md#build-a-skill-on-actions).

## Build, preview, publish

A mini app goes through [the change loop](../development/the-change-loop.md) like any change.

- **Plan.** [`/plan`](../../.agents/skills/plan/SKILL.md) writes the change, with a task for the app's tests, and ends on [the plan's link](../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link), where you build it.
- **Preview.** When [`/apply`](../../.agents/skills/apply/SKILL.md#finish-with-a-preview) finishes, it uploads a preview of the whole main app from the agent host. Open the app at `/apps/<name>/` on that link. Each further change uploads again to the same link.
- **Publish.** [`/ship`](../../.agents/skills/ship/SKILL.md) saves, waits for CI, and merges. CI runs the main app's suite and deploys it with the app inside, as [the gate](../development/the-change-loop.md#the-gate) says.

**A preview builds the whole app, so the first one in a worktree waits for the install.** Preview links use the same [native Worker Access protection](cloudflare-access.md#the-hostnames-to-add) as the main app. Use allowed email login or the saved machine credential, and keep staging data separate from production.

## The home page lists the apps

The home page, `app/src/pages/home/Home.tsx`, is the list: there is no page of its own at `/apps/`, which goes home. Each card shows an app's title and description and links to it; the example, Hello, is labeled *Example*. With no apps yet, the page offers a first request to copy into your chat. Manifests come from the build; current app-permission readback decides which cards open. Loading/error states withhold the whole list.

Once [Access permissions start](employee-access.md#the-first-open), an employee sees every app: the ones they hold as links, and each one they lack greyed, marked *No access*. A greyed card opens nothing; a click or the keyboard shows *Ask your admin for access to <title>.* under it. So every employee can read every app's title and description. The server still refuses a direct visit and the app's API, by the same current permissions. Nothing is greyed for the employer, or for anyone before permissions start. An employee with no business apps reads to contact their employer, above the greyed cards.

The list ends with a *Connect your assistant* card for every signed-in person, before and after permissions start: the one way to the steps. Once the app can [hand the project out](employee-project.md#who-gets-what), a person who lacks Project code sees the card greyed and marked *No access*: a press opens nothing and says to ask their admin. The card opens them in a popup over the page, `app/src/components/ConnectDialog.tsx`, and *✕* returns to the list. The popup says what an assistant is, then numbers four steps: have an AI assistant on your computer, with install links for Claude Code and Codex named as examples; copy your setup message with the one *Copy* button; paste it into your assistant's chat; approve the sign-in it opens, as the email it names. It ends with what to ask and the apps the connection reaches. When the steps can't load it says so and offers *Try again* The message is [the same short one for everyone](employee-project.md#install-in-one-step). For a person given Project code it adds that the connection brings the whole project. *Can't copy? Show the message* leaves the text to select, which wraps inside the popup. Once permissions have started, an employee sees the list without the employer's welcome. The employer retains the removable welcome and custom branding.

Above the list sit a workspace heading and a removable welcome, *Make it yours*. Copy its one request into your chat: the agent asks about your work and where your time goes, one question at a time, then suggests a few apps. It builds the one you pick and removes the guide, with an explanation and a preview before publishing. It starts from what it already knows, and reads no chats: [setup learns about you from your past chats](learning-from-chats.md) while it installs. The heading stays above the apps when the guide is gone; ask in your chat to change it. Update the tutorial files only while the target's `Home.tsx` still renders `<Tutorial />`; a finished guide stays removed.

Every page, each app's included, shares one look from the app's one stylesheet, `app/src/index.css`: the device's font, light to start on every device, one frame, neutral surfaces, black or white primary actions, and visible keyboard focus. Every screen is built from one set of ready-made parts, [shadcn](https://ui.shadcn.com)'s, on [Tailwind](https://tailwindcss.com); [the pieces](core-stack.md#the-pieces) says what each is. The frame is one width with one left edge on every page, set in `app/src/Layout.tsx`: Home, each mini app and [Access](access-screens.md#one-frame-on-every-screen) start at the same edge, so nothing jumps sideways between screens. A bar spans the screen above it, its contents in the same frame: the editable WongStack name and colored W mark, which return home, a sun or moon button that switches the page between light and dark, and [*Sign out*](cloudflare-access.md#signing-out) where the site has a sign-in. Ask in chat to change this default identity. A reviewed update preserves or explicitly adapts your own branding. Hello is a card built from those parts, with the name label above the field and the greeting below the action. A loading state shows grey skeleton blocks shaped like what loads, as Home's app cards do, and keeps its words for a screen reader: shadcn's `Skeleton` inside `app/src/components/Loading.tsx`.

Pages outside the app wear the same look: the plan review page, the private key, password, and form pages, and a closed link's page. They can't run React or load a file, so [`look.mjs`](../../.agents/skills/plan/scripts/look.mjs) reads the colours from `app/src/index.css` when it builds or serves one, and draws shadcn's button, field, card, tag, and skeleton in plain CSS from [`look.css`](../../.agents/skills/plan/references/look.css). Change the app's colours and these pages follow. Keep the light set one plain `:root` block and the dark set one plain `.dark` block right after it, or a check fails; a rebrand sets both, or the pages fall back to shadcn's neutral dark.

Every page starts light, whatever the device's setting. A moon in the top right, in the app's bar or the page's corner, turns it dark at once; a sun turns it back. The browser remembers the choice per site: the app, a private link, and a review file each live at their own address, so each remembers its own. The `.dark` class on the page's root element turns dark on, saved as `localStorage['wongstack-theme']`. Tailwind's `dark:` follows the device unless tied to a class, so `index.css` ties it to `.dark`. In the app, `ThemeToggle.tsx` sets it and `index.html` applies the saved choice before the first paint; outside it, [`theme.js`](../../.agents/skills/plan/references/theme.js) does both. A closed link's page has no switch and stays light.

In the WongStack source repo, the example app `hello`, [`access`](employee-access.md) and [`inbox`](../development/reply-links.md#in-your-inbox-first) are payload, so a change to one is a release. The Inbox lists what waits on the signed-in person: plans to review and the chief of staff's approvals and questions. Any other app there is built like in any repo and never ships to other repos.

Part of [the Cloudflare stack](README.md).
