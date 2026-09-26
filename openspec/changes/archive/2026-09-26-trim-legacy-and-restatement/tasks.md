## 1. Remove legacy paths

- [x] 1.1 `wong-sync/references/payload-manifest.md`: delete the notes migration and the "Moving to 18.0.0" section, and the sentences about flags gating old repos. Delete `references/adapt.md`, and repoint `wiki/contributing.md:12` to `/wong-sync` (review.html#/removed).
- [x] 1.2 `wong-sync/SKILL.md` and `wong-setup/SKILL.md`: read only `.claude/.wong-stack.json`.
- [x] 1.3 `preflight.mjs`: always select `core`, `ui`, `pack`, and `scaffold`, and ignore old flags. Remove the flag notes from `payload-files.json`. Setup and `.agents/.wong-stack.json` stop writing the three flags. Update `scripts/tests/` preflight cases.
- [x] 1.4 `build-review.mjs`: remove the `legacy` branch. Delete `save/scripts/sync-review-proposal.mjs` and its mentions in `save/SKILL.md` and the manifest. Update the review tests.
- [x] 1.5 `checkpoint-evidence.mjs`: stop emitting `legacy`. Remove the same-name fallback from `continue`, `save`, `ship`, `verify`, and `apply`. Update the helper's tests.
- [x] 1.6 Delete the previous-model adoption runbook from `wiki/stack/`, `SECURITY.md` "Before 18.0.0", and the Browser Rendering history note in `wong-setup/references/permission-groups.md`. Check `generated-openspec-hashes.json`'s legacy normalization and remove it if nothing else needs it.

## 2. Memory digest

- [x] 2.1 `memory/scripts/lib/digest.mjs`: rank (current-change threads, other threads, feedback, project, reference; newest first within each), then cap at 40 lines and 6 KB. Update the digest tests for the order, the cap, and the last line.
- [x] 2.2 `.agents/settings.json`: add `"matcher": "startup|resume"` to the SessionStart hook.

## 3. One owner per rule

- [x] 3.1 `save/references/checkpoint-evidence.md`: define the named selection rungs. Replace the numbered orders and the copied "Read the helper fields…" sentence in `apply`, `continue`, `save`, `ship`, and `verify` with a list of the rungs each verb uses (review.html#/owners).
- [x] 3.2 `ship/SKILL.md`: keep the steps and commands. Replace the pull-in restatement, the verify restatement, the history note, and the repeated hard rules with links to the change loop and `/apply`'s resolve order.
- [x] 3.3 `/verify`: the skill keeps the steps and the verdict table, `references/walkthrough.md` keeps the mechanics, and `wiki/development/staging-walkthrough.md` keeps the reasons. Remove the other copies.
- [x] 3.4 `apply:44`, `explore:50-70`, and `the-change-loop.md:24-45`: keep each rule in its owner, and link from the rest.
- [x] 3.5 Resolve the contradictions. In `rules/code.md`, remove the local-check and `/simplify` lines. Put one default-branch rule in `git-gate.md`, and link it from `improve`, `ship`, `continue`, and `save`. In `rules/payload.md`, say which route a payload wiki page takes.
- [x] 3.6 Fix the stale text: session notes in `the-change-loop.md:41-42`, `openspec-*` in `wiki/development/README.md:5`, `/opsx` in `ship` and `continue`, and `required-tools.md:3,11,53`.

## 4. Always-loaded surfaces

- [x] 4.1 `agent-browser/SKILL.md`: add `disable-model-invocation: true`, and note the local edit where the vendored file is documented. Confirm in a new session that the description is gone from the skill list. If it is still listed, shorten it and record that in the Decision log.
- [x] 4.2 Trim the `verify`, `routine`, `continue`, and `memory` descriptions to about 35 words each. Each stays a trigger that names when to use the skill.
- [x] 4.3 `AGENTS.md` WONG-STACK rules block: one line and a link per rule, with `/routine` in the verb list.

## 5. Wiki and scripts

- [x] 5.1 Wiki style: link `staging-walkthrough.md` from `development/README.md`. Add up-links to `staging-walkthrough`, `the-change-loop`, `agent-knowledge-center`, and `ux-principles`. Title `wiki/README.md` as a topic. Move the history in `staging-walkthrough.md:163-186` and `repo-layout.md:29` out of the wiki; the archive already holds it.
- [x] 5.2 Add `scripts/lib-cli.mjs` (`isMain`, `parseCli` with strict parsing, `--help` exit 0, usage error exit 2). Use it in the scripts that copy `isMain`, and in `check-openspec-config.mjs` and `check-payload-links.mjs`. Set `strict: true` in `memory.mjs`. Add a test that runs each script with `--help` and with an unknown flag.
- [x] 5.3 Run `node scripts/measure-context.mjs` and `node scripts/check-payload-links.mjs`. Record the before and after instruction-word totals in the Decision log. The goal is a net cut of at least 4,000 words with no dead link.
