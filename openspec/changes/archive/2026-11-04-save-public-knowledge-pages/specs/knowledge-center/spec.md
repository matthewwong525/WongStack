## MODIFIED Requirements

### Requirement: Every wiki page stays short and opens with its title

The same wiki check SHALL fail when a page holds more than 3,000 words, counted as whitespace-separated words across the whole file, or when a page does not open with exactly one `#` title followed by a first paragraph of prose. A page MAY start with one frontmatter block, opened by `---` on its first line and closed by the next `---` line; the check SHALL then look for the title after that block, and a `#` line inside the block SHALL NOT count as a title. A block the knowledge reader reads as frontmatter SHALL be one this check reads past, so a page marked public can be saved. A size failure SHALL name the page, its word count, and the cap, and say to split the page by its sections. Every page the meta-repo ships SHALL pass.

#### Scenario: A page grows past the cap

- **WHEN** a wiki save leaves `wiki/development/browsing.md` at 3,200 words
- **THEN** the check fails naming the page, 3,200 words, and the 3,000-word cap, and the save does not publish until the page is split

#### Scenario: A page opens with a list

- **WHEN** a wiki page's title is followed directly by a bulleted list, or the page has no `#` title
- **THEN** the check fails naming the page and what its opening lacks

#### Scenario: A page marked public opens with frontmatter

- **WHEN** a knowledge page starts with `---`, `public: true`, `---`, then its `#` title and a sentence
- **THEN** the check passes it, and the save publishes the page

#### Scenario: A frontmatter block never closes

- **WHEN** a page starts with `---` and no later `---` line closes the block
- **THEN** the check fails the page for having no `#` title on its first line
