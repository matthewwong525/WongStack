## Context

See proposal.md for the problem and scope. Both entry points currently duplicate the core skills. The payload list, optional component flags, and install record also have consumers outside these two skills.

## Goals / Non-Goals

Goals: short entry points that supply current source context to the normal workflow. Preserve installation compatibility.

Non-goals: add an update engine or change the core verbs.

## Decisions

- Keep source retrieval in one short shared reference. Use a clean checkout of the upstream default branch and identify its version and commit. Preserve dirty caches by choosing a separate checkout. A new script would add maintenance without enough repeated logic to justify it.
- Invoke `/explore` with an outcome and repo context. The core skills own questions and artifacts. Remove the old playbook content. Keep adapt.md as a short compatibility pointer because shipped wiki pages link to it; remove fit-playbook.md. Preserve old setup anchors for existing wiki links.
- Use installed skills first, including recorded renames; use source skills when missing. Source-relative resources stay in the source checkout, while planning and edits target the user's project. Prepare OpenSpec only when planning needs it. `/save` owns any Git bootstrap.
- Keep the inventory and install record schema in the payload reference. Record source version only when implementation completes. Carry legacy user choices as context, without preserving the old verdict mechanism.
- Keep normal authorization: evaluation remains exploration; explicit installation or update implementation continues through the normal later verbs. No separate approval sequence.

## Risks / Trade-offs

- Less procedural detail means more judgment on unusual repos → provide target context and use the core skills' normal investigation.
- A fresh target has no local skills → use source skills and prepare planning prerequisites at the point of need.
- Existing records and old verdict files can contain useful choices → preserve the record fields and read old user choices without running the retired process.

## Migration Plan

Release as 15.0.0 because the entry skills no longer force the old report and installation procedure. Update live descriptions and specs; keep historical archives unchanged. Reverting the release restores the prior entry points and references.
