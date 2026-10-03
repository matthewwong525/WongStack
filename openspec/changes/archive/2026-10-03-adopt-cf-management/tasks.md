# Tasks

## 1. Management guidance

- [x] 1.1 Add `wiki/stack/cloudflare-cli.md` with the account-management boundary, optional host installation, existing token/account selection, command discovery and JSON handling, version-aware fallback, and source links; verify it stands alone, links to its hub, and directs app publishing and automated provisioning to their existing workflows.
- [x] 1.2 Verify the guide's command examples against the installed Cloudflare CLI when available: version, credential-free search and schema inspection, and a supported credential-free dry run; record what was exercised and what was checked only against official docs, with no account mutation or secret-bearing output. No new automated tests are needed for this prose-only change.

## 2. Discovery links and optional-tool documentation

- [x] 2.1 Recheck the Artifacts and memory/devices owners at a natural boundary and safely coordinate overlapping documentation when idle; preserve their actual page changes and record any agreement or unresolved constraint in the plan before affected edits. Verify owner status and actual replies rather than treating dispatch as agreement.
- [x] 2.2 Link the guide from `wiki/stack/README.md` and a separate optional-cf section in `wiki/development/required-tools.md`; verify existing headings and required-tool guarantees stay intact, the procedure lives only in the management page, and no fresh-install, server-installer, hosted-customer-login, or project-dependency requirement is added.
- [x] 2.3 Run `node .github/scripts/wiki-links.mjs` and `node scripts/check-payload-links.mjs`; resolve any new-page or anchor failure and verify the new page is included by the existing `wiki/stack` payload directory.

## 3. Release and plan consistency

- [x] 3.1 Add one `## Next (minor) — Use cf for Cloudflare management` entry to `CHANGELOG.md`, with an Updating note explaining that the assistant installs the optional tool when needed and existing apps need no migration; verify `VERSION` and executable setup/deploy files are unchanged.
- [x] 3.2 Run `node scripts/check-openspec-config.mjs` and `openspec validate adopt-cf-management --strict --no-interactive`, rebuild `review.html` with `node .agents/skills/plan/scripts/build-review.mjs openspec/changes/adopt-cf-management --require-current`, and verify the proposal, decision log, and completed task records match the delivered guidance. Publishing follows the existing gate; no app preview is needed.
