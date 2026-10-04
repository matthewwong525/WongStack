# The staging walkthrough

Check saved-revision behavior through deployed probes or existing CI captures. [The skill](../SKILL.md) owns order and verdicts; [the wiki](../../../../wiki/development/staging-walkthrough.md) owns why.

## a — scout the scenarios

Select delta scenarios and capabilities touched by the branch diff. `WHEN`/`THEN` remain authoritative. Inspect confirmed callers/data contracts; add narrowly relevant existing consumer scenarios, even across capabilities. Name the relationship and expectation; exclude speculation, report missing expectations. Consumer checks grant no repair scope.

Match each scenario to the strongest existing route:

1. **Browser journey** — rendered behavior through its user entry point.
2. **Request probe** — an endpoint's status, body, redirect or header.
3. **State probe** — trigger through the deployed interface, then read with an existing machine or stack command.
4. **CI capture** — saved-source command/output and follow-ups. Read project-owned `.agents/verification/*.json` and owning capture instructions; [CI evidence](ci-evidence.md) owns commands. Validate sources, scenarios, prerequisites, source/run identity and integrity. Never execute downloads/repo code locally. No recipe preserves ordinary probes; drift blocks its check, without editing recipes.

Ledger: scenario, probe, prerequisites, revision, runnable/blocked status, owned cleanup. Prepare surfaces independently: no preview blocks deployed checks alone. No route → name scenario/reason as unverified. Stage runnable checks; blocked/failed prerequisites pause dependents only. Finish independent safe checks.

**Before writes**: `preflight`'s `PLAYGROUND=yes` → create/change/delete staging data freely: no prompt, ownership or cleanup; the next walk rebuilds it. Otherwise establish staging-only bindings and owned disposable records with safe cleanup, or defer, naming the need. Production data, paid resources or access changes beyond the authorized heal need permission.

**Outside services**: `node "$ROOT/scripts/cf-secrets.mjs" shared` lists key names. Trigger a service only on an `own` key; `shared`/unknown destination → never trigger; name the service and that a staging-only key unlocks it.

**Missing seed records** → create through the app's screens, else unverified, naming the missing sample data. **Scheduled work** → run the project's manual trigger on staging, grade its result; the timetable stays partly shown; no trigger → unverified.

## b — write the journeys

`preflight` prints the saved `SHA` and owned `RUN_DIR`; deployed checks also need its `URL`, browser journeys its `BROWSER`. CI-only preparation uses `--no-preview --no-browser`. Files live per journey in `$RUN_DIR/journeys/`, named alike and numbered in walk order.

**`<id>.meta.json`** is for the grader, not the scripts: `then` is the scenario's **THEN** **verbatim**, never paraphrased; `probe` names the ladder rung:

```json
{
  "requirement": "Notes can be created",
  "scenario": "Submitting with no title is rejected",
  "probe": "browser",
  "then": "the form shows \"Title is required\" and nothing is saved"
}
```

**Browser → `<id>.batch.json`**: ordered commands; the driver feeds them unread to `agent-browser batch --bail --json`. First read `agent-browser skills get core` (`--full` for command details): use the installed guide.

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

**Request → `<id>.requests.txt`**: tab-separated `METHOD`, path or full URL, optional JSON body. Paths resolve against the preview; the driver adds Access headers and captures responses in order:

```
POST	/api/notes	{"title":""}
GET	/api/notes
```

**State →** trigger with `<id>.requests.txt`; after `run`, capture the existing remote read from `app/`. `<staging-db>` is `wrangler.jsonc`'s `env.staging` database:

```bash
npx wrangler d1 execute <staging-db> --remote --env staging --command "SELECT count(*) FROM notes" \
  | tee "$RUN_DIR/evidence/import-processed/02-state.txt"
```

**CI →** retain validated raw output, argv/exit, source/run and isolation/cleanup in the owned folder. Missing/stale/malformed/superseded captures stay unverified. Fix/preservation claims compare a named earlier revision with identical behavior, inputs, method and relevant environment. Name revisions/results/limits; incompatible or absent baseline blocks comparison alone, not valid head observations.

**Lasting effects →** after a promised save/export, reopen/reload the record or independently read the file through its real consumer. Keep submitted/readback values and initiating response. Success messages/cached views prove no persistence; read-only promises need none. Compare fresh producer values with rendered consumer output.

Evidence rules:

- **Wait after navigation before screenshots**: `wait --load networkidle`; use `wait --text ...` for updates without navigation.
- **Screenshot where a person would look**, at numbered absolute paths under `$RUN_DIR/evidence/<id>/`; use `--full`, or `--annotate` for element labels.
- **Use semantic elements** (`find role/text/label`) or same-batch snapshot refs; re-snapshot after navigation/re-render.
- **Write no assertions**: a journey produces evidence; it does not decide.
- **Never capture request headers**, `network requests` or HARs: they contain Access credentials.
- Browser URLs must be full; only request paths use the preview base.

