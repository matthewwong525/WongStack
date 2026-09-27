# Create a missing plan at save

Load only when code or a code plan exists and no change was selected. Conversation-only work takes the prose route; an archived handoff never enters this fallback.

Derive a concise plan from the session and relevant diff, holding the intent, constraints, rationale, and facts a cold reader needs, even those only in terminal or scratch state, with repo-relative paths. Ask only if the intent cannot be resolved.

Follow the [CLI contract](../../plan/references/openspec-cli.md): `openspec new change "$NAME"`, read status, then get each ready artifact's instructions before writing. A tasks file alone is not readiness.

Maintain proposal Status, actual Branch, Open questions, and an initial dated Decision log. Write tasks with their true state, and design and spec artifacts when the schema and change require them. Produce the review, drawings and page included, through [plan](../../plan/SKILL.md), even after implementation.

Return the exact change name and CLI-reported root to save; the handoff and code go in the same checkpoint.
