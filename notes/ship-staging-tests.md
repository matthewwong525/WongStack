---
slug: ship-staging-tests
started: 2026-08-02
updated: 2026-08-02
consolidated:
---

# A walkthrough gate on /ship

## What the user asked for

Verbatim shape of the ask: a subagent that "finds all of the test scenarios," then runs Playwright integration tests against staging with screenshots — **without saving the integration tests**, "just like someone going through and running the tests." The self-correction from Puppeteer to Playwright was immediate and deliberate.

The phrase that did the most work is *"like someone going through."* It's what ruled out generated assertions: a human walking an app doesn't write an assertion, they look. Every subsequent decision traces back to honoring that.

## Decisions the user made directly

- **Screenshots as a PR comment, "or like a video ideally if that's possible."** Video turned out to be free; inline playback turned out to be impossible.
- **Gate, not report.** Asked explicitly; answered "gate makes sense."
- **`/ship` only** — not `/save`, when offered the choice.
- **On the judge question** ("should a second agent grade the screenshots?"): *"Maybe just go through the openspec flows."* Read as: don't build a judging apparatus, walk the scenarios and let the written `THEN` be the check. That reading drove the whole grading design, so it's worth flagging as an interpretation rather than a literal instruction.
- **Destructive journeys are in.** *"it's part of it. Only when things fail do we reseed."* — which mapped exactly onto the pack's existing `db:reset:staging`.
- **On making it opt-in:** *"for integration tests similar to zerotrust auth we have a recommendation or optional install."* This was the pivotal steer. It reframed the feature from "something `/ship` now does" to "something a repo adopts," and dissolved the strongest objection on the table (every downstream repo inheriting a slower, flakier `/ship`).
- **Sequencing at the end:** ship the payload change first, provision the meta-repo separately.

## The user's working style, as observed

- Steers by picking a direction rather than answering every question — twice moved past open forks to the next thing. When that happened, taking the recommendation and stating the assumption plainly was accepted both times.
- Asks "why doesn't this work?" about infrastructure rather than accepting a limitation. The CI-doesn't-deploy answer was wanted as a diagnosis, not a workaround.
- Values a real rehearsal over reasoning — consistent with the `staging-worker-env` session, which set that precedent explicitly.

## Things learned that outlived the change

**There is no Playwright MCP server in this environment.** Live click-by-click browser driving by an agent isn't available here; the achievable shape is a script that drives and an agent that judges the resulting screenshots. Worth knowing before promising any "agent uses a browser" capability.

**GitHub only renders inline images and playable video for `user-attachments` URLs**, which are produced by dragging a file into the web UI. There is no `gh` or REST path — it needs a browser session. Anything posted from a CLI is a link, or must be hosted elsewhere first (R2, release assets, raw.githubusercontent). This limitation is permanent enough to design around rather than retry.

**Playwright's toolchain is already installed in this environment** — 1.61.1, two chromium builds, and `ffmpeg` — resolvable from `/root/.npm/_npx/*/node_modules`. Video recording works out of the box via `recordVideo` on a context.

**The meta-repo ships the stack pack without having taken it.** `gh secret list` is empty, `app/wrangler.jsonc` is the bare scaffold with no `env.staging` or `d1_databases`, and `app/package.json` has the vanilla vite scripts rather than the pack's wrappers. So its CI builds and never deploys — by design, per the workflow's own comment ("an unprovisioned repo gets a real PR check instead of a permanently red one"). This is why anything needing a real preview URL can't be tested from here.

**The July test resources are still live** — `wongstack-d1-test` Worker responds 200. Useful as a real HTTPS target for anything that needs one without provisioning.

## Open threads

- **Provision the meta-repo via `/wong-cloudflare`** — the agreed next change. It closes the two unverified pieces (`preview-url.sh` on a real per-commit URL, `db:reset:staging` firing on failure) and would let WongStack dogfood the walkthrough on its own PRs.
- **Whether the gate can actually say no in practice.** The design bets on the `THEN`'s provenance rather than a second judge. If it starts rubber-stamping, the recorded fallback is a skeptical judge that sees only the screenshots and the `THEN`, blind to the steps taken.
- **Whether the media bucket rung is worth keeping.** It shipped optional and nothing depends on it; if nobody configures one, the comment-as-prose design means it can be dropped without loss.
- **A repo with a Worker but no D1 can't use the pack's pipeline** — `cf-build.sh` errors without a staging `database_name`. Noticed while diagnosing why CI doesn't deploy here; not pursued, and possibly a real gap for simple apps.
