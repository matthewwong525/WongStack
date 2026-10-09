# The staging walkthrough

Check saved behavior through deployed probes or CI captures. [The skill](../SKILL.md) owns order and verdicts; [the wiki](../../../../wiki/development/staging-walkthrough.md) owns why.

## a — scout the scenarios

Select delta scenarios, capabilities touched by the diff and narrowly connected consumers across capabilities. Confirm and name callers/contracts and existing expectations; exclude speculation, report missing promises. `WHEN`/`THEN` judge; consumers grant no repair scope.

Match each scenario to the strongest existing route:

1. **Browser journey** — rendered behavior through its user entry point.
2. **Request probe** — an endpoint's status, body, redirect or header.
3. **State probe** — trigger through the deployed interface, then read with an existing machine or stack command.
4. **CI capture** — saved-source output/follow-ups. Read `.agents/verification/*.json` and its owning guide; [CI evidence](ci-evidence.md) owns commands. Validate sources/scenarios, prerequisites, identity/integrity. Never execute downloads/repo code locally. Absent recipes leave ordinary probes; drift blocks only their check; edit none.

Ledger: scenario/probe, prerequisites/revision, runnable/blocked, owned cleanup. Prepare independently; missing preview blocks deployed checks alone. No route → name scenario/reason as unverified. Pause dependents of failed/blocked prerequisites; finish safe independent checks.

**Before writes**: `preflight`'s `PLAYGROUND=yes` → create/change/delete staging data freely: no prompt, ownership or cleanup; the next walk rebuilds it. Otherwise establish staging-only bindings and owned disposable records with safe cleanup, or defer, naming the need. Production data, paid resources or access changes beyond the authorized heal need permission.

**Outside services**: `node "$ROOT/scripts/cf-secrets.mjs" shared` lists keys. Trigger only `own`; `shared`/unknown → never trigger; name service/staging-only key needed.

**Missing seed records** → create through screens; else name missing data/unverified. **Scheduled work** → grade its manual staging trigger; timetable stays partly shown; no trigger → unverified.

## b — write the journeys

`preflight`: saved `SHA`, owned `RUN_DIR`, deployed `URL`, browser `BROWSER`; CI-only uses `--no-preview --no-browser`. Per-journey files in `$RUN_DIR/journeys/` share names, numbered in walk order.

**`<id>.meta.json`**: grader-only; `then` copies **THEN verbatim**, `probe` names its rung:

```json
{"requirement":"Notes can be created","scenario":"Submitting with no title is rejected","probe":"browser","then":"the form shows \"Title is required\" and nothing is saved"}
```

**Browser → `<id>.batch.json`**: ordered commands, passed unread to `agent-browser batch --bail --json`. First read `agent-browser skills get core` (`--full` for details).

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

**Request → `<id>.requests.txt`**: tab-separated method, path/full URL, optional JSON body. Paths use the preview; driver adds Access headers/captures responses in order:

```
POST	/api/notes	{"title":""}
GET	/api/notes
```

**State →** trigger via `<id>.requests.txt`; after `run`, capture the existing remote read from `app/`. `<staging-db>`: `wrangler.jsonc`'s `env.staging` database:

```bash
npx wrangler d1 execute <staging-db> --remote --env staging --command "SELECT count(*) FROM notes" \
  | tee "$RUN_DIR/evidence/import-processed/02-state.txt"
```

**CI →** keep validated raw output, argv/exit, source/run, isolation/cleanup in the owned folder. Missing/stale/invalid/superseded captures stay unverified. Fix/preservation compares named earlier source with identical behavior, inputs, method/environment. Name revisions/results/limits; absent/incompatible baseline blocks comparison alone.

**Lasting effects →** reopen/reload saved records or independently read exported bytes through the real consumer. Keep submitted/readback values and initiating response; messages/caches prove no persistence. Read-only promises need none. Compare fresh producer values with rendered consumers.

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

After source/tests and the gate, stage independent journeys together; grade prerequisites first. Before retries remove completed inputs from `journeys/`: staged writes replay. Driver runs browsers then requests; finish readbacks/state/CI before grading. CI-only needs no browser/preview. Cleanup failure → retain owned IDs, defer dependent writes, finish independent checks.

`run`/`publish` print `REDACTED=<n>` credential-bearing text files scrubbed. Above 0, report it. `unknown`: inspect text evidence and `comment.md` for credentials before posting.

## d — grade against the written expectation

Read each verbatim `then` beside browser screenshots/`evidence/<id>.result.json`, numbered responses, state/CI output and fresh readbacks.

**Partly shown**: some claims observed; others inherently unobservable through available probes (delivery, screen-reader speech). Name each missing claim/why; neither failure nor plain pass; verdict unchanged.

