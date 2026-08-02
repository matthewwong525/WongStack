## REMOVED Requirements

The `ship-walkthrough` capability is removed in full. Its name asserts the coupling to `/ship` that this change deletes, and nearly every requirement it holds is stated in terms of a merge that `/walk` does not perform. It is replaced by `staging-walkthrough`, which carries forward every property that was about the trustworthiness of the evidence and drops every property that existed only because a merge was waiting on the verdict.

**Reason** (applies to all requirements below): the walkthrough is no longer a step of `/ship` or a gate on the merge. It is reached only by invoking `/walk`.

**Migration** (applies to all requirements below): see the `staging-walkthrough` capability. Repos that adopted the walkthrough keep the same `playwright` opt-in signal, the same scouting and grading discipline, and the same evidence comment; they must now invoke `/walk` rather than receive the walk as part of `/ship`.

### Requirement: Adoption is detected from state, never configured

**Reason**: Restated under `staging-walkthrough` with `/ship` replaced by `/walk` and the stack-pack gate made explicit.
**Migration**: `playwright` in the app's `devDependencies` remains the entire opt-in; no repo action is required.

### Requirement: The walkthrough runs on /ship only, between CI-green and the merge

**Reason**: The positioning this requirement fixes no longer exists — there is no `/ship` step to sit between CI-green and the merge.
**Migration**: Replaced by "The walkthrough is a user-invoked verb" and "/walk begins by invoking /save", which preserve the load-bearing part of the ordering (the preview URL must exist for this commit) while removing the merge-time positioning.

### Requirement: Scenarios become journeys, scoped to the change

**Reason**: Carried over unchanged in substance under the new capability name.
**Migration**: None — behavior is identical.

### Requirement: The walk is throwaway and saves nothing

**Reason**: Carried over unchanged in substance, with the cleanup-on-every-exit-path rule promoted from the skill's hard rules into the requirement.
**Migration**: None — behavior is identical.

### Requirement: The verdict is graded against the written expectation

**Reason**: Carried over unchanged in substance under the new capability name.
**Migration**: None — behavior is identical.

### Requirement: The walkthrough gates the merge, with five verdicts

**Reason**: No verdict gates anything now. `/walk` performs no merge and no other skill consults its result.
**Migration**: Replaced by "Verdicts report, and gate nothing". The five verdict names survive, and the `UNKNOWN` ≠ `NONE` distinction survives as a rule about honest reporting rather than about merging.

### Requirement: Failure resets staging, then re-walks under the existing cap

**Reason**: The shared cap of 3 existed to bound an automatic fix-and-repush loop inside a merge gate. A user-invoked verb has no such loop to bound.
**Migration**: Replaced by "A failed walk resets staging, then stops". The reset survives with its rationale; it now runs at the end of a failed walk rather than before an automatic retry, giving the same guarantee that a walk begins from the seeded fixture. The user re-invokes `/walk` after fixing.

### Requirement: Evidence is reported as a PR comment that degrades honestly

**Reason**: The comment was posted only on `SUCCESS`, because a failure blocked the merge and was fixed before anything was published.
**Migration**: Replaced by "Evidence is posted on every verdict and degrades honestly", which posts on every verdict and appends one comment per invocation. The honest-degradation rules for missing media hosts and for video links are unchanged.

### Requirement: Adoption is recommended and documented, never forced

**Reason**: The runbook it mandates is rewritten around `/walk` and renamed from `wiki/stack/ship-walkthrough.md` to `wiki/stack/staging-walkthrough.md`.
**Migration**: Restated under `staging-walkthrough` with the declined-options list extended to record why the walk is not automatic, and to distinguish that from `/walk`'s own `/save`-first step.
