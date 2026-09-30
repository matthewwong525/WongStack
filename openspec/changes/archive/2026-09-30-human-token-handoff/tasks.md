# Tasks

## 1. Shared entry rule

- [x] 1.1 Add the own-browser token exception to the generic `AGENTS.md` rules with a link to the secrets procedure; verify it names API keys and tokens and excludes automated browser access.

## 2. Wiki procedure

- [x] 2.1 Add the owning token website procedure to `wiki/development/secrets.md`, and link it before generic browser handling in `wiki/development/browsing.md`; verify missing-token, rotation, permission-edit, revocation, and mid-task cases route to the person while ordinary browsing and authorized API operations remain unchanged.
- [x] 2.2 Update `wiki/stack/api-keys.md` to explain the direct service link and short steps, their own browser, and private key input for new or replacement values; verify the wording links to the owning procedure without duplicating it.

## 3. Release and integration checks

- [x] 3.1 Add a `## Next (minor)` changelog entry explaining the human token website handoff and no credential migration; verify `VERSION` is unchanged.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate human-token-handoff --strict --no-interactive`; inspect the diff for scope and conflicting browser guidance, and record the results.

## Verification

- `node scripts/check-payload-links.mjs` passed: all payload and source-only links, anchors, and real paths resolve.
- `node scripts/check-openspec-config.mjs` passed: the configuration parses and its artifact rules apply.
- `openspec validate human-token-handoff --strict --no-interactive` passed.
- Reviewed the edits against missing-token, rotation, permission-edit, revocation, and mid-task cases. The own-browser rule precedes generic browsing guidance; new values use private input and changes without new values await confirmation. Ordinary browsing and authorized API operations retain their existing procedures.
- The edits cover the shared rule, three owning or linked wiki pages, the release note, and task tracking. Implementation left `VERSION` at `27.10.0`; publishing numbered the release `28.1.0` after integrating `28.0.0`. No application or browser-tool code changed.
