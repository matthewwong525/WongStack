---
paths: ["openspec/**"]
---

# Work inside an OpenSpec change

Route each fact to its one surface. Why *this change* is shaped this way goes in the change's Decision log. Session context — what the user said, dead ends, open threads — goes to facts in the memory store, through [the memory skill](../skills/memory/SKILL.md#write). A reusable process goes in `wiki/` when wiki work is explicitly in scope. Do not write the same fact on two surfaces.

Keep git out of change artifacts and OpenSpec steps; [the change loop](../../wiki/development/the-change-loop.md) owns the git boundary.

Drive OpenSpec through the WongStack verbs, which use the CLI and its reported paths directly. Read the [shared CLI contract](../skills/plan/references/openspec-cli.md) for schema and store handling; setup uses `openspec init --tools none`, with no generated `openspec-*` layer.
