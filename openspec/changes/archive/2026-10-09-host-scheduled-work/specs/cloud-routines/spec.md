## REMOVED Requirements

### Requirement: Create a routine from a plain request

**Reason:** Host scheduling replaces cloud-only creation and the old skill name.

**Migration:** Use `/schedule` for new work; preserve and explicitly migrate existing jobs.

### Requirement: Fixed steps become a script, not a routine

**Reason:** The host-schedules capability explicitly prefers deterministic jobs before assistant sessions; classification is no longer tied to installing the cloud runner.

**Migration:** Keep fixed app jobs on their normal code delivery path; use the host scheduling plan for assistant work.

### Requirement: The first routine installs the cloud pieces

**Reason:** New scheduling installs no cloud runner.

**Migration:** Existing deployed resources remain until explicitly requested teardown; new work uses the host.

### Requirement: A run happens in a short-lived cloud computer

**Reason:** Execution location and uptime now depend on the verified host.

**Migration:** Show the new destination and its uptime needs before explicitly moving a job.

### Requirement: The person picks the model, through Cloudflare by default

**Reason:** New runs inherit or select their host's available model settings.

**Migration:** Existing cloud jobs keep their current model; new host jobs do not invoke cloud model setup.

### Requirement: Any pasted model key is recognised and tested

**Reason:** New scheduling uses the host's authentication and connections.

**Migration:** Preserve installed legacy secrets until the person requests teardown; never expose or copy them into a scheduled plan.

### Requirement: A run gets only what it needs

**Reason:** Verified host execution context and scoped schedule authority replace the cloud runner's fixed environment.

**Migration:** Check future-session access and authorize only the schedule's required tools before activating the host job.

### Requirement: A run never waits for an answer

**Reason:** A follow-up now persists a question and waits for the user when required.

**Migration:** Pending user decisions block their dependent action; elapsed time is not consent.

### Requirement: Manage this install's routines

**Reason:** The schedule skill manages typed repo records and native jobs instead of one cloud list.

**Migration:** Retain narrow legacy management for installed cloud jobs until explicitly moved or removed.

### Requirement: When the cloud cannot be reached, nothing changes

**Reason:** Read-back, uncertainty handling, and host capability reporting replace cloud-specific failure handling.

**Migration:** Preserve existing bindings on failures and verify uncertain mutations before retrying.

### Requirement: Teardown removes the routine pieces

**Reason:** New schedules add none of these resources; legacy teardown remains an explicit migration action.

**Migration:** Keep the legacy teardown route for exactly the installed resources the person requests removing.

### Requirement: Paseo schedules are left alone

**Reason:** Host-schedules extends the preservation promise to every existing host and cloud job.

**Migration:** Adopt by verified identity or explicitly move a job; pause the original before a replacement acts.

### Requirement: A renamed skill's old name still runs

**Reason:** New host runs use the published instructions and current entry point rather than the removed cloud bootstrap.

**Migration:** Preserve legacy deployed behavior and resolve older improve/dream prompts in migration or the compatible host run path; identify retired scheduling prompts that need explicit repair.
