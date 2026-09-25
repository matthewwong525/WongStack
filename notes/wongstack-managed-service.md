---
slug: wongstack-managed-service
started: 2026-09-25
updated: 2026-09-25
---

# WongStack managed service: MVP shape and constraints

The user wants a WongStack setup as easy as Meta's Muse or xAI's Grok Bot: sign in and start
chatting, with nothing installed. Three account steps plus local tooling (Claude Code on the web,
Paseo) was judged "too hard". The decision is to build a hosted service. It is a separate product in
a **new repo made from the WongStack template**, not an OpenSpec change here. This note is its
starting brief. Facts were checked on 2026-09-25.

## Decided MVP

- **Journey:** sign in with GitHub → pay → log in to Claude in a browser terminal → scan the Paseo
  QR code or open the link. Four steps, no installs.
- **Hosting:** one Hetzner **CPX22** (2 vCPU, 4 GB, 80 GB) per paying user, EU location, always
  on. That costs €19.49/month plus €0.50 for IPv4. Always-on means the Paseo daemon is always reachable.
- **Pricing:** paid from day one (Stripe Checkout, about $29/month) **before** the VM is created.
  A free VM attracts crypto-mining abuse, and the service pays for it.
- **GitHub:** a GitHub App creates the repo from the template. The control plane gives the VM
  short-lived tokens scoped to that one repo, so there is no second login on the VM. The
  service holds the app's private key.
- **Assumed (not asked):** the control plane runs on Cloudflare Workers + D1. The browser terminal is
  `ttyd` on the VM, reached through the service's proxy. Cloudflare setup is deferred: the user runs
  `/wong-cloudflare` in their first chat and pastes a token.

## Cost per user

The VM is about 90% of the cash cost per user. Claude, Cloudflare (the user's own free account),
and GitHub cost the service nothing. The Paseo relay is open source (Apache-2.0). The shared
control plane is about $5/month in total. Card fees are about 3%.

## Hetzner constraints found

- **Cheap plans are sold out.** Every cost-optimized plan (CX23, CX33, CAX11–CAX41) shows "This
  product is currently unavailable" on hetzner.com/cloud/cost-optimized. Cause: server DRAM prices
  rose 43–48% in Q4 2025. Hetzner raised prices on 1 April and 15 June 2026. CX23 was €5.49 after June.
- CPX12 (1 vCPU, 2 GB) is reported at €11.99. It was rejected because 2 GB is tight for Claude Code +
  Paseo + `npm install`.
- **New accounts are capped at 5 servers.** A limit increase needs one month of history and one
  paid invoice, then a few business days. **Open the Hetzner account early.**
- **Stopped servers still bill.** Saving on idle users means snapshot + delete, with minutes to
  restore.
- **IPv4 is needed:** github.com has no IPv6, so an IPv6-only server can't clone or push.

## Rejected alternative: Fly.io Sprites

Persistent agent VMs that sleep about 30 s after activity stops. From 2026-10-01 the rates are
$0.038/CPU-hour, $0.022/GB-memory-hour, hot storage $0.50/GB-month, and cold storage $0.02/GB-month.
Estimated $3–8/user/month at about 2 active hours/day; $118/month flat out at 2 vCPU/4 GB. Not
chosen: a sleeping Sprite drops the Paseo relay connection, so the Paseo app can't reach it without
a separate "wake" step. If an open relay connection keeps it awake, it bills like an always-on VM.
Untested. Revisit if VM cost or Hetzner stock becomes the blocker.

## Earlier conclusions in this thread

- **Cloudflare account ownership:** the user owns their account. Don't create accounts for users:
  the Tenant API is for approved resellers only, and ownership makes the service liable for billing
  and abuse. A zero-signup hosted tier would use Workers for Platforms in the service's own account.
  It stays a later option with an eject path.
- **Cloudflare OAuth** is open to all developers since 2026-06-03, and its scopes cover Workers, D1,
  and account read. **Open:** whether an OAuth app can get an API-token-write scope to mint the
  long-lived `CLOUDFLARE_API_TOKEN` for GitHub Actions. Test it: register a private OAuth client and
  call `/oauth/scopes`. Also check for Access scopes. If the scope is missing, the fallbacks are
  (B) the service issues short-lived tokens via GitHub OIDC, which puts it in every deploy path, or
  (C) the user pastes one token.
- **Claude login:** Anthropic forbids third-party apps from offering Claude.ai login, routing
  subscription usage, or collecting, storing, or intermediating Claude credentials
  (code.claude.com/docs/en/legal-and-compliance, explicit since Feb 2026). It allows hosting
  **unmodified** Claude Code where each user signs in themselves. Conditions: accept the Commercial
  Terms, remove no sign-in options, and never pay for, resell, or pass through Claude usage.
- **Browser-terminal login rules:** the web UI is a real terminal (keystrokes carried, not read).
  Don't record the terminal during login. Don't read, back up, or move the login file to a new VM.
  Don't run `claude setup-token` into the service's secret store. Don't use a custom "paste code
  here" form.
- **ChatGPT:** "Sign in with ChatGPT" is identity only and gives no model access billed to the
  plan. Plan-billed access exists only inside Codex.
- **Paying for AI later (option A):** the Agent SDK with the service's own API key is permitted.
  In that mode, Paseo, which runs Claude Code, likely is not. Keep the agent runner swappable.

## Post-login script (sketch, untested)

This runs on the VM after the login terminal opens:

1. Poll `paseo provider diagnostic claude` until it reports ready, with a 15-minute timeout. On
   timeout, the UI offers to reopen the login.
2. Start the daemon on the default `127.0.0.1:6767`. The encrypted relay gives remote access, so
   there is no public port, TLS, or password page. Run it as a system service so it survives
   reboots.
3. `paseo workspace create --isolation local --path <repo>`.
4. `paseo run --background` with a short first message: confirm what works, then ask one question.
5. `paseo daemon pair --relay --json` gives a `https://app.paseo.sh/#offer=…` link and QR code.
   **Treat the link as a password:** show it only to its owner, keep it out of logs, and offer
   "pair a new device".

The flags marked in the original sketch still need confirming on a real VM: the exit code meaning
ready, `--json` on `workspace create`, and the pair output field.

## Open before building

- Written confirmation from Anthropic sales that the browser-terminal login is allowed.
- Whether Paseo's hosted relay allows commercial use; self-host it if it doesn't.
- The Cloudflare OAuth token-write scope, which only matters once Cloudflare leaves the MVP's deferred state.
