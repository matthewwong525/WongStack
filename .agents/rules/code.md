---
paths: ["app/**", "scripts/**", ".github/workflows/**"]
---

# Write less code

Write the least code that does the job, and write no code that does not. Decompose branchy logic into named helpers as you write it. Prefer a surgical edit to a file rewrite. After a substantive edit, run the project's checks. Do not use `any`; use `unknown` only when you narrow it before use.

The [`npm test` chain](../../app/package.json) owns all numeric limits and enforces them in CI. Before `/save` on a code change, run `/simplify`.

If your target uses other code paths, adjust the `paths:` list to match its layout.