**Show screenshots before grading verdicts**, numbered order, each with a plain description; [picture convention](../../../../wiki/development/browsing.md#show-what-the-browser-is-doing), no recapture.

- **Clean exits, green suites and `200` prove no pass.** Missing required screenshot message or contradictory output **fails**, including a fresh readback contradicting a successful response. Unavailable readback stays blocked/partly shown under existing limits.
- A failing command is evidence, not a crash. `--bail` stops a browser journey there, so earlier evidence shows how far it got.
- A screenshot that looks like the previous page → check the landed URL in `<id>.url`. A missing wait is a defect in the journey, not the app.
- `[redacted:.env]` in text evidence stands for a `.env` value the driver replaced; read the screenshot for it.
- **Ambiguous → unverified**: retain evidence/`THEN`, offer readings as [options](../../explore/references/asking-the-user.md#confirmations-offers-and-menus-are-asks) at handoff; finish independent checks first.

## e — after a failure

Finish independent checks; retain retry evidence. `PLAYGROUND=yes` → clean up nothing: `preflight` rebuilds staging before each re-walk. Otherwise clean up owned test data; preserve shared data.

A failure is **in scope** only when both hold:

1. the contradicted `THEN` is one of *this change's own* scenarios, and
2. the fix plausibly lives in files this branch already touches (`git diff --name-only origin/main..HEAD`).

Otherwise report **out of scope** with why. A [kept check](#g--kept-checks)'s contradiction needs only 2; after each fix, `replay --only <id>`.

In-scope repair: retain a focused check if existing CI can cheaply reproduce it. `/save` captures its intended failure on exact earlier source/pass on repaired head; head suite must pass. Inspect cause/revision/check identity. Impractical harness → keep available reproduction, missing proof/limits. No new infrastructure, weaker checks or unrelated fixes.

Usually **out of scope**: app `401` with valid service token (app authentication), previous-page screenshot (repair journey waits and re-walk).

## f — post the evidence, then clean up

One `$RUN_DIR/comment.md`: all surfaces/retries, verdict/SHA, preview/run links, verbatim `THEN`, probes/environment, raw observations/readbacks/results, consumer relationships, compared revisions/limits. Label practice/simulation, pass/fail, `◐` partial (shown/missing claims/why), unverified. Text stands alone; numbered browser links: `Pictures (log in to open): [<label>](<url>)`.

Apply the skill's verdict precedence; inherently unobservable claims stay partly shown (§ d). UNKNOWN/TIMEOUT lead **Not verified.**, naming completed checks, blocks, and remedies. Name heals or missing credentials.

Before handoff, attempt safe simulation via existing deployed interfaces, disposable data or sandbox integrations (§ a). No local execution/new tooling. Label **simulated**, supported claims/real behavior unproved; simulated delivery proves no real delivery/experience. Otherwise name the limit.

After independent checks/simulations, **one handoff** in comment/chat includes human-checkable partials. Name each remaining reason, needed action/permission, expected observation/dependents. Offer help/selected or all skips in [the ask format](../../explore/references/asking-the-user.md). Skips stay **skipped, unverified**: no permission/pass or erased failure; re-ask only if reopened. Blocked reachable checks prevent SUCCESS.

Credentials/login: [key links](../../../../wiki/development/secrets.md#receive-a-key-through-a-private-link)/[password links](../../../../wiki/development/passwords.md). Waiting grants no permission. After help resume pending checks; repeat others only on changed conditions. Retain observations, pending/skipped ledger/owned IDs before cleanup.

Publish pictures, post, clean up:

```bash
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" publish "$RUN_DIR"
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/verify/scripts/verify-staging.sh" cleanup "$RUN_DIR"
```

`publish`: `<local-path>\t<url>`, then `MEDIA=`. **private** → links; **public** → `![<label>](<url>)`; **none** → report `REASON`, omit pictures, verdict unchanged. Never cite missing URLs or cleaned local paths; other evidence is inline text, no video.

## g — kept checks

Inside `/ship` only, before § f's post. `J` is `node "$ROOT/.claude/skills/verify/scripts/verify-journeys.mjs"`; every call takes `--run-dir "$RUN_DIR"`, `replay` and `keep` also `--url "$URL"`.

1. **Replay** once §§ c–e settle: `J replay --change-root <archive>`. `same` → list as *replayed, unchanged*, no fresh grade. `changed` → walk it fresh once, three per walk, the rest unverified: pass → keep; contradiction → § e, naming the older promise. `skipped` → this change's walk covers it. `not-run` → name its reason; no pass, no failure.
2. **Keep** each passed browser/request journey, its inputs back in `journeys/`: `J keep --id <id> --expect '<json>'`, `--writes` if it submits or changes data. `expect` rows hold shown claims only: `{"text"}`, `{"gone"}`, `{"path"}`; request `{"step","status","includes"}`. Never one using a private link, an outside service or a manual job trigger.
3. **Prove, install**: `J replay --from "$RUN_DIR/keep"`, then `J keep --install`; name each *left out*. After the post, a changed tree → `/save` once; that commit needs no re-walk.
