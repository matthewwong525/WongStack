## 1. Doctrine — CLAUDE.md

- [x] 1.1 Rewrite the carve-out bullet under `## Rules` (~lines 71–75): the exception is the **prose allowlist** `notes/**` + `wiki/**`, decided by exact path scope, never by extension. Replace the "and those take the normal branch + PR route" clause about `/dream`'s wiki edits with the new justification per design.md D4 — the gate stops unreviewed *behavior*, and neither surface carries behavior.
- [x] 1.2 In the same bullet, state the payload trap explicitly: markdown under `.claude/**`, `openspec/**`, and `CLAUDE.md`/`README.md`/`CHANGELOG.md`/`VERSION` keeps the full gate, because editing the payload is a release.

## 2. Doctrine — notes/README.md and the wiki

- [x] 2.1 Rewrite `notes/README.md` `## Reaching \`main\`` (~lines 87–95) for the widened allowlist; drop "those go through the normal branch + PR gate like everything else" and give the replacement reason.
- [x] 2.2 Rewrite `wiki/development/the-change-loop.md` (~lines 23–29) the same way; drop "which takes the usual branch + PR route."
- [x] 2.3 Grep `wiki/contributing.md` and the rest of `wiki/` for other restatements of the `notes/*.md`-only scope and fix any found.

## 3. The /dream skill

- [x] 3.1 In `.claude/skills/dream/SKILL.md`, rewrite the **No git** bullet (~line 67): keep the rule (`/dream` runs no git; `/save` commits, `/ship` merges) but replace its reason per design.md D4 — the git skills own git — and delete the claim that a wiki edit is worth a PR and that the fast path "does not apply here."

## 4. The /save skill

- [x] 4.1 Rewrite **Step 1 — the fast path decision**: rename "notes-only fast path" → **prose fast path**; state the allowlist as the two prefixes `notes/**` + `wiki/**`; keep the "exact path scope" language; add that routing is by path prefix and never by extension, and that `wiki/` means the literal prefix (a repo whose prose lives in `docs/` keeps the gate) per design.md Risks.
- [x] 4.2 State in Step 1 that a mixed diff — prose plus one path outside the allowlist — takes the normal flow **for the whole save**, and must not be split into two commits to dodge the gate.
- [x] 4.3 Update the Step 2 routing table so a prose-only session (incl. a `/dream` run) maps to the prose fast path.
- [x] 4.4 Rewrite **Step 5's notes-only variant** → prose variant: `git add notes/ wiki/` (stage by path, only what changed), commit message convention for a wiki-bearing save, unchanged direct push to the default branch. Keep the protected-branch fallback (branch + PR, never force) and extend its wording to cover wiki.
- [x] 4.5 Rewrite **Step 7's notes-only report variant** → prose variant: name the changed prose paths, say they landed on the default branch, omit PR/CI/preview sections entirely, don't suggest `/ship`.
- [x] 4.6 Update the **Hard rules** block: the default-branch exception is the prose allowlist; the "never merge" and "never force" rules are untouched.
- [x] 4.7 Update the skill's frontmatter `description` — it currently says a conversation-only session "commits it straight to the default branch"; broaden to the prose allowlist so the skill is discoverable for wiki saves.

## 5. Release

- [x] 5.1 Bump `VERSION` `7.1.0` → `7.2.0` (minor, per design.md D6).
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry: `/save`'s fast path widens from `notes/*.md` to the `notes/**` + `wiki/**` prose allowlist; wiki edits no longer need a PR; routing is by path prefix, never extension.

## 6. Verify

- [x] 6.1 `grep -rn "notes/\*\.md" .` across the payload — zero remaining hits asserting the old scope (archived changes under `openspec/changes/archive/` are historical record; leave them).
- [x] 6.2 `grep -rn "branch + PR route\|branch + PR gate\|worth reviewing"` — zero remaining hits claiming wiki edits need a PR.
- [x] 6.3 Read the five doctrine sites back in order (`CLAUDE.md`, `notes/README.md`, `wiki/development/the-change-loop.md`, `.claude/skills/dream/SKILL.md`, `.claude/skills/save/SKILL.md`) and confirm they state one identical rule.
- [x] 6.4 `openspec validate widen-save-prose-fast-path --strict` passes.
