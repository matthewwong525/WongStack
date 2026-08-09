---
slug: walk-stack-agnostic
started: 2026-08-09
updated: 2026-08-09
consolidated:
---

# Making /walk work in any repo

One session: `/explore` → `/plan` → two full artifact rewrites → `/apply` → `/save`. The
change's own Decision log carries why the change is shaped the way it is; this note carries
what surrounded it.

## What the user actually wanted, and how it sharpened

The opening ask was narrow — "make `/ship` run `/walk` instead of generic integration tests"
— and the real goal only emerged three turns later: **`/walk` should be something anyone can
use to check their app works, on any stack.** Every subsequent correction pushed the same
direction, and each one was more radical than my proposal:

| I proposed | The user said | Why theirs was better |
|---|---|---|
| Browser-resolution chain, Browser Run kept as a rung | "Remove it entirely" | A rung nobody exercises rots, and it keeps a vendor dependency alive in a core verb |
| Narrow "never installs anything" to "never installs a *dependency*" | "Just remove that rule" | The narrowed version still left the first walk in a new repo failing until someone ran a command |
| Two changes (walk rework, then vitest) | "One change" | They ship as one version bump; splitting would have left the manifest half-moved |
| Playwright as the engine | "What about agent-browser" | Decisive: Playwright is a *repo* dependency and would have forced Node into non-JS repos |

**The lesson to carry:** when the user pushes for the more radical version of a change, they
have usually seen a coupling that the incremental version preserves. Three times here, the
"safer" option I recommended was the one that kept the problem alive.

## The argument that decided the engine

Not performance, not features — **where the dependency lives**. `playwright` goes in
`devDependencies`, which presumes a `package.json`. A Python or Go repo would have gained a
Node toolchain purely to look at its own app. `agent-browser` is a machine-level binary, so
the walk's existing "writes nothing to the repo" rule survived untouched instead of needing to
be weakened.

I only noticed this while drafting the *second* rewrite. It's a good reminder that "make X
stack-agnostic" can be quietly violated by the tool you pick to do it.

## Facts established about agent-browser (verified, not read)

Checked on this Linux host before adopting it, because adopting an engine on a README is how
you find out in production:

- `npm i -g agent-browser` + `agent-browser install --with-deps` → Chrome for Testing 151 at
  `~/.agent-browser/browsers/`. Works headless on Linux with no display.
- `doctor --json` is a real check — it launches a browser. That made it the natural preflight.
- `batch --bail --json` takes a JSON array of commands on stdin. This is what let the driver
  become bash: journeys are the tool's own command arrays, so nothing needs translating.
- `set headers '<json>'` covers the Cloudflare Access service-token pair.
- Skills ship *inside the CLI* (`agent-browser skills get core`), and the vendored `SKILL.md`
  is a discovery stub that points at them — so a vendored copy can't drift. That is why
  vendoring it was acceptable at all.
- Apache-2.0, v0.33.2, ~1.26M npm downloads/week, Vercel Labs. Pre-1.0 in an incubator org is
  the real risk; the mitigation is that the driver is one shell script and `get cdp-url`
  leaves a plain CDP path open.

## The bug worth remembering

Testing the driver end to end against `example.com` produced **two byte-identical screenshots**
(17893 bytes each) while the browser had correctly navigated to `iana.org`. The second
screenshot fired before the destination painted, so it captured the page the click had left.

This is the walk's worst failure mode — it grades confidently and wrongly, and nothing errors.
Adding `["wait", "--load", "networkidle"]` made the second screenshot 121664 bytes and the
right page. It is now a hard rule in the skill, the reference, and the runbook, and it is the
kind of thing that only shows up if you actually run the thing rather than reasoning about it.

## Where I contradicted myself, and how it resolved

Mid-implementation I hit a fork my own artifacts had created: `ci-tests` said the suite covers
"the walk driver's journey translation and verdict mapping" (assumes JavaScript), while
`toolchain-dependencies` — rewritten an hour earlier in the same session — said `/walk`'s only
exception is the browser CLI (forbids a language runtime). Both couldn't hold.

Asked rather than guessed; the user chose pure bash. Amended `ci-tests` to test shell by
invoking it. **Two specs written in the same session can still contradict each other** — the
check that caught it was trying to write the code, not re-reading the specs.

## Things deliberately not done

- `agent-browser`'s extra surface — `a11y` (axe), `vitals` (LCP/CLS/INP), HAR capture, network
  interception, `dogfood` skill — is available and untouched. Tempting and out of scope; the
  walk captures what it captured before, minus video.
- No MCP server, though `agent-browser mcp` exists. The payload configures no MCP servers at
  all, and adding the first one is its own decision.
- `check-payload-links.mjs` was *not* refactored to export its internals for testing. Tested by
  invoking it instead, which also happens to test the entry point a target repo runs.

## Open thread

Nothing here is exercisable end to end: WongStack is the payload source with no app, so the
real proof is a target repo that takes the stack and runs `/walk` against a live preview. The
driver was verified against `example.com`, which proves the plumbing but not a graded journey.
