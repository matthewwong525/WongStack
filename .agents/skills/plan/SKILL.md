---
name: plan
description: Draft an OpenSpec change — proposal, specs, design, and tasks — in one step, ready to implement. WongStack's name for OpenSpec's /opsx:propose. Use when you want to plan or spec out what to build before writing code; pairs with /apply to implement and /ship to archive.
user-invocable: true
---

# /plan

`/plan` is WongStack's name for OpenSpec's **propose** step — it drafts a complete change under `openspec/changes/<name>/` (proposal, delta specs, design, tasks) so you have a spec to build against.

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

**Invoke the `openspec-propose` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:propose` and owns the actual behavior (naming the change, generating artifacts in dependency order, validating), subject to the apply handoff below.

## When `/apply` invokes `/plan`

`/apply` may invoke this skill to make its selected line of work apply-ready before implementation. Treat the change name or implementation intent it passes as the user's chosen input, and return the exact resulting change name to `/apply`.

- **No matching change exists** → create it through the ordinary `openspec-propose` artifact process.
- **`/apply` explicitly selected an existing incomplete change** → complete that same change's missing artifacts in dependency order. The user's `/apply` request already answers the generated skill's “continue it or create new?” guardrail: continue it, and never create a duplicate.
- **The required intent is unclear or artifact creation blocks** → pause and return the blocker; `/apply` will not start implementation.

This handoff changes no standalone behavior: `/plan` invoked by itself creates the apply-ready artifacts and stops for review. It never invokes `/apply` automatically.

## UX stage (UI-bearing changes only)

When the change **adds or meaningfully restructures a user-facing screen** (a page or component — not merely touching a UI file), run this stage after design.md's first draft and **before tasks.md**, so tasks can reference the result. The output is the `## UX` section of design.md, in the shape defined by [`wiki/ux-principles.md`](../../../wiki/ux-principles.md) (which the `openspec/config.yaml` `design` rule also enforces for any author outside this skill). **Worker-only, CLI, library, or otherwise UI-less changes skip this stage entirely** — most repos won't run it every change.

1. **UX-design subagent.** Spawn a subagent (Agent tool) that reads: the change's proposal.md + draft design.md, `wiki/ux-principles.md`, your repo's UI/component conventions doc if it has one, and the 1–2 closest analogous existing screens (name them in the prompt — design by mirroring, not by inventing). It **returns the `## UX` section text** — use-case brief with stated frequency assumptions, flow from intent to done, hierarchy map (the one primary action per screen), ASCII wireframes incl. empty/error states, component inventory. It writes no files.
2. **Critic subagent.** Spawn a second subagent with the draft section + `wiki/ux-principles.md` that answers exactly two questions: *does every screen serve the stated job?* and *where does this violate ux-principles.md?* Feed its findings into a single revision round (rerun the design subagent with the critique). One round only — don't loop.
3. **Append + surface forks.** The main thread appends the final `## UX` section to design.md. If the critique exposed a genuine layout fork (e.g. table-with-drawer vs master-detail), surface it to the user as one AskUserQuestion before writing tasks.md; otherwise default to mirroring the named existing screen.
4. **Tasks reference the section.** When drafting tasks.md, UI tasks point at the subsection they implement (per the `openspec/config.yaml` `tasks` rule), e.g. `- [ ] 3.2 Build list view per design.md ## UX — Wireframes`.

## Tasks include their tests

When the change touches **behavior a test can exercise**, `tasks.md` carries a task to add or extend that coverage — grouped with the surface it tests, not bolted on at the end. A prose-only change (wiki, notes, skill text) gets no such task.

The tests are written by `/apply`, while it implements — the moment the context is richest. They are *not* written at checkpoint time: `/save` is a pure checkpoint and never authors tests. From then on the app's suite runs as an ordinary CI check on every push, so coverage ratchets up and nothing has to re-argue it.

## A task that needs the gate says so

Some work can only be verified by pushing — a build that must pass, a preview that must deploy,
browser evidence that must land on the PR. Nothing builds locally, so write such a task so it names
`/save` as how the verification happens (e.g. `- [ ] 4.2 Confirm the migration runs on the preview
— verified via /save`). That tells the implementer the task is completed by a checkpoint rather
than a local command; `/apply` treats [that save as implementation, not as an
exit](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task).

Don't add one by reflex. Most changes need no gate result before their later tasks can proceed, and
the automatic checkpoint at the end of `/apply` already covers them.

**Convention:** the change name *is* the branch name — when you start implementing, work happens on a branch named after the change. Once the proposal reads right, implement it with [`/apply`](../apply/SKILL.md) (which fronts `/opsx:apply` and automatically hands completed work to `/save`), checkpoint partial work at any time with [`/save`](../save/SKILL.md), and resume with [`/continue`](../continue/SKILL.md).
