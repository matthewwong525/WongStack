# The staging walkthrough

How `/walk` walks a change's own OpenSpec scenarios against the deployed preview and grades them. The skill owns *when* this runs, what each verdict reports, and the hard rules; this file owns *how* a walk is performed.

The phases split across two script calls, because scouting is cheap and running is not:

- **§ a (scout)** runs on `RESULT: READY` from `walk-staging.sh scout-check` (which prints `APP_DIR`), *before* `/save` and before any credential check. It reads local files only.
- **§§ b–f** run on `RESULT: READY` from `walk-staging.sh preflight` (which also prints `URL`, `RUN_DIR`, `SHA`, `ACCOUNT_ID`), which the skill calls only once § a produced at least one journey.

On `RESULT: NONE` from either call — not adopted, or nothing browser-observable — the skill has already reported and stopped, and nothing below applies.

The browser is a **Cloudflare Browser Run session**, attached over CDP with the pack's `CLOUDFLARE_API_TOKEN` — one session per journey, opened and closed by the runner. Journeys are written exactly as before; the only observable difference is that every action includes a round trip to the remote browser, which the 15-second step timeout already has headroom for. Don't tighten it.

> **Why `/walk` runs `/save` first.** CI green is what proves `cf-deploy.sh` published a version for *this* commit, which is what makes `preview-url.sh` return a URL that exists. Walking earlier walks the previous commit, or nothing. Never construct the URL by hand from a worker-name convention — a URL you built yourself can point at a commit that was never deployed and still answer 200.

## a — scout the scenarios

The journeys come from the change's **own OpenSpec scenarios**, not from reading the app's routes. Read:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md` — this change's promise, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`), which catches a change that edits behavior an existing spec covers without writing a delta for it.

Do **not** walk the whole `openspec/specs/` surface. A delta-scoped walk stays flat while a full-surface walk grows with the app forever. Regression coverage, if it is ever wanted, belongs in CI as saved tests — a different decision, deliberately not this one.

Then **keep only what a browser can see.** A per-commit alias serves HTTP and nothing else, so scenarios about queue consumers, cron triggers, and alarms are excluded — note which and why, so the report says "not walkable" rather than implying they passed.

**Nothing left after that filter is the answer `NONE`,** reached here at the cost of reading a few local files. Report it in one line and stop: no `/save`, no preflight, no browser session. This is the common case for a pure-backend change, and it is why the scout runs first.

**Destructive journeys are walked, not skipped.** Staging is a seeded fixture database; deleting things is often the scenario most worth walking, and there is no merge riding on the result to create pressure against it.

## b — write the journeys

One `.mjs` file per journey in `$RUN_DIR/journeys/`, numbered in walk order. The scenario's **WHEN** becomes the steps; its **THEN** is carried across **verbatim** — never paraphrased, never "improved":

```js
export const meta = {
  id: 'empty-title-rejected',
  requirement: 'Notes can be created',
  scenario: 'Submitting with no title is rejected',
  then: 'the form shows "Title is required" and nothing is saved',  // ← the spec's words
}
export default async function journey(page, step) {
  await page.goto('/')                 // baseURL is the preview URL
  await step('landing')                // step() screenshots and records
  await page.getByRole('button', { name: 'New note' }).click()
  await step('empty form')
  await page.getByRole('button', { name: 'Save' }).click()
  await step('after submitting empty') // ← the THEN is judged on this screenshot
}
```

Put a `step()` wherever a human would look. Write **no assertions** — the script's job is to produce evidence, not to decide. An assertion here would bake in your guess at correctness and then be deleted with the run.

These files live in the temp run directory and nowhere else — see the skill's hard rule on never writing inside the repo.

## c — run it

```bash
bash "$ROOT/.claude/skills/walk/scripts/walk-staging.sh" run "$RUN_DIR" "$APP_DIR" "$URL"
```

## d — grade against the written expectation

Read `evidence.json`, then **look at the screenshots** — each journey's `then` is right there beside them. For each journey, decide whether the evidence shows what the `THEN` describes.

- **"No exception was thrown" is not a pass.** A journey whose script completed cleanly but whose screenshot lacks the message the `THEN` requires **fails**. This is the whole reason the verdict is not in the script.
- A thrown step is evidence, not a crash — "the button was never there" is exactly what the walk exists to surface.
- The `consoleErrors` array is context for a screenshot that looks right, never a verdict on its own.
- **Genuinely ambiguous? Stop and ask the user**, showing the screenshot and the `THEN` side by side. Do not resolve it in either direction yourself.

