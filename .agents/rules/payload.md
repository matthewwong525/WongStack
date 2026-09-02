---
paths:
  - ".claude/**"
  - ".agents/**"
  - "app/**"
  - "scripts/**"
  - ".github/**"
  - "VERSION"
  - "CHANGELOG.md"
  - "notes/README.md"
  - "wiki/wiki-style.md"
  - "wiki/voice.md"
  - "wiki/contributing.md"
  - "wiki/agent-knowledge-center.md"
  - "wiki/development/**"
---

# Editing the payload is a release

This rule is meta-repo only — it never ships to a target. You are touching a file WongStack distributes (or the machinery around one). The conventions:

- **Every payload edit is a release.** Add a newest-first [`CHANGELOG.md`](../../CHANGELOG.md) entry and bump [`VERSION`](../../VERSION) (semver) in the same change, so the updater can detect and explain it.
- **Run `node scripts/check-payload-links.mjs`** alongside the bump. It resolves every internal link against the file set a *target* receives, per install shape. This repo cannot see the problem by inspection — every link resolves here — so the script is the only detector. *Dead* (resolves in no shape) fails; *conditional* (resolves only with an opt-in category) is reported.
- **A template or fragment is code, not prose.** Renaming a variable a script reads (`.env.example`, a config fragment, a workflow's `env:`) is behavioural: version bump and changelog entry, never a `docs(...)` commit. The failure is silent — a token under an unread name looks like an unprovisioned repo. One file [owns each name](../../wiki/stack/cloudflare-credentials.md#store-it); every other surface links to it.
- **Skills reference files by repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path, because they run from a target's `.claude/skills/`.
- **A git-fronting skill keeps its OpenSpec step intact.** `/save`·`/continue`·`/ship` own every git action and each fronts an OpenSpec step (`/opsx:sync`, apply handoff, `/opsx:archive`); when you edit one, preserve that step. The generated `openspec-*` skills and the vendored `agent-browser` skill stay pristine — regenerate, don't hand-edit.
- **Meta-only rules (like this one) stay out of `payload-files.json`**; payload rules are listed there and in the [payload manifest](../skills/wong-sync/references/payload-manifest.md).

The rest of the working-on-WongStack process: [wiki/development/](../../wiki/development/README.md).
