# The staging walkthrough

Run deployed scenario probes and grade evidence. [The skill](../SKILL.md) owns order and verdicts; [the wiki](../../../../wiki/development/staging-walkthrough.md) owns why.

## a — scout the scenarios

Scout the change's **own OpenSpec scenarios**:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md`, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`).

**Match each scenario to the strongest probe that observes it end to end** on the deployed preview:

1. **Browser journey** — the `THEN` is about something rendered, such as a message appearing; driven with `agent-browser`.
2. **Request probe** — the `THEN` is about the request path with no UI (an endpoint's status or body, a webhook's acknowledgement, a redirect, a header); plain HTTP against the preview URL.
3. **State probe** — the `THEN` is an effect something *else* reads, such as a row a queue consumer writes. Only where an **existing** machine-level or stack-pack command reads that deployed state (a stack-pack repo's staging-database query): trigger over HTTP if possible, then read with that command. With no existing command, the scenario is unverifiable.

A scenario **no probe reaches** (no deployed surface, or observable only by running the repo's code locally) is excluded and **noted by name with its reason**, so the report and PR comment list it as unverified.

Before writing journeys, keep a ledger in the run folder: each scenario's probe, dependencies, runnable or blocked status, and cleanup. A blocked or failed prerequisite pauses only its dependents; finish independent safe checks before asking for help. Stage only runnable journeys, never a blocked trigger.

**Walk destructive journeys on disposable data.** Before any write, confirm deployed bindings are staging-only and integrations use known sandbox destinations; a staging URL alone proves neither. Use isolated fixtures or records this invocation owns, with known safe cleanup. A delete against such a fixture needs no prompt. Preserve shared data and production resources; real messages, purchases, paid resources, or access changes beyond the skill's authorized heal require explicit authorization. Unknown isolation, destination, or cleanup → defer that check, naming the proof or permission needed; continue safe checks.

## b — write the journeys

`preflight` prints `URL`, `RUN_DIR`, `SHA`, and `BROWSER`. Files live per journey in `$RUN_DIR/journeys/`, named alike and numbered in walk order.

**`<id>.meta.json`** is for the grader, not the scripts: `then` is the scenario's **THEN** **verbatim**, never paraphrased; `probe` names the ladder rung:

```json
{
  "requirement": "Notes can be created",
  "scenario": "Submitting with no title is rejected",
  "probe": "browser",
  "then": "the form shows \"Title is required\" and nothing is saved"
}
```

**Browser journey → `<id>.batch.json`**: the ordered `agent-browser` commands as a JSON array. The driver feeds it **unread** to `agent-browser batch --bail --json`. Before you write it, run `agent-browser skills get core` (`--full` for the command reference): it serves the installed version's guide, so the commands never go stale.

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
- **Never capture request headers** (`network requests`, a HAR): the driver adds the Access token to every request, and it would land in the evidence.
- Write preflight's preview URL in full: a batch file has no base URL. Only request-probe paths resolve against it.

## c — run it

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" run "$RUN_DIR" "$URL"
```

Stage independent journeys together; run dependent stages only after grading prerequisite evidence. Failure or ambiguity blocks dependents. Move completed inputs out of `journeys/` before another `run`, so completed mutations never replay. The driver runs all staged browsers, then requests, collecting Access blocks; finish state reads (§ b) before grading. If cleanup fails, preserve owned record identifiers in the report, defer dependent mutations, and continue independent safe checks.

`run` and `publish` each end with `REDACTED=<n>`: the driver replaced a credential in `<n>` text files under the run folder. Above 0, say so in the comment and the report. `unknown` means the scrub could not run: read the text evidence and `comment.md` for a credential yourself before posting.

## d — grade against the written expectation

For each journey, read the evidence beside the `then` in `<id>.meta.json` — screenshots and `$RUN_DIR/evidence/<id>.result.json` for a browser journey, the numbered response captures for a request probe, the command output for a state probe — and decide whether it shows what the `THEN` describes.

**A `THEN` often holds several claims.** Where the evidence shows some, and no probe on this preview can observe the rest (an email sent, a screen reader speaking), the journey is **partly shown**: neither a failure nor a plain pass. Name each claim not shown and why. It leaves the walk's verdict alone.

**Show a browser journey's screenshots in the chat as you grade it**, before its verdict: open each numbered screenshot in walk order with your image tool, one plain line above each saying what it shows. [Show what the browser is doing](../../../../wiki/development/browsing.md#show-what-the-browser-is-doing) owns the how; the walk's screenshots are already taken, so skip its `screenshot` step.

- **"No error" is not a pass, and neither is a bare `200`.** A clean batch whose screenshot lacks the message the `THEN` requires **fails**, as does a `200` without the body the `THEN` describes.
- A failing command is evidence, not a crash. `--bail` stops a browser journey there, so earlier evidence shows how far it got.
- A screenshot that looks like the previous page → check the landed URL in `<id>.url`. A missing wait is a defect in the journey, not the app.
- `[redacted:.env]` in text evidence stands for a `.env` value the driver replaced; read the screenshot for it.
- **Ambiguous → unverified**, with evidence beside the `THEN` and readings as [options](../../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks) in the final handoff. Never choose a reading yourself; finish independent safe checks first.

## e — after a failure

Finish independent checks; retain retry evidence. Clean up owned test data on pass or fail. Seed reset (`node "$ROOT/scripts/reset-staging-d1.mjs"`) requires **FAILURE**, an established disposable database separate from production, and no overlapping dependent work. Otherwise preserve shared data; defer unsafe cleanup.

A failure is **in scope** only when both hold:

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

Otherwise report **out of scope** with why.

Usually **out of scope**: empty fixtures (separate seed change), app `401` with valid service token (app authentication), previous-page screenshot (repair journey waits and re-walk).

## f — post the evidence, then clean up

Write one `$RUN_DIR/comment.md` for all journeys and retries: verdict, preview URL, short SHA; each verbatim `THEN`, probe, **where it ran**, evidence, and result. Name passes, failures, `◐` partly shown (shown and missing claims, why), and unverified scenarios. Text must stand without images. Browser journeys link numbered screenshots: `Pictures (log in to open): [<label>](<url>)`.

Apply the skill's verdict precedence; inherently unobservable claims stay partly shown (§ d). UNKNOWN/TIMEOUT lead **Not verified.**, naming completed checks, blocks, and remedies. Name heals or missing credentials.

Before the handoff, attempt the strongest safe simulation for checks you cannot complete directly: existing deployed interfaces, disposable synthetic data, or established sandbox integrations. Apply § a's safety limits and the skill's deployment-only rule; no local repo execution or invented tooling. Label evidence **simulated**, naming claims supported and real behavior not proved. A simulated delivery never proves actual delivery or a person's experience. No safe simulation → name the limitation; never fabricate evidence.

After independent checks and simulations, give **one consolidated handoff** in comment and chat, including human-checkable partly shown claims. For each remaining check, name its reason, exact manual action or authorization, expected observation, and dependents. Offer help, skip selected checks, or skip all remaining checks in [the shared ask format](../../explore/references/asking-the-user.md). Record skips as **skipped, unverified**; retain failures and evidence limits. A skip grants no permission or pass; do not ask again unless the person reopens it. Apply verdicts to obtained coverage; skipping does not turn a blocked reachable check into SUCCESS.

Use [key links](../../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) or [browser hand-over](../../../../wiki/development/browsing.md#hand-the-browser-over) for credentials/login. Waiting or unattended runs grant no permission. After help, resume pending checks; repeat completed checks only if conditions changed. Keep observations, pending/skipped ledger, and owned record identifiers before cleanup.

Publish pictures, post, clean up:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" cleanup "$RUN_DIR"
```

`publish` prints `<local-path>\t<url>` then `MEDIA=`. **private** → linked pictures; **public** → `![<label>](<url>)`; **none** → omit pictures and report `REASON` in comment/chat; verdict unchanged. Omit files without URLs; never cite local paths deleted by cleanup. Other evidence is inline text; no video.
