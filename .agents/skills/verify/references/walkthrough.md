# The staging walkthrough

How `/verify` scouts a change's own OpenSpec scenarios, probes them against the deployed preview, and grades them. [The skill](../SKILL.md) owns the steps, verdicts, and hard rules; [the staging walkthrough](../../../../wiki/development/staging-walkthrough.md) owns the reasons.

The phases split across two script calls:

- **§ a (scout)** runs on `RESULT: READY` from `verify-staging.sh scout-check`, *before* `/save` and preflight, reading local files only.
- **§§ b–f** run on `RESULT: READY` from `verify-staging.sh preflight` (which prints `URL`, `RUN_DIR`, `SHA`, `BROWSER`), called only once § a produced a journey. Pass `--no-browser` when no journey is a browser journey.

On `RESULT: NONE` (no scenario any probe can reach) the skill has already reported and stopped.

The browser is **[`agent-browser`](https://github.com/vercel-labs/agent-browser)**, a standalone CLI with its own Chrome, run on this machine. Request probes need only `curl`.

## a — scout the scenarios

Journeys come from the change's **own OpenSpec scenarios**, not the app's routes:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md`, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`).

Do **not** walk the whole `openspec/specs/` surface.

**Match each scenario to the strongest probe that can observe it end to end** against the deployed preview:

