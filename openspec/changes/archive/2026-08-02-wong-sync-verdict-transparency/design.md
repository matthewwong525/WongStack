## Context

`/wong-sync`'s adapt step maps upstream capabilities, surveys the target, and assigns every capability one of four verdicts: `present`, `divergent`, `adopt`, `declined`. Only `adopt` produces a durable artifact — the OpenSpec change folder. The other three are reported in chat and written into `.claude/.wong-stack.json`'s `capabilities` ledger, where `declined` and `divergent` suppress re-pitching on later runs unless the upstream expression changed.

Two problems follow from that shape:

1. **`declined` conflates two authorities.** `adapt.md` defines it as "wrong for this repo, **or** the user said no", and `adapt.md`'s concreteness bar adds a third writer: a graft the skill couldn't describe concretely is also `declined`. Two of those three are the skill's own inference, yet all three get the permanence appropriate only to a user's refusal. Worse, an inference like "this assumes CI and you have no forge checks" is *conditional on repo state that changes* — pinning it to an `asOfCommit` of the **upstream** clone means it is never revisited when the thing that actually justified it (the target) changes.
2. **Non-adopt verdicts have no durable home.** They exist in a chat report and in JSON. The JSON is a machine record, not something a user reviews; `adapt.md` states the intent that "a wrong call is visible and arguable", but the only way to argue is to hand-edit the manifest.

Constraint from the repo: `/wong-sync` runs no git in the target, never overwrites an existing file, and proposes rather than implements. Any fix has to live inside those.

## Goals / Non-Goals

**Goals:**

- Distinguish a verdict the user chose from one the skill inferred, and give only the former permanence.
- Make every verdict — not just `adopt` — land somewhere a human reviews at their own pace.
- Give the user a way to overrule any non-adopt verdict without editing JSON.
- Keep the run non-interactive: no prompt wall, no per-capability confirmation.

**Non-Goals:**

- Gating Step 2's copy of absent payload files. Nothing is committed, `/save` is the gate, and the volume on a current repo is small. Considered and deliberately left alone.
- An interactive checkpoint during the run (the "check off what to adopt" option). A 20–40 item list on every sync trains people to hit accept, and it does nothing about run two, where the ledger is what suppresses.
- Any change to the two-subagent structure, the capability definition, or id stability.

## Decisions

### 1. Split the verdict by *who decided*, not by *why*

`declined` becomes two verdicts:

| verdict | written by | sticky? |
|---|---|---|
| `not-applicable` | the skill — an `assumes` the repo doesn't meet, or a graft it can't describe concretely | no |
| `declined` | the user, from an actual recorded refusal | yes |

The axis is authority, not reason. That is what the complaint is actually about: not that the skill judges, but that its judgment is stored with the weight of the user's.

*Alternative considered:* keep one verdict and add a `by: "user" | "skill"` field. Rejected — the field would be trivially droppable by a future edit and reads as metadata rather than as a distinct thing, whereas a distinct verdict forces every table, report, and rule to state which one it means.

*Alternative considered:* `blocked` or `inapplicable` as the name. `not-applicable` says the repo-fit thing plainly and doesn't imply a temporary obstruction that will clear.

### 2. Only `declined` suppresses; everything else is recomputed each run

Today `divergent` is also sticky. Under the authority axis it shouldn't be — it's an inference — but re-pitching it every run would be noise. The resolution is that recomputation and re-pitching are different things: `divergent` is recomputed from scratch each run and, if still true, lands on `divergent` again and is reported as one quiet line. It never becomes a task either way, so recomputation costs nothing and buys correctness — if the local solution that justified `divergent` is deleted, the next run naturally flips it to `adopt`.

This makes the ledger's job precise: **it stores the user's decisions, plus a snapshot of the last computed state for reporting and retirement detection.** Only the first half is authoritative on a later run.

`declined`'s existing re-raise rule is untouched: a user's "no" recorded at commit X is re-raised when the upstream expression changes after X.

### 3. `.claude/wong-sync-verdicts.md` — one durable record, regenerated

