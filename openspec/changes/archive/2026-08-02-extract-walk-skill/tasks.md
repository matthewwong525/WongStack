> **Paths:** `.claude` is a symlink to `.agents` — every edit below targets `.agents/`, per [repo layout](../../../wiki/development/repo-layout.md). A repo-wide `grep` under-counts because it does not follow symlinks; search `.agents/`.

## 1. The /walk skill

- [x] 1.1 `git mv .agents/skills/ship/references/walkthrough.md .agents/skills/walk/references/walkthrough.md` and `git mv .agents/skills/ship/scripts/{walk-staging.sh,walk-runner.mjs} .agents/skills/walk/scripts/` — move, don't copy, so history follows. Verify `.agents/skills/ship/scripts/` is empty afterwards and remove it if so.
- [x] 1.2 Write `.agents/skills/walk/SKILL.md` frontmatter per [adding a skill](../../../wiki/development/adding-a-skill.md): `name: walk`, `user-invocable: true`, and a trigger-rich `description` packed with the phrasings that should fire it (walk the app, see it working in a browser, screenshot the change, staging walkthrough, check it looks right, browser evidence on the PR). Keep it under 1,536 characters — the skill-listing cap truncates silently past that.
- [x] 1.3 Write the `SKILL.md` runbook body: Step 1 invoke `/save` (per design.md decision 1 — state *why* the ordering exists, that a hand-built URL can answer 200 for a commit that was never deployed); Step 2 `walk-staging.sh preflight`; Step 3 follow `references/walkthrough.md`; Step 4 post evidence on every verdict; Step 5 reset staging on `FAILURE` only, then stop; Step 6 report. Open with the loop position and what `/walk` is *not* (not a gate, not a test suite).
- [x] 1.4 Write the verdict table as **report outcomes, not merge outcomes** — five verdicts, none of which blocks anything (per `staging-walkthrough` → "Verdicts report, and gate nothing"). Keep the `UNKNOWN` ≠ `NONE` paragraph, reframed as reporting honesty with the Access-challenge case named.
- [x] 1.5 Carry the surviving hard rules into `SKILL.md`: never write inside the repo, never install Playwright or a browser, reset staging only after a failed walk, cleanup on every exit path including `UNKNOWN` and when asking the user. Drop the merge-related rules entirely.
- [x] 1.6 Fix the moved `references/walkthrough.md` for its new home: retarget `$ROOT/.claude/skills/ship/scripts/…` → `…/walk/scripts/…` (three occurrences: run, publish, cleanup), the `SKILL.md` anchor link in section d, and the "Step 4/4.5/5" references in the § f prose and the "why the walk sits after CI" note. Rewrite § e (recover from a failure) as reset-then-stop with no retry budget.
- [x] 1.7 Change § f to post the comment unconditionally and title it by verdict, and update the comment template so a `FAILURE`/`UNKNOWN` comment reads correctly (not just the ✅ example). Note that repeated invocations append rather than replace.
- [x] 1.8 Confirm `scripts/walk-staging.sh` and `walk-runner.mjs` need no content change — they take `RUN_DIR`/`APP_DIR`/`URL` as arguments and hold no path back to `ship/`. Grep both for `ship` and fix anything found (e.g. a usage string or comment).

## 2. Strip the walkthrough from /ship

- [x] 2.1 Delete Step 4.5 in `.agents/skills/ship/SKILL.md` — the preflight block, the `### Verdicts` table, the `UNKNOWN` ≠ `NONE` paragraph, and the on-FAILURE/on-SUCCESS paragraphs.
- [x] 2.2 Rewrite the `description` frontmatter: it currently advertises walking scenarios with Playwright, screenshots, video, and a PR comment. Remove all of it; `/ship` is PR + CI + squash-merge + archive.
- [x] 2.3 Update the intro: the gate-ladder sentence (line ~13) loses the walkthrough rung and its link; Step 4's hand-off "→ Step 4.5" becomes "→ Step 5".
- [x] 2.4 Remove the walkthrough bullet from Step 6 (report) and the three walkthrough entries from `## Hard rules` (the opt-in-is-detected rule, the never-merge-on-UNKNOWN/TIMEOUT rule, the never-install/never-write rule, and the reset-staging rule). Keep the merge-safety and never-build-locally rules.
- [x] 2.5 Renumber remaining steps so they run 1–5 with no gap, and check every internal cross-reference and anchor link still resolves.

