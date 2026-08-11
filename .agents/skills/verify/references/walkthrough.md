# The staging walkthrough

How `/verify` exercises a change's own OpenSpec scenarios against the deployed preview and grades them. The skill owns *when* this runs, what each verdict reports, and the hard rules; this file owns *how* a walk is performed.

The phases split across two script calls, because scouting is cheap and running is not:

- **§ a (scout)** runs on `RESULT: READY` from `verify-staging.sh scout-check`, *before* `/save` and before preflight. It reads local files only.
- **§§ b–f** run on `RESULT: READY` from `verify-staging.sh preflight` (which prints `URL`, `RUN_DIR`, `SHA`, `BROWSER`), which the skill calls only once § a produced at least one journey. Pass `--no-browser` when no journey is a browser journey.

On `RESULT: NONE` — no scenario any probe can reach — the skill has already reported and stopped, and nothing below applies.

The browser is **[`agent-browser`](https://github.com/vercel-labs/agent-browser)**, a standalone CLI that carries its own Chrome and runs it on this machine. Preflight installs it when a browser journey needs it — and skips it entirely when none does. Nothing is ever added to the repository for it — that is what lets a repo in any language walk. Request probes need only `curl`, which every machine already has.

> **Why `/verify` runs `/save` first.** CI green is what proves the deploy published a version for *this* commit, which is what makes `preview-url.sh` return a URL that exists. Verifying earlier verifies the previous commit, or nothing. Never construct the URL by hand from a naming convention — a URL you built yourself can point at a commit that was never deployed and still answer 200.

## a — scout the scenarios

The journeys come from the change's **own OpenSpec scenarios**, not from reading the app's routes. Read:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md` — this change's promise, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`), which catches a change that edits behavior an existing spec covers without writing a delta for it.

Do **not** walk the whole `openspec/specs/` surface. A delta-scoped walk stays flat while a full-surface walk grows with the app forever. Regression coverage, if it is ever wanted, belongs in CI as saved tests — a different decision, deliberately not this one.

Then **match each scenario to the strongest probe that can observe it end to end** against the deployed preview:

1. **Browser journey** — the `THEN` is about something rendered: a message appears, a list updates, a count drops. Driven with `agent-browser`.
2. **Request probe** — the `THEN` is about the request path with no UI: an endpoint's status code or body, a webhook's acknowledgement, a redirect, a header. Driven as plain HTTP requests against the preview URL; no browser involved.
3. **State probe** — the `THEN` is an effect something *else* can read: a queue consumer writes a row, a cron marks a record. Usable only where an **existing** machine-level or stack-pack command reads that deployed state (for a stack-pack repo, a staging-database query). The shape is: trigger over HTTP where a trigger exists, then read the state with the existing command. **Never add tooling to the repo** — a scenario with no existing command to read it is unverifiable, not a reason to invent one.

A scenario **no probe reaches** — no deployed surface, or observable only by building or executing the repo's code locally — is excluded and **noted by name with its reason**, so the report and the PR comment list it as unverified rather than implying it passed.

**Nothing left after the ladder is the answer `NONE`,** reached here at the cost of reading a few local files. Report it in one line and stop: no `/save`, no preflight, no probes. This is the case for a pure-library change with no deployed surface at all — rarer than it was when only browsers counted.

**Destructive journeys are walked, not skipped.** Where staging is a seeded fixture, deleting things is often the scenario most worth walking, and there is no merge riding on the result to create pressure against it.

## b — write the journeys

Files live per journey in `$RUN_DIR/journeys/`, named alike and numbered in walk order.

**`<id>.meta.json`** — for the grader, never read by the scripts. The scenario's **THEN** is carried across **verbatim**, never paraphrased, never "improved" — and `probe` names the ladder rung:

```json
{
  "requirement": "Notes can be created",
  "scenario": "Submitting with no title is rejected",
  "probe": "browser",
  "then": "the form shows \"Title is required\" and nothing is saved"
}
```

**Browser journey → `<id>.batch.json`** — the ordered `agent-browser` commands, as a JSON array. The driver feeds this to `agent-browser batch --bail --json` **unread**, so there is nothing between what you wrote and what runs:

