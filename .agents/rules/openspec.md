---
paths: ["openspec/**"]
---

# Work inside an OpenSpec change

Route each fact to its one surface. Why *this change* is shaped this way goes in the change's Decision log. Session context — what the user said, dead ends, open threads — goes to facts in the memory store, through [the memory skill](../skills/memory/SKILL.md#write). A reusable process goes in `wiki/` when wiki work is explicitly in scope. Do not write the same fact on two surfaces.

Keep git out of change artifacts and OpenSpec steps; [the change loop](../../wiki/development/the-change-loop.md) owns the git boundary.

Drive OpenSpec through the WongStack verbs, which use the CLI and its reported paths directly. Read the [shared CLI contract](../skills/plan/references/openspec-cli.md) for schema and store handling; setup uses `openspec init --tools none`, with no generated `openspec-*` layer.

Write a spec as a promise, not a procedure. A requirement stays when a person or an installed repo relies on it: what they see or get, what must never happen, and what an update delivers or keeps. Leave the how to the skill that runs it — which script or step does it, file and function names (unless the name is the promise, like `.env.example`), a message's exact wording, and the order of steps inside a skill. Give each requirement one or two scenarios: the ordinary case and, where one exists, the edge or failure the rule exists to stop. A spec that retells the skill goes stale the next time the skill changes.
