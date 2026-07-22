---
name: plan
description: Draft an OpenSpec change — proposal, specs, design, and tasks — in one step, ready to implement. WongStack's name for OpenSpec's /opsx:propose. Use when you want to plan or spec out what to build before writing code; pairs with /apply to implement and /ship to archive.
user-invocable: true
---

# /plan

`/plan` is WongStack's name for OpenSpec's **propose** step — it drafts a complete change under `openspec/changes/<name>/` (proposal, delta specs, design, tasks) so you have a spec to build against.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
(optional)  draft the  implement  push +    resume →    merge +
            change     the tasks  PR +      /apply      archive
                                  preview
```

**Invoke the `openspec-propose` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:propose` and owns the actual behavior (naming the change, generating artifacts in dependency order, validating).

## UX stage (UI-bearing changes only)

When the change **adds or meaningfully restructures a user-facing screen** (a page or component — not merely touching a UI file), run this stage after design.md's first draft and **before tasks.md**, so tasks can reference the result. The output is the `## UX` section of design.md, in the shape defined by [`docs/ux-principles.md`](../../../docs/ux-principles.md) (which the `openspec/config.yaml` `design` rule also enforces for any author outside this skill). **Worker-only, CLI, library, or otherwise UI-less changes skip this stage entirely** — most repos won't run it every change.

1. **UX-design subagent.** Spawn a subagent (Agent tool) that reads: the change's proposal.md + draft design.md, `docs/ux-principles.md`, your repo's UI/component conventions doc if it has one, and the 1–2 closest analogous existing screens (name them in the prompt — design by mirroring, not by inventing). It **returns the `## UX` section text** — use-case brief with stated frequency assumptions, flow from intent to done, hierarchy map (the one primary action per screen), ASCII wireframes incl. empty/error states, component inventory. It writes no files.
2. **Critic subagent.** Spawn a second subagent with the draft section + `docs/ux-principles.md` that answers exactly two questions: *does every screen serve the stated job?* and *where does this violate ux-principles.md?* Feed its findings into a single revision round (rerun the design subagent with the critique). One round only — don't loop.
3. **Append + surface forks.** The main thread appends the final `## UX` section to design.md. If the critique exposed a genuine layout fork (e.g. table-with-drawer vs master-detail), surface it to the user as one AskUserQuestion before writing tasks.md; otherwise default to mirroring the named existing screen.
4. **Tasks reference the section.** When drafting tasks.md, UI tasks point at the subsection they implement (per the `openspec/config.yaml` `tasks` rule), e.g. `- [ ] 3.2 Build list view per design.md ## UX — Wireframes`.

**Convention:** the change name *is* the branch name — when you start implementing, work happens on a branch named after the change. Once the proposal reads right, implement it with [`/apply`](../apply/SKILL.md) (which fronts `/opsx:apply`), checkpoint with [`/save`](../save/SKILL.md), and resume any time with [`/continue`](../continue/SKILL.md).
