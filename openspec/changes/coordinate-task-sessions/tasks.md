# Tasks

## 1. Existing discovery script

- [x] 1.1 Extend other-work discovery with chat titles, exact session IDs, and status, preserving same-repo filtering and multiple chats per workspace; cover duplicate titles, unrelated projects, archived/current sessions, unavailable Paseo, and unchanged git-only fallback in CI tests.
- [x] 1.2 Verify the installed Paseo send behavior for busy and idle recipients and document a direct invocation using explicit daemon routing and bounded foreground execution; verify the instructions never stop a peer, claim dispatch is agreement, or introduce a watcher or custom queue.

## 2. Workflow instructions and documentation

- [x] 2.1 Add a concise direct-coordination convention to the owning change-loop wiki and explicit same-repo message authorization to AGENTS.md; verify task ownership, brief context requests, and each task's publishing approval remain intact.
- [x] 2.2 Replace the unconditional overlap ask in explore and its workspace reference with owner contact before escalation; update relevant apply/continue and ship guidance to read agreements from existing plans and confirm published dependencies, preserving current gate and collision recovery. Verify every instruction links the same owner and no registration lifecycle or shared store is added.
- [x] 2.3 Add owner-managed chat-title updates at initial planning, resumption, and meaningful scope changes through the existing Paseo update command; verify task titles stay short, routine progress causes no rename, session/branch/plan identity stays unchanged, peer titles and shared workspace names are untouched, and discovery confirms scope from actual context even when a title is stale or an update fails.

## 3. Payload delivery

- [x] 3.1 Add one `## Next (minor)` changelog entry and adjust existing payload/area references only as needed, leaving VERSION unchanged; verify payload links, OpenSpec configuration, and instruction context budget with the required repository checks.
- [x] 3.2 Regenerate the review page and strictly validate the final change; verify the artifacts contain only direct messaging and existing-plan agreements rather than the superseded runtime-store design.

## 4. Integration evidence

- [ ] 4.1 Use /save to run discovery coverage in CI and record the gate result for the actual pushed head; leave this task pending if the gate is failing or unverifiable.
- [ ] 4.2 Exercise direct discovery and a brief proposal, context request, and owner reply between two disposable same-repo chats under test-only briefs; show agreements recorded in their existing plans, independent tasks continuing, and permissions preserved. Send no task to unrelated existing chats and publish no production change. Use /save if fixture fixes need CI evidence.
