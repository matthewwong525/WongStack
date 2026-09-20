## REMOVED Requirements

### Requirement: The generated OpenSpec skills are hidden from the user's command menu

**Reason:** WongStack now uses the CLI directly and no longer installs or invokes generated agent workflows.
**Migration:** Use the existing public WongStack verbs. Retire only known unmodified generated integration files under the migration contract in `openspec-cli-workflow`; preserve custom work.

### Requirement: A script applies the visibility key and is safe to re-run

**Reason:** No generated WongStack workflow layer remains to patch.
**Migration:** Remove the visibility-patch script and its invocations in the same change that removes generated-skill handoffs.

### Requirement: Every skill that regenerates the layer re-applies the patch

**Reason:** Setup initializes without agent generation and routine updates check CLI compatibility instead of regenerating instructions.
**Migration:** Replace regeneration and re-hide steps in setup, sync, and dependency maintenance with the direct CLI lifecycle. Preserve independently installed target integrations.
