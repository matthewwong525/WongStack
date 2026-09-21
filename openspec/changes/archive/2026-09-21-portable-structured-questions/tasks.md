## 1. Structured question behavior

- [x] 1.1 Update `/explore` and each direct question-tool reference to prefer callable Codex `request_user_input`, then callable Claude `AskUserQuestion`, then another host equivalent, per [review.html#/question-flow/after](review.html#/question-flow/after).
- [x] 1.2 Add trusted project Codex configuration that enables `default_mode_request_user_input` without changing user-wide settings, per [review.html#/config-diff/added](review.html#/config-diff/added).

## 2. Contract and release

- [x] 2.1 Keep the `explore-clarification` delta aligned with the implemented callability order and Default-mode behavior.
- [x] 2.2 Bump WongStack to 16.2.1 and add a newest-first changelog entry that states the structured-tool behavior and compatibility limit.

## 3. Verification

- [x] 3.1 Confirm the installed Codex reads the project flag as enabled and that the skill text names both supported tools with the chat fallback last. Record that a newly started Default-mode session is the final callability check because this session's tool catalog is fixed at startup.
- [x] 3.2 Run the required payload-link and OpenSpec-config checks, then validate this change strictly.
