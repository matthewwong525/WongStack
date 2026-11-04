# Spec Delta

## MODIFIED Requirements

### Requirement: Capture happens during the work

The docs SHALL present capture as part of the work: the memory store is short-term memory, company knowledge is long-term memory written when a session learns something, and `/close` is the catch-up that moves a session's and its change's remaining repeatable facts into company knowledge, saved at once. On an install with no knowledge copy, `/close` SHALL publish them in their own pull request.

#### Scenario: Reader sees why capture pays off

- **WHEN** a reader reviews the philosophy page
- **THEN** they see that each change starts with more context than the last

### Requirement: The agent writes what it learns when it learns it

When a request teaches something repeatable, including "read this and remember it", the agent SHALL write it to company knowledge in that request, citing the source by URL or path and never copying the source into the repository. The edit SHALL be saved at once, with no question, and the reply SHALL name the pages and the undo. On an install with no knowledge copy, the edit SHALL be saved like any other file edit, through a pull request; during a change, it SHALL ride in the change's pull request.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the repeatable points land on the page that owns the topic in `knowledge/`, with the URL, live at once, and the reply says how to undo it

### Requirement: People pages are matched by git email

A fact about one person SHALL go on `knowledge/people/<name>.md`, or `wiki/people/<name>.md` on an install with no knowledge copy, which lists every git email the person uses. The agent SHALL find the current person by `git config user.email`; when no page lists it, the next knowledge save SHALL add a short page with the name and email, without asking.

#### Scenario: The first person fact

- **WHEN** a repo with no `people/` folder learns a teammate's review preference
- **THEN** the save adds the people hub, links it from the knowledge hub, and adds the teammate's page with their email

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run whose change touches a Markdown file or removes or moves any file, docs-only runs included, and on every run with no base to compare; a run whose change touches only other files SHALL skip the check and say so. The check SHALL fail when a link to a file in the repo points nowhere, when a link's `#section` part names no heading on the page it lands on, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. Section names SHALL follow GitHub's heading anchors, and a heading inside a code block SHALL NOT count. The failure SHALL name each page and link. A link into `knowledge/` SHALL be skipped in the workflow, which has no copy; the same rules SHALL apply to `knowledge/` before each knowledge save.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

#### Scenario: A renamed heading breaks a section link

- **WHEN** a wiki save renames the heading `## Saved browser logins` while another wiki page links `browsing.md#saved-browser-logins`
- **THEN** the check fails naming the linking page, its line, and the link, and the save does not publish until the link or the heading is fixed

#### Scenario: A code-only change skips the wiki check

- **WHEN** a branch changes only `app/src/pages/home/Home.tsx`
- **THEN** the test workflow runs the code tests, skips the wiki check, and its summary says the wiki check was skipped because no page or linked file changed
