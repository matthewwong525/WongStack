# Spec Delta

## REMOVED Requirements

### Requirement: Create a routine from a plain request
**Reason**: Routines no longer run through Paseo.
**Migration**: `cloud-routines` keeps this promise under the same name.

### Requirement: Runs start in their own worktree
**Reason**: A run now happens in a short-lived cloud computer, not a Paseo worktree, and no agent is kept for a pending question.
**Migration**: `cloud-routines`: *A run happens in a short-lived cloud computer* and *A run never waits for an answer*.

### Requirement: Manage this repo's routines
**Reason**: Routines are listed and managed in the person's Cloudflare account.
**Migration**: `cloud-routines`: *Manage this install's routines*. Schedules made in Paseo stay there; delete them in the Paseo app.

### Requirement: No Paseo, no change
**Reason**: `/routine` no longer needs Paseo.
**Migration**: `cloud-routines`: *When the cloud cannot be reached, nothing changes*.