Every run writes the full verdict list to `.claude/wong-sync-verdicts.md`: every capability, its verdict, its one-line reason, grouped by verdict, plus the re-raised and retired sections. It is written **even when nothing is `adopt`** — that is exactly the run where today's output is thinnest and the "it just decided" feeling is strongest.

Placement rationale — it sits next to `.claude/.wong-stack.json` rather than inside the change folder because verdicts are *repo state*, not change scope: they outlive any one adoption change, and there frequently is no change folder at all. It is committed (via `/save`), not gitignored, so it travels between machines and shows up in the PR diff like every other piece of repo knowledge.

*Alternative considered:* `verdicts.md` inside `openspec/changes/adopt-wongstack-<date>/`. Rejected — it would force writing an otherwise-empty change folder on "nothing to adopt" runs, which `adapt.md` explicitly calls noise, and it would scatter the record across dated folders when what the user wants is *the current picture*.

### 4. Ticking a checkbox is the promotion path

Non-adopt entries are written as checkboxes:

```markdown
## Not applicable

- [ ] `ci-gate-when-present` — assumes forge checks; this repo has no CI workflows.

## Declined

- [ ] `stack-pack-cloudflare` — you said no on 2026-07-14; re-tick to reconsider.
```

The next `/wong-sync` reads the existing file **before** regenerating it, collects every ticked id, and force-verdicts those `adopt` — writing a task for each, and clearing any `declined` ledger entry among them. Un-declining is therefore the same gesture as adopting, which is right: the only way to reverse a "no" is to ask for the thing.

*Alternative considered:* promote in-conversation ("say the word and I'll add it"). Kept as the report's phrasing for a live session, but it can't be the mechanism — it evaporates when the session ends, which is the failure being fixed.

The cost is that promotion takes a second `/wong-sync` run. That is consistent with the skill's grain (it proposes, the loop disposes) and keeps the run itself non-interactive.

### 5. The overwrite carve-out is stated as ownership

"Never overwrite an existing file" is the skill's headline guarantee, and regenerating a file is literally overwriting one. The carve-out is scoped by authorship, not by an exception list: the skill may rewrite a file **it generated and solely owns**, and `.claude/wong-sync-verdicts.md` is the only such file besides the manifest — which the skill has always rewritten. Framing it this way keeps the guarantee meaningful (nothing a human wrote is ever touched) instead of turning it into a list of exceptions that can grow.

Consequence: the file carries a generated-file header saying it is rewritten on every run and that ticked boxes are read first — so a user's edits beyond ticking aren't silently lost without warning.

## Risks / Trade-offs

- **A ticked box is read once, then the line moves to "Adopted" on regeneration** → the regenerated file states where each promoted capability went, and the run's report names them, so the tick isn't silently swallowed.
- **Old ledgers can't distinguish a skill-`declined` from a user-`declined`** → honor existing `declined` entries as user decisions (the conservative read: it keeps suppressing something that may have been suppressed wrongly, rather than re-pitching something the user genuinely refused). Note the migration in the CHANGELOG so anyone who wants a clean slate can delete the entry.
- **Dropping `divergent`'s suppression means recomputing it every run** → it never becomes a task, so the only cost is subagent work that was already happening; the report keeps it to one line each.
- **`.claude/wong-sync-verdicts.md` grows with the capability map** → it's a flat list with one line per capability, grouped; the "Present" group is collapsed to a count in the report but listed in full in the file, which is the point of having a file.
- **A user who edits the file expecting it to persist** → the generated header warns; ticking is the only supported edit.

## Migration Plan

Payload prose only — no runtime, no data migration, nothing to roll back beyond reverting the change. Target repos pick it up on their next `/wong-sync`:

1. First run after adoption writes `.claude/wong-sync-verdicts.md` for the first time and lands it uncommitted for `/save`.
2. Existing `capabilities` entries are read as-is; `divergent` entries stop suppressing and are recomputed; `declined` entries continue to suppress.
3. `VERSION` 8.2.0 → 8.3.0 with a newest-first `CHANGELOG.md` entry describing the verdict split and the new file.

## Open Questions

None blocking. One deferred: whether Step 2's copy list should also become confirmable is left open by the Non-Goals and can be raised separately if the copy volume turns out to bother anyone in practice.
