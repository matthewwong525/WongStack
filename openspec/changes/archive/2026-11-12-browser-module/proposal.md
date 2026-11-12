# The browser becomes a module any project can add

**Status:** ready-to-ship
**Branch:** rare-octopus
**Open questions:** none

## Why

Today the agent's own browser works only inside a full WongStack project. It leans on WongStack's memory code, its app, its plan pages, and its schedules. A project that wants only "let my AI use websites as me, and hand me the browser when it needs me" must take all of WongStack. Memory is now a module any project can add with one pasted message. The browser is next, and it follows the same guide.

## What Changes

- **Any project can add the browser with one pasted message.** The person pastes the message into any AI tool. The AI copies the browser in, checks that it runs, and saves the work. It asks before each step that costs money or makes something public, and before it pushes.
  ```text
  "Add WongStack's browser to this project.
   Follow the setup guide at <link>"

   → the browser, private links, and Shop are added
   → a check opens and closes the browser
  ```

- **One module holds every part that uses the browser.** The browser, the live view, saved logins, the password manager add-on, private links for keys and saved details, and Shop come as one module. They use each other, so they come and update together. The part of *connect your tools* that drives the browser comes too.
  ```text
  the browser module
    browser     websites as you, logins, add-ons,
                where the window shows, the proxy
    hand-over   live view, key links, saved details
    shop        Shop's catalog and checkout
  ```

- **Every command keeps its name and works the same.** In a WongStack project, nothing changes for you. Each chat finds the same commands at the same places.

- **It works alone, and does more where the project has more.** Each extra comes through one named slot that the project fills. An empty slot turns off only that extra, and the browser still works.
  | Extra | Alone | In WongStack |
  |---|---|---|
  | Private page look | A plain, clear page | The shared look, dark mode included |
  | Wake the chat when you finish | You say *done* in the chat | The chat wakes at once |
  | Private links in your inbox | Only in the chat | Also in the app's inbox |
  | Where a key goes | The project's ignored `.env` | `.env` or the app's keys file |
  | Send a tool's key to the team | Kept on this computer only | Sent sealed through the app |

- **Nothing to set up first, and no question at each chat start.** The module needs no part in the project. The browser and its tools install the first time a task needs them, after your yes, as today.

- **Review pages and inbox taps stay WongStack's.** The links whose send goes back into the chat, such as a plan's review page, and the background helper that keeps the live line to your app, move to their own WongStack folder. They work the same, and the module does not need them.

- **Updates keep your edits.** A full WongStack project gets the module with each update, as today. A project with only the browser pastes the update message. Your own edits stay, and when an edit and an update touch the same lines, it stops and names each file.
  ```text
  "Update WongStack's browser in this project.
   Follow the update steps at <link>"
  ```

## What the build needs

- **Nothing.**

Non-goals: no change to how the browser, the live view, a key link, or Shop behaves; reply links and the live-line helper do not join the module; `agent-browser`, the preview checker, stays with `/verify`; *connect your tools* itself (its steps and the Access page) stays WongStack's; no chat-start question.

## Capabilities

### New Capabilities

- `browser-module`: the browser, private links (live view, key links, saved details), Shop, and connect's browser helper as one module any repo adds alone by a pasted message: its three skill folders under one version, its slots and what each does when empty, its own helper copies, its setup check, and its update.

### Modified Capabilities

None. `browser-engine`, `browser-logins`, `password-manager-add-on`, `saved-details`, `private-links`, `secrets-convention`, `shopping`, `own-browser-connect`, `reply-links`, and `live-line` keep every requirement; only where the code and its guides live changes.

## Impact

- **Module (source):** `.agents/skills/browser/`, `.agents/skills/hand-over/`, and `.agents/skills/shop/` move to `.agents/plugins/browser/{browser,hand-over,shop}/`; the three skill paths become links. `connect/scripts/browser.mjs` and `mask-keys.mjs` move into `browser/scripts/`. The module gains `browser/module.json`, `README.md`, `references/setup.md`, `scripts/lib/profile.mjs`, and its own `lib/cli.mjs` and `lib/primary-root.mjs`.
- **Guides move in:** `wiki/development/browsing.md`, `live-view.md`, `login-codes.md`, `saved-details.md`, `password-manager.md`, `browser-window.md`, `browser-proxy.md`, `shopping.md`, and the key-link section of `secrets.md` move to the module's `references/`; wiki hubs link them.
- **WongStack's own parts:** `.agents/browser/profile.mjs` fills the slots. Reply links and the helper (`reply-link.mjs`, `helper.mjs`, `lib/{computer,helper-log,inbox,line,uploads,wake}.mjs`, `wiki/development/reply-links.md` stays) move to a new hidden `.agents/skills/reply-link/` skill. `.agents/settings.json`, `.agents/hooks.json`, and every caller are repointed.
- **Payload:** `payload-files.json` `mapped`, the payload manifest, `scripts/retired-names.json`, `.agents/memory/areas.json` (the `browser`, `live-line`, `inbox`, `own-browser-connect`, `shopping` areas, plus `browser-module`).
- **Checks:** `scripts/tests/module-install.test.mjs` installs the browser module alone; `cli-conventions.test.mjs` keeps the helper copies equal to memory's; the moved script tests follow their files.
- **Docs:** `wiki/maintaining/adding-a-module.md` (the browser as a second example of skill folders under one version), `wiki/stack/connect-your-tools.md`, `wiki/development/README.md`, `CHANGELOG.md` (minor).

