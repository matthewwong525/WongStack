# Catching up an older install

An install from before 19.0.0 updates in place: one sync plan also makes the moves it missed, and keeps every local file. The preflight's `catchUp.reasons` lists which moves apply, each as a code with the paths it saw. Plan a step below only when its code is listed; `catchUp.needed` with no reasons means the version is old but the layout is already current.

Each step keeps the person's own text. A move is `git mv` or a reviewed merge, never a delete and re-copy. Name every preserved local file in the plan's design.

1. **`agent-folder`, `codex-folder` — the shared agent folder.** The target keeps one real `.agents/` folder, with `.claude` and `.codex` as links to it, as [the agent folder](payload-manifest.md#the-agent-folder) says.
   - A real `.claude/` folder: `git mv .claude .agents`, then `ln -s .agents .claude`.
   - A reversed link (`.agents` links to a real `.claude/`): remove the `.agents` link, `git mv .claude .agents`, then `ln -s .agents .claude`.
   - No `.codex` at all: `ln -s .agents .codex`, so Codex reads the same hooks and settings.
   - A real `.codex/` folder: merge its `config.toml` and `hooks.json` into `.agents/config.toml` and `.agents/hooks.json`, keeping local entries; move any other file it holds into `.agents/`. Then replace `.codex/` with `ln -s .agents .codex`.
   - On Windows, make each link with `MSYS=winsymlinks:nativestrict ln -s`.
2. **`rules-file`, `rules-file-reversed` — the rules file both agents read.** A real `CLAUDE.md` follows [the agent folder](payload-manifest.md#the-agent-folder)'s cases. When `AGENTS.md` links to a real `CLAUDE.md`, remove the `AGENTS.md` link, `git mv CLAUDE.md AGENTS.md`, then `ln -s AGENTS.md CLAUDE.md`. Every line stays.
3. **`wiki-elsewhere` — wiki pages kept in another folder.** The record's `components.docsPath` names the folder. `git mv` each WongStack page from there to the same place under `wiki/`, update the repo's own links to it, and drop `docsPath` from the record in the install-record task. Pages the repo wrote itself stay where they are. Compare a moved page with upstream only after the move, so a page reported `missing` at its `wiki/` path is read at its old path first.
4. **`opted-out` — parts the person turned down.** An old record's `components.stackPack`, `appScaffold`, or `ui` set to `false` was the person's choice. Add none of that part's files. Name the part in What Changes as left out, with the reason, and drop the flag from the record only when the person asks for the part.
5. **`generated-openspec` — leftover OpenSpec skills.** List each `openspec-*` skill folder as a removal for review. The WongStack verbs (`/plan`, `/apply`, `/ship`) replace them. Keep a folder whose content the person wrote, and say why.
6. **`deploy-token` — the CI deploy token.** Before 18.0.0, the GitHub secret `CLOUDFLARE_API_TOKEN` held the person's own Cloudflare token. The version alone raises this code, so check first: when the account already has a `<repo>-deploy` token, the move was made, and the plan says so and skips it. Otherwise, mint the `<repo>-deploy` token and replace the secret by [the CI deploy token step](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4d-the-ci-deploy-token), run from the source checkout. Then ask the person to roll the old token's value in the Cloudflare dashboard and update `.env`, because CI could read it.
7. **`no-baseline` — no file list at the installed commit.** Every current payload unit is `added`, and each one the repo already has is `locally-adapted`. Treat each as possibly edited: read it against upstream and merge, never overwrite. `merge-check.mjs` has no baseline here and reports `skipped`; the plan's review is the check.
8. **`mini-apps-folder` — mini apps in the old separate folder.** Mini apps once lived in `mini-apps/apps/<name>/`, as plain pages beside the main app; now each is part of it, as [mini apps](../../../../wiki/stack/mini-apps.md) says. The code lists each app's folder. Name every app in the plan, and move each in the shape of the example, Hello:
   - Its page becomes `app/src/apps/<name>/App.tsx`, exporting `App`, with its `app.json` beside it and its `style.css` as the page's own CSS. Drop its copy of the site header: the main app's frame draws it.
   - Its `api.mjs` routes become `app/worker/apps/<name>/api.ts`, exporting `routes`, with each handler in its own file. Keep every address and every table it reads, so its data stays.
   - Its `.mjs` logic becomes `.ts`, and its `node --test` tests become Vitest tests beside the code, covering every line.
   - A `hello` equal to the old shipped one is replaced by the new Hello; an edited one moves like any other app.

   Show each app in the update's preview. Then, in the same change, remove `mini-apps/`, `scripts/mini-dashboard.mjs`, and any reader of `/apps/apps.json` the repo added.

The install-record task comes last, after every step above, and advances the record once.

## Privacy migration

A prior public default needs explicit review; do not silently preserve anonymous business pages or erase intentional public services. Read the existing entry point, assets, APIs, webhooks, protocols, routes, custom domains, and Access apps. Keep local business code and databases; merge signed enforcement and Worker-first routing into the handlers rather than copying the scaffold over them. Review WebSocket compatibility and higher-precedence hostname/path/preview apps before publishing.

Backfill a reachable owner login email separately from git authorship and include real existing team emails. Synthetic extra-workspace rows grant nothing. Attach one owned app to both actual Worker IDs before the first gated push; adopt an owned legacy gate only after reviewing its policies and retaining human/machine access without a wall gap. Only production memory gets its key-authenticated override. Widen the CI deploy token with Access read permission, preserving its existing necessary scopes and excluding policy writes.

Keep old/live versions behind the wall. Report coverage, real email login, and machine checks independently; an old install is not private merely because new config was written. Show membership updates and revocation as pending until provider readback succeeds; replace then retire only recorded account tokens.
