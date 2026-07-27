# The payload manifest

The single source of truth for **which files sync** between WongStack and a target repo — in both directions. `/wong-sync` reads this list for its diff — and a fresh install is the same diff against an empty base, so this list drives installs too. Nothing outside this list is ever read or copied, so app and business-specific files cannot leak upstream, and upstream cannot clobber them.

## In the manifest

- **Workflow skills** — `.claude/skills/<name>/` (the whole directory, including any `references/` and `scripts/`) for:
  `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, **`wong-sync`** (this skill syncs itself — upstream improvements to the sync arrive through the sync).
  A skill installed under a different local name is diffed under that name: the target's `.claude/.wong-stack.json` `components.skills` array records what was actually installed, and that mapping wins over the default names.
- **Docs convention pages** — at the target's wiki root (`wiki/`, falling back to `docs/`):
  `wiki-style.md`, `voice.md`, `development/secrets.md`, and `ux-principles.md` (**UI-bearing repos only** — synced where installed, offered when the repo has a frontend/screens, never pushed into a CLI/library/backend repo).
  Only these pages — the rest of the wiki is the target repo's own.
- **CLAUDE.md — the `WONG-STACK` block only** — the content between `WONG-STACK:BEGIN` and `WONG-STACK:END`. Everything outside the markers ("What this is" and any repo-specific sections) belongs to the target and is never compared or copied.

## The opt-in stack pack

The **Cloudflare stack pack** is a manifest category gated on a flag: its files are in the manifest **only** for a repo whose `.claude/.wong-stack.json` has `components.stackPack: true`. For any other repo they are treated as *outside* the manifest — never read, classified, pulled, or offered in either direction, so a repo that declined the pack stays byte-for-byte stack-agnostic. For a repo that opted in, these files classify and refresh exactly like any other payload file (the same three-way diff).

The pack's **drop-in files** (whole files the target owns after install):

- `scripts/cf-build.sh`, `scripts/swap-d1-id.js`, `scripts/reset-staging-d1.mjs` — the three zero-config D1 pipeline scripts.
- `schema/seed.sql` and `schema/migrations/.gitkeep` — the seed template and the migrations directory.
- The whole `wiki/stack/` section (hub + `core-stack.md`, `d1-pipeline.md`, `cloudflare-access.md`, `cloudflare-credentials.md`) — the pipeline and Cloudflare-setup docs.

The pack's **config fragments** are **not** manifest files. `package.json` scripts, the `wrangler.jsonc` `d1_databases` block, `.env.example` variables, and the `.gitignore` `.dev.vars` entry must *merge* into files the target already owns, so they can't be whole-file three-way-diffed. They are applied as guided edits following the `CLAUDE.md`-block precedent (show → apply with confirmation → never blind-write), from [`stack-pack-fragments.md`](stack-pack-fragments.md). On the rare upstream change to a fragment, `/wong-sync` re-offers it as a guided edit rather than auto-merging.

## Not in the manifest

- **`wong-setup`** — source-only tooling; never copied into a target (offered as a symlink instead). It copies no payload file except the `wong-sync` skill (the bootstrap that makes the first sync possible); everything else installs through the fresh-mode pull.
- **The generated `openspec-*` skills and `.claude/commands/opsx/`** — regenerated in each repo by `openspec init`, not copied, so they always match the installed CLI.
- **`VERSION` and `CHANGELOG.md`** — WongStack's release record; never copied into a target. `/wong-sync` edits them only in the clone, as part of a contribution's release ritual.
- **Everything else** — app skills, app source, business docs, `.claude/settings.json`, the target's `openspec/` content.
