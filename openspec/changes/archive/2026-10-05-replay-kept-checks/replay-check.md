# A real replay on this branch's preview

Run on 2026-10-05 against `https://e2e-testing-wongstack-staging.matthewwong525.workers.dev` at commit `d00e9a0f`, after the save's checks passed. `preflight` printed `TURN=held`, `SEEDED=yes`, `PLAYGROUND=yes`; `cleanup` gave the turn back. No kept file was committed.

The check was made the way a walk makes one, not written by hand: a browser journey opened `/nothing-here` for the `app-scaffold` scenario *An unknown address*, the screenshot showed "Page not found" and a "Go home" link, and `keep` built the candidate with `{"text":"Page not found"}`, `{"text":"Go home"}`, `{"path":"/nothing-here"}`. `keep` set `writes: false` and swapped the preview address for `{url}`.

| Run | Output | Seconds |
|---|---|---|
| `replay --from <run-dir>/keep`, as recorded | `same app-scaffold/an-unknown-address` · `REPLAY=same 1, changed 0, skipped 0, not-run 0; 14s` | 14.0 |
| the same, first expectation altered to "Page was found" | `changed app-scaffold/an-unknown-address — the page no longer shows "Page was found"` · `REPLAY=same 0, changed 1, skipped 0, not-run 0; 16s` | 16.2 |
| `check`, then `replay` from the project, on a file that was not valid JSON | `unreadable … it is not a verify-journey-1 file` · `not-run … unreadable` · `REPLAY=… not-run 1; 0s` | 0.1 |

What this shows and does not:

- A replay with no model call returns `same` for a page that still shows what was recorded, and `changed`, naming the missing text, for one that does not.
- Both timed runs are proofs (`--from`), which rebuild staging first, so about 12 of each run's seconds are the rebuild. A plain replay of a read-only check, with no rebuild, was not timed: the third run was meant to, but the copy of the candidate it used was damaged by the command that made it, so it showed the `not-run` path instead.
- An earlier attempt at the second run changed nothing in the file and so returned `same`; the altered file was confirmed by reading it back before the run recorded above.
- Not shown here: a writing check, a rebuild between two checks, the two-minute limit, and a check kept and installed by a real publish. Those are the open `verify` thread.
