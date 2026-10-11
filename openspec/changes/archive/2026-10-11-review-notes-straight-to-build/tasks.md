# Tasks

## 1. Review page and reply endpoint

- [x] 1.1 Replace the three-dot menu with three visible footer buttons, retain publish confirmation and progress, and author browser coverage for 320px phone layout, keyboard dismissal, pending-request locking, offline and closed-link behavior.
- [x] 1.2 Send a snapshot of saved unsent notes with either build action and mark only acknowledged submitted content as sent; author browser coverage for both actions, drafts, later edits, stale plans, retryable failures and action-only requests.
- [x] 1.3 Extend the action endpoint with optional bounded reviewer text under its fixed action message; author endpoint coverage for one combined delivery, invalid/oversized text, immutable instruction and target, rate/version/duplicate checks and unconfirmed delivery.

## 2. Workflow and release

- [x] 2.1 Update registered plan action messages and plan/apply routing so attached notes update the existing plan and continue into the authorized action without an extra choice; preserve standalone Send notes and question-note behavior, and adjust existing builder/convention tests.
- [x] 2.2 Update the owning reply-link and review UX wiki descriptions and add a Next minor changelog entry with active-page rebuild guidance; keep skill text within its existing measured budget and leave VERSION unchanged.
- [x] 2.3 Regenerate this change's review page using the updated kit; source-review the completed implementation and test coverage, preserving historical archives.
- [x] 2.4 Increase desktop reading and button-label font sizes, use compact centered desktop buttons, and rebuild the active review page; verify the desktop appearance and existing phone layout in the browser.
- [x] 2.5 Expand the desktop button row to align with the plan's padded content edges and rebuild the review page; verify left/right alignment and no overflow at desktop and phone widths.

## 3. Final verification

- [x] 3.1 After all implementation and tests are authored, run the local worktree pre-check and repair affected failures; include endpoint/browser coverage, payload links, OpenSpec configuration, context budget and strict change validation. Report local evidence without claiming remote checks passed.