## Decision log

- **2026-11-11** — Asked (settled before planning) how each module is shaped → chose the module guide with memory as the example: one pasted message, a real folder in the skills folder, no dependency list or install list, no file outside its folders, named slots that work empty, and updates that keep edits.
- **2026-11-11** — Asked (settled before planning) what the module holds → chose the browser, live view, saved logins, password manager, private links, Shop, and connect's browser part in one module, because they use each other.
- **2026-11-11** — Asked whether reply links and the background helper come into the browser module → chose to keep them out: they move to their own WongStack folder and work the same.
- **2026-11-11** — Assumed: the module is three plain skill folders (`browser`, `hand-over`, `shop`) under one `module.json` version, the shape the plan module adds to the guide, because the module has no hooks once the helper stays out, and plain folders keep every caller's path.
- **2026-11-11** — Assumed: no chat-start question, because the module needs no part in the project; the browser and its tools already install at first use after a yes.
- **2026-11-11** — Assumed: the guides the skills follow (browsing, live view, login codes, saved details, password manager, browser window, proxy, shopping, and the key link) move into the module's `references/`, because a module uses no file outside its folders and its skills say almost nothing without them; the wiki hubs link the moved pages, so each topic keeps one page.
- **2026-11-11** — Assumed: five slots in `.agents/browser/profile.mjs` (`look`, `wakeChat`, `inbox`, `keyFiles`, `sendKey`), read by one module loader, because these are the only places the module code reaches WongStack's app, plan look, schedules, and save code.
- **2026-11-11** — Assumed: the module keeps its own copies of `cli.mjs` (`isMain`, `parseCli`, `usageError`) and `primary-root.mjs`, with a test that keeps them equal to memory's, as the plan module does; `proxy-lines.mjs` uses Node's own `parseEnv`, not memory's.
- **2026-11-11** — Assumed: reply links keep using the module's tunnel code by path, because WongStack may reach into a module; only the reverse is barred, so no third copy is needed.
- **2026-11-11** — Assumed: connect's `SKILL.md` calls the moved browser helper by its new path, because the Services module's own plan turns that into a slot.
- **2026-11-11** — Assumed: `agent-browser` stays out, because it is `/verify`'s preview checker, not an errand browser.
- **2026-11-11** — Asked whether to build now or after *1Password comes with the agent's browser* ships, since both edit the same browser files → chose to build now; whichever publishes second catches up on the move.
- **2026-11-11** — Assumed (build): the link's state no longer keeps the chat's id; WongStack's `wakeChat` reads it when the link ends, from the watcher, which runs in the opening chat's environment. A state written by older code still works, because the state's own fields come last.
- **2026-11-11** — Assumed (build): a `keyFiles` entry is `{ file, names(name) → hint or null, app, copy }`; with no slot, every key goes to the top `.env`, and the link refuses when it is not git-ignored. The undeclared-key message no longer names `TOOL_<ID>`, because only WongStack's profile has tool keys.
- **2026-11-11** — Assumed (build): `sendKey(name, value)` answers `null` (sent), `{ said }` (kept another way), or `{ code, why }` (refused), and the module masks the value in any text; a put-tool failure keeps its own error from the profile. With no slot, `take-key` keeps the key in the primary checkout's ignored `.env` only.
- **2026-11-11** — Assumed (build): with no `look` slot, private pages use a plain light look (`plain-look.css`) and no theme switch.
- **2026-11-11** — Assumed (build): the module's `README.md` and `module.json` sit in `browser/`, so the three mapped folders carry them to installs; WongStack's setup now runs the `AGENTS.md` block and its seeded pages through the same link rewrite as every shipped page, so their links into the module land on the installed folders.
- **2026-11-11** — Assumed (build): the journeys' source paths and the `.env.example` proxy notes name the new paths; a stray tracked `__pycache__` file was removed and `__pycache__/` added to `.gitignore`.
- **2026-11-11** — Assumed (ship): task 4.5 checks `helper.mjs status` runs from `reply-link/` and leaves the repoint of a running helper to its test, because this computer's one helper serves another project (ClaymooApp), and pointing it at this branch would move that project's helper.
- **2026-11-11** — Assumed (ship): task 4.4 counts the three skills as loaded when they stay hidden from the model's skill list, as they are in WongStack today (`hidden: true`, `disable-model-invocation: true`).
- **2026-11-11** — Assumed (ship): the module keeps memory's `.env` reader as its own copy instead of Node's `parseEnv`, because Node's cuts a value at any `#`, so a proxy password holding `#` would break, and this change keeps every behavior.
- **2026-11-12** — Archive checkpoint: brought in main's v53.2.0 (another chat's click waits behind your turn), carried its browser edits into the module's own files, and numbered this release 53.3.0.
