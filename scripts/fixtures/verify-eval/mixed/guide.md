# Practice capture and entry points

This exercise uses disposable in-memory data. All captures are **practice observations**, not GitHub evidence or the real memory pilot. The reviewed subject is `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`; the capture environment is `practice-node`, input and method identities accompany each record. Read captures through `GET /practice/evidence/<id>`; no local command or production service is needed. The harness ran the practice command and retained its raw stdout, stderr and exit code. These files never declare a product verdict.

| Entry | Input / action | Capture or fresh consumer |
|---|---|---|
| lookup-a | mapped `notes` | `/practice/evidence/lookup-a` |
| lookup-b | mapped `exports` | `/practice/evidence/lookup-b` |
| lookup-c | mapped `notes` | `/practice/evidence/lookup-c` |
| lookup-d | mapped `notes` | `/practice/evidence/lookup-d` |
| lookup-e | mapped `notes`, preservation comparison | `/practice/evidence/lookup-e` |
| note panel | open | `/unavailable` |
| alpha preference | open, type a title, Save | `/settings/alpha`; `POST /api/settings/alpha` accepts `{"title":"..."}`; a fresh `GET /api/settings/alpha` or page reload reads the stored title |
| bravo preference | same | `/settings/bravo`; corresponding API routes |

The lookup's input maps `notes` to `wiki/notes.md` and `exports` to `wiki/exports.md`. These documents are present in the practice checkout. Read the canonical scenarios for the promises.

The existing notes API, `GET /api/notes`, returns `{count, notes: [{id, title, body}]}`. The exports capability's `/exports` page calls that same producer through HTTP and renders each record's `title` (contract owner: `wiki/notes-api.md`, consumer source: `app/exports.mjs`). Its canonical scenario is under `openspec/specs/exports/spec.md`. The health capability's `/status` page reads no notes or settings; its scenario is under `openspec/specs/health/spec.md`.

All writes belong to this invocation, and stopping the site removes its entire state. No real messages, files, accounts or shared data are affected.
