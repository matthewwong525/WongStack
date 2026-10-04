# Memory retrieval additions

## ADDED Requirements

### Requirement: Recall combines sources without combining authority

Memory SHALL offer a bounded recall response containing authorized live facts and local document evidence, identified separately and written in their original words. Fact reads SHALL preserve existing permissions, private scope and source access. Fact bodies and transcripts SHALL NOT reach the document index or semantic backend. Documents SHALL remain available independently of fact authorization, with failures reported per source.

#### Scenario: Both sources contribute context

- **WHEN** recall finds an authorized fact and a relevant wiki passage
- **THEN** both appear with their own identifiers or references under a shared budget without duplicate fact rendering

#### Scenario: Fact memory is denied

- **WHEN** fact access is denied but eligible checkout documents are available
- **THEN** recall returns documents and a denied fact-source state without hidden facts, hidden IDs or borrowed credentials

### Requirement: Recall has bounded output and independent readiness

Recall SHALL select at most eight whole facts and five document excerpts within 6,144 UTF-8 bytes including status and metadata, and SHALL complete or return explicit fallback/partial status within twenty seconds. Startup digest generation and pre-edit loading SHALL NOT launch document models. Agents SHALL receive concise task-directed recall guidance while direct fact and area lookups remain available.

#### Scenario: Both sources exceed the budget

- **WHEN** matching facts and documents exceed the shared allowance
- **THEN** recall reserves room for both available source kinds, keeps whole fact bodies, preserves source pointers and identifies omissions

#### Scenario: Semantic retrieval is slow

- **WHEN** semantic work cannot finish within the deadline
- **THEN** it stops and returns verified available fact or keyword evidence with a visible limitation without delaying startup hooks

### Requirement: Document recall is discoverable as installed reads

The installed catalogue SHALL describe document search and recall with validated inputs, truthful outputs, effects, revisions and authentication requirements. Documents SHALL require checkout access; facts SHALL require the existing memory credential. These SHALL remain installed-client reads rather than HTTP endpoints, and company login SHALL grant no extra fact access.

#### Scenario: An agent discovers document retrieval

- **WHEN** an agent lists and describes document retrieval without a memory credential or company login
- **THEN** it can invoke document search under the local contract

#### Scenario: A combined read uses a member credential

- **WHEN** installed recall is called with a member credential
- **THEN** its facts obey member visibility and its documents come only from the allowed checkout
