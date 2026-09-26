## REMOVED Requirements

### Requirement: Migration preserves local ownership

**Reason**: WongStack starts fresh with 19.0.0. No supported install carries the generated `openspec-*` layer from before 16.0.0, so the retire script and its hash list are deleted.
**Migration**: None. An install with the generated layer is not supported. Set it up again in an empty folder.
