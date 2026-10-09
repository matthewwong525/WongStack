# Design

## Context

The apply skill uploads a host preview and reports before asking the shared closing question. Verify already supports named screenshot requests without scouting, saving, or posting evidence. See [the proposal](proposal.md) for motivation.

## Goals / Non-Goals

**Goals:** reuse screenshot capture and image display before the existing choice; keep the preview URL and honest fallback.

**Non-Goals:** no browser runtime, capture script, dependencies, or app UI changes.

## Decisions

- Add a screenshot step to `.agents/skills/apply/SKILL.md` after preview upload and before the report/question. Use `/verify`'s plain checks on the exact current preview URL, with its agent-browser route and safeguards; do not scout, save, or post a PR comment. Existing CI previews retained by final acceptance use the same finish report rather than skipping screenshots.
- Prefer two distinct changed screens. For a single screen, a useful state or phone view can supply the second; one meaningful view suffices. Display the actual image through the host image tool, with a caption; a file link alone is insufficient.
- No preview or no changed UI means explain the omission. A capture or access failure keeps the link and choice, reports the reason, and never substitutes a live page or login page.
- Keep `/ship`'s existing early return unchanged, so its delegated build gains no new stop or upload.
- Update the owning change-loop wiki summary, and add a minor payload changelog entry. Offset added instruction text with concise wording in the same skill; preserve its delivery and helper boundaries.

## Risks / Trade-offs

- [Access or capture unavailable] → report it and proceed to the existing question.
- [Images reveal private inputs] → retain existing screenshot safeguards and temporary storage.
- [Instruction budget] → trim only redundant wording and check the context budget.

## Migration Plan

Normal payload update; no manual steps. Reverting the instructions restores the prior report flow. Build [review.html](review.html) from the proposal. No automatic tests are added for this prose-only skill change; existing payload checks and strict spec validation verify the release's structure.
