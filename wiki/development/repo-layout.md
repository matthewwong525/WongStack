# Repo layout: the symlinks that will bite you

Two paths in this repo are symlinks, and neither tool you'd reach for follows them. Read this before
editing a payload file or auditing the payload for a rule — both have silently produced no-op work.

```
.claude    ─▶ .agents      the whole directory
CLAUDE.md  ─▶ AGENTS.md    the doctrine file
```

Git tracks the real paths — `.agents/**` and `AGENTS.md` — plus the two links. Nothing is duplicated:
a payload file is **one file with two names**, not two copies to keep in sync.

## Editing

**Edit the `.agents/` target, not the `.claude/` name.** The Edit tool refuses to write through a
symlink, so an edit aimed at `.claude/skills/save/SKILL.md` fails rather than silently writing the
wrong place — but the fix is to retarget, not to work around it. Same for `CLAUDE.md`: edit
`AGENTS.md`.

Docs and skills throughout the payload cite `.claude/skills/...` paths on purpose — that's where the
files live in a *target* repo, and the link makes those paths resolve here too. Citing `.claude/` in
prose is correct; **editing** through it is not.

## Auditing

**`grep -r` does not follow symlinks.** A repo-wide grep reports hits under `.agents/` and none under
`.claude/`, so a sweep that searches for `.claude/skills/...` — or that counts how many files state a
rule — will under-count. This is not hypothetical: the `widen-save-prose-fast-path` change audited
five sites, missed a sixth, and found it only during implementation.

When you need every occurrence, search `.agents/` (and `AGENTS.md`), or pass `grep -r --dereference-recursive`
if you specifically want the `.claude/` names in the output.

## Why it's this way

`.agents/` and `AGENTS.md` are the tool-neutral names; `.claude/` and `CLAUDE.md` are what Claude Code
looks for. The symlink lets one payload serve both without a copy step, which matters because
[editing the payload is a release](README.md) — two copies would mean two chances to ship half a change.

Part of [working on WongStack](README.md).
