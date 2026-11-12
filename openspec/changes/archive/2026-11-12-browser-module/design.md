# Design

## Context

[`wiki/maintaining/adding-a-module.md`](../../../wiki/maintaining/adding-a-module.md) (memory, v52.0.0 and v53.0.0) sets the module rules. The plan module (change `plan-module`, workspace `focused-baboon`) adds one rule: a module with no hooks may be several plain skill folders under one `module.json` version. This change uses that rule. If `plan-module` has not shipped when this build starts, this build adds the rule and the `module.json` reading in `check-module-versions.mjs`, and `plan-module` rebases on it.

Today the four folders reach out in these places (checked on `main` at 3d6403f2):

| File | Reaches | For |
|---|---|---|
| `browser/scripts/browse.mjs`, `browser-server.mjs` | `memory/…/cli.mjs` | CLI parsing |
| `browser/scripts/proxy-lines.mjs` | `memory/…/primary-root.mjs`, `memory/…/store.mjs` (`parseEnv`) | the proxy key in the primary `.env` |
| `browser/scripts/addons.mjs` | `hand-over/hand-over.mjs` (`viewHolder`) | inside the module |
| `hand-over/scripts/hand-over.mjs` | `memory/…/cli.mjs`, `primary-root.mjs`, `plan/scripts/look.mjs`, `plan/references/theme.js`, `lib/inbox.mjs`, `lib/wake.mjs` | look, inbox listing, chat waking |
| `hand-over/scripts/keys.mjs` | `ship/scripts/worktree-secrets.mjs` (`ENTRY`, `isIgnored`, `loadBase`) | which files a key may go to; `APP_FILE = app/.dev.vars` |
| `hand-over/scripts/details.mjs`, `helper.mjs`, `reply-link.mjs` | `memory/…/cli.mjs` | CLI parsing |
| `hand-over/scripts/lib/inbox.mjs` | `scripts/company-api.mjs`, `primary-root.mjs` | the app's inbox |
| `hand-over/scripts/lib/wake.mjs` | `schedule/…/paseo.mjs` | `paseo send` |
| `hand-over/scripts/reply-link.mjs` | `plan/look.mjs`, `schedule/…/app-runs.mjs`, `lib/{computer,helper-log,inbox,line,uploads,wake,tunnel}.mjs` | reply links, the helper's inbox loop |
| `shop/scripts/shop.mjs` | `memory/…/cli.mjs` | CLI parsing |
| `connect/scripts/browser.mjs` | `browser/browse.mjs`, `hand-over/{hand-over,view}.mjs`, `memory/…/{cli,primary-root}.mjs`, `company-api.mjs key send` | connect's browser; a tool's key sealed through the app |
| each `SKILL.md` | `wiki/development/*.md` | the how-to the skill follows |

Core reaches in by path: `browse.mjs` (46 files), `hand-over.mjs` (38), `reply-link.mjs` (20), `shop.mjs` (12), `helper.mjs` (10), `details.mjs` (8). `hand-over/scripts/helper.mjs start` is the only hook, in `.agents/settings.json` and `.agents/hooks.json`; it belongs to the live line, not the browser.

## Goals / Non-Goals

**Goals:** the browser, private links (live view, key link, saved details), Shop, and connect's browser helper install alone into an empty repo, keep their paths and behavior in WongStack, and follow the module guide.

**Non-Goals:** reply links, the live-line helper, or the inbox in the module; `agent-browser`; the connect skill's steps or the Access page; any behavior change; a chat-start question.

## Decisions

### 1. Layout

```text
.agents/plugins/browser/            the module (source only)
  browser/                          → installs at .agents/skills/browser/
    SKILL.md  README.md  module.json
    references/  setup.md, browsing.md, login-codes.md, password-manager.md,
                 browser-window.md, browser-proxy.md
    scripts/     browse.mjs, browser-server.mjs, addons.mjs, forwarder.mjs,
                 launch-config.py, login-move.mjs, proxy-lines.mjs, refs.mjs,
                 connect-browser.mjs, mask-keys.mjs,
                 lib/{cli,primary-root,profile}.mjs
  hand-over/                        → .agents/skills/hand-over/
    SKILL.md
    references/  live-view.md, key-link.md, saved-details.md
    scripts/     hand-over.mjs, view.mjs, view-page.*, keys.mjs, keys-page.*,
                 details.mjs, private-page.css, lib/{tunnel,timings,ws-bridge}.mjs
  shop/                             → .agents/skills/shop/
    SKILL.md  references/shopping.md  scripts/shop.mjs
.agents/skills/{browser,hand-over,shop} → ../plugins/browser/<folder>  (links, source only)
.agents/skills/reply-link/          WongStack's own (hidden skill, not the module)
  SKILL.md  scripts/ reply-link.mjs, helper.mjs,
            lib/{computer,helper-log,inbox,line,uploads,wake}.mjs
.agents/browser/profile.mjs         WongStack's slot file (ships; outside the module)
```

- **`module.json`** `{ "name": "browser", "version": "1.0.0", "folders": ["browser", "hand-over", "shop"] }`, the same shape as the plan module's.
- **`payload-files.json` `mapped`** gains one entry per folder, `.claude/plugins/browser/<folder> → .claude/skills/<folder>`; `reply-link` is a plain skill folder.
- **Old paths retire.** `hand-over/scripts/reply-link.mjs`, `helper.mjs`, and the six `lib/` files, plus `connect/scripts/browser.mjs` and `mask-keys.mjs`, go in `scripts/retired-names.json`, and every caller moves.
- **The helper moves itself.** `helper.mjs start` already calls `pointCurrent` with the running script's primary path, so the first chat start after the update repoints `~/.wong-stack/helper/current.json` to `reply-link/scripts/reply-link.mjs`. A test covers a `current.json` that names the old path.
- **Scripts find the checkout top by walking up to `.git`**, never by folder depth: Node resolves the source link to a path one level deeper.

