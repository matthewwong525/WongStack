## REMOVED Requirements

### Requirement: A command that fronts a skill is a pointer to it

**Reason:** The obsolete raw OpenSpec command and generated-skill delegation surface is retired. Public WongStack verbs now use the CLI directly.
**Migration:** Remove references that promise vendored `/opsx:*` commands or generated workflow handoffs. Retain the existing general rule that each payload fact has one canonical owner.
