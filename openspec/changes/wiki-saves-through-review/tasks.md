# Tasks

## 1. Save and ship skills

- [x] 1.1 In `.agents/skills/save/SKILL.md`, delete the `wiki/` routing row, the §1 allowlist paragraph, and the §5 direct-save report line; drop "Wiki-only saves go to the default branch" from the description; add to the normal route that a save with no change gets a plain PR body with a `/ship` footer
- [x] 1.2 Rename `references/prose-save.md` to `references/facts-save.md`, keep only the facts-only save, and update every link to it (`save/SKILL.md`, `new-plan.md`, any other)
- [x] 1.3 In `.agents/skills/ship/SKILL.md` Step 2, replace the no-change stop with `/save`'s authoring test: code or a plan for code stops; otherwise skip archive and distillation and continue to Step 3

## 2. CI

- [x] 2.1 Add the `docs_only` output to `.github/scripts/app-untouched.sh` (header, every `answer`, false when failing safe) and cover it in `scripts/tests/app-untouched.test.mjs`: wiki only, openspec only, wiki plus `.agents/` Markdown, wiki plus a root `.md`, no base, empty diff
- [x] 2.2 Check every caller that parses `app-untouched.sh` output still works with a fifth line
- [x] 2.3 Gate `.github/workflows/payload.yml`: `fetch-depth: 0`, the scope step, skip lint, shellcheck, and the c8 suite when `docs_only` is true, run `private-names.test.mjs` alone then, keep release checks, write a one-line summary, and update its header comment

## 3. Docs and records

- [x] 3.1 Delete *The prose allowlist* from `wiki/development/the-change-loop.md`; add one sentence to *The gate* that every file edit takes it and a change is needed for code only; repoint in-page references
- [x] 3.2 Delete the prose line from the `WONG-STACK` block in `AGENTS.md`; update the *Save* term in `wiki/README.md` and *Write it when you learn it* in `wiki/wiki-style.md` so neither describes a wiki route
- [x] 3.3 Confirm `.agents/rules/payload.md` still says a payload wiki page edit is a release, without reference to the allowlist
- [x] 3.4 Update the Purpose line of `openspec/specs/delivery-gate/spec.md` to drop "Wiki-only prose goes straight to the default branch"
- [x] 3.5 Add `#the-prose-allowlist` and `prose-save.md` to `scripts/retired-names.json`, and search for any other "prose allowlist", "prose route", or "wiki-only" wording outside history
- [x] 3.6 Bump `VERSION` to 26.0.0 and add a `CHANGELOG.md` entry telling installed repos that wiki edits now open a pull request like any save
- [x] 3.7 Record a memory fact that this supersedes the 2026-07-30 prose-straight-to-main feedback

## 4. Verify

- [x] 4.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict --no-interactive`, and `node scripts/measure-context.mjs --check`
- [x] 4.2 `/save`, and confirm in CI that the payload and test checks pass on this branch
