# Repo layout: the symlinks that will bite you

Three paths in this repo are symlinks. `grep`, the Edit tool, and GitHub's web view do not follow
them. Read this before you edit, link, or audit a payload file — each has silently produced
wrong work.

```
.claude    ─▶ .agents      the whole directory
.codex     ─▶ .agents      the whole directory
CLAUDE.md  ─▶ AGENTS.md    the doctrine file
```

Git tracks the real paths — `.agents/**` and `AGENTS.md` — plus the three links. Nothing is
duplicated: a payload file is **one file with several names**, not copies to keep in sync.

## Editing

**Edit the `.agents/` target, not the `.claude/` name.** The Edit tool refuses to write through a
symlink, so an edit aimed at `.claude/skills/save/SKILL.md` fails rather than silently writing the
wrong place — but the fix is to retarget, not to work around it. Same for `CLAUDE.md`: edit
`AGENTS.md`.

## Linking

**A Markdown link names the real path: `.agents/...`, not `.claude/...`.** GitHub's web view and its
raw host do not follow a directory link, so `blob/main/.claude/skills/save/SKILL.md` is a 404 while
`blob/main/.agents/skills/save/SKILL.md` opens. The same holds for an absolute `github.com` URL.
Link `AGENTS.md`, not `CLAUDE.md`, where you mean this repo's doctrine file.

**Commands and code spans keep `.claude/`.** Claude Code resolves `.claude/` in every install and the
hooks run through it, so `node .claude/skills/memory/scripts/memory.mjs` stays as written. Only a
clickable link has to survive GitHub.

A page that ships to a target may still link `CLAUDE.md`: a target has a real `CLAUDE.md` that holds
the WongStack block, and no `AGENTS.md`.

[`scripts/check-payload-links.mjs`](../../scripts/check-payload-links.mjs) enforces this. It reads each
symlink from the git tree and the working tree, fails on a live Markdown link that passes through
one, and prints the real path to use. It skips code spans and fenced code. The
[payload rule](../../.agents/rules/payload.md) says when to run it.

## Auditing

**`grep -r` does not follow symlinks.** A repo-wide grep reports hits under `.agents/` and none under
`.claude/`, so a sweep that searches for `.claude/skills/...` — or that counts how many files state a
rule — will under-count.

When you need every occurrence, search `.agents/` (and `AGENTS.md`), or pass `grep -r --dereference-recursive`
if you specifically want the `.claude/` names in the output.

## Why it's this way

`.agents/` and `AGENTS.md` are the tool-neutral names; `.claude/` and `CLAUDE.md` are what Claude Code
looks for, and `.codex/` is what Codex looks for. The symlinks let one payload serve every agent
without a copy step, which matters because [editing the payload is a release](README.md) — two copies
would mean two chances to ship half a change. A target keeps the same layout: a real `.agents/`
folder with `.claude` and `.codex` links to it ([the agent folder](../../.agents/skills/wong-sync/references/payload-manifest.md#the-agent-folder)).

Part of [working on WongStack](README.md).
