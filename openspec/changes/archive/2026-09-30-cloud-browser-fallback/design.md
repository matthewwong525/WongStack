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
