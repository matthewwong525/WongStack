# The staging walkthrough

How `/ship` Step 4.5 walks a change's own OpenSpec scenarios against the deployed preview and grades them. The skill owns *when* this runs, what each verdict does to the merge, and the hard rules; this file owns *how* a walk is performed.

Everything here runs only on `RESULT: READY` from `walk-staging.sh preflight` (which also prints `APP_DIR`, `URL`, `RUN_DIR`, `SHA`). On `RESULT: NONE` the skill has already gone to Step 5 and nothing below applies.

> **Why the walk sits after CI.** CI green is what proves `cf-deploy.sh` published a version for *this* commit, which is what makes `preview-url.sh` return a URL that exists. Walking earlier walks the previous commit, or nothing. Never construct the URL by hand from a worker-name convention — a URL you built yourself can point at a commit that was never deployed and still answer 200.

## a — scout the scenarios

The journeys come from the change's **own OpenSpec scenarios**, not from reading the app's routes. Read:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md` — this change's promise, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`), which catches a change that edits behavior an existing spec covers without writing a delta for it.

Do **not** walk the whole `openspec/specs/` surface. `/ship` runs once per change; a delta-scoped walk stays flat while a full-surface walk grows with the app forever. Regression coverage, if it is ever wanted, belongs in CI as saved tests — a different decision, deliberately not this one.

Then **keep only what a browser can see.** A per-commit alias serves HTTP and nothing else, so scenarios about queue consumers, cron triggers, and alarms are excluded — note which and why, so the report says "not walkable" rather than implying they passed.

**Destructive journeys are walked, not skipped.** Staging is a seeded fixture database; deleting things is often the scenario most worth walking, and a gate that must pass creates quiet pressure to shed exactly that coverage. Resist it.

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
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" run "$RUN_DIR" "$APP_DIR" "$URL"
```

## d — grade against the written expectation

Read `evidence.json`, then **look at the screenshots** — each journey's `then` is right there beside them. For each journey, decide whether the evidence shows what the `THEN` describes.

- **"No exception was thrown" is not a pass.** A journey whose script completed cleanly but whose screenshot lacks the message the `THEN` requires **fails**. This is the whole reason the verdict is not in the script.
- A thrown step is evidence, not a crash — "the button was never there" is exactly what the walk exists to surface.
- The `consoleErrors` array is context for a screenshot that looks right, never a verdict on its own.
- **Genuinely ambiguous? Stop and ask the user**, showing the screenshot and the `THEN` side by side. Do not resolve it in either direction yourself, and do not merge.

There is no second judging agent by design: the `THEN` was written by `/plan`, before this walk existed, for reasons that had nothing to do with passing it. That provenance is the external check. Honor it by grading against the words that are there.

The verdict this produces feeds the table in [`SKILL.md`](../SKILL.md#step-45--walk-staging-only-if-this-repo-opted-in), which owns what each one does to the merge.

## e — recover from a failure

Reset staging first, then fix:

```bash
(cd "$APP_DIR" && npm run db:reset:staging)   # only on failure, never on a pass
```

Then fix → `git push` → re-run **Step 4** → re-run **Step 4.5**. These attempts share Step 4's cap; they are not a second budget.

The reset is not tidiness: a retry against the half-mutated database the failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers. A **passing** walk's data is left exactly where it is — staging is a fixture, not a preserve.

## f — post the evidence, then clean up

One comment per `/ship` run (not per journey), written so it is complete as prose — a reader with no images still gets the whole story:

```bash
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" cleanup "$RUN_DIR"
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

### ⛔ Not walkable
- *Imports are processed from the queue* — queue consumers don't run on a preview alias (HTTP only).
```

Then the media:

```bash
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" publish "$RUN_DIR"
```

- **`RESULT: WALKED`** → it printed `<local-path>\t<public-url>` per file; substitute them into the comment. Screenshots render inline, video is a link.
- **`RESULT: NONE`** (no `WALK_MEDIA_BUCKET`) → cite the local paths. This is **not** a failure and is not reported as one — the prose is the record; media is corroboration.

**Video is a link at every rung.** GitHub plays video inline only for `user-attachments` URLs, which are produced by dragging a file into the web UI — there is no `gh` or REST path to that endpoint. Don't go looking for one.

Run `cleanup` on every exit path, including when the skill stops on `UNKNOWN` or asks the user a question.
