# Investigating security candidates

Use this with [`/improve`](../SKILL.md). A confirmed finding identifies controlled input, a reachable path, the missing or ineffective check, the affected data or action, and a safe negative verification probe. A pattern match is only a lead.

## Map the trust boundary

Read the repository's architecture and security guidance, then verify the mounted code. Trace the full path from entrypoint to handler and side effect. Identify who controls each input, which identity is established, which authorization is required, where validation occurs, and which service or data store receives the action.

Authentication does not prove authorization or object ownership. A private-looking hostname, opaque identifier, internal package, or signed-in user does not remove the need to check the affected operation. Development bypass flags are not vulnerabilities or safe controls until their deployed configuration and reachability are known.

## Confirm the lead

| Lead | Evidence to establish |
| --- | --- |
| Query construction | Controlled values use binding. Dynamic identifiers use a fixed allowlist. Trace every interpolated fragment. |
| Raw HTML, Markdown, or SVG | Identify who can write the content and where context-appropriate sanitization occurs. Test intended formatting and hostile input. |
| Webhook or machine request | Verify the sender with the correct raw data and secret before writes, queueing, or external effects. Reject an invalid signature. |
| Controlled outbound URL | Check allowed schemes, hosts, addresses, and redirects at each hop. Establish the intended remote-fetch feature before narrowing it. |
| Record identifier | Check identity, authorization, and ownership at lookup or mutation. Unguessable is not authorized. |
| Upload or numeric input | Check type, size, range, storage path, and authority before data, money, inventory, or compute effects. |
| Secret or error detail | Prove that a value reaches a response, client bundle, telemetry, or log. Help text that names a key is not the key. Never copy a value. |
| Dependency advisory | Verify the authoritative advisory, installed version, affected configuration, and reachable use. The local survey has no advisory database. |

Find the source owner for each control. A check copied at several callers can drift; a central boundary can be safer when all legitimate paths use it. Do not move a check across a trust boundary only to remove duplication.

Test the rejected path and legitimate callers. Prefer the smallest fix that closes the confirmed path. Changes to access policy, feature availability, destructive data, credentials, or external accounts require separate user authority. A security label does not grant it. [`/ship`](../../ship/SKILL.md) owns every delivery gate.
