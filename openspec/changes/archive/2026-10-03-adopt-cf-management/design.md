# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The stack uses React/Vite, Wrangler configuration, a deployed staging Worker, and GitHub Actions. Automated provisioning is already deterministic and does not need cf. Ordinary account-management requests currently have no canonical cf guide.

Cloudflare released cf in open beta on September 28, 2026. Its resource commands can run beside Wrangler projects. Its project commands require migration, and some Wrangler functions remain unsupported. The existing `wiki/stack/` directory ships wholesale; a new page needs no manifest change.

## Goals / Non-Goals

**Goals:** give agents discoverable account-management guidance, keep the optional tool outside project dependencies, and preserve the existing account and authorization boundaries.

**Non-Goals:** no new skill, helper script, automated installer, runtime dependency for core verbs, production mutation during verification, or build/deploy migration. Native Worker Previews remain a later change. There is no app UI change.

## Decisions

### One management page, linked from existing hubs

Add `wiki/stack/cloudflare-cli.md`, titled “Manage Cloudflare with cf,” with an actionable first sentence and a link back to `wiki/stack/README.md`. Add its entry to that hub and a short optional-tool section in `wiki/development/required-tools.md`. The management page owns commands and install details; required-tools explains when the tool is needed and links there. Keep existing anchors intact.

Prefer a dedicated page over expanding the core-runtime or credentials pages: the management procedure is its own recurring task, and those pages already own different topics. Do not add global agent instructions or vendor another skill; agents find the guide through the owning wiki hub.

### Use cf for ad hoc resource work; retain deterministic provisioning

The guide recommends cf for authorized Cloudflare account inspection and one-off resource management, including D1, R2, Workers, and Access. Follow `cf cli search "<task>"` with `cf schema <generated-api-command>` and the selected command's `--help`; check actual option names rather than guessing them. Use a supported `--dry-run` to inspect a request without sending it. Parse JSON with Node's existing facilities or read it directly; add no jq dependency. Account lists may be paginated, so the guide must not claim the first page is complete.

The tool does not replace `.agents/skills/wong-setup/scripts/provision.mjs`, the setup runbook, or any script under `scripts/`. Those scripts encode resource reuse, access protection, propagation waits, credential handling, and recovery. Wrapping them in cf subprocesses is outside this first change.

In Wrangler projects, continue using the existing workflow for builds and releases. Explicitly exclude `cf init`, `cf migrate`, `cf dev`, `cf build`, and `cf deploy` from this guide's adoption step: some can generate configuration that ignores Wrangler settings. Operations that publish Worker code, mutate runtime secrets or triggers, or apply schema changes still belong to their existing reviewed workflow. If cf lacks a supported management command, use the existing runbook or documented API route within the task's authorized scope.

### Optional host install, existing credentials

Check the actual Cloudflare CLI with `cf --version`; if another product owns that command, use Cloudflare's `cloudflare` alias. When needed and absent, follow the existing point-of-need install convention with `npm install --global cf`, using a user-local prefix when a global install would need a password. Confirm Node meets cf's documented minimum, currently 22.18. Do not install into `app/package.json`, add a lockfile, change setup's required tool list, or edit the server installer. Do not invent a new consent step when the conversation already authorizes the installation.

Use `CLOUDFLARE_API_TOKEN` and explicitly select `CLOUDFLARE_ACCOUNT_ID` from the existing authorized account context. The credentials page remains the owner of their names and storage. Use the secrets convention to resolve the primary worktree's ignored `.env` and load credentials without printing them. Do not rely on an unrelated saved login, a cached account choice, or `.dev.vars` as account credentials. cf can read a current-directory `.env`, but commands invoked inside `app/` do not thereby load the repo-root file; explicitly exported credentials avoid that ambiguity.

Do not copy tokens into command arguments, plan artifacts, app runtime secrets, or reports. Some API commands return newly created credentials: capture that output privately and report only nonsecret fields. Missing permissions follow the existing credentials procedure; cf does not justify broadening permissions on its own. Hosted or otherwise scoped environments remain scoped: absence of account-admin access is not a request for customer sign-in or a customer account token.

