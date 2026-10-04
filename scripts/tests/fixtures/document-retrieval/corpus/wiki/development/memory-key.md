# The memory key

Your memory key opens this repository's [session memory](memory.md), with private memory owned by this OS-user installation. Repository authorization includes shared memory; trusted setup or the admin installs the secret that proves that authorization to the store. A copied checkout or a chosen machine ID alone grants nothing.

`CLOUDFLARE_MEMORY_TOKEN` holds your **memory key**. **This page owns that name.** It stays in the primary checkout's ignored `.env` under [the secrets convention](secrets.md), never in git, chat, logs, or CI secrets. Each repository has its own credential. The local installation ID stays the same across its chats, repositories, and linked worktrees.

Production `/_memory/*` reaches the memory route without an app login and checks its own credential. Staging and branch previews bind no production memory and answer 404. See [Access](../stack/cloudflare-access.md#4-bypass-the-public-surface). Every call uses the primary checkout's recorded `components.memory.worker`; a branch cannot redirect its secret.

The production app Worker binds `MEMORY_DB` and, when available, `MEMORY_BUCKET`. The [memory skill](../../.agents/skills/memory/SKILL.md) owns the handler. `memory_keys` holds only credential hashes, machine IDs, roles, and optional labels. Ordinary keys cannot read or change it or the retained legacy `memory_admins` table. The trusted admin's `CLOUDFLARE_API_TOKEN` reaches the database directly for migrations and issuance.

A key has one of three roles:

- **Admin:** setup's installation. It can read every fact and transcript; digest and search default to its own private facts until `--everyone` is requested.
- **Member:** a repository contributor. It loads and contributes team knowledge automatically and accesses private facts and transcripts only for its stored machine owner. It supersedes only that owner's facts, with a replacement in the same batch.
- **Reader:** read-only repository access. Every fact it contributes stays unshared, visible only to its machine and the admin.

The [privacy table](memory.md#who-sees-what) applies even with one active machine. Emails, hostname, git authors, and people pages are labels only. New raw transcripts live under `sessions/<machine-id>/<agent>/<session>.jsonl`; only the owning machine and admin read them. Historical email paths remain admin-readable. Authors and dates stay unchanged when upkeep restates a fact.

A failed production deploy pauses memory; facts wait in this machine's local spool. Offline starts can use this machine's cached digest. A refused credential prevents cached private memory from loading, including a later offline start, until authorization succeeds again.

The app's code shares the Worker with memory. [Mini apps](../stack/mini-apps.md) receive no memory bindings; the importable-env guard also blocks them. Review app changes before publishing: code in the same Worker can deliberately circumvent that boundary. The [picture route](staging-walkthrough.md#what-a-walk-needs) receives the bucket alone and reads only `walks/`.

## Joining through GitHub

This heading remains for older links. Enrollment through GitHub has been replaced by trusted credential installation. Memory needs no GitHub lookup, person sign-in, account cap, or renewal. Missing credentials are reported by the normal hook; it never auto-enrolls a checkout.

The admin issues a credential for the recipient's local machine ID into a private transfer file. The recipient installs it with:

```bash
node .claude/skills/memory/scripts/memory.mjs join --file <absolute-private-file>
```

Installation checks the configured production Worker, repository database, local ID, and active server grant before writing the primary `.env`. On Unix, the transfer file must have mode 600. Once installed, ordinary chats load and capture permitted memory without another approval. Transfer through an existing private channel; never paste the file's contents into chat. Remove the transfer file when it is no longer needed.

## Add or remove a teammate

Repository authorization is the policy: contributors receive **member** credentials, read-only teammates **reader** credentials. The trusted admin uses the existing provisioning token with D1 Write:

```bash
node .claude/skills/memory/scripts/memory.mjs member admin
node .claude/skills/memory/scripts/memory.mjs member add <machine-id> --role member --key-file <absolute-private-file>
node .claude/skills/memory/scripts/memory.mjs member remove <machine-id>
node .claude/skills/memory/scripts/memory.mjs member list
```

Get the recipient's ID from `node --input-type=module -e 'import { machineId } from "./.claude/skills/memory/scripts/lib/machine-id.mjs"; console.log(machineId())'` in their checkout. It is an identifier, not a credential. `member admin` installs this machine's admin key directly; no git email or GitHub account is needed for memory. `member add` writes a restricted transfer file outside repositories, never prints its secret, and accepts an optional `--label` for display.

New keys have no scheduled expiry. Reissuing for a machine revokes its earlier credentials immediately. `member remove` revokes every credential and pending login marker for that ID here. Listing shows machine IDs, labels, roles, revoked state, and verified login identity, without secrets. Existing login metadata stays on retained rows after rotation or revocation. Removing repository permission elsewhere does not revoke memory: the admin must remove its credential too.

## Ordinary login labels the machine

Setup supplies the normal app link with a short-lived machine context. Opening it and completing the website's usual email login attaches the verified issuer and subject to this machine. No code, extra screen, button, or memory approval is needed. Setup seeds its marker hash while issuing the admin credential; recipient installation requests one after validating its key. Only its hash and 24-hour expiry are stored remotely. Local link state is private, and markers are redacted from transcripts and refused in facts.

The link labels the assistant installation, even if opened on a phone. It must stay personal: forwarding it can identify the recipient as its user. It never proves who authored every earlier note. Original authors, ownership, and permissions stay intact; notes written before login remain identifiable by the machine's association. Matching login identities on two machines never combine private memory.

The callback uses the existing verified human website identity, consumes the marker once, and redirects to the clean app URL. Invalid, expired, replayed, revoked, service, open-site, and preview contexts create no association. A different verified subject cannot silently replace an established label. A plain unrelated visit cannot identify an assistant installation. Memory works before login and when association is unavailable; installation reports an unavailable link plainly.

## Updating an existing store

After the reviewed Worker update deploys, the admin runs `memory.mjs migrate`, then issues replacement machine credentials using the commands above. Old email keys are refused. Shared history stays available; historical private facts, sessions, and raw objects remain unassigned and admin-readable. Nothing matches old emails or hostnames to an owner. Old local cache, spool, and unregistered transcripts are not adopted. Historical ownership recovery is a separate decision.

The local ID lives outside git in the OS user's data folder (`XDG_DATA_HOME/wongstack`, otherwise `~/.local/share/wongstack`; Windows uses Local AppData). Keep its private `machine-id` file: losing it creates a different installation. A corrupt ID stops memory instead of rotating ownership. People sharing one OS account share one owner. Copying both its ID and credential gives the same bearer access.

Back to [session memory](memory.md).
