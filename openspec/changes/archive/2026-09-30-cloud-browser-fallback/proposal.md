# Proposal

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