### 2. Slots

`browser/scripts/lib/profile.mjs` exports `slot(name)`: it imports `<top>/.agents/browser/profile.mjs` once, if it exists, and returns the named part or `null`. Module code calls it; skill text needs no slot runner.

| Slot | Used by | Empty |
|---|---|---|
| `look()` → `{ css, themeJs }` | `hand-over.mjs` `/page.css`, `/theme.js` | `private-page.css` alone, light only; `/theme.js` answers an empty script |
| `wakeChat(state, message)` → `'sent'\|'unavailable'` | `hand-over.mjs` on a hand-back, a key saved, a take-over | `'unavailable'`: the chat waits with `hand-over.mjs wait`, or the person says *done* |
| `inbox` → `{ companyFor, listLink, closeItem, inTime }` | `hand-over.mjs` link listing | the link is only in the chat |
| `keyFiles(root)` → `[{ file, names? }]` | `keys.mjs` | the top `.env`, only when git-ignored |
| `sendKey(name, value)` → `null \| { code, why }` | `connect-browser.mjs take-key` | the key is saved in the top `.env` and the result says it stayed on this computer |

WongStack's `.agents/browser/profile.mjs` fills each from today's code: `plan/scripts/look.mjs` and `plan/references/theme.js`; `reply-link/scripts/lib/wake.mjs`; `reply-link/scripts/lib/inbox.mjs`; `ship/scripts/worktree-secrets.mjs` with `app/.dev.vars`; `company-api.mjs key send` with its `CLOUDFLARE_API_TOKEN` fallback. The `APP_FILE` constant and the tool-key hint move into the profile.

### 3. Own helpers

- `browser/scripts/lib/cli.mjs` copies `isMain`, `parseCli`, `usageError`; `lib/primary-root.mjs` copies `primaryRoot`; `lib/env.mjs` copies memory's `.env` reader, `parseEnv`. Every module script imports these, across folders by `../../browser/scripts/lib/…` (inside the module).
- `cli-conventions.test.mjs` fails when any copy differs from memory's, as it does for the plan module's.
- `proxy-lines.mjs` reads the proxy key through `lib/env.mjs`, not `node:util`'s `parseEnv`: Node's cuts a value at any `#`, so a proxy password holding `#` would break. `connect-browser.mjs` no longer reads `.env`; it only writes a key line.
- `reply-link.mjs` (core) imports `../../hand-over/scripts/lib/tunnel.mjs` from the module: WongStack may reach a module, so the tunnel keeps one copy.

### 4. Guides move into the module

The skills' how-to pages move by `git mv` into the module's `references/`, keeping each heading, so anchors stay valid at the new path. `memory.mjs pull <page>` lists every inbound link; each is repointed to the real `.agents/plugins/browser/…` path by [repo layout](../../../wiki/maintaining/repo-layout.md#linking). `wiki/development/README.md` keeps one line per moved page, linking it. `secrets.md` keeps the rest of its topic and links `hand-over/references/key-link.md` for *receive a key through a private link*; its anchor `#receive-a-key-through-a-private-link` is kept as a short section with the link, because installed repos link it. Inside the moved pages, a link to a WongStack page outside the module becomes its GitHub address, as memory's README does.

### 5. Setup and update

`browser/references/setup.md`, following memory's:

1. Stop in a WongStack install (`.claude/.wong-stack.json`).
2. Copy the three folders from GitHub as real folders to `.claude/skills/`.
3. Check `.env` is git-ignored; add it to `.gitignore` when missing, saying so.
4. Profile: write none by default. The guide names each slot, what it does when empty, and WongStack's profile by GitHub link.
5. Check: `browse.mjs status`, `details.mjs list` with a temporary `HOME`, and `hand-over.mjs --help` each exit 0. Then, after the person's yes (it downloads the browser), `browse.mjs install` and `open https://example.com`, `snapshot`, `close`.
6. Commit, and ask before any push.

`## Update` three-way merges the three folders from the version in `module.json`, like memory's, and stops on a clash, naming each file.

### 6. Checks

- `module-install.test.mjs`: copies the three folders into an empty repo's `.agents/skills/`, runs setup step 5's first three commands with no profile, and fails on an import from outside them. A second case writes a profile that fills every slot with stubs and checks each slot is called.
- `check-module-versions.mjs`: reads `browser/module.json`, as for the plan module.
- `measure-context.mjs --check`: the moved guides are counted where they were; the three `SKILL.md`s change only their links.

## Risks / Trade-offs

- [This change and *1Password comes with the agent's browser* edit the same files] → this builds first (Matthew, 2026-11-11); files move with `git mv`, so that change's merge follows the renames.
- [The plan module's WongStack profile points `reviewLink` at `hand-over/scripts/reply-link.mjs`] → whichever ships second repoints it to `reply-link/scripts/reply-link.mjs`; `check-retired-names.mjs` names the miss.
- [80+ inbound links move] → `check-payload-links.mjs`, `memory.mjs pull`, and `check-retired-names.mjs` find each one.
- [A running helper still names the old script] → `start` repoints it at the next chat start (decision 1); until then, a stale launcher exits and the service restarts it once `current.json` is fixed.
- [Two copies of small helpers] → a test keeps them equal.
- [The Services module will need connect's browser through a slot] → out of scope; until then `connect/SKILL.md` names the module path.