There is no second judging agent by design: the `THEN` was written by `/plan`, before this walk existed, for reasons that had nothing to do with passing it. That provenance is the external check. Honor it by grading against the words that are there.

The verdict this produces feeds the table in [`SKILL.md`](../SKILL.md#verdicts), which owns what each one reports.

## e — after a failure

Post the evidence first (§ f — a failing walk's screenshots are the point), then reset staging:

```bash
(cd "$APP_DIR" && npm run db:reset:staging)   # only on failure, never on a pass
```

The reset is not tidiness: a walk that begins against the half-mutated database the failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers. A **passing** walk's data is left exactly where it is — staging is a fixture, not a preserve.

Then decide whether this failure is yours to fix. **Both halves of the test must hold:**

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

**In scope** → fix the code, invoke `/save`, and walk again — at most **two** fix attempts per invocation, then stop and report like any failure. **Out of scope** → stop after the reset and report what failed and what to look at.

State the judgement in the report either way, in one line: *"in scope — the empty-title check is this change's own code"*, or *"out of scope — the login form predates this branch"*. A reader who disagrees can then say so, which is not possible if the reasoning stayed in your head.

Two failure shapes are almost always **out of scope** even when they look fixable: a journey that fails because staging's seed has nothing to act on (fix the seed deliberately, in its own change), and a `401` from the app itself with a valid service token (the Worker is authenticating the wrong way — see the runbook's note on verifying the signed assertion).

## f — post the evidence, then clean up

One comment per `/walk` invocation (not per journey), posted on **every** verdict — `SUCCESS`, `FAILURE`, `UNKNOWN`, and `TIMEOUT` alike. Nothing is being blocked that would otherwise carry the news, so the comment *is* the result. Walking again appends another comment rather than editing the first; the PR should carry an honest log of attempts.

Write it so it is complete as prose — a reader with no images still gets the whole story. Title it by verdict:

```bash
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/walk/scripts/walk-staging.sh" cleanup "$RUN_DIR"
```

Write `$RUN_DIR/comment.md` in this shape:

```markdown
## Staging walkthrough — <verdict>

Walked <N> scenario(s) against <url> at `<short-sha>`.

### ✅ Submitting with no title is rejected
> **THEN** the form shows "Title is required" and nothing is saved

`landing` → `empty form` → `after submitting empty`
The message appears and the list is unchanged.

![after submitting empty](<url-or-path>)
[video](<url-or-path>)

### ❌ A note can be deleted
> **THEN** the note disappears from the list and the count drops to 2

`landing` → `open note` → `after delete`
The note is still listed and the count still reads 3.

![after delete](<url-or-path>)
[video](<url-or-path>)

### ⛔ Not walkable
- *Imports are processed from the queue* — queue consumers don't run on a preview alias (HTTP only).
```

On **`UNKNOWN`** or **`TIMEOUT`** there may be no journeys to list. Say so in those words — *the walk could not be verified*, and what would make it runnable — rather than posting an empty-looking success:

```markdown
## Staging walkthrough — UNKNOWN

**Not verified.** The walk could not run against <url> at `<short-sha>`.

The preview responded with a Cloudflare Access challenge. `/walk` minted a service
token and retried once; the retry was challenged again, so the Access policy is
not accepting it. Check the policy's service-token rule, then run `/walk` again.
```

When a heal ran, **say so and say what it did** — "minted a service token and retried once", "granted Browser Rendering Edit and retried once". An `UNKNOWN` that hides its repair attempt reads as an untried walk, and the next reader repeats the work.

Then the media:

```bash
bash "$ROOT/.claude/skills/walk/scripts/walk-staging.sh" publish "$RUN_DIR"
```

- **`RESULT: WALKED`** → it printed `<local-path>\t<public-url>` per file; substitute them into the comment. Screenshots render inline, video is a link.
- **`RESULT: NONE`** (no `WALK_MEDIA_BUCKET`) → cite the local paths. This is **not** a failure and is not reported as one — the prose is the record; media is corroboration.
- **A journey whose `video` is `null`** (recording unavailable over the remote session) → say "video unavailable — screenshots only" for that journey rather than omitting the line silently. The absence of video never changes a verdict.

**Video is a link at every rung.** GitHub plays video inline only for `user-attachments` URLs, which are produced by dragging a file into the web UI — there is no `gh` or REST path to that endpoint. Don't go looking for one.

Run `cleanup` on every exit path, including when the skill stops on `UNKNOWN` or asks the user a question.
