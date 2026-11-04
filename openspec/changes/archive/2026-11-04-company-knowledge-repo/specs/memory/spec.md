# Spec Delta

## MODIFIED Requirements

### Requirement: The digest holds what always applies and asks for a search

The digest SHALL include the people page that lists the current git email, found in `knowledge/people/` and then in `wiki/people/`, after the current change's threads, within at most 1.5 KB; a page cut short SHALL end with a line naming its path. The digest's opening lines SHALL tell the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question.

#### Scenario: A person with a people page

- **WHEN** the current git email is listed on `knowledge/people/ana.md`, a 3 KB page
- **THEN** the digest shows the first part of that page within 1.5 KB, a line naming `knowledge/people/ana.md` for the rest, and then feedback facts

#### Scenario: No people page

- **WHEN** no page in `knowledge/people/` or `wiki/people/` lists the current git email
- **THEN** the digest shows no person section, and its opening lines still ask for a search once the task is known
