## 1. Write the recommendation doc

- [ ] 1.1 Create `docs/recommended-stack.md` per the progressive-disclosure rulebook (`docs/wiki-style.md` + `docs/voice.md`): a topic title, a strong opener that states up front it's a recommendation and not a requirement
- [ ] 1.2 Write the **Core stack** section — React + Vite SPA on Cloudflare Workers (D1/R2); why the combo fits AI-driven dev (merge = deploy, single runtime, cheap per-branch previews), kept principle-led over version-pinned
- [ ] 1.3 Write the **Paseo** section — the open-source tool for driving Claude Code across parallel git-worktree agents; how it maps onto WongStack's branch-per-change loop (isolated worktree per agent, `paseo.json` worktree setup)
- [ ] 1.4 Write the **Slash-skill tips** section — day-to-day guidance on the WongStack verbs (when to reach for each, how they chain, common gotchas); reference the verbs as they actually ship at apply time (six-verb loop incl. `/apply` if `evolve-change-loop` has landed, else five)

## 2. Wire it into the wiki + release

- [ ] 2.1 Link the doc from `docs/README.md` as an optional appendix, visually separate from the core "Where to find things" process list
- [ ] 2.2 Add cross-links: from `docs/development/the-change-loop.md` (sideways to the tips) and, if `evolve-change-loop` landed, to the secrets-convention page
- [ ] 2.3 Add a `CHANGELOG.md` entry and bump `VERSION` (minor — additive doc)
- [ ] 2.4 Verify: doc reads as optional, all links resolve, verbs named match the shipped skills, no core skill/installer/doc now implies a required stack
