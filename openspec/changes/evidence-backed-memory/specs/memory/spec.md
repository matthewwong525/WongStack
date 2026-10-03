## ADDED Requirements

### Requirement: A factual brief keeps its supporting evidence

Memory SHALL offer an explicitly scoped, read-only brief of current facts, grouped by kind and written in the selected facts' original words, with no additional model call or inferred conclusions. Each entry SHALL identify its fact, creation date, author, and source session when recorded, and provide a way to request that fact's source. The brief SHALL exclude superseded facts, show its generation time and selection limits, preserve whole entries within 6,144 UTF-8 bytes, and distinguish an empty successful read from unavailable memory. It SHALL create no stored facts or persistent summary.

#### Scenario: A decision has been replaced

- **WHEN** a scoped brief matches an old fact and its live replacement
- **THEN** only the replacement is eligible, its original words and evidence identifiers appear, and no inferred reconciliation is added

#### Scenario: The selected facts exceed the brief's cap

- **WHEN** a scoped brief selects more fact text than fits
- **THEN** it keeps whole entries within its byte bound and states its selection limit and the count omitted from its selected set, without claiming completeness

### Requirement: Briefs preserve fact and source permissions

A brief SHALL expose only facts the caller may read under the same enforced permissions and default personal scope as search. An explicit request to widen scope SHALL grant no additional authority. Building a brief SHALL retrieve no transcript bytes; reading a cited source SHALL remain subject to that source's access and availability rules.

#### Scenario: A member asks for a wider brief

- **WHEN** a member requests a brief for everyone and a matching personal fact belongs to another owner
- **THEN** the other owner's fact and its evidence identifiers do not appear

#### Scenario: A team fact has a private source

- **WHEN** a caller can read a shared fact but cannot read its transcript
- **THEN** the brief can cite the visible fact, exposes no transcript bytes, and following its source refuses transcript access

### Requirement: Structured search preserves ordinary search behavior

Memory SHALL provide opt-in structured search results containing fact identifiers, original text, type, slug, attribution, date, source session when recorded, and change state. Structured and ordinary results SHALL use identical filtering, visibility, liveness, ordering, and selection limits. Ordinary search output SHALL remain compatible. The structured form SHALL expose no transcript content, object-storage keys, or credential values.

#### Scenario: Search is requested in two formats

- **WHEN** the same caller repeats an unchanged filtered search in ordinary and structured formats
- **THEN** both formats select the same fact IDs in the same order and apply the same limits

#### Scenario: A search hides personal facts

- **WHEN** a structured search matches facts hidden from that caller
- **THEN** neither the hidden bodies nor their evidence identifiers appear
