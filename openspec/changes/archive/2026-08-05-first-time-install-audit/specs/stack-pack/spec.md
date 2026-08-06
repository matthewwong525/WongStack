## ADDED Requirements

### Requirement: Every config-relative path in a fragment is stated per layout

The `wrangler.jsonc` fragment SHALL state, for each path it carries that Wrangler
resolves relative to the config file, what that path is in **both** supported
layouts — the repo-root layout and the `app/` subdirectory layout the app scaffold
ships — and `migrations_dir` SHALL join `main` as a rule the scripts depend on.

The fragment is the only thing in the payload that ever creates a target's Wrangler
config, so a path it states wrongly is wrong in every repo that has one. It already
does this correctly for `main` (*"resolved relative to the config file, so
`worker/index.ts` is right for both layouts"*) and the `package.json` fragment does
it for its `../scripts/` paths — `migrations_dir` is the omission. The pack ships
`schema/` at the repo root, so in the `app/` layout the correct value is
`../schema/migrations`; the fragment's literal `schema/migrations` resolves to
`app/schema/migrations`, which never exists.

This is the flagship path, not a corner: an appless repo takes the scaffold, so the
`app/` layout is what every non-technical first install receives. WongStack's own
`app/wrangler.jsonc` carries the correct value with a comment explaining it, which
is why the defect is invisible here.

#### Scenario: Fragment applied in the app/ layout

- **WHEN** `/wong-cloudflare` creates `app/wrangler.jsonc` from the fragment
- **THEN** `migrations_dir` is `../schema/migrations`, and `wrangler d1 migrations apply` finds the pack's migrations directory

#### Scenario: Fragment applied at the repo root

- **WHEN** the Worker and its config sit at the repo root
- **THEN** `migrations_dir` is `schema/migrations`

#### Scenario: Wrong path is caught at first migration

- **WHEN** a repo's config points `migrations_dir` at a directory that does not exist
- **THEN** the build wrapper exits non-zero rather than deploying a Worker against an unmigrated database

### Requirement: The build wrapper's stop names its remedy

Where `cf-build.sh` stops because no Wrangler config is present, its message SHALL
name what to run — `/wong-cloudflare` — rather than reporting only the missing file.

An unprovisioned repo is the *expected* state after setup, because the pack is
adopted before it is configured and the token is documented as arriving later. The
message that state produces — `wong: ERROR — no wrangler config found under <root>`
— names a file the reader has never heard of and gives no next step.

This is a message fix and nothing more. The audience is whoever reads the CI log,
since running the app is done at the deployed preview URL rather than locally; the
exit status SHALL NOT change, so CI behaviour stays exactly as it is.

#### Scenario: Build runs before provisioning

- **WHEN** the build wrapper runs in a repo that has taken the pack but not yet run `/wong-cloudflare`
- **THEN** the message states that the repo is not configured for Cloudflare yet and that `/wong-cloudflare` configures it
- **AND** the exit status is unchanged
