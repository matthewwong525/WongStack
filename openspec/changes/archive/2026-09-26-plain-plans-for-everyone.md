<!-- openspec-archive v1 2026-09-26-plain-plans-for-everyone -->
<!-- file proposal.md utf8 6813 -->
# Plans a non-technical person can read

**Status:** ready-to-ship
**Branch:** explore/plan-non-tech
**Open questions:** none

## Why

Many WongStack users are not engineers, but its plans are written for engineers. The last plan used words such as `isMain` and "delta specs". Its questions ask about "compatibility and migration". A failed check asks "fix or merge anyway?". People must also learn six commands named after git steps. After a plan, nothing tells them where to look. A person who can not read the plan can not really review it, so the review step does not protect them.

## What Changes

- **Plans are written for the person who asked.** Their page in `wiki/people/` has one line that says whether they are technical. When no page says, the plan assumes they are not. For a non-technical reader, the Why, the list of changes, and every question use plain words about what they will see and get. File names, code, and commands go into the design and the tasks, which the review page does not show. An engineer's plan stays as it is today.
- **You just ask; the agent runs the commands.** Say "add a sign-up page" and the agent plans, builds, and publishes it with the same commands as today. It stops twice for your approval:
  ```text
  "add a sign-up page"
         │
         ▼
  plan ──▶ review page
         │
  ◆ Build it now?
         │ yes
         ▼
  build ──▶ preview link
         │
  ◆ Publish it?
         │ yes
         ▼
       live
  ```
  The commands stay as shortcuts. When you type `/ship`, it still does everything with no stops, as today.
- **Every plan ends with a link to its review page.** The last lines of the reply tell you to click the link to see the plan, then ask what to do next:
  ```text
  Plan ready: add a sign-up page
  ──────────────────────────────
  People can make an account
  with their email address.

  Click here to see the plan:
  review.html   ← link

  What next?
  1. Build it now (Recommended)
  2. Change the plan first
  3. Stop here
  ```
  The page builder prints where the page is, so the link always goes to the correct file.
- **Problems are fixed first, then explained as outcomes.** When a check fails, the agent tries to fix it, as it does today. If it still needs you, it says what does not work and what each choice means for you. For example: "The sign-up button does not work on the preview. Fix it first, or publish anyway?" It does not ask you to judge CI results or git terms.

**Non-goals:** No new command and no renamed command. No change to a plan for a person whose page says they are technical. No web address for the review page (that is still an open item). No change to mini apps, which already go live after one question.

## Capabilities

### New Capabilities

- `reader-level`: The person's recorded technical level, the non-technical default, and how plans, questions, and reports use it.

### Modified Capabilities

- `request-routing`: A code change asked for with no command stops at the plan and again before it is published.
- `structured-asks`: Every ask and blocker report names outcomes at the reader's level, not mechanisms.
- `ux-wireframes`: The page builder prints the page's path, and a plan that stops for review ends with a link to it.

## Impact

- Skills: `explore/references/asking-the-user.md`, `plan/SKILL.md`, `plan/scripts/build-review.mjs`, `apply/SKILL.md`, `ship/SKILL.md`.
- Doctrine and docs: the `WONG-STACK` block in `AGENTS.md`, `README.md`, `wiki/development/the-change-loop.md`, `wiki/wiki-style.md` (People), and the proposal rules in `openspec/config.yaml`.
- Tests: `scripts/tests/review.test.mjs`.
- Release: `VERSION` 23.1.0 and a `CHANGELOG.md` entry. No install breaks.

## Decision log