1. **Browser journey**: the `THEN` is about something rendered, such as a message appearing. Driven with `agent-browser`.
2. **Request probe**: the `THEN` is about the request path with no UI: an endpoint's status or body, a webhook's acknowledgement, a redirect, a header. Plain HTTP requests against the preview URL.
3. **State probe**: the `THEN` is an effect something *else* reads, such as a row a queue consumer writes. Usable only where an **existing** machine-level or stack-pack command reads that deployed state (a stack-pack repo's staging-database query): trigger over HTTP if possible, then read the state with that command. **Never add tooling to the repo**; with no existing command, the scenario is unverifiable.

A scenario **no probe reaches** (no deployed surface, or observable only by running the repo's code locally) is excluded and **noted by name with its reason**, so the report and PR comment list it as unverified.

**Nothing left after the ladder is the answer `NONE`.** Report it in one line and stop: no `/save`, no preflight, no probes.

**Walk destructive journeys; do not skip them.** On a seeded fixture, a delete is often the scenario most worth walking.

## b — write the journeys

Files live per journey in `$RUN_DIR/journeys/`, named alike and numbered in walk order.

**`<id>.meta.json`** is for the grader, not the scripts. Copy the scenario's **THEN** **verbatim**, never paraphrased; `probe` names the ladder rung:

```json
{
  "requirement": "Notes can be created",
  "scenario": "Submitting with no title is rejected",
  "probe": "browser",
  "then": "the form shows \"Title is required\" and nothing is saved"
}
```

**Browser journey → `<id>.batch.json`**: the ordered `agent-browser` commands as a JSON array. The driver feeds it to `agent-browser batch --bail --json` **unread**, so what you write is what runs:

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

**Request probe → `<id>.requests.txt`**: one tab-separated step per line: `METHOD`, a path (resolved against the preview URL) or full URL, and an optional JSON body. The driver curls each line in order with the Access headers and captures the full response as evidence:

```
POST	/api/notes	{"title":""}
GET	/api/notes
```

**State probe →** its trigger, if any, is an ordinary `<id>.requests.txt`. The driver does **not** run the state read: after `run`, run the existing command yourself and capture its output into the journey's evidence directory:

```bash
npm run db:query:staging -- "SELECT count(*) FROM notes" \
  | tee "$RUN_DIR/evidence/import-processed/02-state.txt"
```

Evidence rules:

- **Wait after every navigating action, before the screenshot**, or the screenshot captures the *previous* page. Use `["wait", "--load", "networkidle"]`, or `["wait", "--text", "..."]` when the page updates without navigating.
- **Screenshot wherever a human would look**, to a numbered absolute path under `$RUN_DIR/evidence/<id>/`. `--full` for the whole page; `--annotate` for numbered element labels.
- **Address elements semantically** (`find role`, `find text`, `find label`) or by `@eN` refs from a `snapshot` in the same batch. Re-`snapshot` after anything that navigates or re-renders, because refs go stale. Prefer semantic locators for anything a person could name.
- **Write no assertions.** A journey produces evidence; it does not decide.
- Write the preview URL preflight printed in full; a batch file has no implicit base URL. Only request-probe paths resolve against it.

These files live in the temp run directory and nowhere else.

## c — run it

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" run "$RUN_DIR" "$URL"
```

The driver runs every journey in order: batch files through `agent-browser`, each in its own browser session, and request files through `curl`. Then do any state-probe reads yourself, per § b, before grading.

## d — grade against the written expectation

For each journey, read the evidence beside its `then` from `<id>.meta.json`: screenshots and `$RUN_DIR/evidence/<id>.result.json` for a browser journey, the numbered response captures for a request probe, the command output for a state probe. Decide whether the evidence shows what the `THEN` describes.

- **"No error was reported" is not a pass, and neither is a bare `200`.** A clean batch whose screenshot lacks the message the `THEN` requires **fails**; a `200` without the body the `THEN` describes **fails**.
- A failing command is evidence, not a crash: "the endpoint answered 404" is what the walk exists to surface. `--bail` stops a browser journey there, so the earlier evidence shows how far it got.
- When a screenshot looks like the previous page, check the landed URL in `<id>.url`: that is a missing wait, a defect in the journey, not the app.
- **Genuinely ambiguous? Stop and ask the user**, showing the evidence and the `THEN` side by side, with the readings as [options](../../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks). Do not resolve it either way yourself.

Grade against the `THEN`'s words; no second agent grades. The verdict feeds the table in [`SKILL.md`](../SKILL.md#verdicts), which owns what each one reports.

## e — after a failure

The evidence is posted (§ f) before staging is reset. A failure is **in scope** only when both hold:

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

Anything else (pre-existing behavior, infrastructure, another capability's scenario) is out of scope. State the judgement in one line either way, so a reader can disagree: *"in scope — the empty-title check is this change's own code"*, or *"out of scope — the login form predates this branch"*.

Three failures are almost always **out of scope** even when they look fixable: nothing in the fixture to act on (fix the seed in its own change); a `401` from the app itself with a valid service token (the app authenticates wrongly); and a screenshot of the previous page (fix the journey's waits and re-walk).

## f — post the evidence, then clean up

One comment per `/verify` invocation, not per journey, on every verdict; verifying again appends a new comment, never edits the first. Make it complete as prose for a reader with no images, name each journey's probe, list unverifiable scenarios by name, and title it by verdict:

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

Always say **where each probe ran**.

On **`UNKNOWN`** or **`TIMEOUT`**, with perhaps no journeys to list, say plainly *the walk could not be verified* and what would make it runnable, never an empty-looking success:

```markdown
## Staging walkthrough — UNKNOWN

**Not verified.** The walk could not run against <url> at `<short-sha>`.

The preview responded with a Cloudflare Access challenge. `/verify` minted a service
token and retried once; the retry was challenged again, so the Access policy is
not accepting it. Check the policy's service-token rule, then run `/verify` again.
```

When a heal ran, **say what it did**: "minted a service token and retried once". When it was *unavailable* (an Access wall with no Cloudflare token), say so and name the missing credential.

Then the screenshots:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
```

- **`RESULT: WALKED`** → it printed `<local-path>\t<public-url>` per file; substitute them into the comment so screenshots render inline.
- **`RESULT: NONE`** (no `WALK_MEDIA_BUCKET`) → cite the local paths. This is **not** a failure.
- Request- and state-probe evidence is text, quoted inline in the comment; only screenshots go through `publish`.

The walk captures screenshots only; there is no video.
