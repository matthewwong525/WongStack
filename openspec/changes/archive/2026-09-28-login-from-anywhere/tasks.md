# Tasks

## 1. Script

- [x] 1.1 Run `agent-browser dashboard start --allowed-origins https://example.trycloudflare.com` (then `dashboard stop`) and `cloudflared tunnel --url` once each to record the real output shapes the script parses; note them in the proposal's Decision log when built
- [x] 1.2 Add `.agents/skills/verify/scripts/hand-over.mjs` with `open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]`, `watch`, `wait`, and `close`, per the design: tunnel first with `--no-autoupdate` and an empty `--config`, then `dashboard stop` and `dashboard start --allowed-origins`, state in `~/.wong-stack/hand-over/`, and a detached watcher that polls only `agent-browser get url` and `get count` and tears down on finish, deadline, `close`, or signal
- [x] 1.3 Make `open` exit 3 with `HANDOVER_NEEDS=cloudflared` and start nothing when `cloudflared` is missing (not for `--local`), and refuse while a live watcher exists

## 2. Tests

- [x] 2.1 Add `scripts/tests/hand-over.test.mjs` with fake `cloudflared` and `agent-browser` on `PATH` that log their calls. Cover:
  - The tunnel starts before the dashboard, and the dashboard gets the tunnel's exact origin.
  - `HANDOVER_LINK` is the tokenized URL.
  - A matching address gives `done` and tears down (dashboard stopped, tunnel killed).
  - A named element reaching count 0 gives `done`.
  - With both finishes given, both must hold.
  - With no finish, only `close` or the deadline ends it.
  - The deadline gives `timeout` and tears down.
  - `close` gives `closed`.
  - `--local` never calls `cloudflared`.
  - Missing `cloudflared` exits 3 having started nothing.
  - A second `open` is refused.
- [x] 2.2 In the same file, assert the watcher calls agent-browser only with `get url`, `get count`, and `dashboard`, and that `result.json` holds no URL

## 3. Wiki and rules

- [x] 3.1 In `wiki/development/home.md`, point step 2 of *Saved browser logins* at a new *Hand the browser over* subsection, which owns the how:
  - When to hand over: a login, a captcha or bot check, a code, any input only the person can give, or *let me take over*. Never try to get past one yourself.
  - How: run `hand-over.mjs open` with the finish (`--until` or `--until-gone`, neither for a takeover), plus `--local` only when the person says they're at this computer. Send the link and run `wait` in the background.
  - While it's open: send the session no commands, and run `close` when the person says *done*.
  - After it closes: on `done`, take a fresh snapshot and resume. On `timeout`, say so and offer a new link. On `HANDOVER_NEEDS=cloudflared`, ask, install, and retry.
  - Keep "never asks for a password in chat".
- [x] 3.2 Add a short *Is the link safe?* paragraph in that subsection covering the design's Security points in plain words, Cloudflare's view included
- [x] 3.3 Add `cloudflared` to `wiki/development/required-tools.md` beside `agent-browser`: what it's for, installed with consent at the first remote hand-over, and the install commands per system
- [x] 3.4 In `AGENTS.md`, extend the rule *Browse as the person* to say the agent hands the browser over when it needs you, linking the new subsection

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Take over the agent's browser from your phone` entry to `CHANGELOG.md`, with an **Updating.** note: nothing to do by hand; the first hand-over to another device asks to install Cloudflare's tunnel tool
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`
- [x] 4.3 Before `/ship`, if `buy-with-link` has merged, reconcile both plans' lines in the `dependencies` spec and `home.md`

## 5. Live check

- [x] 5.1 On this server, run a real `open --until` through a real quick tunnel, open the printed link from a second agent-browser session, navigate the first session to the named address, and confirm `wait` prints `done`, the dashboard and tunnel are gone, and the link no longer loads; then let a `--minutes` run time out and confirm the same teardown
