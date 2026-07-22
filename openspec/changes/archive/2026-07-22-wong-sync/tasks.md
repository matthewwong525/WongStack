# wong-sync — tasks

## 1. The wong-sync skill

- [x] 1.1 Create `.claude/skills/wong-sync/SKILL.md`: frontmatter (name, description, user-invocable), the one-pass flow — Step 0 resolve target + manifest + refuse-in-source; Step 1 clone management (XDG cache path, hint semantics, fetch + clean reset with dirty-clone guard); Step 2 three-way classification table with two-way fallback when `commit` is absent; Step 3 pull leg (apply upstream updates to the working tree, batch-approvable, no target git, hand off to `/save`); Step 4 contribute leg (curation bar, default-skip, generality rationales); Step 5 clone-side git (branch `wong-sync/<repo>-<date>`, single commit with files + VERSION bump + CHANGELOG entry, push, `gh pr create`, reset clone clean); Step 6 fork-aware PR (permission check, `gh repo fork` once, record `upstream.fork`); Step 7 rewrite manifest last (v2 schema, lazy migration); degraded offline path; hard rules (no target git, manifest-only reads, opt-in contributions)
- [x] 1.2 Create `.claude/skills/wong-sync/references/payload-manifest.md` — the single payload list (workflow skills + `wong-sync`, docs convention pages, CLAUDE.md WONG-STACK block; exclusions: `install-wong-stack`, `openspec-*`, VERSION, CHANGELOG) with the renamed-skill mapping rule

## 2. Shrink the installer

- [x] 2.1 Rewrite `install-wong-stack/SKILL.md` to fresh-install only: remove Step 3U; manifest-exists path ensures `wong-sync` is installed then redirects to `/wong-sync`; reference the payload manifest in `wong-sync/references/` instead of an inline list; add `wong-sync` to the copied skills and the Step 4 manifest `components.skills`; write v2 manifest fields (`commit` from `$WS` HEAD, `upstream.repo`/`clone`) at install time
- [x] 2.2 Extend the installer's legacy-traces step: offer to remove installed/symlinked `contribute-wong-stack` (superseded by `/wong-sync`); update the Step 0 symlink offer to install-wong-stack only

## 3. Retire contribute-wong-stack

- [x] 3.1 Delete `.claude/skills/contribute-wong-stack/`

## 4. Doctrine + docs

- [x] 4.1 Update the CLAUDE.md WONG-STACK block: rescope the git rule ("no git in the target; wong-sync owns git in the clone"), swap `/contribute-wong-stack` references for `/wong-sync`, update the skill roster; mirror the same edits in this repo's top-level CLAUDE.md sections that name the round trip
- [x] 4.2 Update README.md's round-trip story (install once → `/wong-sync` forever) and any wiki pages that reference `/contribute-wong-stack` or the installer's update mode

## 5. Release

- [x] 5.1 Bump VERSION to 5.0.0 and add the CHANGELOG entry (wong-sync introduced; installer fresh-only; contribute-wong-stack retired; manifest schema v2)
- [x] 5.2 Read the final SKILL.md set end-to-end for consistency: payload list matches installer copy loop, manifest fields named identically everywhere, no surviving reference to the retired skill or update mode
