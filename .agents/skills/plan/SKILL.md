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

After the first design draft and before tasks, have a design subagent read the proposal, design, [visual author guide](references/review-author.md), the [fixed kit](references/review-kit.html), and, for screens, [`ux-principles.md`](../../../wiki/ux-principles.md) and one or two closest existing screens. It writes only `review-visuals.html` with one visual for each What Changes item that benefits from one; a text-only bullet needs none. Each pictured item owns its visual and local state controls. The shared viewer shows the full item text above it. The subagent returns a bullet-to-anchor map. The main thread places each anchor at the end of its proposal bullet and runs:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "<change-root>" --require-current
```

Each screen-bearing change also gets a `## UX` design section: use-case brief, shortest flow, hierarchy, components, and a `### Review` link with screen and state anchors. A UI-less change has no screen visual or UX section. Phone-oriented work is drawn phone-first. A task that builds a visual cites its review anchor.

Run the deterministic [review checker](scripts/check-review.js) in a browser after opening the generated file. It reports anchor, mark, state, navigation, and action defects. The builder rejects forbidden author markup. A structural pass cannot prove the picture explains the change. A critic subagent reads the rendered page and the plan, checks meaning, hierarchy, empty rendered states, flow-card Details and branch joins, draft-note controls, and phone overflow, then returns concise findings. Feed those into one revision round with the design subagent and rebuild the page. Confirm anchors resolve and the standalone file still opens offline. If the browser cannot run, report the rendered checks as unverified rather than a pass; source generation and validation still run.

The template owns layout, navigation, annotations, and copy behavior. The visual author does not edit its CSS or script. The builder reads the proposal directly; do not keep another authored copy of Why or What Changes.

## Finish

Write tasks grouped by the surface they touch, following the CLI's checkbox template. A task needing CI or a deployed preview names `/save` as its means of completion. Validate with `openspec validate "<name>" --strict --no-interactive`. Confirm the review exists and all apply-required artifacts are complete. Standalone `/plan` presents the page and stops. When invoked by `/apply`, return the exact change name and let `/apply` implement it.
