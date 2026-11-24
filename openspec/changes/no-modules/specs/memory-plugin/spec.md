## REMOVED Requirements

### Requirement: A repo plugs into the plugin in one place

**Reason**: Memory has no profile; it calls WongStack's store, topics, and person page directly.
**Migration**: None; topics, step tags, and lookups work as before.

### Requirement: Setup installs memory from one pasted message

**Reason**: WongStack ships as one stack; no part is added, set up, or updated alone.
**Migration**: Use WongStack whole; `/wong-sync` updates every part together.

### Requirement: An install updates only the modules it has

**Reason**: WongStack ships as one stack; no part is added, set up, or updated alone.
**Migration**: Use WongStack whole; `/wong-sync` updates every part together.

### Requirement: Memory installs as one folder whose hooks the project runs

**Reason**: Replaced by payload-layout's "WongStack ships as one stack", which owns the hook list for every part.
**Migration**: None.
