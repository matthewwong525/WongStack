---
name: dream
description: Update the wiki from memory.
user-invocable: true
---

# /dream

`/dream` authorizes every step. `D` is `node "$(git rev-parse --show-toplevel)/.claude/skills/dream/scripts/dream.mjs"`; `M` is [memory](../memory/SKILL.md)'s `memory.mjs`.

1. **Stop** on uncommitted edits, a change's branch, or an unreachable store: say why.
2. **Tidy memory** by [consolidation](../memory/SKILL.md#background-run), step 3, skipping `due`.
3. **Gather.** `D since`, then `M search --since <date> --limit 200 --type <type>` for `project`, `reference`, `feedback`, past `after fact`; say if one hit 200.
4. **Add and clean** by [what a dream does](../../../wiki/development/wiki-dream.md#what-a-dream-does): `D pages` lists pages.
5. **Never edit a `shipped` page.** List its misfits: page and fact.
6. **Publish** an edit from `origin/main` on `dream-<date>`: `/ship` minus its closing question.
7. **Record** on slug `wiki-dream`: a `project` fact tagged `dream`, `Dream <date>: read facts up to #<id>. Checked: <pages>.`, even with no edit; and one `thread` tagged `improve` with step 5's list.
8. **Report** each changed page with its fact, and step 5's list.

`--dry-run` runs only steps 3 to 5, anywhere, and prints each edit with its fact.
