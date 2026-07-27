## 1. wait-for-checks.sh

- [x] 1.1 Rewrite the poll loop in `.agents/skills/save/scripts/wait-for-checks.sh` to fetch tab-delimited lines via `gh pr checks --json name,bucket,link --jq '.[] | "\(.bucket)\t\(.name)\t\(.link)"'`, per design.md Decision 1
- [x] 1.2 Replace the four `jq` filters with shell equivalents — pending count, fail/cancel selection, and the two detail-line printers — preserving the exact `RESULT:` lines and indented `  - name  link` / `  - name (still running)` output
- [x] 1.3 Update the no-checks guard to `-z "$LINES"` alone — dropping the `RC -ne 0` half, which was a second silent bug (`gh pr checks` exits 8 on pending / 1 on failure, so the old guard reported `NONE` for any live PR); see design.md "Correction found during implementation" — and confirm the header comment still describes the four results accurately
- [x] 1.4 Verify no `| jq` remains in the script and dry-run it in this repo (expect `RESULT: NONE` with no PR)

## 2. wong-sync Step 0

- [x] 2.1 Replace the `jq -r` bash block in `.agents/skills/wong-sync/SKILL.md` Step 0 with prose instructing the agent to read `.claude/.wong-stack.json` and note `commit`, `upstream.repo`, `upstream.fork`, `upstream.clone`, per design.md Decision 2
- [x] 2.2 State in that prose the default for `upstream.repo`, the `~` → `$HOME` expansion for `upstream.clone`, and that absent fields are absent (not empty strings) on older manifests
- [x] 2.3 Check the rest of `wong-sync/SKILL.md` — including Step 6's manifest write — for any other standalone `jq` and convert it the same way

## 3. wong-setup preflight

- [x] 3.1 Drop `jq?` from the GitHub-readiness item in `.agents/skills/wong-setup/SKILL.md` and state the required set as `git`, `gh` (installed + authed), a resolving `origin`, and `openspec`

## 4. Documentation

- [x] 4.1 Add a short "Required tools" note to `wiki/development/` recording the `git` / `gh` / `openspec` set and the rule that JSON goes through `gh --jq`, never a standalone `jq`; link it from `wiki/development/README.md`
- [x] 4.2 Sweep the whole payload for remaining standalone-`jq` references in prose (skills, wiki, CLAUDE.md, README.md) and fix any stragglers

## 5. Mirror and release

- [x] 5.1 ~~Apply every skill and script edit to the `.claude/skills/` mirror~~ — no-op: `.claude` is a committed symlink to `.agents`, so the trees are one tree; `diff -rq` confirmed empty
- [x] 5.2 Bump `VERSION` to 6.4.0 (payload behavior change, backwards compatible)
- [x] 5.3 Add a newest-first `CHANGELOG.md` entry covering the dependency removal and the `wait-for-checks.sh` silent-false-SUCCESS fix noted in design.md Risks