- **2026-09-26** — Asked who the plan and its questions are written for → chose the person asking, with their level read from their people page.
- **2026-09-26** — Asked whether non-technical people must type the commands → chose no: they just ask, and the agent picks the command; the commands stay as shortcuts.
- **2026-09-26** — Asked what a non-technical person sees when a check fails → chose: the agent tries to fix it first, and asks only in outcome terms.
- **2026-09-26** — Asked what to assume when no page records the level → chose non-technical.
- **2026-09-26** — Asked how far the agent goes with no command → chose: stop at the plan review ("build it now?"), then build, return the preview, and ask "publish it?" before the merge.
- **2026-09-26** — Asked where the review link goes → chose the end of the plan reply, with a line that tells people to click it (the user's own request).
- **2026-09-26** — Assumed: the level is one line on the person page, `**Technical level:** technical` or `non-technical`, because that page already holds how the person likes work done.
- **2026-09-26** — Assumed: the agent records the level when the person says it or asks for more or less detail, and never guesses it from one message, because a wrong guess sticks for every later plan.
- **2026-09-26** — Assumed: only the Why, What Changes, questions, and reports follow the reader level; Capabilities, Impact, specs, design, and tasks stay technical, because the review page shows only the first and tools and engineers read the rest.
- **2026-09-26** — Assumed: the two stops apply to every code change asked for with no command, whatever the level, because a person who wants no stops can type `/ship`.
- **2026-09-26** — Assumed: an invoked `/ship` or `/apply` keeps its current authorization, because a change there would break one-go runs.
- **2026-09-26** — Assumed: "publish it?" comes after `/save` returns the CI result and the preview; `/ship`'s walk still runs after the yes, and a failed walk asks in outcome words, because the walk lives inside `/ship`.
- **2026-09-26** — Assumed: the link is a Markdown link to the page's absolute path, because a pull request can not show the page yet.
- **2026-09-26** — Assumed: the link line sits just above the next-step question, because every reply must end with that question.
- **2026-09-26** — Assumed: no people page is seeded in this repo, because the wiki grows from use.
- **2026-09-26** — Assumed: the release is 23.1.0, a minor version, because no existing install breaks.
- **2026-09-26** — Distill: the store held no live facts for this change or branch; no repeatable fact beyond the People rule this change already writes to `wiki/wiki-style.md`.
- **2026-09-26** — Landed all 13 tasks: the reader-level rule in the ask convention, the no-verb two-stop path, the review link after every stopping plan, and the builder's path line (tests pass). Archived; version 23.1.0.

<!-- end proposal.md -->
<!-- file design.md utf8 3341 -->
## Context

See proposal.md — Why. The change touches doctrine that many skills cite: the shared ask convention (`explore/references/asking-the-user.md`), `/plan`, the `WONG-STACK` block, and the change loop page. The pattern in this repo is one owner per rule and links from everywhere else (`.claude/rules/payload.md`). The drafting rules the OpenSpec CLI shows the agent live in `openspec/config.yaml`.

## Goals / Non-Goals

**Goals:**
- One owner for the reader-level rule, cited by every skill that writes to the person.
- The routing and stop rules for a code change with no verb, stated once in the change loop and summarized in the `WONG-STACK` block.
- A deterministic link path from the page builder, so the agent never guesses it.

**Non-Goals:**
- A reader-level switch per skill, or any repo-wide setting.
- Rewriting archived proposals.

## Decisions

- **The ask convention owns the reader-level rule.** `asking-the-user.md` already governs how every question looks, and eight skills cite it. A new "Write at the reader's level" section there covers questions, next-step asks, and blocker reports, and names where the level comes from. The alternative, a new wiki page, adds a hop for every skill. The People section of `wiki/wiki-style.md` owns the page line's format; the ask convention links it.
- **The proposal rule goes in `openspec/config.yaml` and `/plan`.** The CLI shows config rules while drafting, so the rule reaches every drafting path, including `/save` authoring a change from a session. `/plan` states the lookup (git email → people page → level line → default non-technical) in one sentence and links the ask convention.
- **The two stops come from the routing rule, not new skill flags.** With no verb, the agent runs `/plan` as a standalone stop, then `/apply` on yes (which saves and returns the preview), then `/ship` on the second yes. `/apply` and `/save` already end with a next-step ask when the person invoked them directly; the no-verb path treats each stage as invoked by the person, so no skill needs a new mode. The change loop page owns the rule; the `WONG-STACK` block's verbs line changes from "build or change code through the verbs" to "ask for the change; the agent runs the verbs".
- **The builder prints the path on a second line.** `review: current, updated` stays the first line, so nothing that reads it breaks. A second line holds the absolute path of `review.html`. `/plan` builds its link from that line. The alternative, a relative path, does not open from the Paseo browser or a terminal link.
- **Failure asks reuse the existing fix loops.** `/save` already tries CI fixes three times and `/verify` tries in-scope fixes twice. Only the wording of `/ship`'s walk-failure ask and blocker reports changes, through the ask convention.

## Risks / Trade-offs

- [An engineer with no page gets a plain plan] → They say once that they are technical; the agent records it and every later plan has full detail.
- [Plain words hide a risky technical detail from a reviewer] → The detail is still in design, specs, and tasks, and the pull request still carries the full change; the rule moves detail, it does not remove it.
- [An agent writes jargon anyway] → The rule is in config, which the CLI shows at drafting time, and in `/plan`; the reviewer's notes catch the rest.

<!-- end design.md -->
<!-- file tasks.md utf8 2099 -->
## 1. Script

- [x] 1.1 `build-review.mjs`: after the status line, print the absolute path of `review.html` on its own line on every successful build
- [x] 1.2 `scripts/tests/review.test.mjs`: assert the two-line output for both builder aliases, and that the path line names the change's `review.html`

## 2. Skills

- [x] 2.1 `explore/references/asking-the-user.md`: add a "Write at the reader's level" section — the level lookup, the non-technical default, outcome words for questions, options, next-step asks, and blocker reports, and fix before asking; update the "finished plan" next-step example to include the review link line
- [x] 2.2 `plan/SKILL.md`: write Why and What Changes at the reader's level (link the ask convention); in Finish, end a stopping plan with "Click here to see the plan:" and a Markdown link to the path the builder printed, just above the next-step question
- [x] 2.3 `apply/SKILL.md`, `save/SKILL.md`, and `ship/SKILL.md`: lead reports with the outcome in plain words for a non-technical reader; word `/ship`'s walk-failure ask and `/save`'s "ship it" option by the ask convention

## 3. Doctrine and docs

- [x] 3.1 `AGENTS.md` `WONG-STACK` block: change the verbs rule so the person just asks and the agent runs the verbs, with the two stops, and the verbs kept as shortcuts
- [x] 3.2 `wiki/development/the-change-loop.md`: state the no-verb path and its two stops, and that an invoked verb keeps its authorization
- [x] 3.3 `wiki/wiki-style.md` People section: define the `**Technical level:**` line, when to write it, and the non-technical default
- [x] 3.4 `openspec/config.yaml`: add the proposal rule to write Why and What Changes at the reader's level; run `node scripts/check-openspec-config.mjs`
- [x] 3.5 `README.md`: say that you can just ask, and that the commands are shortcuts

## 4. Release

- [x] 4.1 Bump `VERSION` to 23.1.0 and add the `CHANGELOG.md` entry
- [x] 4.2 Run `node scripts/check-payload-links.mjs`
- [x] 4.3 Rebuild this change's `review.html` and validate with `openspec validate plain-plans-for-everyone --strict --no-interactive`

<!-- end tasks.md -->
<!-- file specs/reader-level/spec.md utf8 2987 -->
## Purpose

Let a plan, a question, and a report fit the person who reads them: plain outcomes for a non-technical person, full detail for an engineer, from one line on the person's wiki page.

## ADDED Requirements

### Requirement: The person page records a technical level

A person page in `wiki/people/` MAY hold one line, `**Technical level:** technical` or `**Technical level:** non-technical`. The agent SHALL find the current person's page by git email, as `people-wiki` defines. The agent SHALL write or change the line when the person states their level, or asks for more or less technical detail. It SHALL NOT infer the level from one message. When no page lists the current email, or the page has no level line, the agent SHALL treat the reader as non-technical. The level SHALL be a fact about a person, not a repo mode.

#### Scenario: No page

- **WHEN** the current git email is on no people page
- **THEN** the plan is written for a non-technical reader

#### Scenario: An engineer says so

- **WHEN** a person with no level line says "I'm a developer, give me the technical detail"
- **THEN** the next wiki save writes `**Technical level:** technical` on their page
- **AND** later plans for that person keep full technical detail

#### Scenario: Two people in one repo

- **WHEN** one teammate's page says technical and another's says non-technical
- **THEN** each person gets plans at their own level, and neither line supersedes the other

### Requirement: Plans use the reader's words

For a non-technical reader, a plan's Why and What Changes SHALL describe what the person will see, get, or be able to do, in plain words. They SHALL NOT use file paths, identifiers, commands, or engineering terms unless the person used that term first. Technical detail SHALL go in the design, the specs, and the tasks. The Capabilities and Impact sections MAY stay technical. For a technical reader, the plan SHALL keep the detail it has today.

#### Scenario: A non-technical plan

- **WHEN** a non-technical person asks for a sign-up page
- **THEN** the What Changes item says that people can make an account with their email
- **AND** the file names and the database change are in the design or tasks, not in What Changes

#### Scenario: A technical plan

- **WHEN** a person whose page says technical asks to change how the app stores data
- **THEN** What Changes may name the tables, files, and commands involved

### Requirement: Reports lead with the outcome

A reply that returns control to a non-technical reader SHALL start with the outcome in plain words: what is done, what they can open, or what is not working. Technical lines that a skill must print, such as a gate result, a branch, or a commit, MAY follow after it.

#### Scenario: A build finishes

- **WHEN** a build for a non-technical reader is saved and the preview is ready
- **THEN** the reply starts with what was built and the preview link
- **AND** the branch, commit, and gate lines come after that

<!-- end specs/reader-level/spec.md -->
<!-- file specs/request-routing/spec.md utf8 2450 -->
## MODIFIED Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL start the change loop on its own only when a request changes the repo's existing code or process. A request for a new standalone page or small tool SHALL take the mini-app path that `mini-apps` defines. When the person invokes a verb, the verb SHALL serve the work whatever its kind, as `work-verbs` defines. The rule SHALL live in the `WONG-STACK` block.

A code or process change the person asks for with no verb SHALL stop for the person twice. First, the agent SHALL run `/plan`, which ends with the review link and asks whether to build it now. On yes, it SHALL run `/apply`, whose completion save returns the CI result and the preview. It SHALL then ask whether to publish the change. On yes, it SHALL run `/ship`. A verb the person invokes SHALL keep its own authorization: `/ship` still runs the whole chain, and `/apply` still plans and builds without a stop. The person SHALL NOT need to name a verb to move the work to its next stage.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to change how the repo's app stores data
- **THEN** the agent runs the change loop, starting at `/explore`
- **AND** it stops at the plan's review page and asks whether to build it now

#### Scenario: The person says yes to both stops

- **WHEN** the person answers "build it now" and then "publish it" with no verb
- **THEN** the agent runs `/apply`, reports the preview, and on the second yes runs `/ship` to the merge

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

#### Scenario: A mini app

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent builds it on the mini-app path, with no `/explore` round, and reports a preview URL

#### Scenario: A verb for non-code work

- **WHEN** the person invokes `/plan` for their week
- **THEN** the agent writes a to-do in the conversation and creates no OpenSpec change

<!-- end specs/request-routing/spec.md -->
<!-- file specs/structured-asks/spec.md utf8 1437 -->
## ADDED Requirements

### Requirement: Asks name outcomes at the reader's level

Every ask, including a clarification question, a confirmation, a next-step question, and a blocked-state fork, SHALL state its question and each option's tradeoff in terms the reader can judge, at the level that `reader-level` defines. For a non-technical reader, it SHALL name what the person will see, get, lose, or risk, not the mechanism. It SHALL NOT offer a choice that needs technical judgment the person does not have. Where a skill can fix a failure within its own rules, it SHALL try the fix before it asks. The shared ask convention SHALL state this rule once.

#### Scenario: A clarification about compatibility

- **WHEN** `/explore` must ask a non-technical person about a data migration
- **THEN** the question asks what should happen to the accounts that exist today
- **AND** it does not use the words "migration" or "schema"

#### Scenario: A walk fails after its fix attempts

- **WHEN** `/verify` fails for a non-technical reader after its own fix attempts inside `/ship`
- **THEN** `/ship` says what does not work on the preview, in plain words
- **AND** asks whether to fix it first or publish anyway, with what each choice means for the person

#### Scenario: A technical reader

- **WHEN** the same walk fails for a person whose page says technical
- **THEN** the ask may name the failed scenario, the check, and the evidence link

<!-- end specs/structured-asks/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 1103 -->
## ADDED Requirements

### Requirement: A plan that stops for review links its page

On a successful build, the page builder SHALL print the absolute path of `review.html` on its own line, after its status line. A `/plan` that stops for review SHALL end its reply with one line that tells the person to click the link to see the plan, and a Markdown link to that path. The line SHALL come just above the next-step question, so the reply still ends with that question. A `/plan` that returns to `/apply` without a stop SHALL NOT need the line.

#### Scenario: The builder reports the page

- **WHEN** the builder writes or confirms a current `review.html`
- **THEN** its output holds the status line and then the page's absolute path

#### Scenario: A standalone plan

- **WHEN** `/plan` finishes a change and stops for review
- **THEN** the reply's last lines are "Click here to see the plan:" with a link to `review.html`, then the next-step question

#### Scenario: A plan inside a one-go ship

- **WHEN** `/ship` runs `/apply`, which runs `/plan`
- **THEN** the chain continues without the stop line

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 34539 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds zoom, pan, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-26-plain-plans-for-everyone</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:flex; gap:10px; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .drawing { margin:10px 0 0; }
  .zoom { display:flex; align-items:center; gap:6px; margin:0 0 4px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  .frame { box-sizing:content-box; position:relative; overflow:auto; max-height:70vh; border:1px solid var(--line); border-radius:4px; background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; }
  .frame.zoomed { touch-action:none; cursor:grab; -webkit-user-select:none; user-select:none; }
  .art { display:block; width:max-content; margin:0; padding:8px 10px; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; transform-origin:0 0; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:5; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; border-width:2px 0 0; border-radius:0; padding:10px 12px calc(10px + env(safe-area-inset-bottom)); }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-26-plain-plans-for-everyone">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-26-plain-plans-for-everyone</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap any paragraph, item, drawing line, or decision to add a note.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Many WongStack users are not engineers, but its plans are written for engineers. The last plan used words such as <code>isMain</code> and &quot;delta specs&quot;. Its questions ask about &quot;compatibility and migration&quot;. A failed check asks &quot;fix or merge anyway?&quot;. People must also learn six commands named after git steps. After a plan, nothing tells them where to look. A person who can not read the plan can not really review it, so the review step does not protect them.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Plans are written for the person who asked.</b> Their page in <code>wiki/people/</code> has one line that says whether they are technical. When no page says, the plan assumes they are not. For a non-technical reader, the Why, the list of changes, and every question use plain words about what they will see and get. File names, code, and commands go into the design and the tasks, which the review page does not show. An engineer's plan stays as it is today.</div></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>You just ask; the agent runs the commands.</b> Say &quot;add a sign-up page&quot; and the agent plans, builds, and publishes it with the same commands as today. It stops twice for your approval: The commands stay as shortcuts. When you type <code>/ship</code>, it still does everything with no stops, as today.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">&quot;add a sign-up page&quot;</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">       │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">       ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">plan ──▶ review page</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">       │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">◆ Build it now?</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">       │ yes</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">       ▼</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">build ──▶ preview link</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">       │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">◆ Publish it?</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">       │ yes</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">       ▼</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">     live</span></pre></div></figure></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Every plan ends with a link to its review page.</b> The last lines of the reply tell you to click the link to see the plan, then ask what to do next: The page builder prints where the page is, so the link always goes to the correct file.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">Plan ready: add a sign-up page</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">──────────────────────────────</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">People can make an account</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">with their email address.</span>

<span class="ln" data-note="item-3-line-6" tabindex="0">Click here to see the plan:</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">review.html   ← link</span>

<span class="ln" data-note="item-3-line-9" tabindex="0">What next?</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">1. Build it now (Recommended)</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">2. Change the plan first</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">3. Stop here</span></pre></div></figure></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Problems are fixed first, then explained as outcomes.</b> When a check fails, the agent tries to fix it, as it does today. If it still needs you, it says what does not work and what each choice means for you. For example: &quot;The sign-up button does not work on the preview. Fix it first, or publish anyway?&quot; It does not ask you to judge CI results or git terms.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> No new command and no renamed command. No change to a plan for a person whose page says they are technical. No web address for the review page (that is still an open item). No change to mini apps, which already go live after one question.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked who the plan and its questions are written for → chose the person asking, with their level read from their people page.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether non-technical people must type the commands → chose no: they just ask, and the agent picks the command; the commands stay as shortcuts.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what a non-technical person sees when a check fails → chose: the agent tries to fix it first, and asks only in outcome terms.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what to assume when no page records the level → chose non-technical.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how far the agent goes with no command → chose: stop at the plan review (&quot;build it now?&quot;), then build, return the preview, and ask &quot;publish it?&quot; before the merge.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked where the review link goes → chose the end of the plan reply, with a line that tells people to click it (the user's own request).</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the level is one line on the person page, <code>**Technical level:** technical</code> or <code>non-technical</code>, because that page already holds how the person likes work done.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the agent records the level when the person says it or asks for more or less detail, and never guesses it from one message, because a wrong guess sticks for every later plan.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: only the Why, What Changes, questions, and reports follow the reader level; Capabilities, Impact, specs, design, and tasks stay technical, because the review page shows only the first and tools and engineers read the rest.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the two stops apply to every code change asked for with no command, whatever the level, because a person who wants no stops can type <code>/ship</code>.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: an invoked <code>/ship</code> or <code>/apply</code> keeps its current authorization, because a change there would break one-go runs.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: &quot;publish it?&quot; comes after <code>/save</code> returns the CI result and the preview; <code>/ship</code>'s walk still runs after the yes, and a failed walk asks in outcome words, because the walk lives inside <code>/ship</code>.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the link is a Markdown link to the page's absolute path, because a pull request can not show the page yet.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the link line sits just above the next-step question, because every reply must end with that question.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: no people page is seeded in this repo, because the wiki grows from use.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the release is 23.1.0, a minor version, because no existing install breaks.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Distill: the store held no live facts for this change or branch; no repeatable fact beyond the People rule this change already writes to <code>wiki/wiki-style.md</code>.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Landed all 13 tasks: the reader-level rule in the ask convention, the no-verb two-stop path, the review link after every stopping plan, and the builder's path line (tests pass). Archived; version 23.1.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard draft</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item' };
    return { at: '#/decisions/' + m[2], kind: 'decision' };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, counts, and the notes list ──
  function render() {
    all('.pin', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    drawings.forEach(measure);
  }

  // ── tap to note: a still pointer on a data-note element shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, #editor')) return;
    const el = t.target.closest('[data-note]');
    if (el) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : null;
    if (el && t.classList.contains('entry')) el.scrollIntoView({ block: 'center' });
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeEditor(false); hideChip();
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    if (docked) {
      editor.style.left = editor.style.top = '';
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      if (open.el) {
        const r = open.el.getBoundingClientRect(), limit = window.innerHeight - editor.offsetHeight - 8;
        if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - 8, r.bottom - limit));
      }
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  function dock() {
    const vv = window.visualViewport;
    editor.style.bottom = vv && open && editor.classList.contains('docked') ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px' : '';
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', dock); window.visualViewport.addEventListener('scroll', dock); }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fit to the frame, then zoom by 1.25 up to 4, pinch, Ctrl or Cmd wheel, and pan ──
  const drawings = [];
  function measure(d) {
    const atFit = d.s <= d.fit + 0.001, fw = d.frame.clientWidth;
    d.w = d.art.offsetWidth; d.h = d.art.offsetHeight;
    d.fit = fw > 0 && d.w > 0 ? Math.min(1, fw / d.w) : 1;
    zoom(d, atFit ? d.fit : d.s, 0, 0);
  }
  function zoom(d, s, cx, cy) {
    s = Math.max(d.fit, Math.min(4, s));
    d.x = cx - (cx - d.x) * s / d.s; d.y = cy - (cy - d.y) * s / d.s; d.s = s;
    const zoomed = s > d.fit + 0.001, fh = Math.min(d.h * s, window.innerHeight * 0.7);
    d.frame.style.height = Math.ceil(fh) + 'px';
    d.x = Math.min(0, Math.max(d.frame.clientWidth - d.w * s, d.x));
    d.y = Math.min(0, Math.max(fh - d.h * s, d.y));
    d.art.style.transform = 'translate(' + d.x + 'px,' + d.y + 'px) scale(' + s + ')';
    d.frame.classList.toggle('zoomed', zoomed);
    d.level.textContent = (zoomed ? '' : 'Fit · ') + Math.round(s * 100) + '%' + (zoomed ? ' · drag to pan' : '');
    d.out.disabled = !zoomed; d.in.disabled = s >= 4;
  }
  function gap(d) { const p = Object.keys(d.ptrs).map(function (k) { return d.ptrs[k]; }); return { a: p[0], b: p[1], dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 }; }
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), bar = document.createElement('div');
    bar.className = 'zoom';
    bar.innerHTML = '<span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button>';
    fig.insertBefore(bar, frame);
    const b = bar.querySelectorAll('button');
    const d = { frame: frame, art: fig.querySelector('.art'), level: bar.firstChild, out: b[0], in: b[2], s: 1, fit: 1, x: 0, y: 0, w: 0, h: 0, ptrs: {}, pinch: null };
    drawings.push(d);
    bar.addEventListener('click', function (e) {
      const i = Array.prototype.indexOf.call(b, e.target);
      if (i >= 0) zoom(d, [d.s / 1.25, d.fit, d.s * 1.25][i], frame.clientWidth / 2, frame.clientHeight / 2);
    });
    frame.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      zoom(d, d.s * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    frame.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      d.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      const two = Object.keys(d.ptrs).length === 2;
      if (two) d.pinch = { s: d.s, dist: gap(d).dist };
      if (two || d.s > d.fit + 0.001) {
        Object.keys(d.ptrs).forEach(function (k) { try { frame.setPointerCapture(Number(k)); } catch (err) { /* capture is optional */ } });
      }
    });
    frame.addEventListener('pointermove', function (e) {
      const p = d.ptrs[e.pointerId];
      if (!p) return;
      if (e.pointerType === 'mouse' && !e.buttons) { delete d.ptrs[e.pointerId]; return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (d.pinch && Object.keys(d.ptrs).length === 2) {
        const g = gap(d), r = frame.getBoundingClientRect();
        zoom(d, d.pinch.s * g.dist / d.pinch.dist, (g.a.x + g.b.x) / 2 - r.left, (g.a.y + g.b.y) / 2 - r.top);
      } else if (d.s > d.fit + 0.001) { d.x += dx; d.y += dy; zoom(d, d.s, 0, 0); }
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      frame.addEventListener(type, function (e) { delete d.ptrs[e.pointerId]; d.pinch = null; });
    });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a /continue instruction ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from review.html (' + data.notes.length + '):'];
    data.notes.forEach(function (n, i) { lines.push((i + 1) + '. ' + where(n.id).at + ' · ' + n.label + ' — ' + n.text.replace(/\s*\n\s*/g, ' ')); });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) { width = root.clientWidth; hideChip(); }
    drawings.forEach(measure);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
