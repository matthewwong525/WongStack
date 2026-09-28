# Design

## Context

[*Saved browser logins*](../../../wiki/development/home.md#saved-browser-logins) step 2 hands the person the browser with `agent-browser stream enable` or `agent-browser dashboard start`, then waits for them to say the login is done. Both listen on loopback only, so a person chatting through Paseo on a phone, or an agent on a server, has no way in.

agent-browser 0.38.1 already supports a proxied dashboard: `dashboard start --allowed-origins <https-origin>` accepts that exact origin and prints a private URL whose token rides in the `#fragment`. On first open the dashboard moves the token into a Secure, host-bound, same-site cookie. Loopback URLs need no token. `dashboard stop` ends the server. Start refuses to reuse a running dashboard with different origins.

`cloudflared tunnel --url http://127.0.0.1:<port>` opens a Cloudflare quick tunnel: no account, a random `https://<words>.trycloudflare.com` address printed on stderr once the tunnel is up, gone when the process exits.

## Goals / Non-Goals

**Goals:** the person takes over the agent's browser from any device, for a login, a captcha, any input, or on request; the agent resumes on its own when a named finish lands; the link closes on finish, on *done*, or on timeout, whatever happens to the chat; the agent keeps its hands off meanwhile.

**Non-Goals:** Cloudflare Access or a named tunnel; an always-on dashboard; the agent-browser auth vault; captcha-solving services; changing where the profile lives or how long sessions last.

## Decisions

- **One script owns the whole lifecycle.** `.agents/skills/verify/scripts/hand-over.mjs`, Node built-ins only, with four subcommands. Teardown is the security promise, so it is code, not steps an agent may skip ([the principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)).
  - `open [--until <glob>] [--until-gone <selector>] [--local] [--minutes 10]` starts everything, prints `HANDOVER_LINK=<url>`, spawns the watcher, and exits.
  - `watch` (internal, detached) polls and tears down.
  - `wait` blocks until the watcher's result and prints `HANDOVER_RESULT=done|timeout|closed|error`. The agent runs it in the background, so the host wakes it on exit.
  - `close` ends an open link, when the person says *done* or *cancel*. It is the only finish for a takeover with no `--until`.
- **Lives in `/verify`'s scripts folder.** `/verify` is the WongStack skill that fronts agent-browser, and the payload already ships the folder whole. A new skill would add a description to every session's menu.
- **Tunnel first, then dashboard.** The dashboard needs the tunnel's exact origin, which exists only once `cloudflared` prints it. `open` starts `cloudflared tunnel --no-autoupdate --url http://127.0.0.1:4848` in its own process group and reads stderr for the first `https://…trycloudflare.com` within 30 seconds. It then runs `agent-browser dashboard stop` (start refuses a mismatched running one), then `dashboard start --port 4848 --allowed-origins <origin>`, and takes the tokenized URL from its output. Any failure tears down what started and exits non-zero.
- **`--local` skips the tunnel.** It starts the loopback dashboard and prints `http://localhost:4848`. The same watcher still stops it. The agent uses it only when the person says they are at this computer.
- **The watcher reads only the address or a count.** Every 2 seconds, in the task's session (`AGENT_BROWSER_SESSION` is inherited), it runs `agent-browser get url` and matches `--until` with agent-browser's glob rules (`**` any run, `*` no `/`), and/or `agent-browser get count <selector>` and treats 0 as `--until-gone` met. Both given means both must hold. Neither given means a takeover that only `close` or the deadline ends. It never runs `snapshot`, `screenshot`, `get text`, `get value`, `eval`, or `wait --fn`. It records only whether the finish was met, never the address, since a post-login address can carry a one-time code.
- **The agent names the finish.** It knows the site. For a login it passes the logged-in page (`--until "**mail.google.com/mail/**"`). A generic "left the login page" test would fire on a two-step code page. For a captcha that clears in place, it passes the captcha's frame (`--until-gone "iframe[src*=recaptcha]"`). For *let me take over*, it passes neither.
- **Hands off while the link is open.** Between `open` and the result, the agent sends the task's session no commands. Only the watcher's reads touch it, so the agent never fights the person for the page. After the result, it takes a fresh snapshot, because the person may have moved the page anywhere.
- **No bypassing.** A captcha, a bot check, or an unexpected prompt is a hand-over, not a puzzle. The agent does not retry past it, change its browser's fingerprint, or use a solving service.
- **Teardown on every exit path.** On match, deadline, `close`, or SIGTERM/SIGINT, the watcher runs `dashboard stop`, kills the tunnel's process group, writes `result.json`, and removes its pid file. The deadline is fixed at `open` (default 10 minutes, `--minutes` to change it).
- **One link at a time.** State lives in `~/.wong-stack/hand-over/`. `open` refuses while a live watcher's pid file exists, matching the one-personal-task rule.
- **`cloudflared` at the point of need.** When it's missing, `open` exits 3 with `HANDOVER_NEEDS=cloudflared` and starts nothing. The agent asks, then installs from Cloudflare's own channel: `brew install cloudflared` on macOS, `winget install --id Cloudflare.cloudflared` on Windows, and on Linux Cloudflare's package repository, or its release binary into `~/.local/bin`.
- **Three ADDED requirements.** `browser-logins` adds *The agent hands the browser over when it needs the person*, *A hand-over link closes itself*, and *The agent keeps its hands off during a hand-over*. *The person does each login once* stays as is: the hand-over is how that login happens. `dependencies` gets an ADDED *A remote hand-over adds one tool*, leaving the `/verify` requirement that the open `buy-with-link` plan also modifies untouched.

## Security

What protects the person, and what it doesn't cover:

- **A leaked link.** The address is random and new each time. The key sits in the fragment, which browsers never send in a request. After first open it becomes a host-bound cookie. The link lives at most 10 minutes and never after success. Someone who sees it in that window, such as over the person's shoulder, can drive the browser until it closes. That is the accepted cost of choosing no email check.
- **Cloudflare in the middle.** The quick tunnel ends TLS at Cloudflare's edge. Keystrokes, the password included, cross it as dashboard input events inside that connection. It is the same trust the person's app already places in Cloudflare. The proposal says so plainly.
- **Discovery.** Quick tunnels use a wildcard certificate, so the random name is not published in certificate logs. The name is not guessable.
- **What the dashboard shows.** While open, it shows every agent-browser session on the machine and its command feed. The one-personal-task rule means that is the hand-over's own session. A concurrent `/verify` would show only a preview with no personal logins.
- **The agent's view.** The watcher reads only the address and an element count, the result carries no URL, and the agent sends no command until the link closes. No screenshot or snapshot runs meanwhile.
- **Links in history.** The link stays in the chat and in saved transcripts. It is dead once closed, since the tunnel host and the dashboard token both end with teardown.
- **Saved passwords.** agent-browser runs Chrome headless, which cannot show Chrome's *save password?* prompt, so no password lands in the profile. The profile holds session cookies, as today. This is unverified: checking it is a task.

## Risks / Trade-offs

- **Quick tunnels have no uptime promise**, and Cloudflare rate-limits them. A login is a few minutes, so a failure just means a retry. `open` reports it plainly.
- **A `~/.cloudflared/config.yaml` blocks quick tunnels.** A person who already runs a named tunnel may have one. `open` passes `--config` pointing at an empty temp file so theirs is ignored, and a test pins the flag.
- **The dashboard's printed format is not a documented contract.** `open` matches the first `<origin>/…#…` URL in the output, and a test pins the 0.38.1 shape. A format change fails `open` loudly rather than printing a wrong link.
- **The watcher dies with the machine.** A reboot also kills the tunnel and the dashboard, so nothing stays open.
- **Hosts without background commands** (a plain Codex run) block on `wait` for up to 10 minutes. That still works, but the person can't say *done* until it ends, so on such a host a takeover with no finish just runs to the deadline or a named finish.
- **A finish the agent names wrong** never fires. The deadline still closes the link, and the person can say *done*.
- **`buy-with-link` edits the next section of the same page** and the dependencies spec. Whichever ships second rebases, and rewords the other's "one other step" line if needed.
