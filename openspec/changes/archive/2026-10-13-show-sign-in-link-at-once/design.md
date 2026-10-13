# Design

## Context

See proposal.md - Why. `cloudflared` prints the sign-in address; `loginUrl()` in `scripts/employee-bootstrap.mjs` passes on only `https://<origin>/cdn-cgi/access/cli` with no JWT, and `main()` writes it to stderr as `Sign in with your own company account: <link>`. The address carries `token=` inside `redirect_url`, and both texts in `app/worker/employee-access/prompt.ts` forbid printing login output; the apps-only text allows the link only *when a browser is unavailable*.

## Goals / Non-Goals

**Goals:** an assistant that reads either the prompt or the tool's output knows to show the link now.

**Non-Goals:** changing `loginUrl()`'s checks, the sign-in flow, or stdout's JSON summary.

## Decisions

- **Say it in both places.** The prompt is read before the run; the stderr line is read at the moment of the decision, and reaches people who copied an older prompt once they update. One alone leaves the other contradicting it.
- **One exported `signInNotice(link)`** in `employee-bootstrap.mjs`, used by its `main()` and by `scripts/company-api.mjs`, so the two tools can not drift. Text: an instruction line (show this link to the person now and wait; safe to show: this business's checked sign-in address, not a credential), then the link alone on the next line so it copies clean.
- **The project text stays within its limits**: at most six lines, shorter than the apps-only text, and free of the words its test bans (`token`, `password`, `key`).
- **Re-pin by the existing procedure** ([publish checked artifact pins](../../../wiki/stack/employee-project.md#publish-checked-artifact-pins)): a commit holding the final bootstrap bytes, then its SHA and the file's SHA-256 in `bootstrap-release.json`.

## Risks / Trade-offs

- [The pinned commit is not public until the branch is pushed] → the save pushes it before the check; confirm the raw address serves the digest after.
- [An assistant still pipes output to a file and never reads it] → the prompt line covers that case.
