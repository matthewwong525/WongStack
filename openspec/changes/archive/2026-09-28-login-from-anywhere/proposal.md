# Take over the agent's browser from your phone

**Status:** ready-to-ship
**Branch:** browser-password-tunnel
**Open questions:** none

## Why

Sometimes the agent's browser needs you: a login, a captcha, a code sent to your phone, or a step you'd rather do yourself. Today that browser only opens on the computer the agent runs on. If you chat from your phone, or the agent runs on a server, you can't reach it, and you have to tell the agent when you're done.

## What Changes

- **You get a private link and take over from anywhere.** When the agent hits something only you can do, it sends you a link. That could be a login, a captcha, a two-step code, or a choice it shouldn't make for you. The link opens the agent's browser on your phone or laptop, and you do the step yourself. A password goes only into the real site, never through the chat.
  ```text
  agent: "Gmail wants a login:"
      │  private link
      ▼
  you open it on your phone
      │
      ▼
  agent's browser: you log in,
  or solve the captcha
      │
      ▼
  agent sees you're past it,
  closes the link, carries on
  ```
- **Ask for it any time.** Say *let me take over* mid-task. The agent stops using the browser and sends you the same link. When you say *done*, it takes back over from where you left the page.
- **The agent knows when you're done.** Before sending the link, it names what "past it" looks like: the inbox's address, or the captcha box gone. When that happens, it picks the task back up. You don't have to type "done". A wrong password or a second code page doesn't count, because the page isn't there yet. When there's nothing to watch for, as when you asked to take over, you say *done*.
- **The link is safe to use and dies fast.**
  - Every link has a new random address, plus a secret key that only the link carries. Someone who finds the address without the key gets nothing.
  - The link closes once you're past the step, when you say *done*, or after 10 minutes, whichever comes first. It closes even if the agent crashes, and it never works again.
  - While you have the browser, the agent doesn't touch it or look at what you type. It only checks the page's address, or whether the box it's waiting on is still there.
  - One thing to know: Cloudflare carries the connection, so like any site it hosts, it could in principle see what passes through. Your app already runs on Cloudflare, so this adds no new company to trust.
- **At the computer, nothing leaves it.** If you say you're sitting at the computer the agent runs on, it gives you a local link instead and opens no tunnel.
- **The tunnel tool installs once, with your OK.** The first link to another device asks before it installs Cloudflare's free tunnel tool. It adds nothing to your project.

Non-goals: no email-code check in front of the link, which would need a domain and a setup step. No always-on link, no saved passwords, no automatic captcha solving, and no change to how logins are kept afterward.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: whenever the browser needs the person (a login, a captcha, any input, or their own request to take over), the agent hands it over through a private link that closes on success, on *done*, or after 10 minutes; meanwhile the agent sends no commands and reads only the address or whether a named element is present.
- `dependencies`: a remote hand-over adds one tool, `cloudflared`, installed with consent the first time it is needed.

## Impact

- New `.agents/skills/verify/scripts/hand-over.mjs`: opens the tunnel and dashboard, prints the private link, and starts a detached watcher that waits for the named address or for a named element to go, and tears everything down on success, timeout, or `close`. Node built-ins only.
- `wiki/development/home.md` *Saved browser logins*: step 2 and a new *Hand the browser over* subsection: logins, captchas, any input, and *let me take over*.
- `wiki/development/required-tools.md`: `cloudflared` beside `agent-browser`.
- `scripts/tests/hand-over.test.mjs`: fake `cloudflared` and `agent-browser` on `PATH`.
- `CHANGELOG.md` `## Next (minor)` entry.
- `AGENTS.md` rule *Browse as the person*: names the hand-over.

## Decision log

