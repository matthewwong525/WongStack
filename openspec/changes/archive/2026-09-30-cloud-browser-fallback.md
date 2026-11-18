<!-- openspec-archive v1 2026-09-30-cloud-browser-fallback -->
<!-- file proposal.md utf8 6855 -->
# Get past sites that block the assistant's browser

**Status:** ready-to-ship

**Branch:** famous-turtle

**Open questions:** none

## Why

Many sites put a "Verify you are human" check in front of the agent's browser, and some block it outright. Tapping the check yourself through a hand-over link doesn't help: it asks again, because the site is judging the browser, not the tap. On 2026-09-30 this stopped a Grillies order. Cloudflare's own cloud browser tells sites it is an agent working for a person, and it got into Grillies on Uber Eats and SkipTheDishes where the agent's browser could not.

## What Changes

- **A blocked site moves to Cloudflare's browser.** The agent keeps using its own browser first. When a site shows a check it can't pass, or blocks it, the agent says so in one line and carries on in Cloudflare's browser instead of sending you a hand-over link that can't work.
  ```text
  agent's browser ──▶ site loads ──▶ carry on
         │
     check or block
         ▼
  Cloudflare's browser ──▶ site loads ──▶ carry on
         │
     blocked there too
         ▼
  "Do this step on your phone" + the link
  ```
- **You stay logged in across both.** Before the switch, the agent copies that one site's login from its browser into Cloudflare's, so you arrive logged in. Afterwards it copies any refreshed login back. Your Gmail or bank login never moves for a food order. A saved password or a hand-over still covers a site with no login to copy.
- **Hand-overs work in either browser.** If Cloudflare's browser needs you, say for an Uber Eats login code, you get the same private link, showing that browser.
- **One setting flips the default.** If most of your sites block the agent's browser, you can make Cloudflare's the first choice instead.
- **Nothing is disguised.** The agent never hides that it's automated, borrows another address, or pays a service to solve checks. A site that turns away both browsers, like DoorDash, gets the link for you to do that step on your own phone.
- **The browsing skill gets one home.** A new `browser` skill owns both browsers. The agent-browser pointer stays as the tool maker ships it.
- **New installs get the permission.** Setup adds Cloudflare's browser to what your Cloudflare key can do; an existing install adds it the first time it's needed.

Non-goals: driving a browser on your own laptop, getting WongStack its own signed identity, or changing the hand-over page itself.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a blocked site moves to Cloudflare's browser; logins carry over for that one site; one setting picks the default browser; cloud sessions close promptly; the agent never disguises its browser; a check the agent's browser can't pass leads to the fallback, not a hand-over.
- `cloudflare-provisioning`: the user token's widen also grants `Browser Run Write`.

## Impact

- New hidden skill `.agents/skills/browser/` (`SKILL.md`, `scripts/cloud-browser.mjs`) and its test `scripts/tests/cloud-browser.test.mjs`.
- `.agents/skills/wong-setup/scripts/provision.mjs` (`NORMAL_PROVISION`), `references/permission-groups.md`, `scripts/tests/provision.test.mjs`.
- `wiki/development/browsing.md`; the payload manifest; `CHANGELOG.md`.
- Cloudflare Browser Run usage on the person's account: 10 browser hours a month included on Workers Paid, then $0.09 an hour; 10 minutes a day on Workers Free.
- `.agents/skills/agent-browser/SKILL.md` and the hand-over scripts are unchanged.

## Decision log

