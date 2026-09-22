# Create a missing plan at save

Load only when code or a plan for code exists and no applicable change was selected. Conversation-only work uses the prose route. An archived handoff never enters this fallback.

Derive a concise plan from the session and relevant diff. It must preserve the current intent, constraints, rationale, and facts a cold reader needs. Use repo-relative paths; keep any needed fact from terminal or scratch state in the change. Ask only when the intended work cannot be resolved.

Follow the [CLI contract](../../plan/references/openspec-cli.md). Create the change with `openspec new change "$NAME"`, read status, then obtain each ready artifact's instructions before writing. Honor the selected root, schema, dependency closure, conditional skips, and permitted `skip_specs`; a tasks file alone is not readiness.

Maintain proposal Status, actual Branch, Open questions, and an initial dated Decision log. Write tasks with their true completion state. Write design and spec artifacts when required by the schema and change. Produce the required review through [plan](../../plan/SKILL.md): visual authoring, fixed builder, browser checks, critique, and revision all still apply. Do not reproduce these procedures here or bypass review because implementation happened first.

Return the exact selected change name and CLI-reported root to save. The handoff and code belong in the same checkpoint.
