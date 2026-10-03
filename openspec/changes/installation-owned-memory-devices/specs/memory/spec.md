## MODIFIED Requirements

### Requirement: Teammates cannot change or hide each other's facts

A `member` key SHALL write facts only under its own machine principal ID, and SHALL supersede only facts written under its own machine principal ID, with its own new fact in the same write; a supersede aimed at another machine's fact SHALL leave that fact live. Only the admin key SHALL supersede anyone's fact. The Worker SHALL refuse, running nothing in the batch, any member statement that edits or deletes a fact, claims another principal or forges another machine's attribution, overwrites another machine's session, or hides a write inside a read.

#### Scenario: A member deletes a fact

- **WHEN** a member key sends a delete or a body edit for fact 3
- **THEN** the Worker answers 403 and fact 3 is unchanged

#### Scenario: A member replaces a teammate's fact

- **WHEN** Ana's save supersedes fact 3, which Bo wrote
- **THEN** fact 3 stays live, Ana's new fact is stored, and the script says fact 3 was left because Bo wrote it

#### Scenario: A member writes under another name

- **WHEN** Ana's key sends a fact claiming Bo's principal or attribution
- **THEN** the Worker answers 403 and no fact is stored

### Requirement: A team keeps personal facts personal

The Worker SHALL return to a member or reader only everyone's shared `project`, `reference`, and `thread` facts plus that machine principal's own personal and unshared facts, however the read is written. Admin machine credentials with the appropriate scope SHALL see every fact; the client SHALL default their digest and search to their own machine principal's personal facts unless `--everyone` is explicitly requested. Ownership SHALL use internal machine principal IDs and reviewed historic mappings, never email aliases from a wiki page or git configuration. These filters SHALL apply even when only one active machine remains. Shared facts SHALL NOT expose another machine's transcripts.

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

## REMOVED Requirements

### Requirement: Memory is reached through the production Worker with a memory key

**Reason**: Machine-scoped credentials replace email-bearing keys and environment-token routing.

**Migration**: Use trusted installation setup and machine grants; follow the reviewed migration below, retain historic evidence, and invalidate legacy access at cutover.

### Requirement: A person with GitHub access joins memory

**Reason**: Trusted machine enrollment replaces GitHub repository admission.

**Migration**: Use trusted installation setup and machine grants; follow the reviewed migration below, retain historic evidence, and invalidate legacy access at cutover.

### Requirement: The admin's key is tied to their GitHub account

**Reason**: Explicit installation roles replace GitHub-linked administration.

**Migration**: Use trusted installation setup and machine grants; follow the reviewed migration below, retain historic evidence, and invalidate legacy access at cutover.

### Requirement: A GitHub account, not an email, decides admin and key count

**Reason**: Machine grants and explicit machine limits replace GitHub key limits.

**Migration**: Use trusted installation setup and machine grants; follow the reviewed migration below, retain historic evidence, and invalidate legacy access at cutover.

### Requirement: An older store moves behind the Worker safely

**Reason**: The major cutover retires direct account-token fallback instead of maintaining two authorities.

**Migration**: Use trusted installation setup and machine grants; follow the reviewed migration below, retain historic evidence, and invalidate legacy access at cutover.

## ADDED Requirements

### Requirement: Memory credentials open only the pinned repository store

Every ordinary memory call SHALL use an authorized machine credential at the pinned installation's canonical production Worker. A credential SHALL open exactly one repository store, and path identifiers SHALL match that store. New credentials SHALL live in private OS-user state outside tracked files; an explicit compatibility override SHALL never become an account-token fallback. Staging and ordinary previews SHALL have no memory bindings and SHALL answer memory routes with 404. Authentication tables and ownership-mapping controls SHALL be inaccessible through memory data credentials, including admin credentials.

#### Scenario: Another store or address
- **WHEN** a valid machine credential is used at another installation, repository path or unapproved origin
- **THEN** no memory is returned or changed

#### Scenario: An admin machine queries auth state
- **WHEN** an admin machine attempts to read credentials, change machine grants, alter schema or modify ownership mappings through the memory data API
- **THEN** the operation is denied without widening its data-administration authority

### Requirement: Historic ownership requires evidence and preserves attribution

Migration SHALL preserve original fact bodies, authors, session attribution and transcript bytes. Historic ownership SHALL be assigned only through an audited operator-reviewed mapping of specific records to proven machine principals, never by matching email alone. Unmapped records SHALL remain admin-only until reviewed. Legacy transcript access SHALL use exact approved ownership mappings, not email prefixes. New records SHALL use the authenticated principal as owner; reader privacy and fact immutability SHALL remain enforced.

#### Scenario: Proven historic records
- **WHEN** a trusted installation operator approves evidence linking selected old records to a machine principal with proven ownership
- **THEN** that principal can access the mapped records under their original visibility without rewriting authorship or transcript text

#### Scenario: Matching email without proof
- **WHEN** a person uses the same email as an old author but no approved evidence establishes ownership
- **THEN** the old private facts and transcripts remain unavailable to that person

### Requirement: Cutover and rollback never reopen retired authority

An update SHALL inventory and back up the store, establish trusted installation-operator authority, disable GitHub joins and legacy key issuance, and require trusted machine enrollment before reporting memory ready. Old credentials SHALL be invalid at cutover, including at retained production versions. Partial migrations SHALL fail closed. Rollback after cutover SHALL retain revocations and retired authorization paths; restoring historic data SHALL NOT restore historic access. Queued writes SHALL retain their original identity binding.

#### Scenario: An old client or Worker remains
- **WHEN** a pre-update key or join route is used after cutover
- **THEN** it cannot read memory, issue a usable key or bypass revoked machine grants

#### Scenario: Cutover fails or is rolled back
- **WHEN** adoption is incomplete or a rollback is required
- **THEN** memory pauses safely, facts and queued writes are preserved, and no anonymous, GitHub or direct-token fallback is enabled

### Requirement: Normal chats capture memory automatically under machine scope

An authorized machine SHALL load its bounded memory digest and capture useful facts and eligible transcripts during normal assistant use without a Devices interaction or manual approval. Private capture SHALL use the authenticated machine owner and shared capture SHALL preserve existing team visibility rules. Network or authorization failures SHALL retain a private machine-bound queue and report pending or failed capture rather than claiming success. Revocation SHALL prevent flushing or reenrolling under another identity automatically.

#### Scenario: Normal authorized chat
- **WHEN** an enrolled machine learns a private preference and a shared project decision
- **THEN** both are captured automatically, another authorized machine can read only the shared decision, and no browser approval or repeated sign-in is requested

#### Scenario: Offline or revoked capture
- **WHEN** capture cannot reach the store or the machine's grant is revoked
- **THEN** its queue remains bound to that machine and target, the failure is reported honestly, and no notes are reassigned or silently made public
