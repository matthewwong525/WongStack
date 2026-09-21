# Investigating consolidation

Use this with [`/improve`](../SKILL.md). Repeated code supports consolidation only when changing one copy's requirement must also change another. Similar syntax alone does not show shared knowledge.

## Find the owner and callers

- Compare inputs, outputs, units, defaults, ordering, error handling, retries, timeouts, idempotency, and partial-success rules.
- Find the owning layer before you move shared logic. Keep wire contracts and runtime boundaries explicit. A shorter import path is not a better owner.
- For queries, compare filters, joins, null handling, limits, and transaction behavior. Do not introduce repeated queries to remove repeated text.
- For integration clients, preserve pagination, cancellation, response types, and safe retry behavior. Retrying a write can repeat an external effect.
- For user interfaces, extract a coherent responsibility with a stable interface. Moving render fragments or formatting lines does not reduce coordinated rules.
- For documentation and skills, keep the rule in its current owning page and link to it. Historical notes and archived changes are records, not duplicate current guidance.

Read every actual caller before selecting the change. Tests can call code that production does not. Production can call code through configuration, reflection, generated registration, dynamic import, scripts, queues, cron, or external HTTP routes that a simple import search misses.

## Prove that removal is safe

Search the exported symbol and its path. Check re-exports, dispatch tables, route mounts, build entries, package metadata, configuration, public URLs, and external integration contracts. Use history to distinguish obsolete code from intended behavior that was never connected.

Static unused-code tools are supporting evidence. Run them only against the repository's real leaf configuration. A missing dependency, unresolved module, or tool failure is a coverage gap, not zero references. A passing build does not prove that a runtime-only or external caller survived.

Before delivery, name the callers and behavior that the verification probe protects. Introduce the shared owner, migrate bounded callers, and remove obsolete copies in one independently correct change. Preserve meaningful differences. Put unresolved ownership or external-use questions in deferred findings. [`/ship`](../../ship/SKILL.md) owns implementation and verification.
