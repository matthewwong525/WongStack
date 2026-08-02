# fix-payload-config-drift

**Status:** ready-to-ship
**Open questions:** none

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

Three shipped facts in the payload contradict the code they describe. Each is a one-line fix; together they mean a new adopter following the templates ends up with a token nothing reads, a committable credential, and a command that doesn't exist.

**The token variable is a regression, not lingering drift.** `.env.example` ships `CLOUDFLARE_USER_TOKEN`. Everything that reads a token — `scripts/cf-secrets.mjs`, `.github/workflows/deploy.yml`, `/wong-cloudflare`, `wiki/stack/cloudflare-credentials.md`, wrangler itself — reads `CLOUDFLARE_API_TOKEN`. The `stack-pack` spec already makes this normative: *"The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts."* CHANGELOG v8.6 records fixing it. Commit `d3446fb` then renamed the shipped file back. The name has now flipped three times across releases, in both directions, which is the real finding: nothing holds it in place.

**`.env` is not git-ignored in a target repo.** The pack's `.gitignore` fragment adds `.dev.vars*` and its negation, and nothing else. But `.env` is where `/wong-cloudflare` puts the API token — a credential the payload's own docs describe as "effectively account-root" and "treat it like a root password." A target that never had a `.env` gets a committable one at the exact moment the skill asks for a token. WongStack's own repo is covered; the fragment that travels is not.

**`payload-manifest.md` describes a thing OpenSpec no longer makes.** It states that `.claude/commands/opsx/` is "produced in each repo by `openspec init`." CLI 1.5.0 creates the five `openspec-*` skills and no commands — verified on a fresh install — while the `WONG-STACK` block still tells the reader `/opsx:*` is available "if you want it."

## What Changes

- **`.env.example` returns to `CLOUDFLARE_API_TOKEN`**, matching the spec, the scripts, the workflow, the skill, the wiki, and wrangler.
- **One owner for the token's name.** The variable is a fact stated in seven files; per the payload's own single-source rule it gets an owning file, with every other mention linking rather than restating. Adding a name to a template is otherwise indistinguishable from a docs edit, which is how this shipped twice.
- **The `.gitignore` fragment covers `.env` as well as `.dev.vars`** — the same wildcard-plus-negation shape (`.env*`, `!.env.example`) already used for `.dev.vars`, and for the same reason: a per-environment variant holds real values.
- **The `opsx` claim is corrected** to what the CLI actually produces, and the `WONG-STACK` block stops promising a command surface a fresh repo does not have.

**Non-goals:** the `deploy.yml` failures and concurrency race (`fix-pack-ci-defaults`); the missing wiki pages and dead links (`fix-payload-wiki-gaps`); anything about Cloudflare Access.

## Capabilities

### Modified Capabilities
- `stack-pack`: the `.gitignore` fragment's scope widens to the credential file, and the token variable's name gets a single owner rather than being restated per file.
- `payload-single-source`: the token variable becomes a named instance of the one-owner rule, and the stale `opsx` generation claim is corrected.

## Impact

- `.env.example` — the variable name.
- `.claude/skills/wong-sync/references/stack-pack-fragments.md` — the `.gitignore` fragment; the `.env.example` fragment's owner link.
- `.claude/skills/wong-sync/references/payload-manifest.md` — the `opsx` claim.
- `CLAUDE.md` (the `WONG-STACK` block) — the `/opsx:*` availability line.
- `wiki/stack/cloudflare-credentials.md` — candidate owner for the variable name.
- `VERSION`, `CHANGELOG.md`.
- Any repo that filled in `.env` from the current template — their token is under a name nothing reads.

## Decision log

- **2026-08-02** — Implemented all 16 tasks. `.env.example` restored to `CLOUDFLARE_API_TOKEN`; confirmed by grep that no live payload file carries `CLOUDFLARE_USER_TOKEN` (only historical CHANGELOG entries and archived changes).
  Chose **`wiki/stack/cloudflare-credentials.md` as the owning file** for the variable name, per the design's recommendation — it already explains what the token is and where it goes, so the fact sits with its explanation. `.env.example` and the fragment now link rather than restate. The classification half landed in the `WONG-STACK` block's release rule: renaming a value the code reads is behavioural, never a `docs(...)` commit.
  `.gitignore` fragment widened to `.env*`/`!.env.example` alongside the `.dev.vars` pair, with one shared rationale, an instruction to apply it *before* asking for a token, and the untracking caveat (widening does not untrack an already-committed file — needs `git rm --cached` **and** a credential rotation).
  The `opsx` claim was corrected against reality rather than memory: ran `openspec init` on a scratch repo and confirmed CLI 1.5.0 produces five `openspec-*` skills and **no** `.claude/commands/opsx/`. Swept the payload and fixed four files that promised `/opsx:*` to a target.
  Verified: all five surfaces agree on the token name, and the widened ignore rules checked against real `git check-ignore` (`.env`, `.env.local`, `.env.staging` ignored; both `.example` files committable).
