## ADDED Requirements

### Requirement: Private memory belongs to an installation

Private memory SHALL belong to a stable, randomly generated local OS-user installation ID reused across sessions, linked worktrees, and repositories. Each repository SHALL retain its independent store and secret credential. Hostnames, git authorship, emails, browser data, and optional labels SHALL NOT establish ownership or permission. Normal assistant sessions SHALL retain automatic memory loading and capture once authorized.

#### Scenario: Another session or linked worktree

- **WHEN** an authorized installation starts a normal chat or resumes in a linked worktree
- **THEN** it uses the same machine owner and automatically loads and captures memory through the existing hooks

#### Scenario: Matching names on another machine

- **WHEN** two installations use the same email or hostname, including when one copies a repository
- **THEN** their private memory remains separate, and choosing the other's ID without its repo secret grants no access

### Requirement: Installation setup and trusted admins issue machine credentials

Repository authorization SHALL be sufficient policy for memory access, with no separate memory or device approval: authorized repository contributors SHALL receive member credentials through the existing trusted setup/admin tooling and SHALL be able to contribute shared memory. Read-only access SHALL retain the existing reader role and unshared-write restriction. Only trusted installation setup or an administrator using the repository's existing provisioning authority SHALL issue, replace, or revoke memory credentials and assign admin, member, or reader roles. Credential ownership SHALL be bound to the machine recorded with its server-side hash. Labels SHALL be metadata only. No Git-host check, person login, device approval screen, hosted account, or extra service SHALL be required for memory. The credential SHALL reach only a private transfer file or the target's ignored primary credential file, never chat, logs, git, or CI secrets. A recipient SHALL install only a credential for its local machine and the configured repository. Once installed, permitted memory loading and capture SHALL operate automatically in ordinary chats without further approval or enrollment. New credentials SHALL remain valid until revoked or replaced; replacement/removal SHALL refuse all earlier affected credentials on their next request. Listing SHALL reveal no secrets; insufficient provisioning permission SHALL stop without changing grants.

#### Scenario: Normal installation and a teammate

- **WHEN** trusted setup issues its local admin key or a trusted admin issues a member or reader credential for a teammate's installation
- **THEN** each credential opens only its repository with its assigned role and machine owner, and an authorized contributor's ordinary chats automatically load and contribute permitted shared memory without a separate memory approval, GitHub check, or person sign-in for memory

#### Scenario: Unauthorized enrollment or revocation

- **WHEN** a clone without a valid secret requests memory or issuance, or a revoked/replaced credential requests memory
- **THEN** the request is denied without granting access, issuing a key, or adopting a supplied machine ID

### Requirement: Website login identifies a machine automatically

The normal WongStack website login SHALL automatically associate its verified login issuer and subject with the authorized assistant machine carried by the setup-supplied app link. Completing ordinary email login SHALL require no matching code, extra screen, button, or separate approval. Email SHALL be display metadata, not the stable identity or permission. Association SHALL identify the machine alongside records already stored under that machine ID without rewriting original authors or transferring ownership. Memory SHALL keep working before login and if association fails. Login association SHALL NOT grant memory access, change roles, combine different machines' private memory, or claim historical records with no machine owner.

#### Scenario: Normal login after notes were stored

- **WHEN** a person opens the app link supplied for their authorized assistant installation and completes the website's normal email login
- **THEN** its verified login ID is associated with that machine automatically, existing machine-owned notes can be identified through that association, the person reaches the usual app without an extra step, and memory permissions and original authors remain unchanged

#### Scenario: Missing context or invalid association

- **WHEN** a website visit has no machine context, uses an invalid, expired, replayed, or revoked association marker, lacks a verified human login ID, or attempts to replace an established link with a different person
- **THEN** no machine identity or permission is inferred or reassigned, unrelated private memory stays inaccessible, and permitted machine memory continues independently of the association

### Requirement: Historic private data is not automatically claimed

An ownership update SHALL preserve authored history and stored raw objects. Existing credentials without machine ownership SHALL require trusted replacement and SHALL NOT gain machine authority by matching email or hostname. Legacy private facts and sources SHALL remain admin-readable and SHALL NOT be automatically reassigned. Unowned historic sessions, old local caches, and spooled work SHALL NOT be silently adopted under a new owner; ownership remapping SHALL remain outside this change.

#### Scenario: A fresh ID matches historic metadata

- **WHEN** a newly authorized installation shares an old author's email or hostname
- **THEN** shared history remains available but historical private memory is not assigned to that machine, and the admin retains explicit access

#### Scenario: A historic fact is restated

- **WHEN** authorized upkeep restates a historic fact
- **THEN** the new fact preserves its author and original ownership, including unassigned ownership, rather than claiming it for the admin's machine

## REMOVED Requirements

### Requirement: A person with GitHub access joins memory

**Reason:** Repository permissions for memory come from trusted setup/admin-issued machine credentials.
**Migration:** Replace existing keys through trusted admin issuance; install the replacement into the primary ignored credential file. Missing credentials prompt for that step instead of GitHub enrollment.

### Requirement: The admin's key is tied to their GitHub account

**Reason:** The existing provisioning authority issues machine credentials and roles directly; a GitHub account no longer decides admin status.
**Migration:** Keep the existing provisioning token and admin command mechanism; replace old admin/member keys with machine-owned credentials. Preserve legacy account metadata without using it as permission.

### Requirement: A GitHub account, not an email, decides admin and key count

**Reason:** Explicit machine authorization and revocation replace GitHub admin matching and account-based key limits.
**Migration:** List, replace, and remove credentials by machine ID in this repository; no automatic account cap or GitHub renewal remains.

