# Create a missing plan at save

Load only when code or a code plan exists and no change was selected; an archived handoff never enters. Any other file edit with no change keeps save's normal route, without a plan; conversation-only work takes [the facts-only save](facts-save.md).

Derive a concise plan from the session and relevant diff: the intent, constraints, rationale, and facts a cold reader needs, even ones only in terminal or scratch state, with repo-relative paths. Ask only if the intent is unclear.

Create it by the [CLI contract](../../plan/references/openspec-cli.md#create-or-read-a-change): `openspec new change "$NAME"`, status, then each ready artifact's instructions before writing; a tasks file alone is not readiness. Write the proposal header and a first dated Decision-log entry as save does, tasks in their true state, and design and spec artifacts when the schema and change require them. Produce the review, drawings and page included, through [plan](../../plan/SKILL.md), even after implementation.

Return the exact change name and CLI-reported root to save; the handoff and code share one checkpoint.
