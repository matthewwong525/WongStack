## 1. Gate the contribute leg in `wong-sync`

- [x] 1.1 Add the input contract to `.claude/skills/wong-sync/SKILL.md`: bare `/wong-sync` = pull-only; `/wong-sync contribute` = pull, then the contribute leg. State that an explicit contribute run **still pulls first** (the ordering is a correctness property, per design Decision 2).
- [x] 1.2 Gate Step 4 (curate) and Step 5 (branch + ritual + PR) on the `contribute` argument — on a bare run, skip from Step 3 straight to Step 6. Leave both steps' internals unchanged.
- [x] 1.3 Update the Step 2 classification table: a local-only change is still classified, but on a bare run it's silent (no candidate surfaced) rather than queued for Step 4.
- [x] 1.4 Update Step 7's report: on a bare run report pulled/conflicts/manifest only, and close with one line naming `/wong-sync contribute` as the way to send improvements upstream (no prompt, no decision).
- [x] 1.5 Rewrite the skill's frontmatter `description` and its opener + step diagram so neither describes a plain sync as contributing back.

## 2. The contributing page (synced to targets)

- [x] 2.1 Write the contributing page at the wiki root per `wiki/wiki-style.md` + `wiki/voice.md`: what `/wong-sync contribute` does, the generality bar ("does this belong in every WongStack repo?"), opt-in per file with skip as default, and that the skill opens the upstream PR itself (fork-aware, VERSION + CHANGELOG ritual). Link it up/down/sideways.
- [x] 2.2 Add the page to the **synced docs** list in `.claude/skills/wong-sync/references/payload-manifest.md` — alongside `wiki-style.md`, `voice.md`, `development/secrets.md`, `ux-principles.md` — so target repos receive it (design Decision 3; this is what replaces the prompt's discovery role).
- [x] 2.3 Link the page from `wiki/README.md` (and `wiki/development/README.md` if it reads naturally there) so it isn't orphaned.

## 3. Reword the round-trip framing

- [x] 3.1 `CLAUDE.md` — the "What this is" sentence ("runs the round trip: pull updates down, contribute improvements back up") and the `WONG-STACK` block's `/wong-sync` bullet ("runs the round trip in one pass … then offers your genuinely-local payload improvements back upstream"). Frame as: pulls updates; contributing is `/wong-sync contribute`.
- [x] 3.2 `README.md` — the skill table row for `/wong-sync`.
- [x] 3.3 `wiki/development/README.md` — the `/wong-sync` description in the payload/processes prose.
- [x] 3.4 `wiki/development/required-tools.md` — the `gh` row cites "the `/wong-sync` contribution leg"; reword so it reads as the explicit action (`gh` stays required regardless — design Decision 5).
- [x] 3.5 `.claude/skills/wong-setup/SKILL.md` — the installed-repo hand-off line ("run `/wong-sync` to pull updates and contribute improvements back") → pull updates only.

## 4. Release + verify

- [x] 4.1 `CHANGELOG.md` entry + `VERSION` bump (minor — a skill's default behavior changes; additive doc).
- [x] 4.2 Verify: a bare `/wong-sync` run surfaces no contribution prompt anywhere in the runbook; `/wong-sync contribute` still pulls before curating; the contributing page is in the manifest's synced docs and linked from the wiki; **no payload prose describes a plain sync as contributing** (sweep `README.md`, `CLAUDE.md`, `wiki/`, both skills); `openspec validate wong-sync-pull-only` passes.
