# The staging walkthrough

How `/verify` scouts a change's own OpenSpec scenarios, probes them against the deployed preview, and grades them. [The skill](../SKILL.md) owns the steps, verdicts, and hard rules; [the staging walkthrough](../../../../wiki/development/staging-walkthrough.md) owns the reasons.

**§ a** runs on `RESULT: READY` from `verify-staging.sh scout-check`, *before* `/save` and preflight, reading local files only. **§§ b–f** run on `RESULT: READY` from `verify-staging.sh preflight` (which prints `URL`, `RUN_DIR`, `SHA`, `BROWSER`), called only once § a produced a journey.

The browser is **[`agent-browser`](https://github.com/vercel-labs/agent-browser)**, a standalone CLI with its own Chrome, run on this machine. Request probes need only `curl`.

## a — scout the scenarios

Journeys come from the change's **own OpenSpec scenarios**, not the app's routes:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md`, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`).

Never the whole `openspec/specs/` surface.

**Match each scenario to the strongest probe that observes it end to end** on the deployed preview:

1. **Browser journey** — the `THEN` is about something rendered, such as a message appearing; driven with `agent-browser`.
2. **Request probe** — the `THEN` is about the request path with no UI (an endpoint's status or body, a webhook's acknowledgement, a redirect, a header); plain HTTP against the preview URL.
3. **State probe** — the `THEN` is an effect something *else* reads, such as a row a queue consumer writes. Only where an **existing** machine-level or stack-pack command reads that deployed state (a stack-pack repo's staging-database query): trigger over HTTP if possible, then read with that command. **Never add tooling to the repo**; with no existing command, the scenario is unverifiable.

A scenario **no probe reaches** (no deployed surface, or observable only by running the repo's code locally) is excluded and **noted by name with its reason**, so the report and PR comment list it as unverified. **Nothing left is `NONE`** ([the skill's Step 1](../SKILL.md#step-1--scout-first-before-spending-anything)): no `/save`, preflight, or probes.

**Walk destructive journeys; never skip them**: on a seeded fixture, a delete is often the scenario most worth walking.

## b — write the journeys

Files live per journey in `$RUN_DIR/journeys/`, named alike and numbered in walk order.

**`<id>.meta.json`** is for the grader, not the scripts: `then` is the scenario's **THEN** **verbatim**, never paraphrased; `probe` names the ladder rung:

```json
{
  "requirement": "Notes can be created",
  "scenario": "Submitting with no title is rejected",
  "probe": "browser",
  "then": "the form shows \"Title is required\" and nothing is saved"
}
```

**Browser journey → `<id>.batch.json`**: the ordered `agent-browser` commands as a JSON array. The driver feeds it **unread** to `agent-browser batch --bail --json`, so what you write is what runs. Before you write it, run `agent-browser skills get core` (`--full` for the command reference): it serves the guide for the installed version, so the commands never go stale.

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

**State probe →** any trigger is an ordinary `<id>.requests.txt`. The driver does **not** run the state read: after `run`, run the query yourself from `app/` and capture its output into the journey's evidence directory. `<staging-db>` is `env.staging`'s database name in `wrangler.jsonc`:

```bash
npx wrangler d1 execute <staging-db> --remote --env staging --command "SELECT count(*) FROM notes" \
  | tee "$RUN_DIR/evidence/import-processed/02-state.txt"
```

Evidence rules:

- **Wait after every navigating action, before the screenshot**, or it captures the *previous* page: `["wait", "--load", "networkidle"]`, or `["wait", "--text", "..."]` when the page updates without navigating.
- **Screenshot wherever a human would look**, to a numbered absolute path under `$RUN_DIR/evidence/<id>/`: `--full` for the whole page, `--annotate` when numbered element labels help.
- **Address elements semantically** (`find role`, `find text`, `find label`, preferred for anything a person could name) or by `@eN` refs from a `snapshot` in the same batch; re-`snapshot` after anything that navigates or re-renders, because refs go stale.
- **Write no assertions**: a journey produces evidence; it does not decide.
- Write preflight's preview URL in full: a batch file has no base URL. Only request-probe paths resolve against it.

## c — run it

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" run "$RUN_DIR" "$URL"
```

The driver runs every journey in order: batch files through `agent-browser`, each in its own browser session, and request files through `curl`. Then do any state-probe reads (§ b) before grading.

## d — grade against the written expectation

For each journey, read the evidence beside the `then` in `<id>.meta.json` — screenshots and `$RUN_DIR/evidence/<id>.result.json` for a browser journey, the numbered response captures for a request probe, the command output for a state probe — and decide whether it shows what the `THEN` describes.

**Show a browser journey's screenshots in the chat as you grade it**, before its verdict: open each numbered screenshot in walk order with your image tool, one plain line above each saying what it shows, so the person follows the batch. [Show what the browser is doing](../../../../wiki/development/browsing.md#show-what-the-browser-is-doing) owns the how; the walk's screenshots are already taken, so skip its `screenshot` step.

- **"No error" is not a pass, and neither is a bare `200`.** A clean batch whose screenshot lacks the message the `THEN` requires **fails**, as does a `200` without the body the `THEN` describes.
- A failing command is evidence, not a crash: "the endpoint answered 404" is what the walk exists to surface. `--bail` stops a browser journey there, so earlier evidence shows how far it got.
- A screenshot that looks like the previous page → check the landed URL in `<id>.url`. A missing wait is a defect in the journey, not the app.
- **Genuinely ambiguous → stop and ask the user**, showing the evidence and the `THEN` side by side, the readings as [options](../../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks). Never resolve it yourself.

Grade against the `THEN`'s words; no second agent grades. [The verdict table](../SKILL.md#verdicts) owns what each verdict reports.

## e — after a failure

The evidence is posted (§ f) before staging is reset. A failure is **in scope** only when both hold:

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

Anything else (pre-existing behavior, infrastructure, another capability's scenario) is out of scope. State the judgement in one line either way, so a reader can disagree: *"out of scope — the login form predates this branch"*.

Three failures are almost always **out of scope**, however fixable they look: nothing in the fixture to act on (fix the seed in its own change); a `401` from the app itself with a valid service token (the app authenticates wrongly); and a screenshot of the previous page (fix the journey's waits and re-walk).

## f — post the evidence, then clean up

One comment per `/verify` invocation, not per journey, on every verdict; verifying again appends a new comment, never edits the first. Make it complete as prose for a reader with no images: title it by verdict, name each journey's probe and **where it ran**, and list unverifiable scenarios by name:

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

On **`UNKNOWN`** or **`TIMEOUT`**, perhaps with no journeys, title it `## Staging walkthrough — UNKNOWN`, lead with **Not verified.**, and say what blocked the walk and what would make it runnable, never an empty-looking success. On every verdict, say what any heal did ("minted a service token and retried once"), or that it was *unavailable* (an Access wall with no Cloudflare token) and which credential is missing.

Then the screenshots:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
```

- **`RESULT: WALKED`** → it printed `<local-path>\t<public-url>` per file; substitute them into the comment so screenshots render inline.
- **`RESULT: NONE`** (no `WALK_MEDIA_BUCKET`) → cite the local paths; **not** a failure.
- Request- and state-probe evidence is text, quoted inline; only screenshots go through `publish`. The walk records no video.
