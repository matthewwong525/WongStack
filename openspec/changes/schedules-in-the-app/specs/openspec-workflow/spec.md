## REMOVED Requirements

### Requirement: Published scheduled goals remain open

**Reason**: A finite goal is now a schedule with an end, kept in the company app; no OpenSpec record holds it.
**Migration**: "One-time recurring and goal-based tasks have distinct endings" and "Every schedule lives in the company app" in `host-schedules`.

### Requirement: Delivery and resumption honor a record's lifecycle

**Reason**: No schedule record or goal lives in the repo, so the verbs have nothing of that kind to tell apart from a code change.
**Migration**: "Every schedule lives in the company app" in `host-schedules`; `/schedule` manages schedules, and the verbs handle code changes only.
