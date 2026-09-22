---
name: plan
description: Draft an OpenSpec change with a proposal, required artifacts, tasks, and a standalone interactive HTML review. Use before implementation when a change needs a plan or visual review.
user-invocable: true
---

# /plan

Create an apply-ready OpenSpec change and its required `review.html`. The page is the main human review surface: What Changes is its navigation, and each item can show a flow, diff, tree, or screen. It works offline, on a phone, and lets the reviewer annotate and copy feedback into `/continue`.

## Explore first

Invoke [`/explore`](../explore/SKILL.md) in bounded mode. Read prior answers and investigate only gaps. The exit round may ask at most one final group for this transition; a completed exit round cannot be repeated. Once settled, fill cheap details with recorded assumptions and ask nothing more during this plan. Record every earlier answer and the exit round in the proposal Decision log as `asked X → chose Y`; mark inferred decisions as `assumed` with the reason.

## Draft with the CLI

Follow the shared [CLI contract](references/openspec-cli.md): select the root or requested store, create a change with `openspec new change "<name>"` only when needed, and read `openspec status --change "<name>" --json`. For each ready artifact in the transitive `applyRequires` set, read `openspec instructions <id> --change "<name>" --json`, apply its template and rules, then recheck status. Read dependency files from disk. Honor conditional skips and `skip_specs` when the artifact's instruction allows them. Do not mark an existing tasks file ready while its dependencies are absent.

If `/apply` selected an incomplete change, complete that exact change rather than creating another. If planning blocks, report it to `/apply` without beginning implementation. A standalone `/plan` stops for review after producing and validating the artifacts.

Before tasks, decide whether a repeated process belongs in deterministic code. Use the judgment in [`agent-knowledge-center.md`](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai). A change to testable behavior gets a coverage task beside the related implementation; a prose-only change does not.

## Build the review page for every change

Right after the proposal draft, launch one design subagent in the background. Supply the proposal, [author guide](references/review-author.md), relevant [examples](references/review-examples.html), and, for screens, [`ux-principles.md`](../../../wiki/ux-principles.md) and closest existing screens. The author writes only `review-visuals.html` and returns a bullet-to-anchor map. Draft design and tasks while it runs; finish anchor citations when it returns.

Default to one `flow`, `screen`, `diff`, or `tree` visual that carries the change. Draw each new or restructured user-facing screen. The author states why any further visual is needed. Other bullets stay text. Anchor each visual to one owning What Changes bullet, then run:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current
```

For screens, add a `## UX` design section with a brief, flow, hierarchy, components, and `### Review` link to screen and state anchors. Draw phone work phone-first. UI-less changes omit this section and screen visuals. Tasks that build visuals cite their anchors.

Run the deterministic [review checker](scripts/check-review.js) once in a browser on the generated file. The builder rejects forbidden markup; the checker reports structural defects. The reviewer annotates meaning and layout. Without a browser, report the rendered check as unverified; still build and validate.

On plan updates, rerun the author only when an anchored bullet or its visual changes. Otherwise rebuild from the existing fragment.

The template owns layout, navigation, annotations, and copy behavior. The visual author does not edit its CSS or script. The builder reads the proposal directly; do not keep another authored copy of Why or What Changes.

## Finish

Write tasks grouped by the surface they touch, following the CLI's checkbox template. A task needing CI or a deployed preview names `/save` as its means of completion. Validate with `openspec validate "<name>" --strict --no-interactive`. Confirm the review exists and all apply-required artifacts are complete. Standalone `/plan` presents the page and stops, ending with [the next step](../explore/references/asking-the-user.md#end-every-reply-with-the-next-step) — implement it now *(Recommended)*, revise the plan first, or stop here. When invoked by `/apply`, return the exact change name and let `/apply` implement it.