- **2026-09-30** — Asked whether to make the person's hand-over tap pass the check by turning off the browser's automated flag → declined: that disguises the browser, and the wiki already forbids it.
- **2026-09-30** — Asked whether to route the server's browser through the person's home internet or phone hotspot → declined: it hides where the visit comes from, and the flag would still trip the check.
- **2026-09-30** — Asked whether to replace agent-browser with Cloudflare's browser → chose a fallback: Cloudflare's browser starts blank each time and comes from a new address each visit, so sites that watch for new devices ask for codes more often.
- **2026-09-30** — Asked for one setting to flip the default to Cloudflare's browser → chose to include it.
- **2026-09-30** — Asked how logins reach Cloudflare's browser → chose to copy only the task's site's login in before and back after, never a check's pass cookie.
- **2026-09-30** — Asked to rename the agent-browser skill to `browser` → chose a new hidden `browser` skill that owns both browsers and leaves the vendored agent-browser pointer unchanged, because the tool's updates replace that file.
- **2026-09-30** — Assumed: the `browser` skill is hidden and not typed as a verb, like `hand-over`, because the person asks for browsing in plain words and the rules keep the verb list fixed.
- **2026-09-30** — Assumed: logins stay in the agent's existing browser profile as their one store, with copies only in a short-lived private file during a switch, because a second login store is one more place to leak.
- **2026-09-30** — Assumed: the agent switches without asking and says so in one line, because the cost is cents and a question would stall errands the person started from a phone.
- **2026-09-30** — Assumed: on the free Workers plan's 10-minute daily cap, the agent says so plainly and offers the step on the person's phone, because the plan can't tell which tier an account is on.
- **2026-09-30** — Assumed: `open` acquires the Browser Run session itself, the bridge joins it by its `cf-browser-session-id`, and the bridge sends `Browser.close` on every exit, because per Cloudflare's docs a closed socket leaves the browser running until its keep-alive runs out.
- **2026-09-30** — Assumed: every `agent-browser` command for a cloud session names `--cdp` too, because one without it made agent-browser drop the cloud connection and start the local browser (tried on this server).
- **2026-09-30** — Assumed: the hidden `hand-over` skill's description shortens to *Private links: browser, keys, passwords.* to offset the `browser` skill's, because startup text sits at its 2,200-word ceiling.
- **2026-09-30** — Asked whether to comment on vercel-labs/agent-browser#1642 with the Browser Run use case → declined; nothing was posted and the bridge stays.
- **2026-09-30** — Asked to log in to Uber Eats through a hand-over on the cloud browser and place a real order → declined as too much work; the login carry-over, the phone hand-over on the cloud browser, and a real order stay unverified, recorded as an open thread.
- **2026-09-30** — Assumed: archived and checkpointed for /ship as 28.6.0 after merging main (28.4.0, 28.5.0), keeping both changelog entries.

<!-- end proposal.md -->
<!-- file design.md utf8 8270 -->
# Design

## Context

See [proposal.md](proposal.md) for why. What was measured on 2026-09-30 from the Hetzner server (`ubuntu-8gb-hel1-1`):

| Site | agent-browser (headless, `navigator.webdriver` true) | Cloudflare Browser Run |
|---|---|---|
| Grillies on Uber Eats | Turnstile loop | menu loads |
| Grillies on SkipTheDishes | Cloudflare block page | store loads |
| nowsecure.nl | Turnstile loop | passes |
| order.online / doordash.com | loop / refused by IP | loop / refused |
| scrapingcourse.com challenge | loop | loop |

A windowed agent-browser (`--headed` on Xvfb) also looped when the person tapped through a hand-over. Browser Run is on Cloudflare's signed-agent list, so a site that allows signed agents lets it in without anything being hidden.

Constraints:

- **agent-browser 0.38.1 can't authenticate a CDP connection.** `--cdp wss://api.cloudflare.com/client/v4/accounts/<id>/browser-run/devtools/browser` returns `401`: it sends no `Authorization` header on the socket ([vercel-labs/agent-browser#1642](https://github.com/vercel-labs/agent-browser/issues/1642)). `--headers` scopes to page requests only.
- **Browser Run sessions are blank and short.** No persistent profile; idle timeout 60 s by default, `keep_alive` up to 600 000 ms. Workers Free: 10 browser-minutes a day, 3 concurrent. Workers Paid: 10 hours a month, then $0.09 an hour; 10 concurrent, then $2 each.
- **`wong-setup` does not ship to installed repos** ([payload manifest](../../../.agents/skills/wong-sync/references/payload-manifest.md)), so an installed repo can't import `provision.mjs`'s `widen`.
- **`hand-over.mjs` already works per agent-browser session**, via `AGENT_BROWSER_SESSION`, `stream status`, and `stream enable`.
- **agent-browser `state save|load`** writes cookies plus local and session storage as JSON, AES-256-GCM encrypted when `AGENT_BROWSER_ENCRYPTION_KEY` is set.

