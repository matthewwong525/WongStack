# Investigating security candidates

Use this with [`/improve`](../SKILL.md). A pattern is a lead. A confirmed finding names controlled input, a reachable path, the missing or ineffective check, the affected data or action, and a safe negative verification probe.

## Map the trust boundary

Read the architecture and security guidance, then trace the mounted code from entrypoint to side effect: who controls each input, which identity and authorization apply, where validation happens, and which service or data store receives the action.

Authentication is not authorization or ownership: a private hostname, opaque ID, internal package, or signed-in user still needs the operation checked. A development bypass flag is neither a vulnerability nor a safe control until you know its deployed configuration and reachability.

## Confirm the lead

| Lead | Evidence to establish |
| --- | --- |
| Query construction | Controlled values bound; dynamic identifiers allowlisted; every interpolated fragment traced. |
| Raw HTML, Markdown, or SVG | Who writes it, where context-appropriate sanitization happens; test intended formatting and hostile input. |
| Webhook or machine request | Sender verified from raw data and secret before writes, queueing, or external effects; bad signatures rejected. |
| Controlled outbound URL | Schemes, hosts, addresses, and redirects checked at every hop; confirm the intended remote-fetch feature before narrowing. |
| Record identifier | Identity, authorization, and ownership at lookup or mutation; unguessable is not authorized. |
| Upload or numeric input | Type, size, range, storage path, and authority before data, money, inventory, or compute effects. |
| Secret or error detail | Proof a value reaches a response, client bundle, telemetry, or log (a key's name is not the key). Never copy a value. |
| Dependency advisory | Authoritative advisory, installed version, affected configuration, reachable use; the survey has no advisory database. |

Find the source owner of each control. A check copied at several callers can drift; a central boundary is safer only when every legitimate path uses it. Never move a check across a trust boundary just to remove duplication.

Test the rejected path and legitimate callers; make the smallest fix that closes the confirmed path. Access policy, feature availability, destructive data, credentials, and external accounts need separate user authority; a security label does not grant it.
