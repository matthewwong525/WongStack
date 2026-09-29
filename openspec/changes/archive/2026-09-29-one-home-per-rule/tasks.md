# Tasks

## 1. AGENTS.md

- [x] 1.1 Retitle `AGENTS.md` to `# AGENTS.md`; in the meta half, say only that the payload manifest lists what ships, dropping "the wiki" and "OpenSpec records".
- [x] 1.2 In the `WONG-STACK` block's verbs rule, drop "only `/save` and `/ship` push" and point the finished-plan question at its owner instead of quoting it.
- [x] 1.3 In the block's print-the-link rule, say the `/apply` line goes under the link only after *Review the plan*.

## 2. Skills and rules

- [x] 2.1 `asking-the-user.md#print-the-plans-link`: copy the next-step line only on the *Review the plan* reply; update the `NEXT_STEP` comment in `build-review.mjs` to match.
- [x] 2.2 `ship/SKILL.md`: Step 6's closing question links `new-workspace.md#next-work` with no option list; "`/save`'s authoring test" links save's route table.
- [x] 2.3 `new-workspace.md#next-work`: own the whole after-ship list (next part, walk the merged app, *Close this workspace*, stop).
- [x] 2.4 `save/SKILL.md`: the status note links the change loop's Status values instead of listing them; `facts-save.md`: "save's capture rules" links save's step 2.
- [x] 2.5 `.agents/rules/payload.md`: the git-fronting bullet links the change loop for which verbs own git.
- [x] 2.6 `openspec-cli.md`: drop the hard-coded CLI version from the reconcile section.
- [x] 2.7 `payload-manifest.md`: one line in "The agent folder" that setup also copies the values-blank `.env.example`, which a sync does not update.

## 3. Wiki

- [x] 3.1 `the-change-loop.md`: keep the git-owner list; add the review-notes exception to "`/plan` always invokes `/explore`"; link the finished-plan question and the workspace-split options to their owners.
- [x] 3.2 `wiki/development/README.md` and `wiki/contributing.md`: one sentence each linking the payload manifest for what ships.
- [x] 3.3 `required-tools.md`: the `git` row links the change loop; add a `curl` row and say five commands; drop the stack-pack conditionals.
- [x] 3.4 Drop the stack-pack conditionals in `core-stack.md`, `agent-knowledge-center.md`, `staging-walkthrough.md`, `stack/README.md`, `d1-pipeline.md`, and `ux-principles.md`.
- [x] 3.5 `staging-walkthrough.md`: the verdict line says a verdict gates nothing on `/verify`'s own run and links `/ship`'s Step 4 for a failed walk.
- [x] 3.6 `wiki/stack/mini-apps.md`: the Plan bullet links the finished-plan question instead of quoting "build it now?".
- [x] 3.7 `agent-knowledge-center.md`: add `/improve` and `/routine` to the skill list.
- [x] 3.8 `adding-a-skill.md`: step 1 asks for a one-line description of what the skill does and when to use it.
- [x] 3.9 `stack/README.md`: the Getting started entry describes the page, not a step count.

## 4. README, config, and server

- [x] 4.1 `README.md`: add `/verify` to the command table.
- [x] 4.2 `openspec/config.yaml`: `.agents/` paths and `AGENTS.md`, and no "is markdown".
- [x] 4.3 `server/setup.sh`: install Node 22 (`setup_22.x`).
- [x] 4.4 Add a test in `scripts/tests/server-setup.test.mjs` that `server/setup.sh`'s Node major equals `.nvmrc`.

## 5. Specs and release

- [x] 5.1 Edit the Purpose lines of `openspec/specs/staging-walkthrough/spec.md` and `openspec/specs/context-economy/spec.md`.
- [x] 5.2 Add a `## Next (patch) — Each rule has one home` entry at the top of `CHANGELOG.md`, with **Updating.** *Nothing to do by hand.*
- [x] 5.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; fix what fails.
