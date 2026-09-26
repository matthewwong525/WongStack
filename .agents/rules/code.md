---
paths: ["app/**", "scripts/**", ".github/workflows/**"]
---

# Write less code

Write the least code that does the job, and write no code that does not. Decompose branchy logic into named helpers as you write it. Prefer a surgical edit to a file rewrite. Do not use `any`; use `unknown` only when you narrow it before use.

The [`npm test` chain](../../app/package.json) owns all numeric limits and enforces them in CI, which is [the gate](../../wiki/development/the-change-loop.md#the-gate); nothing builds locally.

If your target uses other code paths, adjust the `paths:` list to match its layout.
