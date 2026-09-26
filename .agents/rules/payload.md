---
paths:
  - ".claude/**"
  - ".agents/**"
  - "app/**"
  - "scripts/**"
  - ".github/**"
  - "VERSION"
  - "CHANGELOG.md"
  - "wiki/wiki-style.md"
  - "wiki/voice.md"
  - "wiki/contributing.md"
  - "wiki/agent-knowledge-center.md"
  - "wiki/development/**"
---

# Editing the payload is a release

This rule is meta-repo only — it never ships to a target. You are touching a file WongStack distributes (or the machinery around one). The conventions:

- **Every payload edit is a release.** Add a newest-first [`CHANGELOG.md`](../../CHANGELOG.md) entry and bump [`VERSION`](../../VERSION) (semver) in the same change, so the updater can detect and explain it. A payload `wiki/` page takes this route, with a branch and a PR, never [the prose route to `main`](../../wiki/development/the-change-loop.md#the-prose-allowlist).
- **Run `node scripts/check-payload-links.mjs`** alongside the bump. It resolves every internal link against the file set a *target* receives. This repo cannot see the problem by inspection — every link resolves here — so the script is the only detector. A link that resolves nowhere in a target fails, and so does a live Markdown link that passes through a symlink, which GitHub cannot follow ([repo layout](../../wiki/development/repo-layout.md#linking)).
- **Run `node scripts/check-openspec-config.mjs`** too. It asks the OpenSpec CLI whether it can read [`openspec/config.yaml`](../../openspec/config.yaml). An unparseable config makes the CLI drop **every per-artifact rule** and carry on with a warning nobody reads, so changes get drafted against no rules at all — one unquoted `: ` inside a plain scalar did exactly that for a whole release. Same reason as the link checker: the failure is invisible by inspection, so a script has to be the detector.
- **A template or fragment is code, not prose.** Renaming a variable a script reads (`.env.example`, a config fragment, a workflow's `env:`) is behavioural: version bump and changelog entry, never a `docs(...)` commit. The failure is silent — a token under an unread name looks like an unprovisioned repo. One file [owns each name](../../wiki/stack/cloudflare-credentials.md#store-it); every other surface links to it.
- **An ask is a choice, and a reply ends with the next step.** A skill that asks the user links [the ask convention](../skills/explore/references/asking-the-user.md) and states only what is specific to its own question; it never keeps a second copy of the choice format or the tool order.
- **Skills reference files by repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path, because they run from a target's `.claude/skills/`.
- **Git-fronting skills keep their CLI and delivery steps.** `/save`·`/continue`·`/ship` own every git action. Preserve the spec-reconciliation, resume, validation, and archive behavior when editing them. The [CLI contract](../skills/plan/references/openspec-cli.md) owns shared mechanics. The vendored `agent-browser` skill remains upstream content; refresh it from upstream rather than hand-editing it, then keep its one local edit: `disable-model-invocation: true` in the frontmatter, so only `/verify` calls it.
- **Meta-only rules (like this one) stay out of `payload-files.json`**; payload rules are listed there and in the [payload manifest](../skills/wong-sync/references/payload-manifest.md).

The rest of the working-on-WongStack process: [wiki/development/](../../wiki/development/README.md).
