# Changelog

`/wong-sync` reads the entries newer than your installed version
(`.claude/.wong-stack.json`) and walks you through each change. Newest first.

## 9.5.0 — secrets survive worktrees, and ship has one checkpoint

**Real local credentials now have one durable home: the primary Git worktree.** An ignored `.env`
inside a linked worktree is a separate file, so saving or rotating a token there made the credential
disappear when that disposable checkout went away — or left several silent copies disagreeing about
which value was current. The secrets convention now separates the two lifecycles deliberately: real
values persist in the primary worktree's ignored live file, while the active branch carries blank,
documented declarations in `.env.example`. Adding a variable updates both sides; rotating only its
value creates no meaningless template diff. Existing duplicate files are preserved for explicit
reconciliation, never printed or bulk-merged, and an ignored symlink is the supported end state for
checkout-local tooling that insists on the conventional path.

**The workflows that produce and consume credentials follow the same Git-derived location.**
`/wong-cloudflare` resolves the primary checkout from the absolute per-worktree and common Git
directories before it asks for a token, verifies ignore protection at that exact destination, and
narrowly updates the durable file. `/walk` honors exported values first, then reads the same durable
file — including the optional Access service-token pair — from any linked worktree. Neither workflow
creates a second live copy or emits a value.

**`/save` is now the universal credential-safe checkpoint.** It preserves only secrets the session
explicitly identified by variable name; it never guesses from token-shaped strings. New contracts
gain a blank example declaration, rotations do not churn the template, and handled values are barred
from notes, OpenSpec artifacts, staged tracked files, commit messages, PR bodies, and reports. The
non-secret fact that a variable rotated remains capturable, so redaction does not erase the decision.

**`/ship` no longer carries a second implementation of commit, push, PR, and branch CI.** It verifies
the feature and default branches, performs its owned OpenSpec archive step, then invokes `/save` once
in shipping context. That delegated checkpoint commits the archive and code, regenerates the PR from
the archived handoff, and returns a merge-safe CI result. `/ship` only merges on `SUCCESS` or `NONE`,
then deletes the remote branch worktree-safely. The exact commit that contains the archive is therefore
the commit CI checked and the commit that merges.

## 9.4.0 — the walk's browser moves to Cloudflare, and the install step disappears

**`/walk` no longer needs a browser on your machine.** The walkthrough's one machine-mutating
prerequisite — `npx playwright install chromium`, a ~150MB download that broke on servers and
sandboxes missing system libraries and was the step people skipped — is gone. The browser is now a
[Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/) session on Cloudflare's
edge, attached over CDP with the same `CLOUDFLARE_API_TOKEN` the stack pack already provisions. The
adoption rung is now one command: `npm i -D playwright-core` (the no-bundled-browsers half of
Playwright — which is the point). Everything agentic about the walk is unchanged: journeys are still
scouted from the change's own scenarios, evidence still lands on local disk, screenshots and video
still grade against the scenario's verbatim `THEN`. Video was verified to survive the remote
attachment before shipping this.

**What an existing adopter does: nothing, usually.** `playwright` in your `devDependencies` still
counts as consent — no dependency migration is required. If your token predates this release, the
first walk may report `UNKNOWN` with Browser Run refusing the token; re-run `/wong-cloudflare`, whose
widen now grants **Browser Rendering ▸ Edit** unconditionally, and walk again. Browser time is
metered (free plan: ~10 browser-minutes/day, 3 concurrent; Workers Paid: 10 h/month) — an exhausted
budget reports as `UNKNOWN`, never as a failing app. The
[runbook](wiki/stack/staging-walkthrough.md) owns the rungs and the limits.

## 9.3.0 — the token widen stops asking

**Setup no longer asks whether it may widen your Cloudflare token, because you already said yes when
you pasted it.** The two-checkbox token is the whole design — it carries `API Tokens Write` and
nothing useful, and grants itself the rest on demand — but the payload never said, anywhere, that the
agent was *allowed* to do that. So it read the step the way it reads any credential change on an
account it doesn't own — outward-facing, hard to reverse, ask first — and stalled. Users were granting
permission on every single run for the one move the token exists to make. Nothing was broken; the
payload was silent on a fact only the payload could supply.