## Goals / Non-Goals

**Goals:**

- A task can drive Browser Run with the same `agent-browser` commands it already uses.
- One site's login moves between the personal profile and a Browser Run session, and nothing else moves.
- Deterministic code does the repeatable parts: the bridge, the cookie filter, block detection, the setting, and the one-group widen.

**Non-Goals:**

- Changing the hand-over page or its protocol.
- Detecting every vendor's block page. The script knows Cloudflare's; other clear refusals are the agent's call, per the skill.
- A second durable login store.

## Decisions

### A loopback bridge adds the header

`cloud-browser.mjs open` starts a detached process that listens on `127.0.0.1:<free port>/<random secret>`. For each upgrade it opens TLS to `api.cloudflare.com:443`, writes the upgrade request with `Authorization: Bearer $CLOUDFLARE_API_TOKEN` and `keep_alive=600000`, then pipes bytes both ways without parsing frames, the way `hand-over.mjs` already pipes its stream. It prints `CLOUD_BROWSER_CDP=ws://127.0.0.1:<port>/<secret>` and a session name (`cloud-<n>`). The agent then runs `agent-browser --session cloud-<n> --cdp <that url> …`.

- *Alternatives:* patching agent-browser upstream is the right long-term fix, but it's not ours to ship, so we comment on #1642 and drop the bridge when it lands. A Worker holding the token and exposing a public socket would put a browser-control endpoint on the internet. A Puppeteer driver would fork the browsing path away from agent-browser.
- The token never appears in a command line, a log, or the printed URL. The secret path stops another local process from riding the bridge.

### Lifetime is bounded twice

The bridge exits on `close`, when the last client disconnects after at least one connected, or at a deadline (default 30 minutes), whichever comes first. Closing the upstream socket ends the Browser Run session, so a stopped chat can't leave a billable browser open. The bridge sends no keep-alive of its own: an idle wait past 10 minutes, such as a slow reply to *Pay now?*, closes the session. The agent then reopens the page; the cart lives in the account.

### Logins carry over through a filtered, short-lived state file

- `carry-in --site <host> [--site <host>…]` opens the personal profile's session, runs `state save` into a `mkdtemp` 0700 directory, and keeps only cookies whose domain equals or sits under a given host, plus storage for matching origins. It drops the challenge cookies of Cloudflare, Akamai, DataDome, PerimeterX, and Imperva by a name list in the script. It then runs `state load` into the cloud session and deletes the directory in a `finally`.
- `carry-back` does the reverse, merging the filtered cookies into the personal profile.
- The agent names the site's login hosts, because a login can live on another host (Uber Eats signs in on `auth.uber.com`). A missed host only means no login arrives; the saved-login or hand-over path covers it.
- A busy personal profile gives `CARRY=busy`. The task carries on without carry-over, keeping the one-task-at-a-time lock rule.
- *Alternative:* an encrypted per-site store beside the auth vault. Rejected: a second copy of every login, to keep in sync and to leak.

### Block detection is signature-based, then left to the agent

`cloud-browser.mjs check [--session s]` reads the page's title and first visible text, never a picture or field values. It prints `BROWSER_BLOCKED=check` for Cloudflare's *Just a moment…* / *Performing security verification* still showing after about 15 s, `BROWSER_BLOCKED=block` for *Attention Required! | Cloudflare*, *Sorry, you have been blocked*, or Cloudflare error 1020, and `BROWSER_BLOCKED=none` otherwise. The skill tells the agent to treat an obvious refusal that names the server's address, as DoorDash's does, the same as `block`. The check never runs during a hand-over.

### The setting lives beside the profile

`~/.wong-stack/browser.json` holds `{ "first": "local" | "cloud" }`; a missing file means `local`. `cloud-browser.mjs first [local|cloud]` reads or writes it, keeping other keys. It is machine-wide like the profile, because the same person uses every repo on the machine.

### An installed repo widens one group itself

