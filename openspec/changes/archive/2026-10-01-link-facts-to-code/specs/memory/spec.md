## ADDED Requirements

### Requirement: A fact names the code area it concerns

The `memory` skill SHALL ship a list that maps folder and file prefixes to area tags, each with a definition, and a fact about code SHALL carry the area tag of the folder it concerns. A path's areas SHALL be the tags of its longest matching prefix, with `.claude/` and `.codex/` read as `.agents/`. An area tag missing from the store SHALL be defined from the list on its first write. Given paths or a change name, the skill SHALL print the matched areas and the live facts carrying those tags or their aliases, open threads first, then newest first, capped, under the same team filter as search; for a change it SHALL use the repo paths its proposal, design, and tasks name.

#### Scenario: A change touches the Worker

- **WHEN** a change's tasks name `app/worker/index.ts` and a live fact is tagged `worker`
- **THEN** loading the change's areas prints `worker` and that fact with its age and author

#### Scenario: The most specific folder wins

- **WHEN** the list maps `app/` to `stack-pack` and `app/worker/apps/` to `mini-apps` and `worker`
- **THEN** `app/worker/apps/hello/index.ts` loads `mini-apps` and `worker` facts, and no `stack-pack` facts

#### Scenario: No mapped folder

- **WHEN** none of the given paths matches the list
- **THEN** the command says no area matched and prints no facts

#### Scenario: The store is unreachable

- **WHEN** the area load cannot reach the store
- **THEN** it says memory was not loaded and exits without failing

### Requirement: Re-tagging keeps a fact's origin

The `memory` skill SHALL restate a live fact with added tags as a new fact with the same slug, type, body, date, session, and author, plus its old tags, superseding the old one. It SHALL skip, and report, a fact that is no longer live, already carries every given tag, or, for a teammate's key, has another author. Consolidation SHALL re-tag a live fact about code in a mapped folder that lacks that area's tag, and an open thread naming a verb's next run that lacks the verb's tag, through this restate.

#### Scenario: An old warning gains its area

- **WHEN** consolidation re-tags fact #539, written 2026-09-30 by `matthewwong525@gmail.com` in session S, with `worker`
- **THEN** a new live fact holds #539's exact body, date 2026-09-30, session S, that author, its old tags, and `worker`, and #539 is superseded by it

#### Scenario: A teammate re-tags someone else's fact

- **WHEN** a teammate's key asks to re-tag a fact another person wrote
- **THEN** that fact is skipped and reported, the other re-tags in the batch are written, and the fact stays live

## MODIFIED Requirements

### Requirement: The verbs read memory where they decide

`/explore` SHALL search memory before it asks a question (`asking-the-user`), by the intent's words and by the code areas of the paths it expects to touch; `/continue` SHALL read the slug's live facts and open threads, and `/close` SHALL read the session's and its change's facts before it closes. An unreachable store SHALL NOT stop a verb; it SHALL say memory was not loaded.

#### Scenario: Resuming a change

- **WHEN** `/continue add-po-search` runs and the store holds facts for that slug
- **THEN** the recap shows its open threads and facts with their ages

#### Scenario: Planning a Worker change

- **WHEN** `/explore` expects to touch `app/worker/index.ts` and a live fact is tagged `worker` without naming that path
- **THEN** it loads that fact before its first question