## c — run it

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" run "$RUN_DIR" "$URL"
```

Stage independent journeys together; grade prerequisites before dependent stages. Move completed inputs out of `journeys/` before retries: every staged mutation replays. The driver runs browsers then requests; finish state/readbacks and CI imports before grading. CI-only needs no browser/preview. Failed cleanup: retain owned record IDs, defer dependent mutations, finish independent checks.

`run`/`publish` print `REDACTED=<n>` credential-bearing text files scrubbed. Above 0, report it. `unknown`: inspect text evidence and `comment.md` for credentials before posting.

## d — grade against the written expectation

Read evidence beside each verbatim `then`: screenshots and `evidence/<id>.result.json` for browsers, numbered request responses, state/CI output and fresh readbacks. Grade the written promise.

**Partly shown**: some claims observed, others inherently unobservable through available routes (delivery, screen-reader speech). Name every missing claim and why; neither failure nor plain pass, verdict unchanged.

**Show screenshots while grading, before the verdict**: open numbered images in order, with one plain description above each. [The picture convention](../../../../wiki/development/browsing.md#show-what-the-browser-is-doing) applies; skip recapturing them.

- **A clean exit, green suite or `200` is not a pass.** A clean batch whose screenshot lacks the message the `THEN` requires **fails**, as does exit zero or `200` with contradictory output. A fresh readback contradicting the promised lasting result fails despite a successful initiating response. Unavailable readback stays blocked or partly shown under the existing limits.
- A failing command is evidence, not a crash. `--bail` stops a browser journey there, so earlier evidence shows how far it got.
- A screenshot that looks like the previous page → check the landed URL in `<id>.url`. A missing wait is a defect in the journey, not the app.
- `[redacted:.env]` in text evidence stands for a `.env` value the driver replaced; read the screenshot for it.
- **Ambiguous → unverified**: retain evidence/`THEN`, offer readings as [options](../../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks) at handoff; finish independent checks first.

## e — after a failure

Finish independent checks; retain retry evidence. `PLAYGROUND=yes` → clean up nothing: `preflight` rebuilds staging before each re-walk. Otherwise clean up owned test data; preserve shared data.

A failure is **in scope** only when both hold:

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

Otherwise report **out of scope** with why.

For an in-scope repair, retain a focused check when existing CI can cheaply reproduce the defect. `/save` captures the same check's intended failure on exact earlier source and pass on repaired head; the head suite must pass. Inspect failure cause, revision and check identity. Impractical harness → keep the available reproduction, missing proof and limitation. No new infrastructure, weaker checks or unrelated fixes.

Usually **out of scope**: app `401` with valid service token (app authentication), previous-page screenshot (repair journey waits and re-walk).

## f — post the evidence, then clean up

One `$RUN_DIR/comment.md` covers every surface/retry: verdict, saved SHA, preview/run links, each verbatim `THEN`, probe/environment, raw observations/readbacks and result. Name consumer relationships, compared revisions/results/limits. Label practice/simulated evidence. Show pass, fail, `◐` partial (shown/missing claims and why) and unverified checks. Text stands without images; numbered browser links: `Pictures (log in to open): [<label>](<url>)`.

Apply the skill's verdict precedence; inherently unobservable claims stay partly shown (§ d). UNKNOWN/TIMEOUT lead **Not verified.**, naming completed checks, blocks, and remedies. Name heals or missing credentials.

Before handoff, attempt safe simulations through existing deployed interfaces, disposable synthetic data or sandbox integrations (§ a). No local repo execution or invented tooling. Label **simulated** evidence, supported claims and real behavior unproved; simulated delivery proves no real delivery or personal experience. No safe simulation → name the limit.

After independent checks/simulations, make **one handoff** in comment/chat, including human-checkable partial claims. Each remaining check names its reason, needed action/permission, expected observation and dependents. Offer help or selected/all skips in [the shared ask format](../../explore/references/asking-the-user.md). Skips stay **skipped, unverified**, grant no permission/pass and erase no failure; ask again only if reopened. Blocked reachable checks prevent SUCCESS.

Use [key links](../../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) or [browser hand-over](../../../../wiki/development/browsing.md#hand-the-browser-over) for credentials/login. Waiting grants no permission. Resume pending checks after help; repeat completed checks only on changed conditions. Retain observations, pending/skipped ledger and owned IDs before cleanup.

Publish pictures, post, clean up:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" cleanup "$RUN_DIR"
```

`publish`: `<local-path>\t<url>`, then `MEDIA=`. **private** → links; **public** → `![<label>](<url>)`; **none** → report `REASON`, omit pictures, verdict unchanged. Never cite missing URLs or cleaned local paths; other evidence is inline text, no video.
