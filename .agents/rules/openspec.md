---
paths: ["openspec/**"]
---

# Work inside an OpenSpec change

Route each fact to its one surface. Why *this change* is shaped this way goes in the change's Decision log. Session context — what the user said, dead ends, open threads — goes in `notes/<slug>.md`. A reusable process goes in `wiki/`, via `/dream`. Do not write the same fact on two surfaces.

OpenSpec never runs git. The WongStack skills (`/save`, `/continue`, `/ship`) own every git action; keep git out of change artifacts and out of OpenSpec steps.

Drive OpenSpec through the WongStack verbs. `openspec init` generates `openspec-*` skills, which the verbs invoke — it generates no `/opsx:*` slash commands, so don't reach for one.
