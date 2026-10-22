# Tasks

## 1. Test

- [x] 1.1 In `scripts/tests/review-browser.test.mjs`, test `a sketch fits 320px, opens full screen, …`: after `await page.locator('#item-1 summary').click();`, add the phone-screen test's comment and `await page.waitForFunction(() => document.querySelector('#item-1 .art.sketch').style.fontSize !== '');` before the `fits` measure.

## 2. Verification

- [x] 2.1 Run `node .github/scripts/checks.mjs --worktree` as a pre-check (browser tests skip here without a browser).
- [x] 2.2 `/save`, then confirm the Payload checks' browser job passes in CI, the real gate for this test.