It says it now. The [credentials page](wiki/stack/cloudflare-credentials.md#the-widen-is-pre-authorized)
owns the statement: supplying a token with those two groups **is** the permission to widen it, and an
agent widens and then reports which permissions it granted. `/wong-cloudflare` restates it as
behaviour at Step 2 and in its Boundaries block — right beside *"ask before creating or deleting
anything billable"*, which is the rule an agent was generalizing from, so the exception is named where
the over-generalization happens. The widen protocol carries it too, for an agent following that
reference outside the skill, and the failure map now lists the stalled run as the failure mode it is.

**What it doesn't cover, stated in the same breath everywhere it appears:** creating or deleting
anything billable still asks first, a widen that fails or doesn't verify still stops the run before
anything is provisioned, and narrowing the token back afterward is still offered rather than assumed.
The authorization is scoped to the one free, reversible call. The account-root trade-off is unchanged
and still stated plainly on the same page, two sections down — the grant and its cost are meant to be
read together.

## 9.2.0 — the ground under the install

Last release said this repo can't detect its own install defects by inspection. So this time someone
stood a target up from nothing — empty folder, no git, no app, driven the way a non-technical person
would drive it — and wrote down everything that broke. The pipeline itself was fine: push, CI,
migrations, deploy, a live URL serving the starter app. Everything that broke was the **ground
underneath** it, and every one of these is invisible here because this repo already has that ground.

**Your secrets are now actually ignored, which the docs have been claiming for some time.** A fresh
install had no `.gitignore` at all — nothing in the payload or `/wong-setup` created one — while
`secrets.md` shipped alongside it stating that `.env` *"is listed in `.gitignore` … so it can't be
committed by accident"* and telling you to `cp .env.example .env` and fill it in. Follow that page on a
fresh install and you produce a file holding a token the credentials page calls *"effectively
account-root"*, fully committable. The rule now goes in during setup, **unconditionally** — declining
the secrets convention no longer declines the protection, because leaving a credential committable
isn't a documentation preference. `.env*` and `.dev.vars*`, each with its `!*.example` negation.
**If you already have an install, check `git check-ignore -q .env` yourself** — `/wong-sync` never
modifies a file you own, so this one won't arrive on its own.

**Migrations work in the `app/` layout.** The `wrangler.jsonc` fragment is the only thing in the
payload that ever creates a target's config, and it said `migrations_dir: "schema/migrations"`. Wrangler
resolves that relative to the config file — which for the app scaffold lives in `app/` — so it pointed
at `app/schema/migrations` while the pack ships `schema/` at the repo root. First change carrying a
migration, the build stops with `No migrations present at …` naming a path you never chose. It's the
flagship path: a repo with no app of its own gets the scaffold, so this is what every appless first
install received. WongStack's own config had it right, with a comment explaining why — which is exactly
why nobody saw it. The fragment now states the value for both layouts and lists it among the rules the
scripts depend on.

**Setup no longer walls a newcomer at the first commit.** Git refuses to record anything without a name
and email, and `gh auth login` does not set them — so the most likely first-run failure for the exact
audience this is written for was `Author identity unknown / Please tell me who you are`. Setup now
reads both from the GitHub account that's already signed in and sets them, asking nothing. Private
email (GitHub's default, and `null` from the API) resolves to the account's noreply address, which is
what GitHub itself stamps on browser commits. The initial commit also moved to *after* seeding, because
an empty folder has nothing to commit.

**`main` is assumed instead of detected.** `/save`, `/ship`, and `/continue` all told the agent to
substitute whatever `git symbolic-ref refs/remotes/origin/HEAD` resolves to — a command that *fails*
on every freshly created repo, because `gh repo create` doesn't record a head. Since setup runs
`git init -b main` and `gh repo create` follows the local branch, the answer was already known. Detection
survives only for a pre-existing repo where `main` doesn't exist.

**The release link check stopped grading its own homework.** It exempted four paths as "files any real
target has", including `wiki/development/README.md` under the comment *"the wiki hubs `/wong-setup`
seeds"* — which setup did not seed. It therefore reported **no dead links** against an install that had
eight. Setup now seeds `wiki/development/README.md` alongside the wiki root, an exemption must name a
step that demonstrably writes the path, and the payload file list moved into
`payload-files.json` so the checker reads the manifest instead of keeping a third copy of it.

**Two smaller honesty fixes.** `/wong-setup` promised that declining Node still left `/save` working;
it doesn't — `/save` shells out to `openspec new change`, `openspec status`, and `openspec instructions`
whenever it authors a change, which is most sessions. And `openspec init` signs off by telling you to
run `/opsx:propose`, a command it does not generate and WongStack tells agents not to reach for; setup
now corrects that immediately, since it's the last thing on your screen.

Known and deliberately not handled: Cloudflare caps D1 at **ten databases per account** and each
project takes two, so roughly the fifth project fails with `7406 System limit reached`. Adopters are
typically on a fresh account and the failure is loud, so it's written down rather than pre-flighted.

## 9.1.0 — the pack brings an app, and stops lying about what works

Five fixes, all found by people installing WongStack for real rather than by reading it. The theme is
uncomfortable and worth naming: **this repo cannot detect most of them by inspection.** Every payload
link resolves here, CI is green here, `.env` is git-ignored here, and the app exists here. The
maintainers' own repo is not the artifact under test — the artifact is what arrives somewhere else.

**Do this if you set up Cloudflare Access on the old runbook: open your app in a browser and log in.**
The runbook recommended `workers.dev`, and Access cannot reliably gate a zone Cloudflare owns. The
failure is the dangerous kind — an anonymous `curl` gets a `302` and a service token gets a `200`, so
every terminal check passes, while a logged-in human gets Cloudflare's *"There is nothing here yet"*
placeholder. Your wall may be admitting nobody, and nothing in your setup says so. The fix is a custom
domain; the runbook now requires one and documents the symptom so you recognize it.

**The pack can bring its own app.** It shipped a complete pipeline — scripts, CI, schema, docs — and no
Worker, and the `wrangler.jsonc` fragment declared bindings with no `main`, so even a hand-written
Worker got a config wrangler couldn't deploy. An install into a fresh repo landed the whole pack and
left nothing deployable. Now `/wong-setup` and `/wong-cloudflare` detect a repo with no app of its own
and fold WongStack's starter into the *same* one question — no second decision, no framework
vocabulary — gated on `components.appScaffold` beside `stackPack`. **A repo that already has an app
never sees the offer and is never touched.** `app/wrangler.jsonc` is deliberately excluded from the
copy: it holds two live `database_id`s, and copying it would point your Worker at WongStack's own
databases. Your config is created by `/wong-cloudflare` from the fragment, which now carries `main`,
`assets`, and the compatibility fields.

**CI was red by default and deployed twice.** In the state the pack ships in — no wrangler config yet —
`deploy.yml` failed at step 1 and the parity check aborted, both before the token guard that was
supposed to handle exactly this. And `concurrency` keyed on `github.ref`, which differs between a
branch's `push` and `pull_request` triggers, so both ran and raced for the same preview alias. The
workflow now detects an unconfigured repo, reports *"run `/wong-cloudflare`"*, and exits green; the
concurrency group keys on the event as well as the branch, with a job-level `if` — **both are needed,
because GitHub evaluates concurrency before a job's `if`**, and a cancelled run is what `gh pr checks`
reports as `fail`, which would block `/ship`.

**Two credential fixes.** `.env.example` shipped `CLOUDFLARE_USER_TOKEN` while everything that reads a
token — wrangler, the scripts, the workflow, the skill, the docs — reads `CLOUDFLARE_API_TOKEN`. **If
you filled in `.env` from the 9.0.0 template, your token is under a name nothing reads: rename it.**
Nothing can detect this for you, because a missing token is indistinguishable from "not provisioned
yet". The name has now flipped three times in both directions, so it has an owner
(`wiki/stack/cloudflare-credentials.md`) and a rule: renaming a value the code reads is a behavioural
change requiring a version bump, never a `docs(...)` commit. Separately, **the `.gitignore` fragment
now covers `.env*` as well as `.dev.vars*`** — it never did, so a target that had no `.env` acquired a
committable one at the exact moment `/wong-cloudflare` asked for an account-root credential.

**The most-cited doc in the payload wasn't in the payload.** `wiki/development/the-change-loop.md` is
referenced 14 times across 9 of the 10 installed skills, and the `WONG-STACK` block calls it "the one
place that owns" the merge gate — and a target never received it. Same for
`agent-knowledge-center.md` and `development/required-tools.md`. Combined with the block's own
instruction to "find and read the owning doc rather than guessing", a fresh install sent agents to a
dead link and told them to guess. All three now ship, `wiki-style.md` no longer arrives carrying links
to WongStack's marketing section, and `scripts/check-payload-links.mjs` resolves every payload link
against the file set a *target* receives, in each install shape — the check this repo structurally
could not perform on itself.

**How this reaches you.** The three wiki pages arrive automatically on your next `/wong-sync`
(copy-if-absent, no conflict). Everything that edits a file you already own — `deploy.yml`,
`.env.example`, `.gitignore`, `wiki-style.md` — is **offered** through the adapt step as a proposal you
review, never merged into your files automatically. The app scaffold requires setting
`components.appScaffold` and only lands where you have no app.

The Access rewrite was **stood up live on a custom domain** and behaves as documented: an anonymous
caller is challenged, a service token is admitted, the scoped application gates exactly one hostname,
and five unrelated Workers on the same `workers.dev` subdomain stay open. That last number is the
argument against the wildcard this release removes — the account carries seven Workers on that
subdomain, so `*.<subdomain>.workers.dev` would have walled six of them.

`app/worker/access.ts` was verified against **real Cloudflare-issued tokens**, and they settle the
premise empirically: a service-token JWT carries `common_name`, **no `email`**, and an empty `sub`. A
Worker reading `Cf-Access-Authenticated-User-Email` rejects that caller — the lockout this release
fixes. The module accepts the real token against the live certs endpoint and rejects a second real
application's audience, a tampered payload, and a wrong team domain.

The third caller — a **logged-in browser** — was confirmed by hand on the custom domain, and it is the
one that matters: it is the only check that covers a human, and on `workers.dev` it is the one that
fails while every terminal check passes. So the custom-domain requirement is verified end to end, not
merely argued from the failure it avoids. **Do that browser check on your own setup too**; a
service-token `200` is explicitly not a substitute for it.

## 9.0.0 — seeing the app is a verb now, not a toll on the merge

You could only watch your app work in a browser by shipping it. The walkthrough was welded into `/ship`
as a gate, which put your first real look at the change at the last possible moment — and forced a whole
apparatus around it, because a merge was waiting: a walk that couldn't run had to block, retries had to
share `/ship`'s attempt budget, and evidence only got posted when everything already passed. It's now
`/walk`, invoked when you want it, as often as you want it.

- **BREAKING — `/ship` no longer walks.** Step 4.5, the verdict table, and the walkthrough hard rules are
  gone; `/ship` is PR + CI + squash-merge + archive. **If you adopted the walkthrough as a merge gate, you
  no longer have one** — nothing errors and nothing warns, the rung simply isn't there. Run `/walk` when
  you want the evidence. `/ship` neither runs it nor checks whether it ran.
- **BREAKING — the gate ladder lost a rung.** `CI-when-present → the walkthrough-when-adopted → merge`
  is now just **`CI-when-present → merge`**, with PR review as the gate where there are no checks.
- **New `/walk` skill.** It invokes `/save` first — push, wait for CI, resolve the per-commit preview URL,
  because that alias only exists once CI has published *this* commit — then scouts the change's own
  OpenSpec scenarios into browser journeys, drives them with Playwright, grades each against the scenario's
  written `THEN`, and posts screenshots and video to the PR. Run it mid-change, twice in a row, or right
  before shipping.
- **Evidence is posted on every verdict.** It used to land only on success, because a failure blocked the
  merge and got fixed before anything was published. That was backwards: a failed walk's screenshots are the
  most useful thing it produces. Repeated walks append comments rather than overwriting, so the PR keeps an
  honest log of attempts.
- **Verdicts report instead of gating.** All five survive — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`,
  `TIMEOUT` — but none of them blocks anything. `UNKNOWN` still isn't `NONE`: an adopted repo's un-runnable
  walk is *unverified*, and the comment says so. That mattered as a merge rule; it still matters as a
  reporting rule, because a walk that screenshots a login page and reads as a pass is the outcome worth
  preventing either way.
- **No retry budget.** A failed walk posts its evidence, resets staging, and stops. You fix and run `/walk`
  again — the user is the retry loop, so there's nothing to bound.
- **Renamed:** the capability `ship-walkthrough` → `staging-walkthrough`, and the runbook
  `wiki/stack/ship-walkthrough.md` → `wiki/stack/staging-walkthrough.md`. Both names asserted a coupling
  to `/ship` that no longer exists.
- **Unchanged:** adoption is still `npm i -D playwright` and nothing else, still detected rather than
  configured, and a repo that never adopted it still sees nothing. The walk still writes nothing inside your
  repo, still installs nothing, still resets staging only after a failure, and still refuses to call a
  clean-but-wrong screenshot a pass.
## 8.6.0 — one door to the stack pack, and the Cloudflare facts stop contradicting each other

v8.0 replaced the preview-swap staging model and v8.1 replaced Workers Builds with GitHub Actions, but
each change missed about half the places the old model was written down — leaving five live
contradictions, two of which would have sent a real provisioning run down a retired path. And the pack's
late-adoption story was circular: setup and `/wong-cloudflare` both said "run `/wong-sync` — it'll offer
the pack," while `/wong-sync`'s own rule is that it never offers pack files to a repo that hasn't opted
in. This release extends 8.5.0's one-owner-per-fact doctrine to the setup → sync → cloudflare surfaces.

- **The five contradictions are fixed.** `/wong-cloudflare`'s binding step, its failure map, and the
  provisioning spec now describe the `env.staging` twin model (no `preview_database_id`, no swap);
  the fragments' `.env.example` writes `CLOUDFLARE_API_TOKEN` like everything else (was
  `CLOUDFLARE_USER_TOKEN`); the Workers Builds dashboard deploy-command is documented as
  fallback-only rather than "the pack does not work without it"; the preview URL pattern is the
  staging-Worker form (`<branch>-<worker>-staging.<subdomain>.workers.dev`) everywhere; and the fit
  playbook stops claiming `/wong-sync` "opens the PR itself" — contributing is a manual PR.
- **`/wong-cloudflare` is the one door to the pack.** In a repo that hasn't taken it, the skill makes the
  outcome-phrased offer itself, sets `components.stackPack: true`, lands the drop-in files (via
  `wong-sync`'s clone + copy steps), applies the config fragments, and continues into provisioning; with
  no token yet it stops cleanly and a later re-run finishes. It owns **all** fragment application now —
  including the `wrangler.jsonc` block, written with the real database ids at the binding step, so the
  placeholder-id phase is gone. `/wong-setup`'s offer shrinks to the question plus "run
  `/wong-cloudflare` whenever"; where the skill isn't installed, the documented route is the flag +
  `/wong-sync`. Every pointer now names a path that works.
- **`wiki/stack/provisioning.md` is deleted.** It duplicated the skill step-for-step for an audience —
  an agent with the pack but without the skill — that can't exist, since they install together; it was
  also where the model drift accumulated. Each fact now has one owner: the token screen in
  `cloudflare-credentials.md`, the widen protocol in the skill's `references/permission-groups.md`, the
  deploy model in `d1-pipeline.md`, failures in `references/failure-map.md`, the human narrative in
  `getting-started.md`. `/wong-cloudflare` slims to the outcome flow and links down, the `/ship` →
  `walkthrough.md` pattern.
- **Setup and sync stop restating each other's exact values.** The `.claude/.wong-stack.json` schema is
  stated once, in `wong-sync` Step 4 — `/wong-setup` writes its seed from there (`version`/`commit`
  null) instead of carrying a copy that had to be hand-synced. The clone cache path is marked as
  `wong-sync`-owned where setup repeats it, the `workflow`-OAuth-scope explanation moved to
  `wiki/development/required-tools.md` with one-liners + links everywhere else, and setup's legacy
  migration step compressed to one line.
- **The journey is visible.** The root README and the wiki hub each say the flow in a sentence: setup
  once, sync to stay current, `/wong-cloudflare` when you want it live.

## 8.5.0 — one owner per fact: the payload stops saying things twice

The payload had grown three copies of things it only needed one of, and one of them had already turned
into a bug. `/opsx:apply` told you to archive on completion while the skill it duplicates hands the change
to `/save`, and it pointed at `/opsx:continue`, which doesn't exist — nobody wrote that divergence, one
copy just got an edit the other didn't. Nothing here changes what the verbs do, except that the raw
commands now do what the skills do.

- **The `/opsx:*` commands are one-line pointers.** Each `.claude/commands/opsx/<verb>.md` now invokes the
  correspondingly named `openspec-*` skill and follows it verbatim, instead of carrying a second copy of its
  runbook. Both stay committed — nothing depends on `openspec init` regenerating them — but the skill is the
  single owner, so the two entry points can't drift again. **This fixes `/opsx:apply` skipping the `/save`
  handoff.** ~700 lines removed.
- **`/ship`'s walkthrough moved to `references/walkthrough.md`.** Step 4.5 had grown a 140-line runbook
  inside `SKILL.md`; it now lives in a reference like `wong-sync`'s adapt step and `improve`'s playbooks do,
  and `/ship` is back to reading as the merge verb (228 → ~107 lines). Same behavior, same verdicts.
- **`/save` and `/ship` share one git runbook** — `save/references/git-gate.md` holds the PR open/update
  sequence, the change-mirror body template, the check-result handling and the capped auto-fix loop, once.
  The one place the two genuinely differ (an unverifiable check means *proceed* for `/save` and *stop* for
  `/ship`) is now a per-caller column in that table rather than two independently maintained paragraphs.
- **`/wong-sync` verdicts have one store.** `.claude/wong-sync-verdicts.md` is it. The `capabilities` ledger
  leaves `.claude/.wong-stack.json`, which goes back to recording install state only — and with it goes the
  rule that only half the ledger was authoritative. **Migration is automatic:** the first sync after this
  release folds any existing `capabilities` map into the record, honoring each `declined` as a user refusal,
  then writes the manifest without the key. Nothing to do by hand.
- **One owner per doctrine sentence.** `wiki/development/the-change-loop.md` now states the gate ladder and
  the prose allowlist; `CLAUDE.md`, `notes/README.md`, `/dream` and the verb skills link to it instead of
  restating it. `/save` keeps the two path prefixes inline exactly once, where it routes. The loop diagram
  stops being copied into four skills.
- **New [repo layout](wiki/development/repo-layout.md) page** — `.claude` is a symlink to `.agents` and
  `CLAUDE.md` to `AGENTS.md`, the Edit tool won't write through them, and `grep -r` doesn't follow them, so
  payload audits must target `.agents/`. This had already cost one implementation and was recorded only in
  session notes. `adding-a-skill.md`'s two dead links to the retired `document` skill are fixed.

## 8.4.0 — /ship can walk the app before it merges, if you ask it to

Every gate `/ship` had answered *did it build and did the checks pass*. None answered *does this do what it
promised*. The promise was already written down — every requirement in a change's delta specs is a
`#### Scenario:` with a `WHEN` and a `THEN` — and the pack already deploys every branch to a real staging
Worker with a per-commit URL. This wires the two together.

- **New `/ship` Step 4.5 — the staging walkthrough.** Between green CI and the merge, the change's own
  OpenSpec scenarios are filtered to the ones a browser can see, walked against the deployed preview with
  Playwright, and graded against the scenario's `THEN`. Screenshot every step, video every journey, evidence
  as a PR comment. Ships `.claude/skills/ship/scripts/walk-staging.sh` and `walk-runner.mjs`.
- **Opt-in by state, no flag.** `playwright` in your app's `devDependencies` *is* the consent — the Cloudflare
  Access pattern, where you adopt a capability by taking it. **There is no manifest field.** A repo that
  hasn't opted in sees `/ship` behave exactly as before: no walk, no warning, ~30ms. Remove the dependency
  and it's off again.
- **It gates, and it never installs anything.** A judged failure resets staging (`db:reset:staging`, only on
  failure) then fixes, repushes and re-walks, sharing `/ship`'s existing cap of 3. A walk that *couldn't run*
  — missing browser, no preview URL, or a Cloudflare Access login page — is `UNKNOWN` and refuses to merge,
  extending the existing "unverified is not the same as absent" rule. The Access case is checked by name:
  without it, a walk screenshots a login form and a grader could read that as a pass.
- **Nothing is saved.** Journeys are generated per run into a temp directory and deleted with it — no test
  suite, no `tests/`, no fixtures, working tree unchanged whatever the verdict. The verdict lives outside the
  generated script on purpose: "it didn't throw" is not "it worked."
- **The preview URL now reaches the tooling on GitHub Actions too.** `preview-url.sh`'s discovery methods
  all read GitHub-side artifacts that only *Cloudflare Workers Builds* publishes, so on the Actions backend
  wrangler's URL died in a job log — `/save` reported no preview and the walkthrough could only ever return
  `UNKNOWN`. `cf-deploy.sh` now **harvests** the URL from wrangler's own output (never constructs it from the
  naming convention — a built URL can answer 200 while pointing at another commit) and `deploy.yml` publishes
  it as a GitHub Deployment.
- **New runbook** — [`wiki/stack/ship-walkthrough.md`](wiki/stack/ship-walkthrough.md): the three adoption
  rungs (install → Access service token → optional media bucket, each degrading to the one below), the five
  verdicts, and what the gate deliberately isn't (not a test suite, not on `/save`, no second judging agent).
## 8.3.0 — /wong-sync stops deciding on your behalf and shows its work

`/wong-sync` had a review gate for everything it said **yes** to and none for anything it said **no** to. An `adopt` became an OpenSpec change folder you read at your leisure; a `divergent` or a `declined` got one line in a chat report that scrolled away — and then a manifest entry that quietly suppressed that capability on every future run. So a judgment call you never made became a permanent, invisible "no." The taxonomy made it worse: `declined` was defined as "wrong for this repo, **or** the user said no", so the skill's guesses and your actual refusals shared one sticky slot.

- **The verdicts now split on *who decided*.** A new **`not-applicable`** carries the skill's own reading — an `assumes` your repo doesn't meet, or a graft it couldn't describe concretely. **`declined` narrows to mean you said no**, and may never be inferred: if the skill can't point to something you actually said, the verdict is `not-applicable`.
- **Only `declined` suppresses.** `present`, `divergent`, `adopt` and `not-applicable` are recomputed from scratch every run. This also closes a latent bug: `not-applicable` turns on *your repo's* shape, but ledger entries are pinned to an `asOfCommit` in the **upstream clone** — so "assumes CI, you have none" would never have been revisited when you added CI. The ledger's job is now precise: it stores your decisions, plus a snapshot of the last computed state, and only the first half is authoritative.
- **New `.claude/wong-sync-verdicts.md`** — written on **every** run, holding **every** capability with its verdict and one-line reason, not just the ones that became work. It's committed rather than ignored, so it travels between clones and shows up in the PR diff. It's written even when nothing is adopted — the run where the old output was thinnest and the "it just decided" feeling strongest. The chat report shrinks to a summary that points at it.
- **Tick a box to overrule the skill.** Every non-`adopt` entry in that file is a checkbox. The next `/wong-sync` reads the ticks *before* regenerating the file, forces those capabilities to `adopt`, writes them as tasks, and clears any `declined` ledger entry among them — asking for a capability is how a past refusal is reversed. Promotion costs a second run, which keeps the sync itself non-interactive: no per-capability prompt wall.
- **"Never overwrite" is now scoped by authorship, not by an exception list.** The skill may rewrite a file it generates and solely owns — the manifest, and now the verdict record — and rewrites nothing a human or another tool wrote. The verdict file carries a generated-file header saying so, since ticking is the only edit that survives regeneration.

**Adopting:** nothing to do — your next `/wong-sync` writes the verdict record and leaves it uncommitted for `/save`. Two migration notes. Existing **`divergent` entries stop suppressing** and are recomputed; if the local solution that justified one is still there, it simply lands on `divergent` again. Existing **`declined` entries are honored as user refusals**, because a pre-8.3.0 ledger can't distinguish your "no" from the skill's guess — the conservative read, since re-pitching something you genuinely refused is the louder failure. Tick its box (or delete the entry) if one of them was never your call.

## 8.2.0 — one list of secrets for both Workers, and a gate that catches the drift

8.0.0 made staging a second Worker. A second Worker has a second secret store, and nothing syncs the two — so every new secret meant two `wrangler secret put` calls, and forgetting the second one surfaced at runtime, in staging, later. Configuration drift between the environments was the default state and nothing in the pack looked for it.

- **`.dev.vars` is now the declared source of truth**, and `npm run secrets:push` loads both Workers from it via `wrangler secret bulk` (which takes dotenv format directly). Staging reads `.dev.vars.staging` when it exists and falls back to `.dev.vars` otherwise — so identical values across both Workers is the zero-config default, and divergence costs one file and no command change. `wrangler dev` already reads the same file, so it serves local development too.
- **Diverge where writes escape.** Identical values are fine for read-only credentials. For anything with third-party *write* side effects — payment keys, outbound email/SMS, webhook targets — sharing the value lets a branch on staging charge a real card, which is the production-contamination hole twinning the database closes, re-opened at the API layer.
- **`npm run secrets:check` is a parity gate**, wired into the workflow on every push. Because `.dev.vars` is git-ignored and so absent in CI, the assertion that fails is **Worker against Worker**: production's secret names against staging's. It also fails when a binding declared at the top level of `wrangler.jsonc` is missing from `env.staging`, and warns when a staging service binding still targets production's service. **Names only** — no secret value is read, printed, or logged, so it is safe in retained CI logs.
- **The `.env` refusal is code, not a note.** `.env` holds `CLOUDFLARE_API_TOKEN`, which can widen its own permissions and create account resources; in a Worker's runtime environment, one log leak escalates to the whole Cloudflare account. `secrets:push` refuses that file, resolves symlinks before judging it, and stops outright if `.dev.vars` itself contains a `CLOUDFLARE_*` or `CF_ACCESS_*` key. The two files look interchangeable and the mistake only has to happen once.
- **Cron triggers were documented backwards, and are corrected.** Only `vars` and bindings are non-inheritable; `triggers` is an ordinary *inheritable* key. The pipeline docs told you to omit crons from `env.staging` to keep staging manual — which does the opposite: the environment inherits production's schedule and fires against the staging database, with no error. Keeping staging manual-only needs the explicit `"triggers": { "crons": [] }`. The docs now state the inheritable/non-inheritable split, since the two failure directions are both silent and opposite.
- **`.gitignore` widens to `.dev.vars*` with a `!.dev.vars.example` negation** — the wildcard so a `.dev.vars.staging` of live values can't be committed, the negation so the new committed, values-blank `.dev.vars.example` isn't swallowed by it.

**Adopting:** run `npm run secrets:push` once so both Workers agree, then let the gate hold the line. On a repo that has already drifted the check goes red on the first push — that is the finding, not a regression, and the failure names the keys or bindings. Nothing else changes: no existing script changed behaviour, and the check *skips* rather than fails on a repo with no `CLOUDFLARE_API_TOKEN` (not provisioned) or no `env.staging` (not on the two-Worker model), so adoption never produces a permanently red check.

## 8.1.0 — one token stands the app up; branches stop reaching production

Getting the Cloudflare app running meant leaving the agent and working the dashboard by hand: guess a token's
permission set, create the databases, wire the binding, connect the build, stand up Zero Trust. Every one of
those was a place to stall. Live probing found most of it unnecessary. The manual list is now **sign up and copy one token.**

- **New `/wong-cloudflare` skill** (stack-pack only). Given one token it widens its own permissions, resolves
  the account, creates the production and staging D1 databases, writes the binding, computes the URLs, and
  sets the GitHub secrets. Idempotent, re-runnable long after
  `/wong-setup`, and it ships with the teardown that removes what it made.
- **The self-widening token.** The user creates a token with two permission groups — `User ▸ API Tokens ▸ Edit`
  and `Account ▸ API Tokens ▸ Edit` — and the agent grants itself the rest via `PUT /user/tokens/{id}`.
  Verified end to end: nine endpoints went from `Authentication error` to resolving. The token id is stable, so
  `.env` is written once. Optional features cost nothing up front — someone who never wants a login wall never
  grants anything Zero-Trust-shaped.
- **GitHub Actions is the pack's CI**, via a new `.github/workflows/deploy.yml`. Cloudflare's own Workers
  Builds cannot be connected to a repo through its API at all — no repository connection, no branch config,
  no first trigger — and its GitHub App needs browser OAuth `gh` can't grant, so it costs three dashboard
  steps per repo forever and produces no pull-request check. Actions is `gh secret set` plus a file, and a red
  build is `gh run view --log-failed`, which `/save` and `/ship` already read.
- **The deploy model does not change, and nothing breaks.** 8.0.0 put the branch split in `cf-deploy.sh`, so
  the workflow is a thin driver: it sets the branch and runs the same two scripts. The only script edit is a
  CI-neutral **`CF_BRANCH`**, with `WORKERS_CI_BRANCH` retained as a fallback — so a repo on Workers Builds
  keeps working untouched, can run both backends while migrating, and adopting the workflow is opt-in per repo.
  Before the secrets exist the workflow builds without deploying, so an unprovisioned repo gets a real PR check
  rather than a permanently red one.
- **FIX (was live in 8.0.0): a feature branch deployed to the production Worker, on production data.**
  On the SPA layout the pack ships, `@cloudflare/vite-plugin` flattens the selected environment into a
  generated config and redirects wrangler at it — after which [`--env` on `wrangler deploy` has no
  effect](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/). So
  `wrangler deploy --env staging` silently deployed *production*, while migrations still went to the staging
  database. Green build, preview URL printed, production overwritten. Found by running the whole path against
  a real repo. Three parts to the fix: `cf-build.sh` now exports `CLOUDFLARE_ENV=staging` (the environment is
  selected at **build** time); `cf-deploy.sh` drops `--env` when it sees the redirect; and a **fail-closed
  guard** refuses to deploy when a non-production branch resolves to the production Worker's name — verified
  live by deliberately re-breaking the selection and watching the deploy get blocked.
- **`cf-build.sh` regenerates binding types before building.** A binding written during provisioning failed
  the first build with `Property 'DB' does not exist on type 'Env'`, because `worker-configuration.d.ts` is
  generated from `wrangler.jsonc`. CI regenerates, so nobody has to remember.
- **FIX: the CI gate could silently skip itself.** `wait-for-checks.sh` ran `gh pr checks --json …` with stderr discarded and treated empty output as "no checks." `--json` doesn't exist on older `gh` (2.46, for one), so the flag error was swallowed and the script reported `RESULT: NONE` — telling `/save` and `/ship` the repo had no CI while checks sat on the PR, from which `/ship` would happily merge a red branch. It now detects the flag and falls back to the default output, and **only reports `NONE` when gh explicitly says there are no checks**; anything else it couldn't ask becomes the new `RESULT: UNKNOWN`, carrying gh's own message. `/save` reports that as an unverified gate rather than "none configured", and **`/ship` refuses to merge on it**. Caught when this very release's `/save` reported no checks while three were green.
- **`gh auth login` requests the `workflow` scope.** It isn't in the default set (`repo`, `read:org`, `gist`),
  and without it pushing a workflow file fails at push time with an OAuth error a newcomer can't act on.
  `gh auth refresh --scopes workflow` is the documented repair.
- **Zero Trust is opt-in documentation, not provisioning.** A provisioned app is public by default.
  **BREAKING for the header-trust default:** the template Worker no longer reads
  `Cf-Access-Authenticated-User-Email`, because on a public Worker that header is attacker-controlled and
  trusting it lets anyone impersonate any user. The login wall and the code change are adopted together.
- **Runtimes install at the point of need, never pre-emptively.** Node stays a real dependency of `/plan`,
  `/apply`, and `/ship` (the OpenSpec CLI is npm-only and supplies artifact templates at runtime), but setup
  no longer installs it as a precaution. It asks when a step needs it, prefers a user-local install over
  `sudo`, and completes the runtime-free layer — wiki, notes, `/save`, `/continue`, `/dream` — if you decline.
- **Written for someone non-technical.** The stack-pack offer asks whether you want *a real website people can
  visit* rather than listing components; the token screen gets a literal click path with **Account Resources**
  flagged as the field people miss; Cloudflare's error codes are translated into the one thing to fix; and
  resource names are derived from the repo instead of asked.
- **Docs:** new `wiki/stack/getting-started.md` (the human walkthrough — five steps, no jargon) and
  `wiki/stack/provisioning.md` (the runbook `/wong-cloudflare` executes). `cloudflare-credentials.md`
  reconciled with `.env.example` on one user-scoped `CLOUDFLARE_API_TOKEN`, naming `Workers CI Read` properly
  (Cloudflare files Builds under "CI", which is why searching 392 permission groups for "build" finds nothing)
  and stating plainly that a self-widening token is effectively account-root.

## 8.0.0 — staging is its own Worker; the D1 preview swap is gone

**Only the [stack pack](.claude/skills/wong-sync/references/payload-manifest.md#the-opt-in-stack-pack) changes.** A repo that declined it is untouched by this release.

The pack isolated staging at the *binding* level: one Worker, two database ids, and `swap-d1-id.js` rewriting `wrangler.jsonc` on preview branches. That only ever covered one code path. Cloudflare Workers Builds uploads a **version** on a non-production branch, and a version serves HTTP and nothing else — queue consumers, cron triggers, and every other non-request handler run on the **deployed** version, with production bindings. So a repo that added a queue couldn't exercise it on staging at all, and staging messages were handled by production code against the production database. The unit of isolation on Cloudflare is the Worker; this release uses one.

- **`env.staging` in `wrangler.jsonc`** — a second Worker (`<name>-staging`) with its own deployment, its own queue consumers, and its own bindings. A branch deployed there runs imports, crons, and alarms end to end on branch code.
- **New `scripts/cf-deploy.sh`**, wired to the Workers Builds **deploy command** (`bash scripts/cf-deploy.sh` — the one setting a human must change). Default branch → `wrangler deploy`; any other → `wrangler deploy --env staging` *then* `wrangler versions upload --env staging --preview-alias <branch>` (deploy first — a version can't be uploaded against a Worker that doesn't exist yet). Per-commit preview URLs survive the switch; without that first command a custom deploy command would silently switch them off.
- **BREAKING — `scripts/swap-d1-id.js` is deleted** and `preview_database_id` is gone from the model. Nothing rewrites `wrangler.jsonc` any more; which database a branch binds follows from which Worker it deploys to. `cf-build.sh` loses its swap leg, and it and `reset-staging-d1.mjs` target staging with `--env staging` instead of `--preview`.
- **Twin by default** — every stateful binding in `env.staging` points at a second resource rather than sharing production's behind a namespace prefix. A twin needs no application code; a prefix taxes every call site forever, and one omission writes into production data. Documented as a table over D1, Queues, R2, KV, Durable Objects, cron, secrets, and service bindings. R2 key prefixes are explicitly rejected.
- **Two libraries, one rule each** — `scripts/lib-wrangler-config.sh` (new) and `lib-wrangler-config.mjs` (extended) so a build and its deploy can't resolve different apps, and so every script reads a database name from the right environment. Staging declares its own `database_name`; a missing `env.staging` D1 entry stops the build with an explicit error rather than touching production.
- **`wiki/stack/d1-pipeline.md` is now [Deploy and data pipeline](wiki/stack/d1-pipeline.md)** — opens with the version-vs-deployment diagnostic, then the two-environment model, the twin table, the two preview URLs and which one runs your queue, why staging is shared, and why per-PR Workers are declined. Migration mechanics, seeded staging, and all three production-recovery runbooks are unchanged. `cloudflare-credentials.md` gains per-environment Worker secrets; `cloudflare-access.md` names the staging hostname the existing wildcard already covers.
- **Upgrading is deliberate, and documented.** `/wong-sync` never modifies a file a repo already has, so an existing repo keeps its old scripts until a human follows [adopting the staging environment](wiki/stack/d1-pipeline.md#adopting-the-staging-environment) — nine ordered steps, arranged so stopping partway leaves the repo behaving exactly as before. Nothing breaks until step 8 repoints the deploy command.

## 7.2.0 — prose goes straight to `main`; the fast path widens to `wiki/`

`/save`'s direct-to-default-branch route was scoped to exactly `notes/*.md`. Everything else took the full
behavior-change gate — so a `/dream` run that only rewrote wiki prose needed a branch, a PR, a CI wait, and
`/ship` to land a paragraph. The gate exists to stop unreviewed *behavior* reaching `main`, and prose has
none. The carve-out now matches its own reason.

- **The fast path is a prose allowlist:** the two path prefixes `notes/**` and `wiki/**`. Every changed path
  inside it → commit straight to the default branch, no branch, no PR, no CI, no `/ship`. That covers a
  conversation-only session (just a note) *and* a `/dream` run (wiki pages plus the `consolidated:` stamps).
  One path outside and the normal flow applies to the **whole** save, prose riding along on the branch.
- **Routing is by path prefix, never by file extension.** `*.md` is not a proxy for prose:
  `.claude/**` *is* the shipped payload (editing it is a release), `openspec/**` *is* the specs, and
  `AGENTS.md`/`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and config files keep the full
  gate. The allowlist is closed — a surface that isn't named gets the gate until someone adds it. `wiki/` is
  the literal prefix; a repo that keeps prose in `docs/` is unaffected.
- **Wiki edits no longer need a PR** — the reversal of 7.1.0's stated rule. Review of a wiki edit happens
  where it actually happens: in-session, on the diff `/dream` produced, before `/save` runs. `/dream` is
  deliberate and human-invoked, and a wiki page can't break a build or a deploy; a wrong sentence is caught
  by the next gardening pass, which resolves contradictions newest-wins by design.
- **`/dream` still runs no git** — unchanged rule, new reason. It's the division of labour (the git skills
  own git), not a claim that wiki edits are gated behind a PR.
- Vocabulary: "notes-only fast path" → **prose fast path**, throughout `/save` and the doctrine.
- Doctrine updated in step: `CLAUDE.md`, `notes/README.md`, `wiki/development/the-change-loop.md`, and the
  `save` and `dream` skills now state one identical rule.

## 7.1.0 — conversations reach the repo; `/dream` reads the repo, not your chat history

`/dream` could only consolidate what was in the current conversation, and its unbuilt sweep mode would have
read `~/.claude/projects/` transcripts. Both are machine-local, so a long session on your laptop died there:
`/save` pushed the code and the change, but never the conversation — and `/dream` on a second machine found
nothing. Capture and consolidation are now split across the repo boundary.

- **New `notes/` surface.** One note per line of work at `notes/<slug>.md`, keyed by the same slug as the
  branch and the change, so `notes/add-po-search.md` sits parallel to `openspec/changes/add-po-search/`.
  Kept forever — the wiki carries only what survived the filter; the note stays referenceable for the rest.
  `notes/README.md` documents the convention and ships as a payload file.
- **`/save` is the only skill that reads the conversation.** It writes the note as part of the checkpoint —
  a *compression, not a summary*: what the user stated, decisions with their rationale, what was ruled out
  and why, specifics, open threads. It deliberately does **not** pre-apply `/dream`'s durable-facts filter,
  so that judgment stays repeatable instead of being made once, on one machine. Nothing new beyond the diff
  and the Decision log → no note, and it says so.
- **A conversation is now a valid save.** A session with no code and no plan gets **no OpenSpec change** —
  no invented proposal describing nothing changing, no `tasks.md` with zero tasks, no `no-tasks` entry
  cluttering `openspec list`. Just the note.
- **Notes-only saves commit straight to the default branch** — no branch, no PR, no CI wait, no `/ship`.
  **This is a scoped carve-out to the PR gate** and to `/save`'s "never push to the default branch" rule:
  it applies only when *every* changed path matches `notes/*.md`, and one file outside `notes/` restores
  the normal flow for the whole save. The gate isn't weakened, it moves — a note is one additive,
  slug-unique file that's raw and non-canonical, so there's nothing to approve; `/dream`'s wiki edits *are*
  canonical and keep the full branch + PR route. A rejected push (protected branch) falls back to branch +
  PR, never forced. `/save` still never merges.
- **`/dream` reads only the repo.** Phase 1 consolidates unconsolidated `notes/*.md` and never touches the
  conversation, scrollback, or transcript files, then records `consolidated: <date>` in each note's
  frontmatter — a per-note watermark rather than a central ledger, which would merge-conflict in exactly the
  multi-machine case this exists to serve. Notes are marked, never deleted. Phase 2 gardening runs whether or
  not there are new notes.
- **Sweep mode is deleted.** Its job — reaching sessions the repo never consolidated — is now structural:
  a fresh clone that pulls sees every machine's unconsolidated notes.
- **`/continue` reads the note alongside the change**, so a cold resume inherits the *understanding*, not
  just the plan. No note is normal, not an error.

## 7.0.1 — the D1 pipeline works when the Worker lives in `app/`

The stack pack (6.6.0) put `wrangler.jsonc` at the repo root; the SPA pack (6.7.0) put it in `app/`.
Take both and all three pipeline scripts die on `ENOENT: wrangler.jsonc` — they resolved it as
`<repo>/wrangler.jsonc` and read `schema/` from a different root again. Found by running the pipeline
end-to-end against real D1 databases; every item below is a reproduced failure, not a review note.

- **The scripts find the wrangler config instead of assuming it.** New `scripts/lib-wrangler-config.mjs`
  resolves the repo root from the script's own location, then looks for `wrangler.jsonc`/`.json`/`.toml`
  at the root and in each immediate subdirectory. `swap-d1-id.js` and `reset-staging-d1.mjs` share it;
  `cf-build.sh` does the same in bash. Still zero-config and byte-identical in every repo — now for
  both layouts.
- **`cf-build.sh` no longer depends on the caller's CWD.** It anchors on `${BASH_SOURCE[0]}`, runs
  wrangler from the config's own directory (so config-relative paths resolve), and runs `build:app`
  wherever `package.json` actually is. Previously it grepped `wrangler.jsonc` from CWD and invoked
  `node scripts/swap-d1-id.js` by relative path — both wrong unless CWD was the repo root.
- **`reset-staging-d1.mjs` runs wrangler from the config directory**, so `migrations_dir` resolves the
  way wrangler expects while `schema/seed.sql` still comes from the repo root.
- **Three fragment-doc corrections** in `stack-pack-fragments.md`, each a real install failure:
  `migrations_dir` is config-relative (`../schema/migrations` in the `app/` layout, and getting it
  wrong silently finds no migrations); the `db:migrate:*` scripts used `$npm_package_config_db`, which
  expands to nothing without a `config.db` key; and script paths are relative to the `package.json`
  being merged into. Plus a note that `wrangler deploy`'s binding summary prints
  `preview_database_id`, which reads alarming after a preview swap but is only cosmetic.

Known drift, not fixed here: `wiki/stack/cloudflare-credentials.md` documents `CLOUDFLARE_USER_TOKEN`,
but wrangler reads `CLOUDFLARE_API_TOKEN` (what `.env.example` ships). Follow the wiki and nothing
picks the token up.

## 7.0.0 — `/wong-sync` adapts instead of overwriting

Updating stopped being a file copy. `/wong-sync` used to three-way-diff every payload file and ask
you to resolve the collisions — which meant it could tell you your copy of a skill was *behind*, but
never what upstream could now *do* that you couldn't. Repos experienced that as a sync that only
grabbed surface-level features. It now reads both sides for meaning and proposes what's worth taking,
in your repo's own terms.

The premise is adaptation, not replication: you're up to date when the *capability* is present here,
whatever form it takes — not when your bytes match upstream's.

- **BREAKING: it never overwrites a file that already exists.** The whole write scope is payload
  files that were absent, the `WONG-STACK` block where no markers existed, one OpenSpec change, and
  the manifest. There's no conflict prompt because there's no conflict.
- **BREAKING: the three-way diff is gone**, along with the base commit, the conflict walk, and fresh
  mode. A file you don't have is copied in verbatim; a file you do have is adapted. The threshold is
  per file, so a fresh install is just the case where every file is absent — it stopped being a mode.
- **New: the adapt step.** Two independent subagents — a *cartographer* that maps what WongStack lets
  you do (reading the wiki and the `WONG-STACK` block as first-class sources, not just skills), and a
  *surveyor* that reads what your repo already does. Every capability gets one verdict: `present`,
  `divergent` (you solve it your own way — left alone), `adopt`, or `declined`, each with a reason.
- **It proposes; it never implements.** `adopt` verdicts become
  `openspec/changes/adopt-wongstack-<date>/` — review it, then `/apply` like any other change.
- **New: a capability ledger** in `.claude/.wong-stack.json`, so declines aren't re-pitched every run
  — unless upstream changed that capability since you declined it, in which case it's re-raised with
  what changed.
- **BREAKING: `/wong-sync contribute` is removed.** No curation, no fork handling, no upstream PR.
  Contributing is a manual pull request now; `wiki/contributing.md` has the route and the generality
  bar. Removing the outbound leg is also what lets the surveyor read your repo properly.
- `commit` survives with a new meaning: the clone HEAD you last synced against, driving the changelog
  walk and the ledger — no longer a diff base. Older manifests just gain the new keys.

Upgrading: your first sync after this one is an analysis, not a pull. A stale-but-untouched payload
file no longer refreshes silently — it becomes a task saying to take the upstream version verbatim.
That costs a review it didn't before, which is the deliberate price of never clobbering work you
thought was yours.

## 6.7.0 — `/wong-sync` is pull-only; contributing is a word you say

Every `/wong-sync` used to end by curating your local drift and asking what to send upstream — a step
most people declined on a command they ran to *get updates*. The default now matches the common case.
Nothing is lost: the contribute machinery is untouched, just no longer unprompted.

- **A bare `/wong-sync` pulls and stops.** Refresh the clone, three-way-diff, pull upstream updates
  into the working tree, rewrite the manifest, report. No curation, no contribution prompt. Local-only
  drift is still classified (Step 3 needs it) but never surfaced.
- **`/wong-sync contribute` runs the contribute leg**, unchanged: one-line generality rationale per
  candidate, opt-in per file with skip as the default, then branch + `VERSION`/`CHANGELOG` ritual +
  fork-aware PR in the clone. It **still pulls first** — that ordering is what makes drift already
  landed upstream self-cancel instead of being re-offered. There is no contribute-only mode.
- **A new `wiki/contributing.md`, synced to every target repo** — what `/wong-sync contribute` does,
  the bar ("does this belong in every WongStack repo?"), and the opt-in-per-file rule. The prompt was
  the only place most people met the capability; this page is what replaces it, so it joins the
  manifest's synced docs alongside `wiki-style.md` and `voice.md`.
- **Reworded every surface that promised the round trip** — the skill's description, opener, and step
  diagram, the `WONG-STACK` block, `README.md`'s skill table, `wiki/development/README.md`,
  `required-tools.md`'s `gh` row, and `wong-setup`'s installed-repo hand-off. `gh` stays required; it
  was never justified by the contribute leg alone.

## 6.6.0 — An optional Cloudflare stack: the runnable pack

Change 1 documented the Cloudflare *setup*; this makes the stack *runnable* — as an **opt-in pack** a
repo takes at install and `/wong-sync` keeps current. It ships the parts nobody can reproduce from
prose: three hard-won D1 scripts and the two-database pipeline they implement, generalized from a
production app (where a hand-applied migration once kept a branch red for 8 commits). A repo that
declines the pack sees zero change, and WongStack stays exactly as stack-agnostic as before.

- **A gated `stack-pack` payload category**, keyed on `components.stackPack` in
  `.claude/.wong-stack.json`. Its files install and refresh **only** for a repo that opted in; a repo
  that declined never sees them, in either sync direction.
- **Three zero-config, byte-identical scripts** — no per-repo literal; every value reads from
  `wrangler.jsonc` or `.env`, so identical copies never conflict on refresh:
  - `scripts/cf-build.sh` — the CI build wrapper. Default branch → migrate **prod** D1; any other
    branch → migrate **staging** then swap the binding. Reads the DB name from `wrangler.jsonc`. The
    source's duplicate-prefix guard is **deleted** — timestamp prefixes make collisions impossible.
  - `scripts/swap-d1-id.js` — regex-swaps `database_id` ↔ `preview_database_id` so a preview binds
    staging. The hardcoded prod-id constant is **dropped**; it reads both ids from the file.
  - `scripts/reset-staging-d1.mjs` — drop staging → apply migrations → apply `schema/seed.sql`.
    **Never touches prod.** ~90 lines, down from ~250: the prod-mirror/topo-sort machinery is gone
    because staging is a seeded fixture, not a prod copy.
- **Template files** — `schema/seed.sql` (a commented, empty data-only INSERT template) and
  `schema/migrations/.gitkeep`.
- **Guided config fragments** — `package.json` scripts, the `wrangler.jsonc` `d1_databases` block,
  `.env.example` vars, and `.gitignore` `.dev.vars`. These *merge* into files the target owns, so
  they're applied as guided edits (show → confirm → merge, never blind-write), not manifest pull-files.
- **New `wiki/stack/` pipeline docs** — a **core-stack** page (React + Vite + Workers + D1, why the
  combo suits AI-driven dev) and the **D1 pipeline** — the two-database model, auto-migrate-on-deploy,
  timestamp migrations (`YYYYMMDDHHMMSS_name.sql`; additive and order-independent), seeded staging +
  reset, and the three **prod-recovery runbooks** (Time Travel; never hand-apply schema to prod;
  reconcile `d1_migrations` when prod drifts). The whole `wiki/stack/` section (including change 1's
  Access + credentials pages) now installs with the pack.
- **`/wong-setup` offers the pack** — one plain prompt; yes writes `components.stackPack: true` and
  applies the fragments, no leaves the repo stack-agnostic. Decline is the default and never a gate.
- **`/wong-sync` refreshes the pack** through its existing three-way diff — the gated files enter the
  file list only when `stackPack` is true; config fragments are re-offered as guided edits on the rare
  upstream change. No new refresh machinery.
- **`required-tools.md` states the split** — core stays exactly `git`/`gh`/`openspec`; the pack may add
  `node`/`npm`/`wrangler` + a Cloudflare account, but only in a repo that took it and only in that
  repo's build/CI, never in a skill.
- Follow-on (not yet shipped): `/wong-sync` pull-only (contribute-leg removal), then integration tests.

## 6.5.0 — An optional Cloudflare stack: the Access setup

WongStack tells you how to work but stays quiet on what to run it on. This starts an optional,
opinionated answer — a React + Vite SPA on Cloudflare Workers with D1 — beginning with the one part
that's written down nowhere else: the Cloudflare-side setup. It's a recommendation, not a
requirement; a repo that never adopts the stack sees nothing change, and WongStack stays
stack-agnostic.

- **New `wiki/stack/` section** (linked from `wiki/README.md` as *optional*, distinct from the core
  process pages). A hub plus two pages:
  - **Cloudflare Access** — stand up a login wall with no auth code: the Zero Trust org, an identity
    provider, one Access application, and the trick that gates production *and* every `*.workers.dev`
    preview URL with a **single wildcard policy** (plus a bypass for the open `/public/*` surface, and
    why the bypass must sit above the gate). Documents the header-trust auth model — the Worker trusts
    `Cf-Access-Authenticated-User-Email` — and states loudly that this is safe only *behind* the
    proxy, so verifying previews are actually gated is a step, not a footnote. A missing header is a
    `401`; only an explicit `SKIP_AUTH` dev flag substitutes a fallback identity.
  - **Cloudflare credentials** — the tokens that make everything work. Leads with the trap: create a
    **user-scoped** API token (My Profile → API Tokens), *not* an account token — the Workers Builds
    log API rejects account tokens with `Invalid token`. Both `CLOUDFLARE_USER_TOKEN` and
    `CLOUDFLARE_ACCOUNT_ID` land in `.env` per the secrets convention. Also creates an Access
    **service token** now, so a later CI/tests change can reach gated previews without a browser.
- **Retires `recommended-stack-guide`** — a superseded single-page draft, never started.
- Follow-on changes (not yet shipped): the scripts + D1 pipeline + opt-in installer wiring, then
  `/wong-sync` pull-only, then integration tests. The `wiki/stack/` pages install into a target repo
  only once that installer wiring lands; until then they live here.

## 6.4.0 — One less thing to install (and a CI gate that actually reports)

WongStack asked every repo to install `jq`. It barely used it: of 20 `jq` mentions in the payload, 12
were `gh --jq`, which runs on gh's *embedded* jq and costs nothing. Only three places touched the
standalone binary — and all three failed silently without it rather than erroring, so nobody noticed.
The toolchain is now `git`, `gh`, and `openspec`, full stop.

- **Fix: `wait-for-checks.sh` no longer reports false green.** Two independent bugs lived in the same
  script. Without `jq` on PATH, the pending count came back empty, `${PENDING:-0}` defaulted to 0,
  and a PR with failing checks reported `RESULT: SUCCESS` — `/save` and `/ship` treated red CI as
  passing. Separately (and this one hit *everyone*, `jq` installed or not), the no-checks guard keyed
  off `gh pr checks`'s exit code, but that command exits `8` on pending and `1` on failure — it
  reports the verdict, not whether checks exist. So any PR with live checks took the "no CI
  configured" branch on the first poll and the gate was skipped entirely. The guard is now emptiness
  of output alone, and the filtering runs through `gh --jq` into plain shell.
- **`/wong-sync` Step 0 reads its manifest instead of parsing it.** Four scalars out of
  `.claude/.wong-stack.json` used to come from `jq -r '... // empty'`, which yields a blank string for
  a missing key, an unreadable file, or the pre-2.0 filename alike — all indistinguishable from "not
  set." The skill now tells the agent to read the file and note the values, with defaults and the
  `~` → `$HOME` expansion stated in prose. Skills are instructions to an agent; a subshell is only
  worth it when determinism or volume demands it, and four scalars is neither.
- **`/wong-setup` stops gating onboarding on `jq`** — its readiness check is now `git`, `gh`
  (installed and authed), a resolving `origin`, and `openspec`.
- **New wiki page: [Required tools](wiki/development/required-tools.md)** — the three-tool set, why it
  stays that small, and the two rules that keep it there: filter with `gh --jq` in scripts, and read
  small local JSON files directly rather than shelling out to a parser.

Nothing changes for repos that already have `jq` installed, except that the CI gate now tells the
truth. No manifest or schema changes.

## 6.3.0 — Agents know where the credentials are

WongStack has shipped a secrets convention since 4.x — a committed `.env.example`, git-ignored real
values, and a wiki page explaining both — but the file agents actually read first never mentioned
it. `CLAUDE.md` had no occurrence of `.env`, "secret", "credential", or "auth", so the only route to
the convention was three hops down the wiki, and none of the surfaces along the way used any of
those words. The practical cost: an agent asked to run a one-off script against an API would ask you
for a token or stub the call out, while the value sat in `.env` the whole time.

- **New paragraph in the generic WongStack block**, under "Where context lives" — so it reaches your
  repo's `CLAUDE.md` on the next `/wong-sync`. It names `.env.example` as the committed map of every
  variable the project reads, and the git-ignored `.env` as where the values live when a task
  genuinely needs to run something.
- **`.env.example` first, `.env` second — deliberately.** The template is valueless and safe to read
  freely; it answers "what auth does this project need." Reading `.env` pours live credentials into
  the transcript, so the guidance frames it as the conditional read, for when a script has to run.
- **Stack-neutral, as the convention has always been.** `.env` at the repo root is named as the
  default because a concrete first place to look is the point, but "or your stack's dotenv
  equivalent" keeps it true for a repo on `.dev.vars` or a framework's own dotenv file. `.env.example`
  is mentioned as inline code rather than linked, since `/wong-setup` seeds it on opt-in and a repo
  that declined shouldn't inherit a dead link.
- **Nothing else changed.** The template, `.gitignore` entries, `wiki/development/secrets.md`, and
  `/wong-setup`'s opt-in seeding all behave exactly as before. This is a pointer, not a new
  mechanism — and the block still defers to the wiki page for the full convention.

## 6.2.0 — completed `/apply` runs `/save`

Finishing the implementation checklist now produces its durable handoff without requiring a second
remembered command. Once every task is complete, `/apply` invokes the existing `/save` skill exactly
once, so the change is synced, committed, pushed, opened or updated as a PR, and checked by CI when
present.

- **One owner for git remains** — `/apply` does not duplicate commit, push, PR, preview, or CI
  mechanics; it delegates the completed change to `/save`, which remains their single runbook.
- **Partial work stays intentional** — paused, blocked, interrupted, or failed applies with pending
  tasks do not auto-save. `/save` is still independently invocable whenever an in-progress
  checkpoint is wanted.
- **Already-complete changes are covered** — invoking `/apply` on an all-done task list also hands it
  to `/save`, covering completed work that has not yet received its durable checkpoint.
- **Loop guidance aligned** — the apply wrapper, bundled OpenSpec apply skill, README, CLAUDE.md
  conventions, onboarding, planning guidance, and change-loop wiki now describe the same terminal
  behavior.

## 6.1.1 — WongStack as an AI knowledge center

The docs now state WongStack's thesis directly: agents need shared process knowledge to work well,
and WongStack turns a repo into the place where that knowledge lives, runs, and improves. Code is one
output; the durable value is the knowledge center built through the process.

- **README reframed** — the front door now leads with a repo-native AI knowledge center, not
  "building apps with Claude Code." The paste prompt stays near the top and is written for any
  coding agent that can read files, edit files, run shell commands, and ask questions.
- **New philosophy page** — [`wiki/agent-knowledge-center.md`](wiki/agent-knowledge-center.md)
  explains the model: centralize process, make it agent-runnable, capture plans and decisions,
  preserve reusable lessons, and give future work more context.
- **Shared-memory context** — `CLAUDE.md` now describes the wiki/OpenSpec/skills system as repo
  memory for humans and agents, and the generic WongStack block points agents to the philosophy page
  before the lower-level rulebook.
- **Guided onboarding language** — `/wong-setup` and its playbook now frame setup as process
  alignment into an AI knowledge workflow. Hard mismatches still stop safely before changes, but the
  public posture no longer foregrounds denial.
- **Plain-language terms retained** — repo, pull request, CI, OpenSpec, and wiki are still introduced
  briefly for readers who are learning the workflow for the first time.

## 6.1.0 — WongStack's own wiki moves to `wiki/`

**Nothing is required of your repo.** This is the deferred second half of 4.4.0: that release
taught every skill to resolve the wiki root as `wiki/`, falling back to `docs/`, and rewrote the
convention pages to speak in `wiki/` terms — but WongStack's own tree stayed at `docs/`. So the
toolkit shipped a convention it didn't practice, and its own `CLAUDE.md` and `dream` skill linked
`wiki/wiki-style.md` — a path that didn't exist here. Those links now resolve.

- **`docs/` → `wiki/` in this repo** — all eight pages moved with `git mv`, so history follows
  each one. Content is unchanged apart from path references.
- **The fallback is untouched.** Skills still resolve `wiki/` first and fall back to `docs/`, and
  `/wong-sync` still places the convention pages (`wiki-style.md`, `voice.md`,
  `development/secrets.md`, `ux-principles.md`) at *your* repo's resolved wiki root. A repo that
  installed WongStack before 4.4.0 and kept `docs/` keeps working exactly as it did. Renaming your
  own wiki is optional and yours to do.
- **References repaired** across `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the `plan`,
  `improve`, `wong-setup`, and `wong-sync` skills — WongStack's own page paths only. Every sentence
  describing a *target's* wiki stays generic, and `/improve docs` keeps its name (it names a
  subject, not a directory).
- **History left alone** — earlier CHANGELOG entries and everything under
  `openspec/changes/archive/` still read `docs/`, because that's where those files were when they
  shipped.

## 6.0.1 — the front door actually opens the conversation

The README's one-paste prompt used to start with "Set up WongStack in this repo…", which reads as a
made decision — so `/wong-setup` took its fast path and **skipped the consultation and fit verdict**
for the exact newcomers the door is written for. Two wording fixes: the README paste now asks the
agent to *see whether WongStack fits how I work — then, if it does, walk me through setting it up*,
and `/wong-setup` Step 3 now runs the consultation **by default**, fast-pathing only on an explicit
skip signal ("just install it", "skip the questions"). A bare "set up WongStack" no longer opts you
out of the fit check. No behavior change once either path runs.

## 6.0.0 — /wong-setup: the front door that listens first

Setting up WongStack now starts with a conversation, not an install. **`/wong-setup`** replaces the
installer outright: it researches your repo, asks where your workflow actually hurts, maps those
pains to the verbs that address them, and gives an **honest fit verdict — including "not a good
fit"** — before a single file is copied. Only a yes (or an explicit "just install it", which skips
the questions entirely) moves to setup — and the install itself is now a `/wong-sync` sync.

- **New source-only `wong-setup` skill** — [`wong-setup`](.claude/skills/wong-setup/SKILL.md):
  locate source → mode check → deep research → discover → diagnose → fit verdict → make
  `/wong-sync` runnable (git repo, GitHub access, OpenSpec init, the authored CLAUDE.md
  "What this is" and wiki hub) → seed manifest → hand off. The consultation content lives in
  [`references/fit-playbook.md`](.claude/skills/wong-setup/references/fit-playbook.md) — question
  bank, pain→verb map, and the disqualifiers with what to recommend instead. Research runs
  *before* the conversation so the questions are informed; GitHub setup waits until *after* the
  verdict.
- **`/wong-sync` gains a fresh-install mode** — a seed manifest (`commit: null`, written by
  `wong-setup`) makes the sync diff against the **empty tree**: every payload file classifies as
  a batch-approvable pull (that *is* the install), collisions surface as conflicts with a
  keep-under-another-name option, the contribute leg and changelog walk are skipped, and the
  CLAUDE.md block is inserted when no markers exist. **One copy engine, one list** — the
  installer's copy-loop (a second, driftable encoding of the payload) is gone; `wong-setup`
  copies exactly one payload file, the `wong-sync` skill that bootstraps the first sync.
- **The runbook is guidance-level and agent-agnostic** — outcomes to reach, not command
  sequences, executable by any coding agent that can run shell and edit files (Claude-only
  affordances are "if available"). Setup asks which agent(s) drive the repo, passes them to
  `openspec init --tools`, and offers non-Claude agents an AGENTS.md pointer to the skills.
  Kept exact: the seed-manifest schema and the shared clone cache path.
- **BREAKING: `install-wong-stack` removed** — replaced by `wong-setup`; the skill directory and
  every live reference are gone (no tombstone — there's no installed base to redirect). The
  README's one-paste prompt now reads `wong-setup/SKILL.md`.
- **"Not a good fit" is a first-class exit** — a disqualifier (non-GitHub forge, no git and no
  willingness, a locked-in workflow the loop would fight, no ongoing changes) ends the run with
  the mismatch named and an alternative suggested. Zero changes to the repo on that path.
- **Installed repos are unaffected** — fresh mode triggers only on `commit: null`; a manifest
  with a real commit syncs exactly as before, and a repo with one still skips straight to
  `/wong-sync`.

## 5.0.0 — /wong-sync: the round trip in one pass

One skill now owns staying current: **`/wong-sync`** pulls upstream WongStack changes down *and*
carries your improvements back up, replacing the installer's update mode and `/contribute-wong-stack`
(both did blind two-way diffs, and contributing ended with a dirty clone you had to go `/save` yourself).

- **New `/wong-sync` payload skill** — [`wong-sync`](.claude/skills/wong-sync/SKILL.md) is installed
  into every target (it syncs itself). One pass: refresh the cached clone → **three-way diff** every
  payload file against the commit you last synced to (upstream update / contribution candidate /
  true conflict / in sync — only real decisions get asked) → pull updates into the working tree for
  `/save` → curate local drift with a per-file generality rationale (**opt-in; default skip**) →
  branch + VERSION/CHANGELOG ritual + push + **upstream PR, opened by the skill itself**, forking
  first when you lack push access. The canonical payload list now lives in one place:
  [`payload-manifest.md`](.claude/skills/wong-sync/references/payload-manifest.md).
- **BREAKING: `/install-wong-stack` is fresh-install-only** — re-run on an installed repo it
  bootstraps `wong-sync` if missing and hands off to it; the Step 3U update walk is gone.
- **BREAKING: `/contribute-wong-stack` retired** — absorbed into `/wong-sync`'s contribute leg;
  the installer offers to remove installed/symlinked copies.
- **Git rule rescoped, not broken** — `/wong-sync` runs no git in the repo it syncs (pulled updates
  wait for `/save`) but owns full git in the WongStack clone, and never leaves the clone dirty.
- **Manifest schema v2** — `.claude/.wong-stack.json` gains `commit` (the three-way base) and
  `upstream { repo, fork, clone }`; the clone moves to `${XDG_CACHE_HOME:-~/.cache}/wong-stack/`.
  Old manifests migrate lazily: the first sync falls back to a two-way walk, then records the base.

## 4.6.0 — UX stage in /plan: design the screen before the tasks

Upstreamed from **ClaymooApp**, where a `/plan` UX stage was proven on a UI-heavy Workers app: a
UI-bearing change now designs *what a screen should be* — the job, the flow, the hierarchy — before
any task is written, so tasks build against a spec instead of a guess. Stack-neutral and **gated to
repos with UI**: a CLI, library, or backend never runs the stage and never installs the doc.

- **New `docs/ux-principles.md`** — the judgment layer beside `wiki-style`/`voice`: use-case-first
  brief (who, the job, what *done* looks like, context, common-vs-edge, stated frequency
  assumptions), the shortest flow from intent to done, and the Refactoring-UI principles
  (hierarchy, one primary action per screen, emphasize-by-de-emphasizing, design the empty state).
  Ends with the `## UX` section template every UI-bearing change carries in its design.md. No
  design-system specifics — it points at *your* repo's UI/component conventions for the mechanics.
- **`/plan` UX stage** — [`plan`](.claude/skills/plan/SKILL.md) gains a "UX stage (UI-bearing changes
  only)": a design subagent drafts the `## UX` section by mirroring the closest existing screen, a
  critic subagent checks it against `ux-principles.md`, one revision round, then tasks reference the
  subsection they implement. UI-less changes skip it entirely.
- **OpenSpec rules** — [`openspec/config.yaml`](openspec/config.yaml) gains a `design` rule (UI-bearing
  → carry a `## UX` section per `ux-principles.md`) and a `tasks` rule (UI tasks cite the `## UX`
  subsection), so any author — not just `/plan` — is held to the same shape.
- **Installer + contribute wiring** — [`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md)
  offers `ux-principles.md` only when the target has UI (never forced into a UI-less repo, on install
  or update); [`contribute-wong-stack`](.claude/skills/contribute-wong-stack/SKILL.md) adds it to the
  payload manifest so the doc round-trips.

## 4.5.0 — /dream replaces /document; the wiki lives at `wiki/`

Upstreamed from **WongOS** (Matthew's personal second brain), where the conventions were proven in
use: the wiki moved from `docs/` to `wiki/`, and the write path became **`/dream`** — capture the
session's durable facts, then consolidate the whole tree — replacing the page-at-a-time `/document`.

- **New `/dream` skill, `/document` retired** — [`dream`](.claude/skills/dream/SKILL.md) consolidates
  the session into the wiki the way sleep consolidates memory: capture durable facts the user stated,
  then garden the whole wiki (merge duplicates, resolve contradictions newest-wins, prune stale
  content, repair links, reality-check cited paths/commands against the code). Deliberate only;
  edits stay in the working tree for `/save`. `.claude/skills/document/` (and its
  `references/progressive-disclosure.md`) is deleted — the rulebook lives in the repo's own
  `wiki-style.md`.
- **Wiki root is `wiki/`, falling back to `docs/`** —
  [`improve`](.claude/skills/improve/SKILL.md) (`/improve docs` + the
  [docs audit playbook](.claude/skills/improve/references/docs-audit-playbook.md)) and `dream`
  resolve the wiki root instead of hardcoding `docs/`, so un-renamed repos keep working.
- **Conventions updated for the rename** — the `CLAUDE.md` WONG-STACK block,
  [`docs/wiki-style.md`](docs/wiki-style.md), [`docs/voice.md`](docs/voice.md), and
  [`docs/development/secrets.md`](docs/development/secrets.md) now speak in `wiki/` terms and name
  `/dream` as the gardener. (WongStack's own pages still sit at `docs/` — the repo's own
  `docs/` → `wiki/` rename + installer update is the natural follow-up.)
- **`/ship` cross-references updated** — docs distillation now points at `/dream`.

## 4.4.0 — retire the auto-push Stop hook

WongStack no longer ships the optional auto-push `Stop` hook. It was opt-in and off by default, but a
hook that commits and pushes on every turn is more surprising than it's worth now that `/save` and
`/ship` own git explicitly — the payload is simpler without it.

- **Removed from the payload** — `.claude/hooks/auto-push.sh` and the `.claude/settings.json` `Stop`
  entry are gone; `install-wong-stack` no longer offers the hook (the Step 3F question and the
  copy/merge step are dropped, and the manifest no longer carries `autoPushHook`); `contribute-wong-stack`
  no longer diffs it.
- **Update path cleans up existing installs** — re-running `/install-wong-stack` on a repo whose
  manifest shows `autoPushHook: true` now **offers to remove** the installed `auto-push.sh` and drop
  only our `Stop` entry from `settings.json` (leaving any other hooks intact), then flips the manifest.
- No change to the core loop: `/explore → /plan → /apply → /save → /continue → /ship`.

## 4.3.0 — contribute-wong-stack: push improvements back upstream

The round trip is complete. `/install-wong-stack` copies the payload *down* into a repo; the new
[`contribute-wong-stack`](.claude/skills/contribute-wong-stack/SKILL.md) skill pushes improvements to
that payload *back up* into a WongStack clone — so WongStack, the source of truth, stops drifting
behind its own installs. (The v4.0.0 `/apply` adoption was exactly this, done by hand; now it's a
command.)

- **New `/contribute-wong-stack` skill** — the upstream-only inverse of install. It diffs **only the
  payload manifest** (the workflow skills, the `docs/` convention pages, the auto-push hook, and the
  `CLAUDE.md` WONG-STACK block) between the current repo and a WongStack clone, walks you through each
  drift (**keep-WongStack / take-from-here / skip**), copies the approved ones up, then bumps `VERSION`
  + adds a `CHANGELOG` entry and leaves the clone ready for `/save`. It never reads or copies
  app/business-specific files, so nothing local can leak upstream; it runs no git itself; and it
  refuses to run when the clone *is* the current repo.
- **Installer knows the meta-skills come in a pair** —
  [`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md) now excludes **both**
  `install-wong-stack` and `contribute-wong-stack` from the copied payload (source-only tooling) and
  offers to symlink both so they're runnable from a target repo.

## 4.2.0 — a friendlier install for total newcomers

The installer now welcomes someone who has never used Claude Code — or barely used a terminal — the
way a good onboarding prompt should: paste one line, answer in plain language, and end up genuinely
*started*. No behavior changes to what gets installed; this is voice and starting-point.

- **Bootstrap from zero.** [`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md) now
  treats "no repo yet / an empty folder" as a first-class starting point (Step 1.5, rung 0), not an
  error path — it explains what a repo and a remote *are* and offers to set each up.
- **Plain-language, one-thing-at-a-time.** The GitHub-readiness rungs each lead with a one-line "why,"
  asked one at a time instead of as a wall of tool checks; a fresh install now opens with a short
  human-facing preamble ("here's what I'm about to set up — ready?") before touching anything.
- **A real first step.** The install now ends by handing you a concrete, copy-pasteable first command
  (e.g. `/plan add-a-readme`), not just a menu of verbs.
- **Warmer README front door** — the install section points newcomers at the web/desktop app
  ([claude.ai/code](https://claude.com/claude-code)) as the least terminal-heavy way in, and reassures
  that an empty folder with no Git/GitHub experience is fine. The paste stays a URL-read of the runbook,
  so nothing drifts.

## 4.1.0 — a stack-neutral secrets convention

WongStack now ships an opinion on secrets — the one generalizable piece of a downstream Cloudflare
install's `.dev.vars` pattern, with none of the platform machinery. A committed **`.env.example`** is
the source-of-truth list of every variable a repo reads (documented, blank); the real file is
git-ignored. It's a **convention, not code** — nothing reads it, and a repo renames it to whatever its
stack expects.

- **New root [`.env.example`](.env.example)** — documented placeholders, no platform names; add a var
  in code, add it here.
- **`.gitignore`** now ignores `.env` / `.env.local` / `.dev.vars` so real secrets can't be committed.
- **New page [`docs/development/secrets.md`](docs/development/secrets.md)** — the
  `.example`-as-source-of-truth discipline and how to bootstrap a local file; linked from the
  development section README.
- **[`install-wong-stack`](.claude/skills/install-wong-stack/SKILL.md) offers it** — the page rides
  along with `docs/`; the `.env.example` + `.gitignore` entries are seeded on opt-in (a repo may
  already handle secrets its own way).

Purely additive — no skill, loop, or gate behavior changes.

## 4.0.0 — the change becomes a living handoff: `/apply` front-door + Status/Decision-log/PR-mirror

The loop grows from five verbs to six and the OpenSpec change stops being a static plan — it becomes
a **living handoff** that carries the *why*, not just the *what*. This mirrors the shape ClaymooApp
settled on after dogfooding it, adapted to WongStack's stack-agnostic, CI-optional gate.

```
was:  /explore → /plan → /continue → /save → /ship
now:  /explore → /plan → /apply → /save → /continue → /ship
```

- **New skill [`/apply`](.claude/skills/apply/SKILL.md)** — the **implement stage**, fronting
  `/opsx:apply` with no git. It works the change's `tasks.md` in a live session (already on the
  branch, right after `/plan`). This splits *implementing* from *resuming*: implement with `/apply`,
  resume cold with `/continue`.
- **[`/continue`](.claude/skills/continue/SKILL.md) is now the resume on-ramp** — it checks out the
  branch, recaps the plan + the **tail of the Decision log** (so you inherit decisions and dead ends),
  runs a **counts-only drift check** (commits vs tasks, unresolved review comments), then hands off to
  `/apply`. The `openspec list` pick-menu shows each change's **Status**, so "what can I pick up?" is
  answerable at a glance.
- **[`/save`](.claude/skills/save/SKILL.md) maintains the change as a living surface**, not just a
  spec sync:
  - a **`**Status:**` header** on `proposal.md` — `in-progress` / `blocked (…)` / `ready-to-ship` /
    `parked`; **`/save <note>`** sets it (e.g. `/save blocked on API key`).
  - an **append-only `## Decision log`** — one dated bullet per save (what landed, what was decided or
    ruled out and why); plan sections may change, history never gets rewritten.
  - a **PR body that mirrors the change**, regenerated every save (Summary + Status + Tasks + Preview +
    a `/continue` footer) — so a forge alone is a complete handoff surface.
  - **author-as-fallback** — a session that skipped `/plan` gets its change authored from the
    conversation via the same OpenSpec artifact process, so nothing pushes without its handoff.
- **[`/ship`](.claude/skills/ship/SKILL.md)** now reuses `/save`'s change-mirror PR body and names
  out-of-band review (`/code-review`, PR review) as the deeper-review path — it is the merge, not the
  gate. Stack-specific quality-gate subagents stay out; WongStack is stack-agnostic.
- **Docs + surfaces updated** — [the change loop](docs/development/the-change-loop.md) is rewritten
  for the six-stage loop and the living-handoff surfaces; README, `CLAUDE.md`, and the installer all
  install and advertise `/apply`.

**Upgrading is additive** — `/save` and `/continue` keep working; existing changes without a Status
header or Decision log just gain them on the next `/save`. The one behavior change: `/continue` now
hands off to `/apply` rather than calling `/opsx:apply` directly, and implementing in a live session is
`/apply`.

## 3.2.0 — `/improve` plans as OpenSpec changes

`/improve` now writes its plans **where the repo plans**. When the audited repo has an initialized
OpenSpec layer (`openspec/changes/` at the root), Phase 4 writes each selected finding as an
**OpenSpec change folder** — `openspec/changes/<slug>/` with proposal, tasks, design when warranted,
and delta specs when spec-level behavior changes — instead of `plans/NNN-*.md`. The change name is a
branch-ready kebab-case slug, so advisor output plugs straight into the loop:
`/continue <slug>` → `/save` → `/ship`. Repos without OpenSpec keep shadcn's original `plans/` flow,
unchanged.

- **New reference** [`references/openspec-plans.md`](.claude/skills/improve/references/openspec-plans.md)
  holds all OpenSpec-mode instructions: the detection rule, the plan-template → artifact mapping
  (the self-contained-for-a-weak-executor bar carries over — drift stamp, verification gates, STOP
  conditions land in `tasks.md`), `openspec validate` when the CLI is available, and no persistent
  rejection index (`openspec list` + the archive replace `plans/README.md`).
- **Variants adapt:** `execute` inlines the change's artifacts and ticks `tasks.md` checkboxes on
  approval; `reconcile` reads `openspec list` + the archive; `review-plan` takes a change slug;
  `--issues` publishes proposal + tasks as the issue body; the `docs` variant's plans are applied
  via `/continue` → `/save` → `/ship`.
- **Hard Rule 1 widened, not weakened:** in OpenSpec mode the only writable location is
  `openspec/changes/` (never `archive/`, never `openspec/specs/` — syncing is `/save`'s job).
  Still zero source edits, zero git.
- **Docs playbook refreshed:** the "Planning & applying docs fixes" section covers both modes and
  drops stale pre-3.0 wording (handoff/summary issues; "merge on green CI" → the 3.1.0 gate).

## 3.1.0 — CI is optional, not the only gate

GitHub Actions is no longer a required pillar — it's an **optional accelerator**, honored when a
repo has checks configured. The durable system is **pull requests** (any forge), version control,
OpenSpec, and everything-lives-in-the-repo. When a repo has CI, `/save` and `/ship` behave exactly
as before (wait for checks, auto-fix on red, `/ship` merges only on green); when it doesn't, the
**gate is PR review** — the PR, the OpenSpec change, and its archive are what a reviewer approves.
Nothing builds locally in either case (no local-verify fallback).

- **Doctrine reworded, mechanics unchanged.** `wait-for-checks.sh` already returned `NONE` for
  repos without checks, and `/save` / `/ship` already proceeded on it — this release makes the
  prose match: `CLAUDE.md`, `README.md`, `docs/development/the-change-loop.md`, the `save` / `ship`
  skills (intros, steps, hard rules, descriptions), the `wait-for-checks.sh` header, and the
  `install-wong-stack` workflow-fit note now say "CI when present, else PR review."
- **No tooling change.** The skills still use `gh` for PR mechanics; the shift is doctrine, not a
  rewrite for other forges.

## 3.0.0 — OpenSpec is the planning layer

WongStack now plans with **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** instead of GitHub
issues. A change is a folder under `openspec/changes/<name>/` (proposal, delta specs, design,
tasks) — visible from any clone via `openspec list`, and the **archived change is the record of
what shipped**. The workflow skills are now thin verbs over the native OpenSpec loop; you never
type `/opsx:*` by hand, but the commands stay available. **Breaking:** `/preview` is removed, and
`/save` / `/ship` no longer create GitHub handoff or summary issues.

- **The loop.** `/explore → /plan → /continue → /save → /ship`, each fronting one OpenSpec step:
  `/explore`=`/opsx:explore`, `/plan`=`/opsx:propose`, `/continue`=load context + `/opsx:apply`,
  `/save`=`/opsx:sync`, `/ship`=`/opsx:archive`. Documented in
  [`docs/development/the-change-loop.md`](docs/development/the-change-loop.md).
- **New skills** `/explore` and `/plan` (thin delegates to the generated `openspec-*` skills).
  **Removed** `/preview` (it was a `/save` alias — redundant now).
- **Simplified git skills.** `/save` syncs the change's delta specs into `openspec/specs/`, then
  pushes + previews (no handoff issue). `/continue` resumes by change name (= branch name), PR, or
  the `openspec list` menu, then implements. `/ship` squash-merges then archives the change (no
  summary issue, no docs distillation — use `/document`). The CI gate + preview URLs are unchanged.
- **OpenSpec never runs git; the WongStack skills own all of it.** The `openspec/` folder is
  committed with your code and reaches the default branch on `/ship`'s merge.
- **Installer.** `/install-wong-stack` now installs the `openspec` CLI and runs `openspec init` in
  the target (generating the `/opsx:*` commands + `openspec-*` skills); the manifest gains an
  `openspec` component and drops `preview` from the skill list.

## 2.4.0 — `/improve` — a senior codebase advisor (+ a `docs` variant)

New **`/improve`** skill: a **read-only senior advisor** that surveys a codebase, finds the
highest-value improvements, and writes prioritized, **self-contained plans** for a cheaper model
(or a person) to execute — it never edits source itself. It is
[shadcn/improve](https://github.com/shadcn/improve) (MIT) carried pretty much verbatim, plus one
WongStack addition: a **`docs` variant**.

- **The advisor.** Recon → Audit (parallel read-only `Explore` subagents across nine categories —
  correctness, security, performance, tests, tech-debt, dependencies, DX, docs, direction) → Vet
  (subagents over-report; every finding is confirmed against the code) → write plans under
  `plans/NNN-*.md`. Full variant set: `quick`/`deep`, a focus arg (`security`, `perf`, …),
  `branch`, `next`, `plan <desc>`, `review-plan`, `execute` (dispatch an executor subagent in an
  isolated worktree, then review its diff), `reconcile`, and `--issues`.
- **`/improve docs` — the WongStack addition.** Specializes the audit for a `docs/`
  progressive-disclosure wiki against `wiki-style.md` (structural integrity — broken links/anchors,
  orphans, hub gaps; openers & titles; one-topic-one-page; navigation; staleness; coverage), per
  `references/docs-audit-playbook.md`. Docs plans are applied by a human via `/save` → `/ship`.
- **Attribution.** shadcn's MIT license is carried in `.claude/skills/improve/LICENSE.md`; the
  SKILL and the `audit-playbook.md` / `plan-template.md` / `closing-the-loop.md` references are
  his, verbatim. The installer offers `/improve` alongside the other skills.

## 2.3.0 — Docs voice-and-tone guide

A new **`docs/voice.md`** codifies the prose style for the wiki: concise, dense, still easy to
read. [`wiki-style.md`](docs/wiki-style.md) owns a page's *shape* (titles, links,
one-topic-one-page); `voice.md` owns its *sentences*.

- **`docs/voice.md`** — the law (*say the most in the fewest words a stranger can still
  follow*), seven one-line habits, a delete-on-sight filler list, and a cut-20% test. Linked
  from [`docs/README.md`](docs/README.md) beside the rulebook.
- **Installer ships it.** `/install-wong-stack` seeds `docs/voice.md` next to the rulebook on a
  fresh install and adds/refreshes it on update, so every WongStack install inherits the voice.

## 2.2.0 — Optional auto-push hook

A new **opt-in `Stop` hook** that keeps an open PR synced without re-running `/save`. Ported
and generalized from the ClaymooApp repo WongStack was extracted from.

- **`auto-push` Stop hook** (`.claude/hooks/auto-push.sh`, wired via `.claude/settings.json`).
  Once a branch has an **open PR**, it auto-commits any pending work and pushes it on every turn.
  It no-ops on the repo's **default branch** (resolved from `origin/HEAD`, not hardcoded to
  `main` — WongStack is stack-agnostic), on a detached HEAD, and on any branch without an open
  PR, and it never blocks the turn (any hiccup just exits 0). The commit message lists the
  changed files with a diffstat body.
- **Opt-in only.** It acts every turn, so it's more intrusive than a skill — the installer
  **asks** and leaves it **off by default**. `/install-wong-stack` copies the script and *merges*
  the Stop entry into an existing `.claude/settings.json` (never clobbering your other hooks),
  refreshes it on update, and records `autoPushHook` in the manifest.

## 2.1.0 — Installer helps set up GitHub

`/install-wong-stack` now walks newcomers through GitHub setup instead of assuming it's
already done. Since every WongStack skill (`/save`, `/preview`, `/continue`, `/ship`) runs on
GitHub, the installer treats a working GitHub as a prerequisite and helps close the gap.

- **New "get GitHub working" step.** After researching the repo, the installer checks four
  rungs — is it a git repo, is `gh` installed, is `gh` authed, is there a GitHub `origin` — and
  offers to fix each it finds missing (`git init`, install `gh`, guide `gh auth login`,
  `gh repo create --push`). It explains what each piece is for, asks before any interactive or
  account-changing command, and never silently reassigns an existing remote.
- **Non-blocking.** If the user wants to set GitHub up later, install still proceeds; the report
  flags that `/save`/`/ship` won't work until auth + a remote exist.
- **Richer research.** The target-repo research now reports full GitHub readiness (git repo,
  `gh` install, auth, remote resolves) rather than just `gh auth status`.

## 2.0.0 — Renamed WongFramework → WongStack

The project is now **WongStack**. This is a rename only — no behavior changed — but it
touches user-visible names, so the updater needs to migrate existing installs.

- **`/install-wong-framework` → `/install-wong-stack`.** The installer skill and its command
  were renamed. A symlinked installer keeps working after you `git pull`; if you symlinked the
  old path (`.claude/skills/install-wong-framework`), repoint it at `install-wong-stack`.
- **Manifest renamed `.claude/.wong-framework.json` → `.claude/.wong-stack.json`.** On its next
  run the updater reads the old manifest if present and writes the new one.
- **CLAUDE.md markers renamed `WONG-FRAMEWORK:BEGIN/END` → `WONG-STACK:BEGIN/END`.** The updater
  re-merges the block under the new markers; old markers are recognized and migrated.
- **Paste-to-install.** The README's install step is now a single prompt you paste into Claude
  Code, pointing at the public [`install-wong-stack/SKILL.md`](.claude/skills/install-wong-stack/SKILL.md).
  The installer **self-bootstraps** — Step 0 clones the public repo into a cache when there's no
  local source — so the paste works from a cold start with no manual clone or symlink.

## 1.0.0 — Template + installer

First release of WongStack (then **WongFramework**) as a **template you clone and work from**
rather than a Claude Code plugin. If you used the old `claude-framework` plugin (`/framework:save`,
`/framework:ship`, …), this replaces it; the installer migrates the legacy traces.

- **No more plugin / marketplace.** WongStack lives at the repo root (`.claude/skills/`,
  `docs/`, `CLAUDE.md`) — clone it and every command is live. Commands are plain `/save`,
  `/preview`, `/continue`, `/ship`, `/document` (no `framework:` namespace).
- **`/install-wong-stack`** — a normal skill in `.claude/skills/`; guided, re-runnable
  installer/updater that deep-researches a target repo, merges its `CLAUDE.md` with
  WongStack's conventions, installs the skills, and seeds the `docs/` wiki. Re-run to update.
- **`/ship` now records a GitHub summary issue, not a daily note.** The `daily/` folder is
  gone. Each `/ship` runs two subagents in parallel — one creates/updates a per-conversation
  **summary issue** (the **changes** in the body, a **conversation summary** as a comment;
  closed when the squash-merge lands), one updates `docs/` with any reusable process. The set
  of closed summary issues is the project's conversation log.
- **CLAUDE.md carries marker comments** (then `WONG-FRAMEWORK:BEGIN/END`, renamed to
  `WONG-STACK:BEGIN/END` in 2.0.0) so the updater can re-merge the block without touching
  your own content (your "What this is" stays yours).
