## 1. Survey scripts and coverage

- [x] 1.1 Adapt a dependency-free tracked-file survey under `.agents/skills/improve/scripts/`, with literal scope handling, safe in-repo aliases, bounded output, explicit gaps, and no secret snippets. Follow [coverage](review.html#/coverage).
- [x] 1.2 Implement testable maintained-area discovery, UTC weekly rotation, recent-range baseline selection, and documented fallbacks. Follow [coverage](review.html#/coverage).
- [x] 1.3 Add fixture tests under `scripts/tests/` for docs-only and mixed-language repos, symlinks and escaped scopes, partial reads, bounded output, read-only behavior, week changes, changed/empty area lists, narrowed scope, and missing/non-ancestor baselines. Keep them in the existing payload CI test command.

## 2. Skill and investigation guidance

- [x] 2.1 Add `/improve [area]` and `--audit-only`, target discovery, clean/current checkout and overlap checks, evidence-based selection, no-change and blocked outcomes, and the one-intent `/ship` handoff. Follow [delivery](review.html#/delivery).
- [x] 2.2 Add general security and consolidation references, including intended behavior, actual callers, trust boundaries, source ownership, verification probes, and limitations. Remove ClaymooApp-specific assumptions.
- [x] 2.3 Define interactive candidate questions, explicit unattended context, maintenance revision/area records, staged continuation and terminal markers, and reporting. Preserve normal workflow authority and gates. Follow [execution](review.html#/execution).
- [x] 2.4 Review the skill against every specification scenario with concrete examples. Cover unanswered questions, audit-only dirty trees, unavailable overlap/freshness context, protected security patterns, no eligible work, staged completion, and failed delivery. Record any unmet scenario and resolve it before completion.

## 3. Payload and documentation

- [x] 3.1 Register the skill directory in the core payload inventory and update applicable installer/discovery surfaces. Preserve target-owned skill collision handling. Follow [payload](review.html#/payload).
- [x] 3.2 Add usage and external scheduling guidance to the owning workflow documentation and its discovery links. Update README and the generic agent-instruction block; keep unrelated wiki work out of scope. Follow [payload](review.html#/payload).
- [x] 3.3 Bump the current release to the next minor version and add a newest-first changelog entry. Follow [payload](review.html#/payload).

## 4. Release verification

- [x] 4.1 Run the required payload link and OpenSpec config release checks, validate this change strictly, and confirm the review page matches the final scope.
- [x] 4.2 Use `/save` to run the existing CI gate, including the new fixture coverage; resolve failures and record the result. This task supplies the completion checkpoint if it saves the final task state, per `/apply`.
