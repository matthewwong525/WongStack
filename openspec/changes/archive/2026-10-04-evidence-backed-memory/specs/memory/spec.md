## ADDED Requirements

### Requirement: A factual brief keeps its supporting evidence

Memory SHALL offer an explicitly scoped, read-only brief of current facts, grouped by kind and written in the selected facts' original words, with no additional model call or inferred conclusions. Each entry SHALL identify its fact, creation date, author, and source session when recorded, and provide a way to request that fact's source. The brief SHALL default to eight selected facts, allow an explicit selection up to twenty, and apply its byte budget in retrieval order before grouping. The brief SHALL exclude superseded facts, show its generation time and selection limits, preserve whole entries within 6,144 UTF-8 bytes, and distinguish an empty successful read from unavailable memory. It SHALL create no stored facts or persistent summary.

#### Scenario: A decision has been replaced

- **WHEN** a scoped brief matches an old fact and its live replacement
- **THEN** only the replacement is eligible, its original words and evidence identifiers appear, and no inferred reconciliation is added

#### Scenario: The selected facts exceed the brief's cap

- **WHEN** a scoped brief selects more fact text than fits
- **THEN** it admits whole entries in retrieval order before grouping within its byte bound and states its selection limit and the count omitted from its selected set, without claiming completeness

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

### Requirement: A selective helper leaves simple lookups fast

Memory SHALL offer an explicitly requested experimental helper for broad or ambiguous questions that may reformulate searches and select original facts with evidence. Ordinary search, factual briefs, and automatic session loading SHALL make no additional model call for this helper. The helper SHALL create no stored memory or generated conclusions, and SHALL not receive the parent conversation or automatically retrieve source transcripts.

#### Scenario: A question spans several past decisions

- **WHEN** the caller explicitly requests the helper with a scoped question
- **THEN** the helper may search for alternative wording and return useful original facts with evidence, and states any remaining gaps

#### Scenario: An ordinary lookup is sufficient

- **WHEN** the caller uses ordinary search or a factual brief
- **THEN** that operation retains its existing behavior without invoking the helper

### Requirement: Helper work and returned context have enforced limits

The helper SHALL enforce cumulative limits per task handle of 12,288 UTF-8 bytes of application-supplied model input, 3,072 UTF-8 bytes returned to the caller, three candidate searches, and two model calls. Each request SHALL have a twenty-second deadline. Headers, repeated round inputs, retries, fallback output, and errors SHALL count toward the applicable allowance. Concurrent requests SHALL share reserved allowances. Returned facts SHALL keep whole original bodies and supporting identifiers; truncation and exhausted allowances SHALL never imply complete recall. These bounds SHALL be described as helper-interface limits, not a bound on provider-added context or the main agent's whole conversation.

#### Scenario: Repeated requests consume a task's allowance

- **WHEN** requests reuse the same task handle, including concurrent or retried requests
- **THEN** they cannot collectively exceed its supplied-input, output, search, or model-call allowance, and already supplied facts are not repeated

#### Scenario: A request cannot finish within its limits

- **WHEN** input, output, work, or time reaches its allowed bound
- **THEN** further work stops, any returned packet fits the remaining allowance, and the caller can distinguish an incomplete result from an empty successful read

### Requirement: Helper selection preserves evidence and authority

The helper SHALL expose only current facts authorized by the same enforced store permissions and default scope as search, preserving the caller's scope across alternative queries. Selection SHALL be limited to authorized candidate IDs and revalidated before output. The model SHALL have no tools or memory-write authority; a host without verified isolation SHALL not launch a less restricted helper. The helper SHALL retrieve no transcript content, expose no credential or raw storage key, and reject filter paths that cannot meet its bounded-read contract with a visible explanation.

#### Scenario: A model proposes a hidden or fabricated fact

- **WHEN** a model response names an ID outside the authorized candidate pool or attempts to widen caller filters
- **THEN** the proposal is rejected and no hidden body or identifier is returned

#### Scenario: A selected fact changes before output

- **WHEN** a selected fact is superseded or ceases to be readable before final verification
- **THEN** it is excluded and the result is marked partial, or verification failure returns unavailable or denied without cached evidence

### Requirement: Helper failure keeps the caller informed

An unavailable, unsupported, invalid, or timed-out helper SHALL fall back without an additional model call to a bounded deterministic selection only when current authorized evidence can be verified within the remaining deadline. Otherwise it SHALL return no facts and report unavailable or denied. Failure and fallback SHALL consume the existing task allowances and SHALL not be presented as a successful complete extraction.

#### Scenario: The installed host cannot isolate the helper

- **WHEN** tool-free isolation or current model access is unavailable
- **THEN** no unrestricted helper launches and the caller receives a verified bounded fallback or an explicit unavailable result

#### Scenario: Current memory cannot be verified

- **WHEN** a model fails and the store denies or fails the final verification
- **THEN** the caller gets the denial or unavailability without stale facts or a claim that no matching memory exists

### Requirement: Helper evaluation reports coverage and total work

Memory evaluation SHALL compare the helper with direct eight- and twenty-fact selections under the same final packet budget on synthetic questions with declared required and forbidden facts. It SHALL report critical-fact coverage, complete expected sets, context bytes, store/model calls, elapsed time, and provider-reported token usage or its absence. Recorded model fixtures SHALL be distinguished from live model evidence. Selective helper guidance SHALL remain disabled until live synthetic evaluation shows no forbidden or fabricated facts, no existing regression loss, no per-case critical-fact loss against the comparable twenty-fact baseline, and recovery of both existing synonym-only misses.

#### Scenario: A helper returns fewer bytes but uses more work

- **WHEN** the helper returns a smaller packet but makes additional model calls or takes longer
- **THEN** the report shows that tradeoff without claiming lower total cost or faster retrieval from packet size alone

#### Scenario: Protocol tests pass but live quality is unverified

- **WHEN** recorded-reply tests pass and live evaluation is unavailable or fails its acceptance bar
- **THEN** the helper remains explicitly experimental without selective-use promotion and the missing or failing evidence is reported
