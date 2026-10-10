# Tasks

## 1. Review controls and browser coverage

- [x] 1.1 Implement the single-row footer, accessible three-dot popover, and publish confirmation in the review kit; review source for 320px sizing, Escape/outside dismissal, and focus restoration.
- [x] 1.2 Implement connecting and shared pending-request feedback with spinner, accessible status, duplicate protection, and cleanup on every outcome; review source for success only after acknowledgement and preserved notes fallback.
- [x] 1.3 Update existing browser scenarios for the popover and author held-response tests for connection, send, build, confirmation, cross-action duplication, busy cleanup, stable footer geometry, and keyboard use; review coverage before running tests.
- [x] 1.4 Update wiki/ux-principles.md and wiki/development/reply-links.md to describe compact controls and progress; verify the former two-row instructions are removed from live guidance.

## 2. Payload release

- [x] 2.1 Add a Next minor entry to CHANGELOG.md with an Updating note and keep VERSION unchanged; review the entry for the delivered behavior.

## 3. Final verification

- [x] 3.1 After all source and tests are authored, run node .github/scripts/checks.mjs --worktree and repair relevant failures; record exact results, including browser coverage and required payload/config checks.
- [x] 3.2 Validate the change and rebuild its review page from the updated kit; run the loosened-checks check and inspect compact and pending states on a safe preview without sending an actual build or publish request.

Verification evidence: 47 review and browser checks passed with Chromium, zero skipped. Payload links, OpenSpec configuration, context budget, changed-test lint, and the loosened-checks guard passed. The current review link was inspected at 375px and 320px: footer height 61px, both controls 44px tall, no sideways overflow, publish confirmation above the bar, Escape returned focus to More actions. A held POST in the browser showed immediate pending status and disabled controls without sending anything to the chat.

Full pre-check outcome for 3.1: `CHROME_PATH=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node .github/scripts/checks.mjs --worktree` ran after implementation and test authoring. The app lint and type checks passed. Its app tests reported 46 passing and 3 failing files, with 353 passing and 8 failing tests. The failures were in unchanged Access tests: `App.test.tsx` (2), `PersonPage.test.tsx` (5), and `Leaving.test.tsx` (1). Two exceeded their five-second timeout, five did not observe `Saved.`, and one found an empty body instead of `Retry apps`. No review-kit dependency or change-caused app failure was found; unrelated app code was left alone. Wiki and skill-action checks passed. The process then exited 143 during payload checks, with no `LOCAL_CHECKS` or `PAYLOAD_CHECKS` summary; full payload completion remains unverified. Task 3.1 records the attempted command and its limits, not a passing pre-check. After resolving the unrelated app failures or host interruption, remaining broad checks can be rerun with `node .github/scripts/checks.mjs --worktree --only suite,payload` and Chromium enabled. The focused passing checks above were not rerun.
