# The payload manifest

The single source of truth for **which files sync** between WongStack and a target repo — in both directions. `/wong-sync` reads this list for its diff; `/install-wong-stack` copies this same set on a fresh install. Nothing outside this list is ever read or copied, so app and business-specific files cannot leak upstream, and upstream cannot clobber them.

## In the manifest

- **Workflow skills** — `.claude/skills/<name>/` (the whole directory, including any `references/` and `scripts/`) for:
  `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, **`wong-sync`** (this skill syncs itself — upstream improvements to the sync arrive through the sync).
  A skill installed under a different local name is diffed under that name: the target's `.claude/.wong-stack.json` `components.skills` array records what was actually installed, and that mapping wins over the default names.
- **Docs convention pages** — at the target's wiki root (`wiki/`, falling back to `docs/`):
  `wiki-style.md`, `voice.md`, `development/secrets.md`.
  Only these pages — the rest of the wiki is the target repo's own.
- **CLAUDE.md — the `WONG-STACK` block only** — the content between `WONG-STACK:BEGIN` and `WONG-STACK:END`. Everything outside the markers ("What this is" and any repo-specific sections) belongs to the target and is never compared or copied.

## Not in the manifest

- **`install-wong-stack`** — source-only tooling; never copied into a target (offered as a symlink instead).
- **The generated `openspec-*` skills and `.claude/commands/opsx/`** — regenerated in each repo by `openspec init`, not copied, so they always match the installed CLI.
- **`VERSION` and `CHANGELOG.md`** — WongStack's release record; never copied into a target. `/wong-sync` edits them only in the clone, as part of a contribution's release ritual.
- **Everything else** — app skills, app source, business docs, `.claude/settings.json`, the target's `openspec/` content.
