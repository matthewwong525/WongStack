# Design

## Context

`review-kit.html` fits each drawing in `fit(d)`, called from the `<details>` element's `toggle` listener (`fig.addEventListener('toggle', …)`). `toggle` is queued as a task, so it can run after Playwright's `click()` resolves. Until it runs, the `svg` sketch sits at its 480px viewBox width inside a 320px page.

The test `a sketch fits 320px, opens full screen, …` (line ~1049) clicks `#item-1 summary` and measures at once. CI failures matched both halves of an unfitted measure: `inside: false` (fact #1900, four runs) and `page: false` (run 39678509048 attempts 1–2; PR #430 run 39704871941). The next test, `a phone screen fits 320px…`, already waits:

```js
// The fold's toggle event fits the sketch a moment after the click.
await page.waitForFunction(() => document.querySelector('#item-1 .art.screen').style.fontSize !== '');
```

## Goals / Non-Goals

**Goals:** the sketch test measures only after `fit` ran, every run.

**Non-Goals:** changing `fit` or the kit; adding retries or raising timeouts.

## Decisions

- **Wait on `style.fontSize`, matching the phone-screen test.** `fit` sets `d.art.style.fontSize` first thing, then `size()` the frame width, all in one synchronous call, so a set inline font size means the fit is done. Alternative: wait for `scrollWidth <= innerWidth`; rejected, since it would hide a real overflow as a timeout and assert the thing under test.
- Selector is `#item-1 .art.sketch`, the element `fig.querySelector('.art')` returns for an `svg` fence (`build-review.mjs` line ~189).
- Other `summary` clicks in the file were checked: the dark-device test (~1013) reads colours, not sizes, and the chip test (~120) reads visibility, so neither races `fit`. Lines 262 and 971 already wait.

## Risks / Trade-offs

- Proof is statistical: a green CI run shows no regression but cannot prove the race is gone. The reasoning above (an early measure explains both failure shapes) carries the fix.
