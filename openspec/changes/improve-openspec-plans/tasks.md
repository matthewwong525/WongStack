# Tasks: improve-openspec-plans

## 1. New reference — the OpenSpec plan format

- [x] 1.1 Write `.claude/skills/improve/references/openspec-plans.md`: detection rule (`openspec/changes/` at repo root), the plan-template → OpenSpec artifact mapping (Why → proposal; steps/verification/scope/STOP/done criteria/planned-at stamp → tasks.md; decisions/risks → design.md when warranted; delta specs only for spec-level behavior change), change naming (kebab-case slug = branch name), dependency ordering via a "Depends on" line in proposal.md, no persistent rejection index (report rejections in session output; dedup via `openspec list` + archive), `openspec validate --change <slug>` when the CLI is available, and per-variant adaptations (`execute` inlines artifacts + verdicts update tasks.md checkboxes, `reconcile` reads `openspec list` + tasks.md, `review-plan` takes a slug, `--issues` publishes proposal + tasks as the body, `/continue` → `/save` → `/ship` as the recommended path)

## 2. SKILL.md deltas (keep the shadcn core minimal)

- [x] 2.1 Hard Rule 1: widen the write boundary — in OpenSpec mode the only writable location is `openspec/changes/` (excluding `archive/`); `plans/`/`advisor-plans/` otherwise
- [x] 2.2 Phase 4: add the OpenSpec-mode paragraph — detect `openspec/changes/`, read `references/openspec-plans.md` before writing the first change, write change folders instead of `plans/NNN-*.md`; reconcile against existing active + archived changes instead of `plans/README.md`
- [x] 2.3 Invocation variants: add OpenSpec-mode notes to `execute`, `reconcile`, `review-plan`, `--issues`, and the `docs` variant (docs findings become changes applied via `/continue` → `/save` → `/ship`)
- [x] 2.4 Frontmatter description: mention that plans land as OpenSpec changes when the target repo uses OpenSpec

## 3. Docs audit playbook

- [x] 3.1 Rewrite `docs-audit-playbook.md` §"Planning & applying docs fixes" for both modes, and drop the stale pre-3.0 wording (no more "handoff issue" / "summary issue"; `/save` = sync + push + preview, `/ship` = merge + archive)

## 4. Release bookkeeping

- [x] 4.1 Add a newest-first `CHANGELOG.md` entry (3.2.0 — `/improve` plans are OpenSpec changes in OpenSpec repos)
- [x] 4.2 Bump `VERSION` to 3.2.0