```json
[
  ["open", "https://preview.example.com/"],
  ["wait", "--load", "networkidle"],
  ["screenshot", "$RUN_DIR/evidence/empty-title/01-landing.png", "--full"],
  ["find", "role", "button", "click", "--name", "New note"],
  ["wait", "--load", "networkidle"],
  ["screenshot", "$RUN_DIR/evidence/empty-title/02-empty-form.png", "--full"],
  ["find", "role", "button", "click", "--name", "Save"],
  ["wait", "--load", "networkidle"],
  ["screenshot", "$RUN_DIR/evidence/empty-title/03-after-submit.png", "--full"]
]
```

**Request probe → `<id>.requests.txt`** — one step per line, tab-separated: `METHOD`, a path (resolved against the preview URL) or a full URL, and an optional JSON body. The driver curls each line in order with the Access headers applied and captures the full response — status line, headers, body — as that step's evidence:

```
POST	/api/notes	{"title":""}
GET	/api/notes
```

**State probe →** its trigger, when one exists, is an ordinary `<id>.requests.txt`. The state read is **not** run by the driver: after `run` completes, execute the existing command yourself and capture its output into the journey's evidence directory, so the command and its result are on disk beside everything else:

```bash
npm run db:query:staging -- "SELECT count(*) FROM notes" \
  | tee "$RUN_DIR/evidence/import-processed/02-state.txt"
```

Rules that decide whether the evidence is worth anything:

- **Wait after every navigating action, before the screenshot.** A screenshot taken before the destination paints captures the *previous* page. Verified, not theoretical: without the wait, a click that navigated produced two byte-identical screenshots of the page it had already left — a walk that would have graded confidently and wrongly. Use `["wait", "--load", "networkidle"]`, or `["wait", "--text", "..."]` when the page updates without a navigation.
- **Screenshot wherever a human would look**, with an absolute path under `$RUN_DIR/evidence/<id>/`, numbered in order. `--full` for whole-page capture; `--annotate` when numbered element labels would make the evidence clearer.
- **Address elements semantically** — `find role`, `find text`, `find label` — or by `@eN` refs taken from a `snapshot` in the same batch. Refs go stale the moment the page changes, so re-`snapshot` after anything that navigates or re-renders. Prefer semantic locators for anything a person could name.
- **Write no assertions.** The journey's job is to produce evidence, not to decide. A request probe records the response it got, not the response you expected; an assertion here would bake in your guess at correctness and then be deleted with the run.
- The URL is the preview URL preflight printed. There is no implicit base URL in a batch file — write it in full. Request-probe paths are the one exception: the driver resolves them against that URL so the file stays readable.

These files live in the temp run directory and nowhere else — see the skill's hard rule on never writing inside the repo.

## c — run it

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" run "$RUN_DIR" "$URL"
```

The driver runs every journey: batch files through `agent-browser` (each journey gets its own browser session, so a session that dies mid-journey costs that journey alone) and request files through `curl`, in journey order. Then perform any state-probe reads yourself, per § b, before grading.

## d — grade against the written expectation

For each journey, read the captured evidence with that journey's `then` from `<id>.meta.json` beside it — screenshots and `$RUN_DIR/evidence/<id>.result.json` for a browser journey, the numbered response captures for a request probe, the command output for a state probe. Decide whether the evidence shows what the `THEN` describes.

- **"No error was reported" is not a pass — and neither is a bare `200`.** A journey whose batch completed cleanly but whose screenshot lacks the message the `THEN` requires **fails**; a response that answered `200` without the body the `THEN` describes **fails**. This is the whole reason the verdict is not in the script.
- A failing command is evidence, not a crash — "the button was never there" and "the endpoint answered 404" are exactly what the walk exists to surface. `--bail` stops a browser journey there, so the evidence before it is the story of how far it got.
- Check the landed URL in `<id>.url` when a screenshot looks unexpectedly like the previous page: that is the missing-wait signature, and it is a defect in the journey rather than in the app.
- **Genuinely ambiguous? Stop and ask the user**, showing the evidence and the `THEN` side by side. Do not resolve it in either direction yourself.

There is no second judging agent by design: the `THEN` was written by `/plan`, before this walk existed, for reasons that had nothing to do with passing it. That provenance is the external check. Honor it by grading against the words that are there.

The verdict this produces feeds the table in [`SKILL.md`](../SKILL.md#verdicts), which owns what each one reports.

## e — after a failure

Post the evidence first (§ f — a failing walk's evidence is the point), then reset staging where the repo has that command:

```bash
npm run db:reset:staging   # only on failure, never on a pass; stack-pack repos
```

The reset is not tidiness: a walk that begins against the half-mutated database the failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers. A **passing** walk's data is left exactly where it is — staging is a fixture, not a preserve.

Then decide whether this failure is yours to fix. **Both halves of the test must hold:**

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

**In scope** → fix the code, invoke `/save`, and verify again — at most **two** fix attempts per invocation, then stop and report like any failure. **Out of scope** → stop after the reset and report what failed and what to look at.

State the judgement in the report either way, in one line: *"in scope — the empty-title check is this change's own code"*, or *"out of scope — the login form predates this branch"*. A reader who disagrees can then say so, which is not possible if the reasoning stayed in your head.

Three failure shapes are almost always **out of scope** even when they look fixable: a journey that fails because the fixture has nothing to act on (fix the seed deliberately, in its own change); a `401` from the app itself with a valid service token (the app is authenticating the wrong way); and a screenshot that shows the previous page (fix the journey's waits and re-walk — the app never misbehaved).

## f — post the evidence, then clean up

One comment per `/verify` invocation (not per journey), posted on **every** verdict — `SUCCESS`, `FAILURE`, `UNKNOWN`, and `TIMEOUT` alike. Nothing is being blocked that would otherwise carry the news, so the comment *is* the result. Verifying again appends another comment rather than editing the first; the PR should carry an honest log of attempts.

Write it so it is complete as prose — a reader with no images still gets the whole story. Name each journey's probe, and list unverifiable scenarios by name. Title it by verdict:

```bash
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" cleanup "$RUN_DIR"
```

Write `$RUN_DIR/comment.md` in this shape:

```markdown
## Staging walkthrough — <verdict>

