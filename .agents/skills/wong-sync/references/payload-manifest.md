# The payload manifest

The single source of truth for **which files `/wong-sync` may copy into a target repo**. Step 2 walks this list: a file on it that the target doesn't have is copied in verbatim; a file on it that the target does have is left alone and handed to [the adapt step](adapt.md). Nothing outside this list is ever copied, so upstream cannot drop files into parts of a repo it doesn't own.

**This list bounds copying, not reading.** The adapt step's surveyor reads the target's process surfaces broadly — that is the whole point of it, since a repo that already solves something usually solves it somewhere upstream never heard of. That's safe because there is no outbound path: `/wong-sync` has no contribute leg, opens no pull request, and writes nothing to the clone, so nothing the surveyor reads leaves the machine. Sending an improvement upstream is a manual PR ([`contributing.md`](../../../../wiki/contributing.md)).

## In the manifest

- **Workflow skills** — `.claude/skills/<name>/` (the whole directory, including any `references/` and `scripts/`) for:
  `explore`, `plan`, `apply`, `save`, `continue`, `ship`, `dream`, `improve`, **`wong-sync`** (this skill included — upstream improvements to the sync arrive through the sync, though once installed they arrive as a *proposal* like any other present file).
  A skill installed under a different local name counts as **present** under that name: the target's `.claude/.wong-stack.json` `components.skills` array records what was actually installed, and that mapping wins over the default names. It is adapted, not copied in again under the default name.
- **Docs convention pages** — at the target's wiki root (`wiki/`, falling back to `docs/`):
  `wiki-style.md`, `voice.md`, `contributing.md`, `development/secrets.md`, and `ux-principles.md` (**UI-bearing repos only** — copied where the repo has a frontend/screens, never pushed into a CLI/library/backend repo).
  `contributing.md` is how a target repo learns that upstream exists and how to send something back by hand — the sync itself never mentions contributing, so this page carries the discovery.
  Only these pages — the rest of the wiki is the target repo's own.
- **The session-capture surface** — `notes/README.md`. The file carries the directory (git tracks files, not folders), so copying it in *is* installing the surface. It documents the convention `/save` and `/dream` rely on — the slug key, the frontmatter watermark, the compression bar, and the boundary against the change's Decision log and `wiki/` — so a target repo inherits the convention rather than an empty folder. Never the notes themselves: `notes/*.md` are the target repo's own sessions and are outside the manifest entirely.
- **CLAUDE.md — the `WONG-STACK` block only** — the content between `WONG-STACK:BEGIN` and `WONG-STACK:END`. The block, not the file, is the unit: no markers (or no file) means insert the block; markers present means the block is adapted, never rewritten in place. Everything outside the markers belongs to the target and is never copied over.

## The opt-in stack pack

The **Cloudflare stack pack** is a manifest category gated on a flag: its files are in the manifest **only** for a repo whose `.claude/.wong-stack.json` has `components.stackPack: true`. For any other repo they are treated as *outside* the manifest — never copied, analysed, or offered, so a repo that declined the pack stays byte-for-byte stack-agnostic. For a repo that opted in, these files follow exactly the same rule as every other payload file: **copied if absent, adapted if present, never overwritten.**

The pack's **drop-in files** (whole files the target owns after install):

- `scripts/cf-build.sh`, `scripts/cf-deploy.sh`, `scripts/reset-staging-d1.mjs` — the three zero-config pipeline scripts (build, deploy, staging reset), plus the two helper libraries they share, `scripts/lib-wrangler-config.sh` and `scripts/lib-wrangler-config.mjs`.
  A repo that installed the pack before v8 also has `scripts/swap-d1-id.js`, which the pack no longer ships. The sync neither deletes it nor rewrites the scripts around it — retiring it is a step in the [adoption runbook](../../../../wiki/stack/d1-pipeline.md#adopting-the-staging-environment), surfaced through the adapt step like any other present-file gap.
- `schema/seed.sql` and `schema/migrations/.gitkeep` — the seed template and the migrations directory.
- The whole `wiki/stack/` section (hub + `core-stack.md`, `d1-pipeline.md`, `cloudflare-access.md`, `cloudflare-credentials.md`) — the pipeline and Cloudflare-setup docs.

The pack's **config fragments** are **not** manifest files. `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` `.dev.vars` entry must *merge* into files the target already owns, so they are never whole-file copies. They are applied as guided edits following the `CLAUDE.md`-block precedent (show → apply with confirmation → never blind-write), from [`stack-pack-fragments.md`](stack-pack-fragments.md). When upstream changes a fragment, it surfaces through the adapt step rather than being merged automatically.

## Not in the manifest

- **`wong-setup`** — source-only tooling; never copied into a target (offered as a symlink instead). It copies no payload file except the `wong-sync` skill (the bootstrap that makes the first sync possible); everything else arrives through Step 2's copy-if-absent walk.
- **The generated `openspec-*` skills and `.claude/commands/opsx/`** — regenerated in each repo by `openspec init`, not copied, so they always match the installed CLI.
- **`VERSION` and `CHANGELOG.md`** — WongStack's release record; never copied into a target. `/wong-sync` reads them in the clone (the changelog walk) and writes neither, anywhere.
- **The target's own notes** — `notes/*.md` other than `README.md`. A repo's captured sessions belong to it; only the convention page is payload.
- **Everything else** — app skills, app source, business docs, `.claude/settings.json`, the target's `openspec/` content. The surveyor may *read* a repo's process surfaces to understand it; nothing here is ever *copied*.