On a `401` or `403` from the first Browser Run connection, `open` runs a one-group widen by the rules in [permission-groups.md](../../../.agents/skills/wong-setup/references/permission-groups.md): resolve `Browser Run Write` by name, add it to the account policy, keep `resources` and both API-token grants, `PUT`, then retry with the documented backoff before treating a refusal as real. It prints `CLOUD_BROWSER_GRANTED=Browser Run Write` so the agent can report it. New installs get the group from `NORMAL_PROVISION`. The rules keep one home, in that reference; the script links to it.

### The `browser` skill owns WongStack's browsing

`.agents/skills/browser/SKILL.md` is hidden, with `disable-model-invocation`, like `hand-over`. It holds the script and a short pointer to [browsing.md](../../../wiki/development/browsing.md), which stays the procedure's one home. `.agents/skills/agent-browser/SKILL.md` stays byte-identical to what the tool ships.

## Risks / Trade-offs

- [A site starts refusing signed agents.] → The both-refused path already covers it: the person gets the link and steps.
- [Cookie carry-over trips a device-bound login, such as Google's DBSC or a bank.] → The spec's rejected-login path: saved password, then a hand-over.
- [The bridge's deadline cuts a long task.] → `open --minutes N` raises it; the skill says to reopen with a carry-in rather than keep one long session.
- [Free-plan accounts hit 10 minutes a day fast.] → Detect Browser Run's quota error and name it plainly; the changelog notes the paid plan's included hours.
- [Streaming a CDP-connected session to the hand-over page is untested.] → A task proves it before release; `hand-over.mjs` gets a fix only if it fails.
- [Cloudflare can see pages in its browser.] → Same trust as the hand-over tunnel and the hosting; browsing.md says so.

## Migration Plan

Nothing moves: agent-browser stays the default and the personal profile is untouched. Existing installs pick up the permission through the one-group widen on first use. Rollback is reverting the change; a granted `Browser Run Write` is harmless if left on.

<!-- end design.md -->
<!-- file tasks.md utf8 5202 -->
# Tasks

## 1. The browser skill and its script

- [x] 1.1 Create `.agents/skills/browser/SKILL.md`, hidden with `disable-model-invocation` like `hand-over`, pointing to `scripts/cloud-browser.mjs` and to [browsing.md](../../../wiki/development/browsing.md) as the procedure's home. Leave `.agents/skills/agent-browser/SKILL.md` untouched. Verify `git diff` shows no change to the agent-browser stub.
- [x] 1.2 Add `cloud-browser.mjs open [--minutes N]`: read `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through the memory skill's primary-worktree `.env` reader; start the detached loopback bridge on `127.0.0.1:<free port>/<secret>` that adds the `Authorization` header and `keep_alive=600000` to the Browser Run upgrade and pipes bytes both ways; print `CLOUD_BROWSER_CDP=` and `CLOUD_BROWSER_SESSION=`. Verify with a fake TLS/WebSocket upstream in `scripts/tests/cloud-browser.test.mjs` that the header arrives, the token appears in no output or argv, and a wrong secret path is refused.
- [x] 1.3 Add bridge lifetime and `close`: exit on `close`, on the last client leaving after one connected, or at the deadline (default 30 minutes), closing the upstream each time. Verify all three exits in the test with a shortened deadline.
- [x] 1.4 Add the one-group widen on a first `401` or `403`: resolve `Browser Run Write` by name, keep `resources` and both API-token grants, `PUT`, retry with the documented backoff, and print `CLOUD_BROWSER_GRANTED=`. Name Browser Run's quota error in plain words. Verify with a fake Cloudflare API that the PUT body keeps every existing policy and the two grants, a late-propagating grant succeeds, and a final refusal lists the permission to add by hand.
- [x] 1.5 Add `check [--session s]`, printing `BROWSER_BLOCKED=check|block|none` from the page's title and first visible text only, with the check held about 15 s before it counts. Verify against saved fixture texts for Cloudflare's challenge, block page, error 1020, and an ordinary page.
- [x] 1.6 Add `carry-in --site <host>…` and `carry-back --site <host>…`: `state save` into a 0700 temp dir, keep only cookies and storage for the named hosts and their subdomains, drop the listed challenge cookies (Cloudflare, Akamai, DataDome, PerimeterX, Imperva), `state load` into the other session, and delete the temp dir in a `finally`. A busy personal profile prints `CARRY=busy` and never touches its lock. Verify with fixture state files that another site's cookies and every challenge cookie are dropped, the temp dir is gone after success and after a thrown load, and a locked profile gives `busy`.
- [x] 1.7 Add `first [local|cloud]`, reading and writing `~/.wong-stack/browser.json` and keeping other keys; a missing file reads `local`. Verify both values and the missing-file case.

## 2. Provisioning grants Browser Run

- [x] 2.1 Add `Browser Run Write` (account scope) to `NORMAL_PROVISION` in `.agents/skills/wong-setup/scripts/provision.mjs` and to the table in `references/permission-groups.md`, with the id read from the live API (`adddda876faa4a0590f1b23a038976e4` on 2026-09-30). Verify `scripts/tests/provision.test.mjs` passes with the tables and the script in agreement, including a widen fixture that grants the new group.

## 3. Wiki and payload

- [x] 3.1 Update `wiki/development/browsing.md`: a new section on when a site blocks the agent's browser (the switch, the one-line notice, the login carry-over for one site, both-refused leading to the person's own device, the setting, Cloudflare's allowance and cost); the hand-over *When* bullet sending a Cloudflare check to the fallback, not a link; and the no-disguise rule, kept in one place and linked. Verify the page keeps one home per fact and `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 List the `browser` skill in the payload manifest's core line and add a `## Next (minor)` CHANGELOG entry in plain words, noting the permission an existing install grants itself on first use and the Workers plan allowances; leave VERSION alone. Verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.
- [x] 3.3 Comment on [vercel-labs/agent-browser#1642](https://github.com/vercel-labs/agent-browser/issues/1642) with the Browser Run use case, only after the owner says yes in chat (outward). Verify the comment link, or record the no.

## 4. Real checks

- [x] 4.1 On this server, open Browser Run through the bridge and load Grillies on Uber Eats with `agent-browser --cdp`, and show a picture of the menu in chat. Verify `check` reports `none` there and `check` in the agent's own browser reports `check`.
- [x] 4.2 Record the real checks the owner chose to skip on 2026-09-30 (a login carried into the cloud browser, a hand-over on a phone showing the cloud browser, a real order) as one open memory thread, so the next real Uber Eats task checks them. The hand-over link on the cloud session did start and print its link; nobody used it. Verify the thread is in the memory store.
- [x] 4.3 Validate with `openspec validate cloud-browser-fallback --strict --no-interactive`, rebuild `review.html`, and leave the test suite to `/save`'s CI gate. Verify the page is current.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 5674 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The agent hands the browser over when it needs the person

When a browsing step needs the person (a login, a captcha, a code, or any other input) or the person asks to take over, the agent SHALL hand its browser over and SHALL NOT try to get past the step itself, except that API key or token website steps SHALL follow the own-browser requirement above, and a bot check or block that stops the agent's own browser SHALL first move the site to the cloud browser. When the person is not at the computer the agent runs on, it SHALL hand over through a private link that needs a secret key and gets a new address each time. Before it opens a link, the agent SHALL ask in the chat whether the person is ready and SHALL open the link only after they reply, unless the person's latest message asked to take over.

#### Scenario: A captcha from a phone

- **WHEN** a site shows a captcha and the person chats from another device
- **THEN** the agent sends a private link that opens its browser on that device, and the person solves it there

#### Scenario: The person asks to take over

- **WHEN** the person says to let them take over mid-task
- **THEN** the agent stops sending browser commands and sends the link

#### Scenario: The person is away when a login comes up

- **WHEN** a site asks for a login and the person has not replied for an hour
- **THEN** the agent asks in the chat whether they're ready to log in, opens no link until they reply, and the link's 10 minutes start from that reply

#### Scenario: A Cloudflare check in the agent's own browser

- **WHEN** a site shows a Cloudflare "Verify you are human" check in the agent's own browser
- **THEN** the agent moves the site to the cloud browser instead of sending a hand-over link

## ADDED Requirements

### Requirement: A site that blocks the agent's browser moves to the cloud browser

When a site shows a bot check the agent's own browser can't pass, or refuses it, the agent SHALL carry on in Cloudflare's cloud browser, saying so in one line in the chat, without retrying in its own browser. When the cloud browser is refused too, the agent SHALL stop browsing that site and give the person its link and the steps to do on their own device. Hand-overs SHALL work in whichever browser the task uses.

#### Scenario: An order page behind a check

- **WHEN** the agent's own browser stays on a "Verify you are human" page for a restaurant's Uber Eats store
- **THEN** the chat says the site blocked the agent's browser, and the store's menu opens in the cloud browser with no tap from the person

#### Scenario: Both browsers are refused

- **WHEN** a DoorDash store refuses both browsers
- **THEN** the agent sends no hand-over link and gives the store's link and the steps for the person's phone

### Requirement: A site's login carries over between the browsers

Before a site moves to the cloud browser, the agent SHALL copy only that site's login from its own browser into the cloud browser, and after the task SHALL copy any refreshed login for that site back. It SHALL NOT copy another site's login, or any cookie a bot check issued, and SHALL keep no copy after the switch. When the copied login is rejected, the agent SHALL use a saved login or hand the browser over, as for any login.

#### Scenario: An order from a logged-in account

- **WHEN** the person is logged in to Uber Eats in the agent's browser and the Uber Eats store moves to the cloud browser
- **THEN** the cloud browser opens the store logged in, and no other site's login and no check's pass cookie is in it

#### Scenario: A login tied to one device

- **WHEN** a site rejects the copied login and asks for a code
- **THEN** the agent asks whether the person is ready and hands over the cloud browser

### Requirement: The agent never disguises its browser

The agent SHALL NOT hide that its browser is automated, change the browser's identity to pass a check, send its traffic through another person's or a hired network address, use a check-solving service, or move a check's pass from one browser to another. This SHALL hold even when the person asks, including when the person does the tapping.

#### Scenario: The person offers to tap the check

- **WHEN** the person asks the agent to turn off its automated flag so their hand-over tap passes a check
- **THEN** the agent declines and offers the cloud browser or the step on the person's own device

### Requirement: One setting picks the first browser

A machine-wide setting SHALL choose which browser a task tries first: the agent's own browser by default, or the cloud browser. The other browser SHALL remain the fallback.

#### Scenario: The person flips the default

- **WHEN** the person asks to use the cloud browser first
- **THEN** later tasks open sites in the cloud browser first, and a site that refuses it moves to the agent's own browser

### Requirement: A cloud browser session ends with its task

A cloud browser session SHALL close when its task finishes or fails, and SHALL close by itself after a bounded time even if the agent's session ends. When the account's cloud browser allowance is used up, the agent SHALL say so plainly and give the person the step to do on their own device.

#### Scenario: The chat stops mid-task

- **WHEN** the agent's session ends while a cloud browser session is open
- **THEN** the cloud browser session closes by itself within its time bound

#### Scenario: The daily allowance runs out

- **WHEN** a free-plan account has used its daily cloud browser minutes
- **THEN** the agent names the limit in plain words and gives the person the site's link and steps

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1311 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: One user token widens itself without asking

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. The widen SHALL include the cloud browser's permission, and an installed repo whose token lacks it SHALL widen the same way the first time a task needs the cloud browser. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

#### Scenario: An older install first needs the cloud browser

- **WHEN** a task needs the cloud browser and the token lacks its permission
- **THEN** the token widens itself, the agent reports the permission it granted, and the task carries on

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-30

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39174 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-30-cloud-browser-fallback</title>
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
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-30-cloud-browser-fallback">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-30-cloud-browser-fallback</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Many sites put a &quot;Verify you are human&quot; check in front of the agent's browser, and some block it outright. Tapping the check yourself through a hand-over link doesn't help: it asks again, because the site is judging the browser, not the tap. On 2026-09-30 this stopped a Grillies order. Cloudflare's own cloud browser tells sites it is an agent working for a person, and it got into Grillies on Uber Eats and SkipTheDishes where the agent's browser could not.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A blocked site moves to Cloudflare's browser.</b> The agent keeps using its own browser first. When a site shows a check it can't pass, or blocks it, the agent says so in one line and carries on in Cloudflare's browser instead of sending you a hand-over link that can't work.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">agent's browser ──▶ site loads ──▶ carry on</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">       │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">   check or block</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">       ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">Cloudflare's browser ──▶ site loads ──▶ carry on</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">       │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">   blocked there too</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">       ▼</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">&quot;Do this step on your phone&quot; + the link</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>You stay logged in across both.</b> Before the switch, the agent copies that one site's login from its browser into Cloudflare's, so you arrive logged in. Afterwards it copies any refreshed login back. Your Gmail or bank login never moves for a food order. A saved password or a hand-over still covers a site with no login to copy.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Hand-overs work in either browser.</b> If Cloudflare's browser needs you, say for an Uber Eats login code, you get the same private link, showing that browser.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>One setting flips the default.</b> If most of your sites block the agent's browser, you can make Cloudflare's the first choice instead.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Nothing is disguised.</b> The agent never hides that it's automated, borrows another address, or pays a service to solve checks. A site that turns away both browsers, like DoorDash, gets the link for you to do that step on your own phone.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The browsing skill gets one home.</b> A new <code>browser</code> skill owns both browsers. The agent-browser pointer stays as the tool maker ships it.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>New installs get the permission.</b> Setup adds Cloudflare's browser to what your Cloudflare key can do; an existing install adds it the first time it's needed.</div></div></li>
</ol>
<p class="aside">Non-goals: driving a browser on your own laptop, getting WongStack its own signed identity, or changing the hand-over page itself.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether to make the person's hand-over tap pass the check by turning off the browser's automated flag → declined: that disguises the browser, and the wiki already forbids it.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether to route the server's browser through the person's home internet or phone hotspot → declined: it hides where the visit comes from, and the flag would still trip the check.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether to replace agent-browser with Cloudflare's browser → chose a fallback: Cloudflare's browser starts blank each time and comes from a new address each visit, so sites that watch for new devices ask for codes more often.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked for one setting to flip the default to Cloudflare's browser → chose to include it.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked how logins reach Cloudflare's browser → chose to copy only the task's site's login in before and back after, never a check's pass cookie.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to rename the agent-browser skill to <code>browser</code> → chose a new hidden <code>browser</code> skill that owns both browsers and leaves the vendored agent-browser pointer unchanged, because the tool's updates replace that file.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the <code>browser</code> skill is hidden and not typed as a verb, like <code>hand-over</code>, because the person asks for browsing in plain words and the rules keep the verb list fixed.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: logins stay in the agent's existing browser profile as their one store, with copies only in a short-lived private file during a switch, because a second login store is one more place to leak.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the agent switches without asking and says so in one line, because the cost is cents and a question would stall errands the person started from a phone.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: on the free Workers plan's 10-minute daily cap, the agent says so plainly and offers the step on the person's phone, because the plan can't tell which tier an account is on.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: <code>open</code> acquires the Browser Run session itself, the bridge joins it by its <code>cf-browser-session-id</code>, and the bridge sends <code>Browser.close</code> on every exit, because per Cloudflare's docs a closed socket leaves the browser running until its keep-alive runs out.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: every <code>agent-browser</code> command for a cloud session names <code>--cdp</code> too, because one without it made agent-browser drop the cloud connection and start the local browser (tried on this server).</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the hidden <code>hand-over</code> skill's description shortens to <i>Private links: browser, keys, passwords.</i> to offset the <code>browser</code> skill's, because startup text sits at its 2,200-word ceiling.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether to comment on vercel-labs/agent-browser#1642 with the Browser Run use case → declined; nothing was posted and the bridge stays.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to log in to Uber Eats through a hand-over on the cloud browser and place a real order → declined as too much work; the login carry-over, the phone hand-over on the cloud browser, and a real order stay unverified, recorded as an open thread.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: archived and checkpointed for /ship as 28.6.0 after merging main (28.4.0, 28.5.0), keeping both changelog entries.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
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
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
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
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
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
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
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
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
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
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
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

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
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
