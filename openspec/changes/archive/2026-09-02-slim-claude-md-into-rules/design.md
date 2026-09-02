# Design — slim-claude-md-into-rules

## Context

See proposal.md — Why. Measured baseline (2026-09-02): `CLAUDE.md` 11.9KB (lines 17–109 are the WONG-STACK block); rule `@`-imports hoisted at launch add 14.1KB (`wiki-style.md` 7.5KB + `voice.md` 1.6KB + `notes/README.md` 4.9KB); skill frontmatter descriptions total ~13.7KB, with `save` at 1918 chars and `verify` at 1707. The hoisting is documented Claude Code behavior, not a bug: "imported files are expanded and loaded into context at launch," and "splitting into `@path` imports helps organization but doesn't reduce context."

Research grounding (read during planning):

- [How Claude remembers your project](https://code.claude.com/docs/en/memory) — target <200 lines per CLAUDE.md; path-scoped rules trigger when Claude *reads* matching files; rules without `paths` load at launch; one topic per rule file; HTML comments in CLAUDE.md are stripped before injection; imports load at launch.
- [Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) — CLAUDE.md for what's true every session; rules for file-specific constraints; skills for procedures (name + description load, body on invoke); output styles replace the whole system prompt and are for role changes.
- Output styles are deprecated (v2.0.30) and `/output-style` was removed (v2.1.91); the replacement is plugins ([official plugin](https://github.com/anthropics/claude-code/tree/main/plugins/explanatory-output-style)). Community guides ([rules directory](https://claudefa.st/blog/guide/mechanics/rules-directory), [rule design](https://note.com/hayatetakeda/n/n2b0a91af5174?hl=en)) converge on: one concern per rule, scope everything that isn't needed every session, keep unconditional rules minimal.

## Goals / Non-Goals

**Goals:** cut the always-loaded context roughly in half without orphaning any fact; make the rule layer cover every surface an agent edits (code, wiki, notes, openspec, env, payload); keep the block useful as a standalone orientation for non-Claude agents.

**Non-Goals:** changing rule *semantics* (the `@`-import eager load is accepted — user decision); touching generated or vendored skills; restructuring wiki pages; adding hooks or plugins.

## Decisions

1. **Keep `@`-imports in `wiki.md` and `notes.md`; link, don't import, in the new rules.** The user chose to hard-load the core conventions (style, voice, notes) — they are near-universal and small enough. New rules cover occasional surfaces: `secrets.md` links `wiki/development/secrets.md` (4.4KB — not worth 100% sessions for <5% relevance), `openspec.md` owns its one routing fact inline, `payload.md` states the ritual inline (it has no single owning page; CLAUDE.md was the owner). Alternative rejected: importing everywhere — it would grow the launch load this change exists to cut.

2. **No output style.** The feature is deprecated and removed; its replacement (plugins injecting at SessionStart) is unconditional context — the opposite of this change's direction. Voice stays owned by `voice.md` (loaded via the wiki rule) and ASD-STE100 stays as a one-line block rule.

3. **`payload.md` is meta-only.** Its content ("editing the payload is a release") is meaningless in a target repo, and its `paths` would misfire there (`.claude/skills/**` exists in every target). Kept out of `payload-files.json`; the manifest prose notes the distinction. Paths: `.claude/**`, `app/**`, `scripts/**`, `.github/**`, `VERSION`, `CHANGELOG.md`, `wiki/wiki-style.md`, `wiki/voice.md`, `wiki/contributing.md`, `wiki/agent-knowledge-center.md`, `wiki/development/**`, `notes/README.md` — the payload surfaces, coarse on purpose; over-firing costs one small rule, under-firing costs a silent unreleased payload edit.

4. **Target shape of CLAUDE.md (~4–5KB total, well under 200 lines).**
   - *Meta half:* 2–3 sentences of identity (template, payload, meta-repo that dogfoods; don't run `/wong-setup`//`/wong-sync` here) + pointer to the README and `wiki/development/README.md`. Everything else moves to `payload.md`.
   - *Block:* the four-surfaces table (kept — it is the orientation), read-the-owning-doc instruction, the loop in one line with each verb linked to nothing (skill descriptions already load) and the change-loop page linked as owner, the git boundary sentence, one line each for: ASD-STE100, the gate (link), the prose allowlist (link), secrets (link), wiki discipline. Cut whole: the per-verb parenthetical prose (~2.5KB), the `/wong-sync` bullet (~1.6KB — its skill description loads every session), the long credentials paragraph body, the prose-allowlist detail.
   - Maintainer context that must stay near the text but needn't cost tokens goes into HTML comments (stripped at injection).

5. **Description budget: 600 characters.** Large enough for purpose + trigger phrases (the `apply` description, 477 chars, already works), small enough to force the how back into bodies. `save` keeps its list of *what invoking it causes* only as far as routing needs; behaviors like "waits for CI, auto-fixing failures" live in the body it already duplicates. Skills trimmed: save, verify, wong-sync, dream, improve, wong-cloudflare, wong-setup, update-dependencies, continue, ship, apply, plan, explore. Exempt: `openspec-*` (regenerated by `openspec update`; edits would be overwritten and break the pristine-generated-skills convention), `agent-browser` (vendored).

6. **Trigger-on-read is good enough.** Rules fire when a matching file is *read*, and every skill's flow reads before it writes; the payload rule therefore lands before the first payload edit in practice. No hook is added to force it.

## Risks / Trade-offs

- [A planning-time fact gets cut and no rule has fired yet] → the block keeps the boundary facts (git ownership, loop, surfaces); everything else cut is owned by an always-loaded skill description or a linked page the block tells the agent to read first.
- [Slimmer block reads as a downgrade to targets on next `/wong-sync`] → the sync adapts blocks rather than rewriting locally-authored ones; the CHANGELOG entry explains the cut so the sync's after-picture can, too.
- [Description trims weaken skill auto-selection] → keep every *trigger phrase* ("use when…", user-verb vocabulary); cut only mechanism prose. Verify by rereading each trimmed description against its old trigger list.
- [`payload.md` paths over-fire (e.g. generated `openspec-*` edits)] → acceptable; the rule is small and its advice ("this is a release") is correct for those files too.

## Migration Plan

Single branch, ordinary loop. Order: new rules → CLAUDE.md rewrite → description trims → manifest + VERSION + CHANGELOG → `node scripts/check-payload-links.mjs`. Rollback is `git revert`; no state migrates.
