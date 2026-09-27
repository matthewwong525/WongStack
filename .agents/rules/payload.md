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
  - "wiki/stack/**"
  - "wiki/ux-principles.md"
  - "mini-apps/router*"
  - "mini-apps/routes*"
  - "mini-apps/apps/hello/**"
  - "schema/**"
  - "AGENTS.md"
  - "CLAUDE.md"
---

# Editing the payload is a release

This rule is meta-repo only — it never ships to a target. You are touching a file WongStack distributes (or the machinery around one). The conventions:

- **Every payload edit is a release.** A payload `wiki/` page is no exception. This rule owns how a release is cut; every other page links here:
  1. **Write a `## Next (patch|minor|major) — <Title>` entry** at the top of [`CHANGELOG.md`](../../CHANGELOG.md)'s entries, in the same change, so the updater can detect and explain it. One entry per change.
  2. **Leave [`VERSION`](../../VERSION) alone.** Raise it by hand and two changes in flight pick the same number.
  3. **`/ship` numbers it.** Right before its checkpoint, [`number-release.mjs`](../skills/ship/scripts/number-release.mjs) bumps `main`'s `VERSION` by the entry's level and renames the heading `## X.Y.Z — <Title>`. `merge.sh` refuses a number another release took meanwhile, and names the shipped version in the merge title.
  4. **Fill the release labels when the Releases run warned.** Run `node scripts/tag-releases.mjs` from the checkout `merge.sh` reported as `synced`, with your own `gh` login, and name any Release it creates in the ship report. The Releases workflow's token can not label a version whose commit changes a workflow file; GitHub answers HTTP 403, and the workflow only warns.
- **Run `node scripts/check-payload-links.mjs`** alongside the changelog entry. It resolves every internal link against the file set a *target* receives. This repo cannot see the problem by inspection — every link resolves here — so the script is the only detector. A link that resolves nowhere in a target fails, and so does a live Markdown link that passes through a symlink, which GitHub cannot follow ([repo layout](../../wiki/development/repo-layout.md#linking)).
- **Run `node scripts/check-openspec-config.mjs`** too. It asks the OpenSpec CLI whether it can read [`openspec/config.yaml`](../../openspec/config.yaml). An unparseable config makes the CLI drop **every per-artifact rule** and carry on with a warning nobody reads, so changes get drafted against no rules at all — one unquoted `: ` inside a plain scalar did exactly that for a whole release. Same reason as the link checker: the failure is invisible by inspection, so a script has to be the detector.
- **Retire the old name when you remove or rename something.** Add it to [`scripts/retired-names.json`](../../scripts/retired-names.json) with its replacement, in the same change; `node scripts/check-retired-names.mjs` then fails wherever a live file still names it. OpenSpec validates a spec's shape, not whether its words are still true, so a missed mention otherwise lingers — earlier removals left `notes/`, the memory Worker, and removed OpenSpec commands named in live specs.
- **A template or fragment is code, not prose.** Renaming a variable a script reads (`.env.example`, a config fragment, a workflow's `env:`) is behavioural: a release with its changelog entry, never a `docs(...)` commit. The failure is silent — a token under an unread name looks like an unprovisioned repo. One file [owns each name](../../wiki/stack/cloudflare-credentials.md#store-it); every other surface links to it.
- **An ask is a choice, and a reply ends with the next step.** A skill that asks the user links [the ask convention](../skills/explore/references/asking-the-user.md) and states only what is specific to its own question; it never keeps a second copy of the choice format or the tool order.
- **Skills reference files by repo-relative path** (`$(git rev-parse --show-toplevel)/.claude/skills/...`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path, because they run from a target's `.claude/skills/`.
- **Git-fronting skills keep their CLI and delivery steps.** `/save`·`/continue`·`/ship` own every git action. Preserve the spec-reconciliation, resume, validation, and archive behavior when editing them. The [CLI contract](../skills/plan/references/openspec-cli.md) owns shared mechanics. The vendored `agent-browser` skill remains upstream content; refresh it from upstream rather than hand-editing it, then keep its one local edit: `disable-model-invocation: true` in the frontmatter, so only `/verify` calls it.
- **Meta-only rules (like this one) stay out of `payload-files.json`**; payload rules are listed there and in the [payload manifest](../skills/wong-sync/references/payload-manifest.md).

The rest of the working-on-WongStack process: [wiki/development/](../../wiki/development/README.md).
