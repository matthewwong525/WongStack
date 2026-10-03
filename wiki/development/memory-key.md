# The memory key

Memory uses an installation-owned machine identity: a persistent P-256 private key and rotating bearer bound to one installation, repository, machine and grant. [Session memory](memory.md) owns privacy. Credentials live in private OS-user state outside git, never in repo env credentials, CI secrets, logs, arguments or facts.

Ordinary calls reach the pinned production HTTPS origin under `/_memory/v2/repositories/<repository>/machines/<machine>/`. Only finite named operations run. The route verifies the executing Worker version, schema protections, deployment evidence, current principal, grant, credential and barriers. Browser cookies, email, Access JWTs, service identities, GitHub and broad Cloudflare tokens grant no memory authority. Staging, previews and local routes answer 404 without reading bindings.

The production destination override only delivers requests to the Worker. Mini apps receive no `MEMORY_*` values or bindings; deliberately changed code in the same Worker can still reach bindings, so source and deployment review remain necessary.

Readers write privately. Members also share work facts. User and feedback facts always stay owner/admin private; raw transcripts stay owner/admin only. Installation data admins never administer grants or schema. Privacy remains enforced with one machine.

State follows the same OS user and installation/repository pins across worktrees, restarts and clones; routing config alone grants nothing. Storage refuses foreign ownership, writable parents, links and permissive files. POSIX uses 0700 directories and 0600 files; Windows checks native protected owner ACLs. Live loopback Node handles serialize writers without transferring data and release automatically after a crash.

A failed production deployment pauses memory; the machine-bound queues retain exact pending attempts for a later authorized retry. The app's code shares the Worker with memory, so source review remains necessary even with stripped mini-app bindings and `disallow_importable_env`. The protected [preview-check picture route](staging-walkthrough.md#what-a-walk-needs) receives the bucket alone and matches only its `walks/` folder; it cannot reach private transcript addresses or memory authorization.

Queues precommit exact attempts before HTTP and retain their original key, grant, scope, revisions and generation. Only completed exact receipts count as stored. Fresh own signed status recovers an exact completion; an absent flag alone cannot discard an attempted frame. Independently proven nonexecution of the exact expired proof may permit a separately retained predecessor-linked successor after current same-grant verification. Incomplete/conflicting operations stay closed; revoked, foreign or replaced-authority queues quarantine and never reenroll automatically. Raw addresses include session, credential generation and content hash; confirmed old staged addresses become honest orphans before a new generation opens one. Completed published addresses remain retained. [Migration recovery](memory-migration.md#recover-without-reopening-old-access) preserves these bindings.

## Joining through GitHub

This historical heading preserves existing links. GitHub joining and email-based memory keys are retired. `memory.mjs join` refreshes only an already admitted machine's same-grant credential.

## Add or remove a teammate

Human app/GitHub membership and memory grants are separate. `member` and email-wide removal are retired. A trusted installation operator must issue or revoke the exact machine grant; server team removal requires the privately retained exact installation/repository/machine/grant tuple and verified revocation receipt. A login or email cannot supply that tuple.

## Preparing installation-owned access

Provisioning retains its original owned D1 POST receipt privately and reports `pending-setup`. The source setup completion adapter follows reviewed publication A, activates the full core, publishes only the owned installation configuration B, verifies its deployment successor, and enrolls this computer. [Existing-store migration](memory-migration.md) remains a separate reviewed operation with its own authorized provider adapter and evidence. Missing pins and unsupported activations deny; never infer installation IDs from old resources or adopt an old store automatically.

Trusted setup must verify active Worker settings and genuine `version_metadata` binding type, then prepare exact schema/deployment evidence and compiled full-core activation before issuing grants. The immutable pin projection excludes version metadata: source hashes alone cannot certify deployment. Ordinary use needs no browser approval app, human login or cloud identity. A successful allowed operation with this computer’s exact key and grant is required before ready. Public install metadata holds routing and generated IDs, never a universal readiness proof or capability. A server’s ready observation cannot admit a desktop; another computer supplies its own generated private-key commitment and receives a private one-use grant through the trusted operator channel. Normal production updates retain and acknowledge an exact [publication journal](../stack/d1-pipeline.md#memory-publication); previews never do.

Back to [development](README.md).
