---
slug: structured-explore-questions
started: 2026-09-15
updated: 2026-09-16
---

# Structured exploration session

The user asked whether structured question tools conflict with OpenSpec exploration. Inspection found that the installed OpenSpec explore skill permits a flexible discussion and does not prescribe plain-chat questions. Its conversational examples explained why the wrapper needed an explicit presentation policy. The change decisions live in the proposal rather than this note.

## Tool and validation observations

Question tools differed across agent contexts in this session. The root used an asynchronous structured input tool; a review agent could not see that same tool. Instructions must use the active host's available mechanism and restrictions.

The generic Codex skill validator rejects WongStack's existing `user-invocable` frontmatter extension. Format checks passed on temporary copies with only that extension omitted. The committed skills retain it. The check also found an existing unquoted colon in the plan description; quoting the description repaired its YAML without changing its text.

The review page initially used `visual diff` on its outer choices section. The kit's grid rule kept that section visible under other selections. The corrected `visual diff-visual` class passed a browser check of all four review anchors.
