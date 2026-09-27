# Investigating consolidation

Use this with [`/improve`](../SKILL.md). Consolidate only when changing one copy's requirement must change the other; similar syntax is not shared knowledge.

## Find the owner and callers

- Compare inputs, outputs, units, defaults, ordering, errors, retries, timeouts, idempotency, and partial success.
- Move shared logic to its owning layer, not the shortest import path; keep wire contracts and runtime boundaries explicit.
- Queries: compare filters, joins, nulls, limits, and transactions; never add repeated queries to remove repeated text.
- Integration clients: keep pagination, cancellation, response types, and safe retries; retrying a write can repeat an external effect.
- User interfaces: extract a coherent responsibility behind a stable interface, not render fragments.
- Docs and skills: keep the rule on its owning page and link to it; notes and archived changes are records, not duplicates.

Read every real caller before selecting. Tests may call dead code; production may reach code through configuration, reflection, generated registration, dynamic import, scripts, queues, cron, or HTTP routes an import search misses.

## Prove that removal is safe

Search the exported symbol and its path: re-exports, dispatch tables, route mounts, build entries, package metadata, configuration, public URLs, and external integration contracts. History tells obsolete code from intended behavior never connected.

Unused-code tools only support the case; run them only against the real leaf configuration. A missing dependency, unresolved module, or tool failure is a coverage gap, not zero references. A passing build does not prove a runtime-only or external caller survived.

Name the callers and behavior the verification probe protects. In one independently correct change, add the shared owner, migrate bounded callers, and remove obsolete copies, keeping meaningful differences. Defer unresolved ownership or external-use questions.
