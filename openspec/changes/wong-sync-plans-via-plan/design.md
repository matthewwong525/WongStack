# Design — wong-sync-plans-via-plan

## The decomposition

Authoring an OpenSpec change is five jobs:

| job | what it is | owner after this change |
|---|---|---|
| A — locate | resolve planning home, changeRoot, artifact paths | `/plan` (via the OpenSpec CLI) |
| B — name | pick the change name, handle collisions | the sync (it checks and passes the final, suffixed name) |
| C — content | decide what the change says | the sync (composed proposal + tasks + scoping) |
| D — write | artifacts in dependency order, per template and repo rules | `/plan` |
| E — validate | confirm `applyRequires` is satisfied | `/plan` |

`/wong-sync` today owns all five; only B and C are its product. The change hands D, A, E to the repo's own `/plan` — the same division a user with all the facts would get by typing the composed instruction at `/plan` themselves.

## Decision: instruct, don't extend

The delegation is an **invocation, not a contract**. `/plan` is not modified; the sync passes one fully resolved instruction — exact name, verbatim proposal body, the task list, the spec scoping — and `openspec-propose` treats invocation text as the user's request, which it already does.

Why this beats a caller-contract section in `plan/SKILL.md`:

- **Version independence.** The target's `/plan` is whatever version that repo has, possibly locally edited — and the sync never overwrites local authorship. A delegation that depended on a new contract section would fail in every repo whose plan skill predates it. An instruction works with any `/plan`, today's included.
- **No new coupling.** Nothing in `/plan` or `/apply` changes; the fronted `openspec-propose` stays verbatim per the CLAUDE.md rule.
- **The sequencing makes prompts moot.** The sync's flow is research → clarification questions → verdicts → invoke `/plan`. By invocation time every question `openspec-propose` could ask is already answered in the instruction; its "ask if critically unclear" has nothing left to ask. A genuine blocker returns to the sync, which reports it.

The instruction states, explicitly, the three things `/plan`'s defaults would otherwise get wrong: the proposal body is used **verbatim** (the after-picture must survive a target whose `config.yaml` proposal rule prescribes a different shape), delta specs are emitted **only** for the named grafts, and the supplied tasks are the task list.

## Decision: naming stays in the sync

The sync resolves the collision itself — it checks for an existing `sync-wongstack-<YYYY-MM-DD>` and passes the already-suffixed `-2`/`-3` name. `/plan` never sees a collision, so `openspec-propose`'s "continue it or create new?" guardrail never fires, and an existing (possibly mid-flight) sync change is never touched.

## Decision: delta specs for grafts only

`/plan`'s default emits delta specs, so an unscoped delegation would silently vendor WongStack's own capability specs into every target's `openspec/specs/` — copies the target doesn't own that go stale the moment upstream moves. The instruction scopes them:

- **payload copies and updates** → no delta spec. Vendored files; the spec lives upstream.
- **`adopt` grafts** → a delta spec is expected where the graft is concrete. The target genuinely gains that capability and owns it from then on.

## Decision: the verdict record stays authoritative

`.claude/wong-sync-verdicts.md` (cross-run, tickable, permanent) remains the only store of verdicts — overruling the *next* run requires a living file, and an archived change cannot do that job. `design.md`, if the target's `/plan` writes one, is a per-run snapshot and never the store.

## Decision: resolution and the degraded mode

The sync resolves the plan skill through the manifest's `components.skills` (`SKILLMAP`), so a locally renamed plan skill is found under its local name. A target with no plan skill falls back to the current hand-rolled write (proposal + tasks at `openspec/changes/sync-wongstack-<date>/`), named in the report as a degraded mode. On a seed manifest there is no gap: Step 2 copies the payload during the run, so the plan skill exists before Step 3 needs it. The seed-manifest copy remains the one write-during-run exception.

## What deliberately does not change

- `/plan` and `/apply` — untouched, including the existing "When `/apply` invokes `/plan`" section.
- The research head: clone refresh, newest-instructions rule, blob-hash proof, cartographer/surveyor, clarification stage, verdict taxonomy, adopt bias, changelog accounting, verdict record and its tick surface.
- The after-picture format (After · Gain · Lose · Resolution) and every requirement in `wong-sync-after-picture`.
- "The approval decision is never a prompt", "no git in this repo", "the clone is read-only", "it proposes; it never implements."

## Risks

- **Verbatim is instructed, not enforced.** A target's `/plan` follows the instruction the way any skill follows intent — a heavily customized plan skill could reshape the proposal despite "verbatim." Accepted: the alternative (a protocol in `/plan`) fails harder in old-version repos, and the sync's report can note when the landed proposal diverges from what it composed.
- **Per-repo plan quality varies.** Sync plans become repo-native — the thesis ("adaptation, not replication"), but new coupling. The sync proposal's Lose region should own this in target repos.
