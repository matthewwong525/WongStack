## 1. Compute the closure first

- [x] 1.1 Read `wiki/development/the-change-loop.md`, `wiki/agent-knowledge-center.md`, and `wiki/development/required-tools.md` and list every outbound link each contains
- [x] 1.2 For each link, decide: add that page to the payload too, generalize the reference, or drop it — repeat until the set is closed
- [x] 1.3 Flag any page whose content is WongStack-specific enough that shipping it verbatim would confuse a target, and note what needs generalizing
- [x] 1.4 If the closure grows large, stop and raise it — that is a payload/local boundary question, not this change

## 2. Payload manifest

- [x] 2.1 Add `development/the-change-loop.md`, `agent-knowledge-center.md`, and `development/required-tools.md` to the docs list in `.claude/skills/wong-sync/references/payload-manifest.md`
- [x] 2.2 Add anything else the closure requires
- [x] 2.3 State the rule alongside the list: a page the payload cites as an owner is a page the payload ships

## 3. Generalize what ships

- [x] 3.1 Fix `wiki/wiki-style.md`'s two dead links (`../marketing/find-inspiration.md`, `weekly-cadence.md`) by generalizing or dropping the examples — do not ship WongStack's marketing section to targets
- [x] 3.2 Apply the generalizations task 1.3 identified to the three new pages
- [x] 3.3 Re-check that none of the newly shipping pages introduces a fresh link outside the payload

## 4. The release check

- [x] 4.1 Write the fresh-install link check: install the payload into a scratch repo and resolve every internal link in every copied file, reporting any that dangle
- [x] 4.2 Record it as part of releasing a payload change, alongside the `VERSION` and `CHANGELOG.md` steps
- [x] 4.3 State plainly why the source repo cannot be the test: every one of these links resolves here

## 5. Verify

- [x] 5.1 Fresh-install into an empty repo and confirm zero dangling links from `CLAUDE.md`, the skills, and the wiki pages
- [x] 5.2 Confirm the nine skills' `../../../wiki/development/the-change-loop.md` references resolve
- [x] 5.3 Confirm `/wong-cloudflare`'s two `required-tools.md` references resolve
- [x] 5.4 Confirm a target's own wiki content is untouched

## 6. Release

- [x] 6.1 Bump `VERSION` (minor)
- [x] 6.2 Add the `CHANGELOG.md` entry, noting that existing installs receive the missing pages automatically on their next `/wong-sync` (copy-if-absent, no conflict) while the `wiki-style.md` correction arrives as an adapt-step proposal
