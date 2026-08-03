---
slug: payload-hardening-9-1-0
started: 2026-08-02
updated: 2026-08-02
consolidated:
---

# Five payload fixes shipped as one 9.1.0 release

Implemented five OpenSpec changes in one session, on branch `setup-flow-testing`:
`offer-app-scaffold`, `fix-pack-ci-defaults`, `fix-payload-config-drift`,
`harden-cloudflare-access`, `fix-payload-wiki-gaps`. Each change's own Decision log holds what
landed and why it's shaped that way; this note holds the surrounding context.

## What the user decided

- **One branch, one release** — apply all five together, fold every `VERSION`/`CHANGELOG` task into a
  single 9.1.0 entry, one PR. Chosen over branch-per-change (five PRs, five releases, five CI waits)
  and over stacked branches. The deciding factor: all five bump `VERSION` and `CHANGELOG.md`, so
  separate branches would conflict on both files until merged in order.
- **Order: scaffold → ci → config → access → wiki**, i.e. dependency order, which is also the order
  they were proposed. `harden-cloudflare-access` depends on `offer-app-scaffold` landing the scaffold
  category that carries `worker/access.ts` (stated in that change's `design.md`).
- The user asked for all five "in order" in one instruction and did not revisit it, so the whole
  session ran without further steering.

## The thing worth remembering

**This repo structurally cannot detect most of these defects by inspecting itself.** Every payload
link resolves here, CI is green here, `.env` is git-ignored here, and an app exists here — because
this repo holds the payload *plus everything around it*. All five changes originated from people
installing WongStack elsewhere and hitting the gap on arrival.

That generalizes past this release: **the artifact under test is what arrives somewhere else, not the
source repo.** Two mechanisms now encode it, and they're the durable output of this session:

- `scripts/check-payload-links.mjs` — resolves links against the file set a *target* receives, in
  four install shapes. It caught a page invented during this very session.
- The release rule in the `WONG-STACK` block — a template or fragment is code, not prose; renaming a
  variable a script reads is behavioural and needs a version bump, never a `docs(...)` commit.

Both exist because the same class of bug had already shipped repeatedly: `CLOUDFLARE_API_TOKEN` has
flipped names **three times in both directions**, and the most-cited doc in the payload
(`the-change-loop.md`, 14 references across 9 skills) was never in the manifest at all.

## Verification: what's real and what isn't

Deliberately did **not** mark work verified that wasn't. Worth carrying forward, because the
temptation was strongest exactly where verification was hardest:

- **Reproduced before fixing** — both CI failures were stood up in a scratch pack repo first, so the
  fix was aimed at an observed failure rather than a described one.
- **Checked against reality, not memory** — ran `openspec init` on a scratch repo to confirm CLI 1.5.0
  produces five skills and no `opsx` commands; queried the live Access API to confirm partial-label
  wildcards; read Cloudflare's docs for the `common_name` claim rather than trusting the design's
  assertion of it.
- **Left unchecked what couldn't be checked** — 6 tasks need live infrastructure. Two (`fix-pack-ci-defaults`
  5.2/5.3) verify themselves on this PR's CI. Four (`harden-cloudflare-access` 7.1–7.4) need Access
  stood up on a custom domain and a full provisioning run against the user's **production** Cloudflare
  account. Those are outward-facing mutations; not done unprompted, and the CHANGELOG says so.

## Environment facts discovered

- `CLAUDE.md` is a **symlink to `AGENTS.md`**, and `.claude/` is a symlink to `.agents/`. Edits must
  target the real path — the Edit tool refuses to write through a symlink.
- The repo's `.env` holds a live, working `CLOUDFLARE_API_TOKEN` whose scope sees **two accounts**
  (`Info@claymoo.com's Account`, `Matthewwong525@gmail.com's Account`). That incidentally reproduced
  the exact multi-account hazard `harden-cloudflare-access` task 5.1 guards against, and is why that
  change now says *stop and ask, create nothing before the answer*.
- The account already has an Access application on `*-claymoo-admin.snowy-waterfall-9b1b.workers.dev`
  — a real partial-label wildcard, and the evidence the scoping recommendation rests on.
- `app/node_modules` was installed during the session to typecheck `worker/access.ts`. It is
  git-ignored; the link checker skips `node_modules`, `dist`, and `.wrangler` because third-party
  READMEs are full of their own broken links (216 false positives before that exclusion).

## Open threads

- **11 conditional links** remain: payload files that ship to every repo but link into opt-in
  categories (`plan/SKILL.md` → `ux-principles.md`; `ship/SKILL.md` → `walk/SKILL.md`;
  `stack-pack-fragments.md` → `wiki/stack/*`). Not dead — they resolve wherever the category ships —
  but a non-pack repo sees them dangle. Raised rather than fixed, per `fix-payload-wiki-gaps` task 1.4:
  it's a payload/local boundary question, not that change's scope.
- **The `db:migrate:*` asymmetry.** Those two scripts left `app/package.json` so no copied file carries
  a database name, which means WongStack's own repo now lacks them too. Harmless today
  (`cf-build.sh` migrates on every build, reading the name from the wrangler config) but it's a case of
  the source repo paying a cost to keep the payload clean — the same tension the note opens with.
- Whether the Access partial-label wildcard works on **every plan tier** is still unknown. The runbook
  documents the uncertainty instead of resolving it.

## Live Access verification (added after the first save)

User authorized standing Access up on an `ithinkwong.com` subdomain, which unblocked section 7 of
`harden-cloudflare-access`. What was created on account `040f88e2…` (Matthewwong525@gmail.com's),
and what to remove when it's no longer wanted:

| resource | identifier |
|---|---|
| Workers custom domain | `wongstack-staging.ithinkwong.com` → `wongstack-staging` (id `16aa241c7fc2a934f0bc3f46650279f43ac50037`) |
| Access application | `WongStack staging (Access runbook verification)` (id `10a98858-5fe3-4650-a57f-a02786a1e851`, aud `b0e998ce…`) |
| Access service token | `wongstack-access-verification` (id `00e6082c-9e90-4e43-b167-49aa1004483d`) |

Left standing deliberately so the outstanding browser check can be done. Nothing pre-existing was
modified; the apex `ithinkwong.com` app was not touched.

**The finding worth keeping.** The pre-existing `ithinkwong.com` Access app already used a
partial-label wildcard — `*wongos.matthewwong525.workers.dev` — on an account *different* from the
one that supplied the original evidence. So partial-label patterns are confirmed on two independent
accounts, and the form varies (`*wongos…` here, `*-<worker>-staging…` as documented); the mechanism
is what matters, not the punctuation.

**The premise stopped being a documentation claim and became an observation.** A real
`CF_Authorization` JWT captured from a service-token request contains `common_name`, no `email`, and
an empty `sub` — so the header pattern really does reject machine callers, and `/walk` really would
have been locked out. Worth remembering that this only became checkable once there was a live gated
host; the synthetic tests could never have established it.

**What was deliberately not claimed.** The logged-in-browser row is unverified and marked as such,
because the IdP is one-time-PIN and no human was in the loop. Marking it done on the strength of a
service-token `200` would have reproduced, inside this change's own record, the exact error the
change exists to prevent.

**Resolved.** The maintainer confirmed the logged-in browser serves the app on the custom domain, so
7.1 closed with all three callers verified and the change archived. The custom-domain requirement is
now established end to end rather than inferred from the `workers.dev` failure it avoids. 7.2 was
recorded as descoped to the mechanism — a full `/walk` run needs `playwright`, a separate opt-in this
repo hasn't taken — rather than checked off silently or left open against a dependency that isn't
coming.
