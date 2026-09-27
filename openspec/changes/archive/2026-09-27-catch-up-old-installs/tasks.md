# Tasks

## 1. Scripts

- [x] 1.1 In `.agents/skills/wong-sync/scripts/preflight.mjs`, compare against an empty baseline when the installed commit has no `payload-files.json`; keep `missing-inventory` as an error for the current commit. Per design decision 1.
- [x] 1.2 Add the `catchUp` field with the nine reason codes from design decision 1, detected from `lstat` and the record only, and `needed` true for any reason or an installed version below 19.0.0.
- [x] 1.3 Add the `updating` field (and `updatingComplete`) from the source `CHANGELOG.md` at `HEAD`: every entry above the installed version, with its `**Updating.**` or `**Moving an existing install.**` paragraph. Keep `schemaVersion: 1`.
- [x] 1.4 Export the selection helpers `merge-check.mjs` needs, and add `.agents/skills/wong-sync/scripts/merge-check.mjs` per design decision 3, with `--help`, exit codes 0/1/2, and the shared CLI convention.
- [x] 1.5 In `.agents/skills/plan/scripts/build-review.mjs`, warn when Why and What Changes (drawings excluded) hold more than 12 code spans, per design decision 5.

## 2. Tests

- [x] 2.1 In `scripts/tests/wong-sync-preflight.test.mjs`: an installed commit with no inventory gives `update` with `added` units classed `missing`, `latest-equivalent`, or `locally-adapted`; each `catchUp` code fires on its layout and not on the current layout (real `.agents`, links, real `AGENTS.md`); `updating` lists exactly the entries above the installed version and is empty when current; a source with no changelog gives `updatingComplete: false`.
- [x] 2.2 Add `scripts/tests/wong-sync-merge-check.test.mjs`: an adapted file that kept every upstream addition exits 0; one missing an added section exits 1 and names the file, line range, and first line; a block unit checks only inside the markers; a no-baseline install reports `skipped`.
- [x] 2.3 In `scripts/tests/review.test.mjs`: 13 code spans in What Changes warn with the count and still write the page; 12 do not; code inside a drawing does not count.

## 3. Skill and docs

- [x] 3.1 Add `.agents/skills/wong-sync/references/catch-up.md` with the seven steps of design decision 2, restoring the 18.0.0 folder and deploy-token steps from `v19.0.0^` and adding the reverse-link cases.
- [x] 3.2 In `.agents/skills/wong-sync/SKILL.md`, add the four handoff lines from design decision 4 to the `/plan` description.
- [x] 3.3 In `.agents/skills/wong-sync/references/payload-manifest.md`, document `catchUp`, `updating`, the empty baseline, and `merge-check.mjs` under *Deterministic sync preflight*; link `catch-up.md` from *The agent folder*; make sure `payload-files.json` ships the new script and page.
- [x] 3.4 In `scripts/retired-names.json`, add `allow` entries (with a `why`) for any retired name `catch-up.md` or the preflight must name, such as `docsPath` and `wong-cloudflare`.
- [x] 3.6 Move the four handoff lines from `.agents/skills/wong-sync/SKILL.md` into `references/payload-manifest.md`'s *Deterministic sync preflight* section, and have `SKILL.md` link there, so an old install's own `/wong-sync`, which reads the source manifest, gets them. Update design decision 4 to match.
- [x] 3.7 Check `.agents/skills/wong-sync/references/payload-manifest.md` and the wiki for any other line saying an old install must be set up again, and point it at `catch-up.md`; the `stack-pack` and `app-scaffold` spec deltas already cover the specs.
- [x] 3.5 In `CHANGELOG.md`, add `## Next (minor) — Updates catch up old, heavily edited installs` with an **Updating.** note, and change the *Before 19.0.0* line to say those installs now update in place through the catch-up page.

## 4. Real installs

- [x] 4.1 Run the new preflight, read-only, against ClaymooApp, ClaymooStore, WongOS, CarolOS, SuccessStoryClub, and wongstack-cloud with `TMPDIR=/var/tmp`: none errors, SuccessStoryClub gets `update`, each pre-19 install lists the reasons its layout shows (per the design's Context), and wongstack-cloud lists none. Record the counts in the Decision log.
- [x] 4.2 Drive a full `/wong-sync` on a throwaway WongOS clone per design decision 6, up to its review page, with no build and no remote. Check: the plan names each `catchUp` move, carries the post-publish `memory.mjs migrate` step once, lists the skipped parts with a reason, and the builder prints no code-span warning.
- [x] 4.3 Read that review page as a business owner with no tools and log each unclear line. Fix what this change owns (handoff wording, catch-up steps, preflight fields) and rerun 4.2 once; record the rest as memory facts.
- [x] 4.4 Run `merge-check.mjs` against the WongOS clone with the plan's merges hand-applied for three adapted files (one skill, one wiki page, the `CLAUDE.md` block); confirm it flags a section deliberately left out and passes once restored.

## 5. Gate

- [x] 5.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, and the script suite with `TMPDIR=/var/tmp`; `/save` completes the CI gate.