## 3. Wiki

- [x] 3.1 `git mv wiki/stack/ship-walkthrough.md wiki/stack/staging-walkthrough.md`, then rewrite it around `/walk`: the opener stops calling it "an opt-in gate on `/ship`"; the "What actually happens" diagram drops the Step 4/4.5/5 frame; the five-verdict table's third column becomes what each verdict *reports* rather than what it does to the merge; "When a walk fails" becomes reset-then-stop with no shared cap.
- [x] 3.2 In the same page's "What this deliberately isn't", rewrite the **"Not part of `/save`"** entry — the walk now *begins* with `/save`. Per design.md decision 1, record the distinction rather than deleting it: walking *automatically* on every push is still declined (N runs per change, reseeds firing while the surface changes); `/walk` invoking `/save` as its first step is a different thing. Add the newly declined option: automatic walking on `/ship`.
- [x] 3.3 Update `wiki/development/the-change-loop.md` § The gate: the ladder becomes CI-when-present → merge, the walkthrough paragraph goes, and the "unverifiable gate" paragraph keeps only its CI meaning. This file is the **owner** of the doctrine (`delivery-gate`), so it must state the new ladder exactly once and every other surface links here.
- [x] 3.4 Add `/walk` to the change-loop page's verb list, positioned as an on-demand verb outside the `/explore → … → /ship` line rather than a step in it.
- [x] 3.5 Update `wiki/stack/README.md` (the hub entry: new filename, new description — no longer "`/ship` walks", no longer a gate) and `wiki/stack/d1-pipeline.md` line ~94 (`/ship`'s staging walkthrough → `/walk`, and the renamed link target).
- [x] 3.6 Grep `wiki/` and `.agents/` for `ship-walkthrough`, `Step 4.5`, and "walkthrough" and fix every live reference. Leave `openspec/changes/archive/**` and existing `CHANGELOG.md` entries alone — they are historical record.

## 4. Payload plumbing

- [x] 4.1 Update `.agents/skills/wong-sync/references/payload-manifest.md`: the workflow-skills line lists `ship/references/walkthrough.md and ship/scripts/` — move those to `walk/`. Decide and state which list `walk` belongs in — it is **stack-pack-gated**, so it goes in the opt-in stack pack section next to `wong-cloudflare`, not the always-copied workflow-skills list.
- [x] 4.2 In the same file, update the `wiki/stack/` section file list for the renamed `staging-walkthrough.md`.
- [x] 4.3 Update `.agents/skills/wong-setup/SKILL.md` (~line 101): the sentence describing what to tell a fresh repo says "`/ship` can walk through the app in a browser before it merges". Retarget to `/walk` and the renamed page, and keep the guidance not to offer it during fresh setup.
- [x] 4.4 Check `CLAUDE.md`'s `WONG-STACK` block for any walkthrough or gate-ladder line needing the same edit, and add `/walk` to its verb list if the block enumerates verbs.

## 5. Release

- [x] 5.1 Bump `VERSION` 8.5.0 → **9.0.0** (major — an adopted repo's `/ship` silently stops gating, per design.md decision 7).
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry, leading with the breaking removal in the terms an affected reader needs: `/ship` no longer walks, the gate ladder lost a rung, and the walk is now `/walk`. Cover the rename of both the capability and the runbook page, and the every-verdict comment.
- [x] 5.3 Verify the whole change: `openspec validate --changes extract-walk-skill`, then re-grep for `Step 4.5` and `ship-walkthrough` outside archives to confirm nothing was missed.
