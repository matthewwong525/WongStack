# Tasks

## 1. Private-name check

- [x] 1.1 In `scripts/tests/private-names.test.mjs`, narrow `PRIVATE` to `/claymooapp|wongos|wongstack-cloud/i` and add the allowed `README.md` company-name sample to the matcher test, per design.md; `node --test scripts/tests/private-names.test.mjs` passes

## 2. README and agent description

- [x] 2.1 Rewrite the README's lead line, "What you can ask", and "What you get" to design.md's copy table, word for word; the rest of the README is unchanged, and the private-name test from 1.1 still passes
- [x] 2.2 Change the "What this is" sentence in `AGENTS.md` per design.md, leaving the `WONG-STACK` block byte-for-byte the same (`git diff AGENTS.md` touches only that paragraph)

## 3. Release

- [x] 3.1 Add a `## Next (patch) — The README leads with how Claymoo runs on WongStack` entry at the top of `CHANGELOG.md`'s entries, and run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; all pass
- [ ] 3.2 Run `/save`: CI passes, and the README's first screen on GitHub shows the Claymoo lead and the five business asks
