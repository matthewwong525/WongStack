# Move an existing memory store

An existing memory store moves to machine-owned access through a reviewed installation-operator cutover. Normal chats then use [machine access](memory-key.md); changing an email or copying a checkout cannot claim older private records.

## Prepare the review

Keep an independently verified private backup of database history and transcript objects. Retain the original resource-creation receipt; when it is missing, require a separate explicit ownership/adoption decision backed by operator authority and the backup. A matching database name or a successful GET is insufficient.

The [read-only inventory](../../.agents/skills/memory/scripts/lib/machine-legacy-inventory.mjs) checks exact supported schema and completed installation history. Completed10/11 stores retain their IDs, receipts and removed authority. Genuine14 stores retain their machine/capture/deployment history. Older1–6 stores require reviewed ownership and privately retained new IDs before mutation. Partial, foreign, future or unsupported stores stop unchanged.

Select exact fact IDs, their source sessions and any explicitly selected raw addresses, within the bounded review limit. The [review](../../.agents/skills/memory/scripts/lib/machine-legacy-review.mjs) binds each record's evidence to the destination installation, machine, persistent key, grant, scope and revisions. Typed email, git authorship and an old path prefix never prove ownership. A reader cannot adopt shared records.

The current review supports at most 20 selected records and 1,000 original fact/session/raw records in total, with each source/read/review/journal projection limited to 128 KiB. Provider enumeration allows at most 100 pages and 1,000 identities per kind, with at most 1,000 denial probes. Larger or oversized stores stop before closure or database mutation; they need a separately reviewed migration extension, not repeated smaller selections or blind SQL.

Unselected records remain restricted and their authored history stays intact. Unselected raw objects contribute retained address/session metadata without opening their bytes. A session already marked private stays private: no raw inspection, upload, model read or new capture. Selected raw needs its exact content hash, byte count and ownership evidence. Shared summaries do not grant transcript access.

## Close old access before changing authority

The [trusted adapter](../../.agents/skills/memory/scripts/lib/machine-legacy-adapter.mjs) requires separately authorized provider callbacks and a private durable journal. It has no default transport and cannot be invoked as an ordinary memory-data command. Inspect the concrete target, source revision, backup and proposed mutations before authorizing execution.

Inventory all old serving versions, domains, routes, previews, bindings, credentials and public bucket origins. Close the old serving paths, disable public transcript access and retire their usable memory credentials. Preserve separately reviewed business/CI permissions; a shared account token may require a scoped replacement rather than broad deletion. Independently probe every formerly usable identity and method, including direct database/bucket access. Missing pages, an unknown alias, a redirect, an ambiguous provider response or a still-usable old credential leaves memory closed.

## Apply the reviewed cutover

The [cutover operator](../../.agents/skills/memory/scripts/lib/machine-legacy-operator.mjs) retains its exact target, source, predecessor and candidate in private storage before any mutation. It applies a distinct forward15 schema/manifest and maintenance barrier; SQL1–14 and their historic proofs remain unchanged. Structural extension does not fabricate an earlier bootstrap receipt.

Import only reviewed claims, in bounded pieces. Revalidate the source history, selected records, backup, destination grant and active deployment protections before each mutation and final exposure. Counts and digests must cover both claimed and quarantined history. Preserve bodies, attribution, tags, supersede links, session cursors and raw paths/bytes. Imported sessions stay historical; new conversation capture uses a new owned session namespace.

Only an independently read-back exact completion can expose memory. A successful HTTP envelope is insufficient. Setup reports ready only after this computer's genuine private key and grant complete an allowed memory operation. A completed source receipt or another computer's success is not that proof.

## Recover without reopening old access

| Observation | Action |
|---|---|
| Response lost, exact candidate and completed receipt independently match | Recover that same receipt; do not generate a replacement attempt. |
| Proven no mutation, exact retained candidate and target still valid | Resume only the reviewed phase under its original authority and durable journal. |
| Partial schema, missing receipt, competing attempt or uncertain outcome | Keep memory closed; retain backup, journal and queues for a separately reviewed repair. Do not clear tables, rerun SQL blindly, repin or generate new IDs. |
| Source, target, scope or destination authority changed | Stop and review the new evidence. Removed grants remain removed. |
| A production update needs rollback | Publish a reviewed compatible successor that retains retirement and revocation history. Restoring a backup must never reopen the old Worker, token or join routes. |

Private queues retain their original machine/grant/key and attempted frames. Healthy same-grant renewal can continue untouched work. An uncertain attempted request stays pending or quarantined; an exact expired request proven not to have executed may have a separately recorded predecessor-linked successor. Never flush it under a replacement machine or silently reenroll.

Remote source tests prove the code and refusal cases. Actual provider closure, REST rollback/concurrency, response-loss recovery, two-machine privacy, renewal and revocation still need independently reviewed disposable execution evidence. Neither kind of result substitutes for the other.

Back to [development](README.md).
