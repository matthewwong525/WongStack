## MODIFIED Requirements

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run whose change touches a Markdown file or removes or moves any file, docs-only runs included, and on every run with no base to compare; a run whose change touches only other files SHALL skip the check and say so. The check SHALL fail when a link to a file in the repo points nowhere, when a link's `#section` part names no heading on the page it lands on, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. Section names SHALL follow GitHub's heading anchors, and a heading inside a code block SHALL NOT count. The failure SHALL name each page and link.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

#### Scenario: A renamed heading breaks a section link

- **WHEN** a wiki save renames the heading `## Saved browser logins` while another wiki page links `browsing.md#saved-browser-logins`
- **THEN** the check fails naming the linking page, its line, and the link, and the save does not publish until the link or the heading is fixed

#### Scenario: A code-only change skips the wiki check

- **WHEN** a branch changes only `app/src/pages/home/Home.tsx`
- **THEN** the test workflow runs the code tests, skips the wiki check, and its summary says the wiki check was skipped because no page or linked file changed
