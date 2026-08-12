## 1. Philosophy page

- [x] 1.1 Rewrite `wiki/agent-knowledge-center.md` around the six principles per design.md — plain list first, then one short section per principle linking to the mechanism that applies it; keep the surface-ownership and capture content; no first-person voice; one-sentence "adapt it" caveat.

## 2. README

- [x] 2.1 Strip and tighten `README.md`: keep the section order, keep the "turns a repo into an AI knowledge center" opening, remove "AI-native", rename and de-brand "The compounding loop" section, flatten sales-style bullets to matter-of-fact statements.

## 3. Skills

- [x] 3.1 Add the one-paragraph code-first check to `.claude/skills/explore/SKILL.md`, linking to the philosophy page; do not touch `openspec-explore`.
- [x] 3.2 Add the same check to `.claude/skills/plan/SKILL.md`, linking to the philosophy page; do not touch `openspec-propose`.

## 4. Cross-references

- [x] 4.1 Grep the payload for "AI-native", "compounding", and "smarter than the last"; update `wiki/README.md` pointer text and `CLAUDE.md` cross-references only where wording depends on removed phrases.

## 5. Release

- [x] 5.1 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry describing the principles rewrite and the code-first planning guidance.
- [x] 5.2 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports.
