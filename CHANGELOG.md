# Changelog

The `/install-wong-stack` updater reads the entries newer than your installed version
(`.claude/.wong-stack.json`) and walks you through each change. Newest first.

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
