# Tasks

## 1. One light and dark switch on a plan

- [x] 1.1 `PlanView.tsx`: send the app's look with `inbox:hello` and post `inbox:theme` when it changes; tests in `PlanView.test.tsx`
- [x] 1.2 `review-kit.html`: in hosted mode, drop the page's own switch and apply `inbox:hello`/`inbox:theme` looks; ignore unknown values; tests where the review kit's behaviour is tested
- [x] 1.3 `CHANGELOG.md` `## Next` entry for the review-kit change

## 2. Long approval lines wrap on a phone

- [x] 2.1 `Decision.tsx`: the who-line wraps instead of truncating; the folded answer stays one line; test in `App.test.tsx`

## 3. Verification

- [x] 3.1 `npm test` in `app/` and the payload checks pass
- [x] 3.2 On the preview, a plan in dark mode shows one switch and switches in place; at 360 and 390px the who-line wraps and `scrollWidth` ≤ `clientWidth`