## MODIFIED Requirements

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, change state, and the sessions that worked on a change, with no embeddings. A word SHALL match its other forms (*previews* finds *preview*, *checked* finds *check*), and common filler words in a query SHALL NOT match on their own. A shipped set of questions, each with the facts it must find, SHALL guard this in CI. A session worked on a change when it wrote a fact on the change's slug. Given both a branch and a change, search SHALL return facts from either set of sessions. Each fact SHALL print with its age and its author metadata (a full email when recorded as an email, otherwise a label or machine ID), in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: A question in other word forms

- **WHEN** a live fact says "probe every Worker route on the preview" and the agent searches `how should previews be checked`
- **THEN** that fact ranks in the first three results, and a fact sharing only *how* or *should* does not

#### Scenario: Two authors share a name

- **WHEN** `operations@example.com` and `operations@example.org` each wrote a live fact
- **THEN** each fact's line names its author's whole email, so the two never read as one person

#### Scenario: A session's branch was renamed

- **WHEN** a session started on branch `magical-chicken`, wrote a fact on change `add-home-repo` and a fact on topic `paseo`, and the branch became `explore/home-mode`
- **THEN** a search by branch `explore/home-mode` and change `add-home-repo` returns both facts

### Requirement: Transcripts are kept and traceable

With a bucket, each captured session's full transcript up to 50 MB SHALL be kept with no expiry, and a reader SHALL be able to follow a fact to its session's text. A member or reader SHALL read only transcripts owned by their credential's machine, and the admin every transcript in the repo. The Worker SHALL refuse a transcript over 50 MB from any key; that session's facts SHALL still be captured, and a request for its transcript SHALL say it was too large to keep.

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a teammate's fact
- **THEN** no transcript is shown, and the skill says only the owning machine and the admin can read it

#### Scenario: A session over the size limit

- **WHEN** a captured session's transcript is 60 MB
- **THEN** its facts are saved, no transcript is stored, and asking for its source names the 50 MB limit

### Requirement: Memory is reached through the production Worker with a memory key

Every store call SHALL go through the repo's production app Worker at `/_memory/` with a memory key in `CLOUDFLARE_MEMORY_TOKEN` in the git-ignored `.env`, never a person's Cloudflare token outside admin commands. The Worker's address SHALL come from the primary checkout's install record, never a linked worktree's, so a branch cannot redirect a key. A key SHALL open one repo's store and SHALL NOT be committed or set as a CI secret, the key table SHALL be unreadable through any key, and the staging Worker and previews SHALL answer `/_memory/` with 404.

#### Scenario: A key for another repo

- **WHEN** a key made for `billing` is sent to another repo's Worker
- **THEN** the Worker answers 401 and runs nothing

#### Scenario: A branch names another memory address

- **WHEN** a session starts in a worktree whose branch changed the recorded memory Worker address
- **THEN** the key and any credential validation go only to the primary checkout's address, and the digest says the branch's address was ignored

### Requirement: Teammates cannot change or hide each other's facts

A member or reader key SHALL write facts only for its stored machine owner and SHALL supersede only facts with that owner, with its own new fact in the same write; a supersede aimed at another machine's fact SHALL leave that fact live. Author labels SHALL NOT grant ownership. Only the admin key SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another machine owner, overwrites another machine's or an unowned historical session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact claiming Bo's machine owner
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader key only everyone's shared `project`, `reference`, and `thread` facts plus personal and unshared facts owned by the credential's machine, however the read is written and even when only one machine remains authorized. Machine IDs, emails, labels, hostnames, and people pages supplied by a caller SHALL NOT expand that scope. The admin's key SHALL retain access to every fact; its default digest and search SHALL narrow personal and unshared facts to its own machine, and only its explicit `--everyone` SHALL widen that view.

#### Scenario: A teammate's preference

- **WHEN** a teammate wrote a `feedback` fact about deploys
- **THEN** a member's search for `deploy` hides it, with or without `--everyone`, and the admin's search for everyone shows it

#### Scenario: A reader's thread

- **WHEN** a reader wrote a `thread` fact
- **THEN** it shows in the reader's digest and never in a teammate's

#### Scenario: A personal fact in a work session

- **WHEN** a work-repo session learns the person has a medical appointment every Tuesday
- **THEN** it is stored in that repo as a `user` fact, which teammates never see and the admin can

#### Scenario: A member writes its own read

- **WHEN** a member key sends a hand-written read of the facts table, its text search, or a schema-qualified name
- **THEN** the Worker returns no teammate's personal or unshared fact, or refuses the read

### Requirement: Earlier migrated records stay readable

Facts, sessions, author attribution, and note text from earlier migrations SHALL stay unchanged. Shared history SHALL remain readable to the team; private or unowned historical sources SHALL remain available to the admin without automatic assignment to a machine. The skill SHALL offer no command that imports `notes/` files.

#### Scenario: A migrated fact

- **WHEN** a store holds a fact migrated from a note
- **THEN** permitted search shows it and an admin can print its historical note text

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, author, and machine ownership (including unassigned historical ownership), plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another machine owner or unassigned ownership. Upkeep SHALL re-tag, through this restate, a live fact whose words name a path in a mapped folder and that lacks that area's tag, and an open thread whose words name a verb's run and that lacks the verb's tag. Consolidation MAY re-tag a fact whose area or verb needs judgment to read.

#### Scenario: An old warning gains its area

- **WHEN** upkeep finds fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, naming `app/worker/` with no `worker` tag
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, the original machine ownership, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live
