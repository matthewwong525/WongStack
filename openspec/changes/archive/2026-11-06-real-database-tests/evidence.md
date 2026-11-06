# Evidence: real-database tests

Measured 2026-11-06 on the build machine (8 cores, 15 GB), Node from the app's install, `npm test` from `app/` three times in a row.

| Run | `npm test` | Runtime set (Vitest) | Runtime set (its own timer) | Slowest apps | Peak memory, largest process |
|---|---|---|---|---|---|
| 1 | pass, 42.6 s | 8.56 s | 7.1 s | access 2.5 s, hello 1.0 s, inbox 0.9 s | 1.31 GB |
| 2 | pass, 43.6 s | 9.20 s | 7.8 s | access 2.7 s, inbox 1.0 s, hello 0.9 s | 1.36 GB |
| 3 | pass, 44.8 s | 9.06 s | 7.7 s | access 2.8 s, inbox 0.9 s, hello 0.8 s | 1.37 GB |

- **Runtime median:** 9.06 s by Vitest's duration (7.7 s by the suite's own timer, which starts at its import), under the 20 s mark and the 30 s limit. Knowledge took 0.6 s each run.
- **Peak memory:** the largest process of `npm test` is the coverage run, at 1.37 GB. `npm run test:runtime` alone peaked at 645 MB.
- **Build and start:** 1.0 to 1.2 s; migrations and the seed: 1.0 to 1.5 s.

Checks of the checks, run by hand on scratch edits that were then put back:

- A 25 s wait in Hello's first step failed the full run: `The real-database tests took 32.7 s; the limit is 30 s. Slowest: hello 25.9 s, access 2.4 s, inbox 1.0 s`.
- A 28 s wait in Hello passed under `-t hello` (31.7 s in all, exit 0) and failed the full run (36.8 s, exit 1).
- `-t access` ran only Access's 6 cases; the other 9 were skipped, with one build and start.
- Changing Hello's greeting to `Hi, …` failed `hello > greets a seeded person who holds Hello…`.
- With `apps/hello.ts` and `apps/knowledge.ts` moved away, `check-runtime-tests.mjs` failed naming `hello` and `knowledge`.
- `npm run test:checks`: all 8 gates caught their bad samples, the new `runtime budget` gate included.
