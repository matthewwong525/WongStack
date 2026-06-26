---
name: init
description: Scaffold a repo to follow this framework — create a thin CLAUDE.md (what-it-is / where-context-lives / rules), a docs/ progressive-disclosure wiki seed (docs/README.md hub + docs/wiki-style.md rulebook), and a daily/ notes folder. Use when setting up a new or personal app to use the framework, or to retrofit an existing repo. Idempotent — never clobbers files that already exist without asking.
user-invocable: true
---

# /init

Set a repo up to follow the framework. This makes `/save`, `/ship`, `/continue`, and `/document` feel at home: a thin `CLAUDE.md` that points at the docs, a `docs/` wiki seed that follows progressive disclosure, and a `daily/` folder for the dated notes `/ship` writes.

**Idempotent and non-destructive.** Before writing any file, check whether it exists. If it does, **don't overwrite it** — show what you'd add and ask, or merge in only what's missing. Only create what's absent.

## Step 1 — understand the repo

Look around so the scaffolding is real, not boilerplate:
```bash
gh repo view --json nameWithOwner,description 2>/dev/null
ls -A; cat README* 2>/dev/null | head -40
git log --oneline -10 2>/dev/null
```
Note what the app is, its stack (if any — a personal repo may have none), and how it deploys / previews (so `CLAUDE.md` can say so). Don't guess; if you can't tell, keep those lines short and generic.

## Step 2 — write `CLAUDE.md` (if absent)

Start from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/CLAUDE.md.template` and fill the placeholders from Step 1. Keep it **thin** — three sections (what this is / where context lives / rules), pointing **outward to `docs/`** rather than duplicating it. The template already encodes the load-bearing conventions: docs are the source of truth (read the owning doc before non-trivial work), GitHub Actions is the build gate (no local build gate), and the workflow runs through the framework skills.

If `CLAUDE.md` exists, read it and offer to add only the missing conventions (the docs-as-SSOT pointer, the build-gate line, the skills line) rather than rewriting it.

## Step 3 — seed the `docs/` wiki (if absent)

1. Create `docs/README.md` from `${CLAUDE_PLUGIN_ROOT}/skills/init/templates/docs-README.md.template` — the wiki root: a one-line "how this wiki works" note plus a "Where to find things" list. Seed it with a couple of plausible top-level sections for this repo (e.g. `Development`, `Operations`) as stubs the user can grow; don't invent detailed content.
2. Copy the rulebook in as the repo's own `docs/wiki-style.md`:
   ```bash
   mkdir -p docs
   cp "${CLAUDE_PLUGIN_ROOT}/skills/document/references/progressive-disclosure.md" docs/wiki-style.md
   ```
   `/ship` and `/document` will prefer this repo-local copy, so the repo owns its conventions and can tweak them. Link it from `docs/README.md`'s "how this wiki works" line.

If `docs/` already has content, **don't reorganize it** — just add `docs/wiki-style.md` if missing and make sure `docs/README.md` exists and links it.

## Step 4 — create the `daily/` folder (if absent)

`/ship` appends a dated note (`daily/YYYY-MM-DD.md`, one H1 per conversation) on every ship. Seed the folder so it's tracked and self-explaining:
```bash
mkdir -p daily
cp "${CLAUDE_PLUGIN_ROOT}/skills/init/templates/daily-README.md.template" daily/README.md
```

## Step 5 — report

Tell the user exactly which files were created vs. skipped (already existed), and the one-line next step: *"Start working, then `/save` to checkpoint and `/ship` to merge — `/ship` will write the docs and the daily note for you."* Don't commit anything unless asked — leave the new files in the working tree for the user to review.

## Hard rules
- Never overwrite an existing `CLAUDE.md`, `docs/README.md`, or any doc without explicit confirmation.
- Don't invent business content for `docs/` — seed structure (hubs + the rulebook), not fake procedures.
- Don't commit or push — `/init` only scaffolds; the user reviews, then `/save`/`/ship` as normal.