Account work keeps the existing task authorization rules. For deletes, Cloudflare documents that a noninteractive abort may exit zero; verify the result rather than treating the exit code as proof. Do not add a blanket approval flow to every read or authorized reversible action.

### Documentation-only validation

No executable code or spec-level promise changes, so use `skip_specs: true` and add no implementation-mirroring tests. During `/apply`, check command discovery, schema inspection, and a credential-free dry run using the installed CLI if available. A missing CLI is reported; documentation and planning do not require an unapproved machine install or a live resource mutation. Cross-check any unexercised command against current official docs and distinguish documented support from executed evidence.

Run existing payload-link, OpenSpec-config, wiki-link, and strict change validation checks. CI remains the publishing gate; there is no app build or browser preview for this change.

## Risks / Trade-offs

- [Beta commands change] → cite Cloudflare's command-discovery docs and check the installed version's help instead of shipping a large copied command catalog.
- [An agent treats management guidance as permission to migrate or publish] → draw the account-work boundary beside the existing publishing workflow and name the project commands that require a separate migration.
- [Wrong account or disclosed credentials] → explicitly select the existing authorized account, preserve the credential owner and private input path, and filter secret-bearing command output.
- [The new tool becomes a setup dependency] → install only for a management task; core verbs, server setup, and provisioning continue without it.
- [Concurrent documentation changes] → make additive edits and preserve peers' hosted-workspace and machine-identity guidance; inspect their actual page changes before implementation.

## Migration Plan

Ship the documentation through the existing payload release as `Next (minor)`. Its Updating note says no mandatory installation or app migration is needed: the assistant adds the management tool when a task calls for it. Existing installations receive the page and links through normal sync. Removing the optional guidance rolls back adoption without affecting application configuration or deployed resources. `/ship` owns numbering and publishing.

## Coordination

The 2026-10-03 other-work check found Artifacts PR #238 editing `wiki/stack/README.md` and `wiki/development/required-tools.md`, and memory/devices PR #242 editing the latter's existing memory guidance. This plan adds a new link and a separate optional-tool section, preserving those changes; it does not touch their implementation paths or require either feature to ship first.

At implementation on 2026-10-03, the parent verified actual replies through Paseo conversation logs. Artifacts owner `79539ea6-c024-4127-9422-3c2869b74704` agreed to preserve hosted-workspace guidance and keep cf optional for already-authorized account work, with no customer login, setup, runtime, or delivery changes. Memory/devices owner `21c6858d-e0d3-40d9-8264-1fb43adbd5ad` was verified idle before contact and explicitly agreed to a separate optional-cf section and guide link, preserving memory and Windows guidance, with no memory/setup dependency or credential/authorization changes. Their reply confirms that coordination needs no PR #242 edits or publication.

Read the owners' actual pages in `wrathful-alpacka` and `installation-owned-memory-devices` before editing the overlapping pages. Artifacts changes the personal-versus-hosted account paragraph and adds a hosted-workspaces hub link. Memory/devices changes the initial tool wording, memory identity row, historical GitHub-email heading, and Windows adapter guidance. This change adds only its own hub entry and separate optional-tool section; those unmerged peer changes stay in their owners' checkouts and must be preserved on a future merge. Neither feature must ship first.

## Sources

- [Cloudflare CLI overview](https://developers.cloudflare.com/cf/): resource commands can coexist with Wrangler.
- [Coding-agent guide](https://developers.cloudflare.com/cf/agents/): discovery, schema, dry runs, output, aborted deletes, and project-command boundary.
- [Install and authentication](https://developers.cloudflare.com/cf/get-started/): Node minimum, executable alias, credential precedence, account selection, and `.env` loading.
- [Wrangler command mapping](https://developers.cloudflare.com/cf/wrangler/reference/): remaining command gaps.

## Review

[review.html](review.html) shows the proposed adoption and decision log. No new screen needs a UX section.