- **2026-09-28** — Asked whether a Cloudflare tunnel suits logins for the agent's browser → chose to plan it.
- **2026-09-28** — Asked whether the agent can tell when the login is done without being told → chose to watch the page address for the logged-in page, and give up after a set time.
- **2026-09-28** — Asked how to protect the link → chose a secret link, fresh each login, closed on success or after 10 minutes; no email-code check.
- **2026-09-28** — Assumed: the agent names the logged-in address to wait for (such as `**mail.google.com/mail/**`), because it knows the site, and a generic "left the login page" test would fire early on two-step pages.
- **2026-09-28** — Assumed: the wait never runs `--fn` or a snapshot, so no form value can reach the agent while the person types.
- **2026-09-28** — Assumed: a detached watcher owns teardown, because the link must close even if the chat stops or the agent crashes; the agent's own wait only reports the result.
- **2026-09-28** — Assumed: the tunnel starts before the dashboard, because the dashboard needs the tunnel's exact address as its allowed origin, and Cloudflare's quick tunnel only prints it once running.
- **2026-09-28** — Assumed: the tunnel is the default and the local link is used only when the person says they're at this computer, because most people chat from their phone through Paseo.
- **2026-09-28** — Assumed: the script lives in `/verify`'s scripts folder, not a new skill, because `/verify` is the WongStack skill that fronts agent-browser and a new skill adds to every session's menu.
- **2026-09-28** — Assumed: `cloudflared` gets its own ADDED dependency requirement rather than editing the `/verify` one, because the open `buy-with-link` plan modifies that requirement too; whichever ships second rewords the other's "one other tool" line.
- **2026-09-28** — Assumed: a minor release, because it adds a new way to log in.
- **2026-09-28** — Asked to cover captchas, anything else that needs the person, and a request to take over, then ship → widened the link from logins to any hand-over, renamed the script `hand-over.mjs`, and kept the change name.
- **2026-09-28** — Assumed: the watcher may also check whether an element the agent named is present (`get count`), because a captcha often clears without changing the address; a count reveals nothing the person typed.
- **2026-09-28** — Assumed: a takeover the person asked for has no finish line to watch, so it ends on *done* in chat or the 10-minute limit, and the person can ask for a new link.
- **2026-09-28** — Assumed: the agent sends no browser commands while the link is open, so it never fights the person for the page.
- **2026-09-28** — Assumed: the agent never tries to beat a captcha itself; it hands over, because solving one for a site is the person's call.
- **2026-09-28** — Assumed: the phone check and the saved-password check become open memory threads written at `/save`, not tasks, because both need the person on a real phone and a real login, and `/ship` can't archive with them pending; the agent runs the end-to-end tunnel check itself.
- **2026-09-28** — Built: recorded the real output shapes. `agent-browser dashboard start --allowed-origins <origin>` (0.38.1) prints `Dashboard started; open one of the private access URLs below`, a warning line, then `<origin>/#dashboard-access-token=<64 hex>`; it refuses a running dashboard with other settings (`✗ Dashboard is already running with port 4848 and loopback origins only…`, exit 1), and `dashboard stop` exits 0 even when none runs. `cloudflared tunnel --no-autoupdate --config <empty file> --url …` (2026.9.3) logs to stderr a boxed `https://<words>.trycloudflare.com` line, then `Registered tunnel connection` about a second later; the empty config only logs `ERR Configuration file … was empty` and carries on.
- **2026-09-28** — Assumed: `open` prints the link only once the tunnel logs `Registered tunnel connection`, not at the first address, so the link loads when the person taps it.
- **2026-09-28** — Assumed: teardown sends the tunnel SIGTERM, then SIGKILL after 3 seconds, because `cloudflared` otherwise waits up to its 30-second grace period for an open dashboard connection.
- **2026-09-28** — Assumed: `HANDOVER_POLL_MS` overrides the 2-second poll so the tests run fast; nothing else reads it.
- **2026-09-28** — Built: the session-start instructions sat one word under their 2,200-word ceiling, so the *Browse as the person* rule grows by six words and the meta-repo's own intro drops five ("this is the source, and"), leaving the ceiling unchanged.
- **2026-09-28** — Built: the live check on this server passed. `open --until` printed a link in about 5 seconds; a second browser opened it, saw the task's session, and navigated it through the dashboard's address bar, and `wait` printed `done`. The dashboard port closed, `cloudflared` exited, and the link then showed Cloudflare's Error 1033. A `--minutes 0.5` run printed `timeout` with the same teardown, and `close` printed `closed`. The address without the key showed an empty dashboard, and its API answered `Origin, Referer, or dashboard access token is invalid.`
- **2026-09-28** — Checked task 4.3: `buy-with-link` has not merged, so there is nothing to reconcile; whichever ships second rewords the shared lines.
- **2026-09-28** — Distilled: no repeatable fact; the change has no memory facts, and the how now lives in *Hand the browser over* and *Required tools*.
- **2026-09-28** — Archived and checkpointed for merge by `/ship`.
