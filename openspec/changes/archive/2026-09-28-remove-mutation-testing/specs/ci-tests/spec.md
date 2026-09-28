# Spec Delta

## REMOVED Requirements

### Requirement: Mutation results carry between runs
**Reason**: The scaffold no longer runs mutation testing, so there are no results to carry.
**Migration**: None. `/wong-sync` removes the restore and save steps; saved cache entries expire after 7 unused days.

### Requirement: A nightly run re-tests every mutant
**Reason**: The scaffold no longer runs mutation testing, so the nightly full run and its stop on `/ship` go with it.
**Migration**: None. `/wong-sync` removes the `schedule` trigger from `test.yml`.
