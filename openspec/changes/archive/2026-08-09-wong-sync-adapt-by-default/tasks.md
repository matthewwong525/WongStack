## 1. Verdict bias — .claude/skills/wong-sync/references/adapt.md

- [x] 1.1 Add the adopt-when-in-doubt tie-break to "The gap analysis": when the evidence supports both `adopt` and another verdict, the verdict is `adopt`; state the asymmetry (an `adopt` is reviewed downstream, every other verdict is effectively final until someone reads the record).
- [x] 1.2 Tighten `divergent` in the verdict table and prose: it requires a named, deliberate local alternative; the reason line must name the local mechanism; an unattributable difference is `adopt`, not `divergent`.
- [x] 1.3 Replace "The concreteness bar" demotion: a graft that cannot be described concretely becomes an `adopt` whose task says to shape it with the repo's own `/plan`; narrow `not-applicable` to unmet `assumes` only, everywhere it is defined (table, prose, and the "Check `assumes`" paragraph).
- [x] 1.4 Rescope the "stale-but-unmodified file is an ordinary `adopt`" paragraph to stale files that are **not** provably unmodified (fork or edited lineage), noting provably unmodified ones are updated directly at Step 2.

## 2. Changelog accountability — adapt.md + SKILL.md

- [x] 2.1 In SKILL.md Step 1, change the changelog walk's framing from "context for the report, not a decision" to input for Step 3's per-entry accounting.
- [x] 2.2 In adapt.md, add the accounting rule: every CHANGELOG.md entry between `BASE` and the clone's current version maps to at least one line — reflected here (evidence named) / adopt (capability id named) / updated directly (file named) / outside payload scope; seed manifests skip it.
- [x] 2.3 Add the per-entry accounting to adapt.md's "The report" section and SKILL.md's Step 5, so an unaccounted entry is a visible gap in the run's own output.

## 3. Update-if-untouched — .claude/skills/wong-sync/SKILL.md

- [x] 3.1 In Step 2, replace the two-row table (absent/present) with three cases: absent → copy verbatim; present and provably unmodified but stale → update to upstream's current version; present otherwise → untouched, hand to Step 3. Specify the proof: local `git hash-object` blob equals a blob of that path in the clone's default-branch history (`git -C "$WS" rev-list "$DEFAULT" -- <path>` walked with `rev-parse <commit>:<path>`); lookup under the upstream path via the manifest's skills mapping, write to the local path; the `WONG-STACK` block is excluded; opt-in gates unchanged.
- [x] 3.2 Update the "Never overwrite" hard rule (and the matching bullet in the skill opener and Step 2 prose) to the authorship scoping: never overwrite what a human or another tool authored; a provably unmodified payload file carries no local authorship. Any one-byte difference defeats the proof.
- [x] 3.3 Add the **Updated** list to Step 5's report — one line per directly updated file with its version span, distinct from **Copied**.
- [x] 3.4 Reconcile the skill `description:` frontmatter and CLAUDE.md's `WONG-STACK`-relevant prose ("it never modifies a file that already exists" → the authorship-scoped wording) wherever the old absolute claim appears in the payload (SKILL.md, README/wiki mentions if any — grep for "never modifies a file").

## 4. Release

- [x] 4.1 Add the newest-first CHANGELOG.md entry describing the three behaviors (adopt-when-in-doubt bias, changelog accountability, update-if-untouched) and bump VERSION (minor).
- [x] 4.2 Run `node scripts/check-payload-links.mjs` and fix anything dead.