Verified <N> scenario(s) against <url> at `<short-sha>` — <n> in a local Chrome on the machine that ran `/verify`, <m> by direct request.

### ✅ Submitting with no title is rejected — browser
> **THEN** the form shows "Title is required" and nothing is saved

`landing` → `empty form` → `after submitting empty`
The message appears and the list is unchanged.

![after submitting empty](<url-or-path>)

### ✅ Creating without a title answers 422 — request
> **THEN** the endpoint answers 422 and no note is created

`POST /api/notes {"title":""}` → `422`, body names the missing title; `GET /api/notes` → the list is unchanged.

### ❌ A note can be deleted — browser
> **THEN** the note disappears from the list and the count drops to 2

`landing` → `open note` → `after delete`
The note is still listed and the count still reads 3.

![after delete](<url-or-path>)

### ⛔ Unverified
- *Imports are processed from the queue* — no existing command reads the queue's effect; its e2e home is a CI test.
```

Always say **where each probe ran**. A walk driven on the machine that invoked it depended on that machine, and a reader comparing two walks needs to know that.

On **`UNKNOWN`** or **`TIMEOUT`** there may be no journeys to list. Say so in those words — *the walk could not be verified*, and what would make it runnable — rather than posting an empty-looking success:

```markdown
## Staging walkthrough — UNKNOWN

**Not verified.** The walk could not run against <url> at `<short-sha>`.

The preview responded with a Cloudflare Access challenge. `/verify` minted a service
token and retried once; the retry was challenged again, so the Access policy is
not accepting it. Check the policy's service-token rule, then run `/verify` again.
```

When a heal ran, **say so and say what it did** — "minted a service token and retried once". An `UNKNOWN` that hides its repair attempt reads as an untried walk, and the next reader repeats the work. Where the heal was *unavailable* — an Access wall with no Cloudflare token — say that instead, and name the credential that would have allowed it.

Then the screenshots:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
```

- **`RESULT: WALKED`** → it printed `<local-path>\t<public-url>` per file; substitute them into the comment so screenshots render inline.
- **`RESULT: NONE`** (no `WALK_MEDIA_BUCKET`) → cite the local paths. This is **not** a failure and is not reported as one — the prose is the record; pictures are corroboration. (The variable keeps its historical `WALK_` name: renaming a variable users already set breaks them silently.)
- Request- and state-probe evidence is text and is quoted inline in the comment; only screenshots go through `publish`.

**There is no video.** The walk captures screenshots only, and the comment neither links a recording nor reports one as missing. Don't go looking for a video path that used to exist.

Run `cleanup` on every exit path, including when the skill stops on `UNKNOWN` or asks the user a question.
