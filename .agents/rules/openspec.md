---
paths: ["openspec/**"]
---

# Work inside an OpenSpec change

Route each fact to its one surface. Why *this change* is shaped this way goes in the change's Decision log. Session context — what the user said, dead ends, open threads — goes in `notes/<slug>.md`. A reusable process goes in `wiki/` when wiki work is explicitly in scope. Do not write the same fact on two surfaces.

OpenSpec never runs git. The WongStack skills (`/save`, `/continue`, `/ship`) own every git action; keep git out of change artifacts and out of OpenSpec steps.

Drive OpenSpec through the WongStack verbs, which use the CLI and its reported paths directly. Read the [shared CLI contract](../skills/plan/references/openspec-cli.md) for schema and store handling. Setup uses `openspec init --tools none`; no generated `openspec-*` layer is part of this workflow.
