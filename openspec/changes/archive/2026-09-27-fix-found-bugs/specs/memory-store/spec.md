## MODIFIED Requirements

### Requirement: A member key adds facts under its own name but does not edit or delete them

The Worker SHALL let a `member` key run only reads and the exact write statements the memory script sends: inserts of facts, fact tags, tags, and runs, the upsert of a session row, and the update that marks a live fact as superseded. In a member's insert of a fact, a tag, or a session row, the author SHALL be the key's email. A member's fact-tag insert and supersede update SHALL each follow, earlier in the same batch, an insert of a fact under the member's own email, so a member never tags or supersedes a fact without its own new fact. A member's session upsert SHALL be refused when the store already holds that session under another author. A member's read SHALL be refused when its SQL text, taken whole with nothing stripped, contains a write keyword or a `;`, so no quoted name, string, or comment can hide a write. The Worker SHALL refuse any other statement from a `member` key with HTTP 403, and SHALL run no statement in that batch. When the memory script writes through a memory key, it SHALL write the key's email as the author, and SHALL count the key's email among the current person's emails. An `admin` key SHALL keep running any statement that does not name the key table.

#### Scenario: A member supersedes a fact

- **WHEN** a member's `/save` writes a fact that supersedes a live fact
- **THEN** the new fact is stored and the old one is marked superseded

#### Scenario: A member deletes a fact

- **WHEN** a member key sends `DELETE FROM facts WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member rewrites a fact

- **WHEN** a member key sends `UPDATE facts SET body = 'x' WHERE id = 3`
- **THEN** the Worker answers 403, and fact 3 is unchanged

#### Scenario: A member writes under another name

- **WHEN** Ana's member key sends an insert of a fact whose author is `bo@example.com`
- **THEN** the Worker answers 403, and no fact is stored

#### Scenario: A member hides one bad statement in a batch

- **WHEN** a member key sends a batch with an insert of a fact followed by a `DELETE`
- **THEN** the Worker answers 403, and neither statement runs

#### Scenario: A member supersedes with no fact of their own

- **WHEN** a member key sends the memory script's supersede update for fact 3, with no fact insert before it in the batch
- **THEN** the Worker answers 403, and fact 3 stays live

#### Scenario: A member overwrites another person's session

- **WHEN** Ana's member key sends a session upsert for a session the store holds under `bo@example.com`
- **THEN** the Worker answers 403, and Bo's session row is unchanged

#### Scenario: A member hides a write inside a quoted name

- **WHEN** a member key sends ``WITH a AS (SELECT 1 AS [']) DELETE FROM tags WHERE 'x'='x'``
- **THEN** the Worker answers 403, and no tag is deleted
