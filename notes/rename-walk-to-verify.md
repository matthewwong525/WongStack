---
slug: rename-walk-to-verify
started: 2026-08-11
updated: 2026-08-11
consolidated:
---

# Rename /walk to /verify, and the probe ladder

## What the user asked

Two requests, one session. First: "rename /walk to /verify" — a straight verb rename. Then, after
the plan was drafted: the verb should "also verify stuff even if it doesn't require browser —
essentially try and do e2e test to the best of ability." The second request turned a mechanical
rename into a real capability change, folded into the same OpenSpec change
(`rename-walk-to-verify`, shipped as 12.0.0).

## Context the change's Decision log doesn't carry

- The user's phrasing "to the best of ability" left the local-execution boundary open. The session
  resolved it *against* local execution without asking (autonomous run): the delivery-gate spec's
  building-versus-exercising boundary is load-bearing for every skill, so probes broaden the
  modality (browser → +HTTP +existing-command state reads) but the target stays the CI-published
  deployment. If the user actually wanted `/verify` to run the repo's own code locally, that is a
  deliberate reversal of the delivery-gate spec and needs its own change — the door was left open
  in the report but not taken.
- The concept names deliberately did **not** rename: `staging-walkthrough` (capability),
  `wiki/development/staging-walkthrough.md`, `references/walkthrough.md`, and "walk/walkthrough"
  as activity nouns all stay. Only the verb, the skill directory, the scripts, and `/walk` tokens
  changed. Recorded as an assumption in the proposal; nobody has confirmed or contested it yet.
- The `#when-the-walk-cant-get-in` and other anchors in `staging-walkthrough.md` are referenced
  from `wong-cloudflare`, `cloudflare-access.md`, and `cloudflare-credentials.md` — heading text
  there is load-bearing. The `#walking-the-app` anchor in `the-change-loop.md` was in-page only
  and became `#verifying-the-app`.
- Stale-drift fixed while passing through (mechanical, not scope creep): the change-loop page
  claimed the walk posts "video" (it doesn't, per spec); `.env.example` claimed the token grants
  itself Browser Rendering for a remote browser (that grant was removed when the walk went local,
  per `permission-groups.md`).

## Tooling facts worth keeping

- `scripts/check-payload-links.mjs` reads skill directories from
  `wong-sync/references/payload-files.json` (`core.skillDirs`), not from the prose manifest — a
  skill rename that only edits `payload-manifest.md` shows up as dead links in every install
  shape. The prose manifest and the JSON are two surfaces of one fact.
- OpenSpec 1.8.0's validator matches MODIFIED-requirement scenarios by *title* against the current
  spec and refuses any drop ("omits scenario(s) the current spec still has") — there is no
  scenario-rename syntax. To retitle or remove a scenario, move the whole requirement through
  REMOVED (with Reason + Migration) + ADDED. RENAMED is header-only.
- `openspec validate --change X` is not a flag — it's `openspec validate X`.
- The paseo worktree branch was `wicked-liger` at session start but resolved to
  `rename-walk-to-verify` by save time — the harness tracks the branch rename; don't fight it.

## Implementation shape (for whoever touches the verify skill next)

- Journey files: `<id>.meta.json` gained a `probe` field (`browser` | `request` | `state`).
  Request probes are `<id>.requests.txt` — tab-separated `METHOD  path-or-url  [JSON body]`, one
  step per line, curled by `verify-runner.sh` with the Access service-token pair as headers, full
  response captured per step, no redirects followed (a redirect is a response; follow-ups are
  explicit steps). State probes: trigger via requests file, read executed agent-side after the
  driver returns (thin-driver rule) into the journey's evidence dir.
- `verify-staging.sh preflight --no-browser` skips the agent-browser install/doctor entirely;
  the runner exits 2 if batch files exist without agent-browser, and runs fine with only
  `.requests.txt` files. Temp dirs are now `wong-verify-*`; cleanup accepts the old `wong-walk-*`
  prefix too so a stale run dir from the old name can still be removed.
- `VERIFY_URL` replaced `WALK_URL` (internal writer/reader pair, renamed atomically).
  `WALK_MEDIA_BUCKET`/`WALK_MEDIA_BASE_URL` deliberately kept.

## Open threads

- The wong-sync verdicts file / a real target repo hasn't exercised the rename path yet: the
  expectation is `verify` arrives as missing, untouched `walk` is proposed stale. Worth watching
  the first real sync against 12.0.0.
- `agent-browser`'s `set headers` + curl header parity for Access is assumed equivalent; not yet
  exercised against a real Access-protected preview since the split.
