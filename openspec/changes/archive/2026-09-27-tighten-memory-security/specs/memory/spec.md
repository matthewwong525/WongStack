## MODIFIED Requirements

### Requirement: Search finds facts by words, tags, and filters

The `memory` skill SHALL search live facts by words, tag, type, date, author, branch, slug, and change state, with no embeddings. Each fact SHALL print with its age and its author's full email, in search and in the digest, as dated context the repo overrides when they conflict, and a new tag SHALL need a definition.

#### Scenario: Search by tag and date

- **WHEN** the agent searches tag `ship` since a date
- **THEN** it gets one line per matching live fact, each with its age and author

#### Scenario: Two authors share a name

- **WHEN** `operations@example.com` and `operations@example.org` each wrote a live fact
- **THEN** each fact's line names its author's whole email, so the two never read as one person

### Requirement: Transcripts are kept and traceable

With a bucket, each captured session's full transcript up to 50 MB SHALL be kept with no expiry, and a reader SHALL be able to follow a fact to its session's text. A `member` SHALL read only their own transcripts, and the admin every transcript in the repo. The Worker SHALL refuse a transcript over 50 MB from any key; that session's facts SHALL still be captured, and a request for its transcript SHALL say it was too large to keep.

#### Scenario: A member follows a teammate's fact

- **WHEN** a member asks for the source of a teammate's fact
- **THEN** no transcript is shown, and the skill says only the author and the admin can read it

#### Scenario: A session over the size limit

- **WHEN** a captured session's transcript is 60 MB
- **THEN** its facts are saved, no transcript is stored, and asking for its source names the 50 MB limit

### Requirement: A person with GitHub access joins memory

A person SHALL get a key for their machine without the admin, by proving through GitHub that they can push to the repo, or, for a private repo, read it. Push access SHALL give a member key; read access alone on a private repo SHALL give a reader key, and only once the store carries the reader schema. The Worker SHALL check only its own repository, key a GitHub-verified email, never store the GitHub token, and write the key only to `.env`. Every key SHALL expire after 30 days, renewed in the background at session start; a key made before expiry existed SHALL stop at the update that brings this rule.

#### Scenario: A fork owner asks

- **WHEN** someone who cannot read the original repo sends a join naming their fork
- **THEN** the Worker refuses with 403 and makes no key

#### Scenario: A read-only collaborator asks

- **WHEN** someone who can read a private repo but not push to it sends a join
- **THEN** the Worker makes a reader key, or refuses with the migration fix when the store lacks the reader schema

## REMOVED Requirements

### Requirement: The admin adds and removes teammates

**Reason**: No key is made by hand for another person any more; everyone joins through GitHub, and the admin is tied to a GitHub account.
**Migration**: *The admin's key is tied to their GitHub account* keeps removing and listing keys. Someone without GitHub access to the repo gets repo access on GitHub, then joins.

## ADDED Requirements

### Requirement: The admin's key is tied to their GitHub account

Only a person holding the admin's Cloudflare token SHALL link a GitHub account as the store's admin, and make an admin key for their own machine, written only to `.env`, never printed, and expiring and renewing like a joined key. No command SHALL make a key for another person. The admin SHALL remove every key of an email at once, and list keys by email, role, GitHub account, machine, and expiry without showing a key. A command whose token lacks a permission SHALL stop, name it, and change nothing.

#### Scenario: A member is removed

- **WHEN** the admin removes `ana@example.com`, who has three joined machines
- **THEN** the next call with any of Ana's keys is refused

#### Scenario: The admin asks for a key to send

- **WHEN** the admin asks for a key for `bo@example.com`
- **THEN** no key is made, and the answer says Bo joins through GitHub

### Requirement: A GitHub account, not an email, decides admin and key count

A join SHALL give an admin key only to a GitHub account the admin linked, never by email alone. One GitHub account SHALL hold at most 10 live keys: a join past that SHALL stop the account's key from the machine that joined longest ago.

#### Scenario: Another account with the admin's email

- **WHEN** a GitHub account the admin did not link joins with the admin's verified email
- **THEN** it gets a member key, never an admin key

#### Scenario: An eleventh computer

- **WHEN** a person holding 10 live keys joins from another computer
- **THEN** the new computer gets a key, and the key of the computer that joined longest ago stops
