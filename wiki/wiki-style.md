# Progressive-disclosure wiki: the rulebook

A `wiki/` built this way is a **progressive-disclosure knowledge tree**: one place to start, and every page drills down into more detail, recursively. It is **plain Markdown with standard links**, so it renders anywhere.

## The shape: start general, break down as needed

A section's `README.md` gives the whole process, each step a link. A step with more to it gets its own page, which breaks down the same way: section README → hub (`onboarding/README.md`) → a leaf specific enough to act on. **Don't manufacture depth.**

## One topic, one page

Document each thing in **exactly one place**: the same procedure on two pages is a bug, a second copy gone stale. Pick its home; link from the other.

- **When vs. how.** A checklist or cadence page says *when* and links out; the procedure page owns the *how*.
- **Generic before specific.** Write the shared process once; a specific leaf adds only its quirks and links up.

## Every page stands on its own

Readers land on a page from search, with no context.

- Give every page a clear **`#` title** and a **first sentence** that says what it is, never a breadcrumb, caveat, or filler: search results quote it.
- **Title the topic, not its place in a sequence**: `Find inspiration`, never `Stage 1 — Find inspiration`. Order lives in the parent hub's list, so a page moves without going stale.
- Put drill-down links **inline, at the point of need**, not only at the bottom.

## Link everything, generously

**Link every doc, app, page, tool, or resource the moment you name it**, inline: a reader who doesn't need the link loses nothing. Link a **section**, here or on another page, by its heading anchor: lowercased, spaces → hyphens, punctuation dropped (`## The bar: is it *upstream*?` → `#the-bar-is-it-upstream`). Every page points **up** to its hub, **down** to what it references, and **sideways** to the siblings it hands off to.

## Folders only for deep branches

Use a folder only when a step grows into several pages (`onboarding/`: a hub plus a page per role), with its `README.md` as the hub; a lone page stays flat. Breadcrumbs follow folders, so don't hand-write them. Moving a page changes its URL: update the links to it.

## Maps are pictures; links live in the list

A `mermaid` diagram may open a section, but keep it **visual-only**: clickable nodes are brittle. The numbered list beside it carries the links.

## No orphans, no dead-ends, full hub-coverage

Something links to every page, its hub at minimum; a hub links *every one* of its children. Every page links onward, up at least.

## Repeatable knowledge

The wiki is long-term memory for **repeatable knowledge**: facts that stay true and apply again: how we work, people, the company, the product, customers. The test: **will this help with a future task that is not this one?** Yes → the wiki. No → the [memory store](development/memory.md) or the change's proposal; a single decision, a date, or one change's details fail it.

- **Write it when you learn it**, in the same request. Cite the source by URL or path; don't copy it into git. Save it through a pull request like any edit ([the gate](development/the-change-loop.md#the-gate)), inside a change's own if one is open; [`/ship`](../.agents/skills/ship/SKILL.md) catches what a session missed.
- **Let it grow from use.** Seed nothing: the first fact on a topic makes its page; the first about a person makes `people/`. No `index.md` (hubs index) and no `log.md` (git logs).
- **One format everywhere**: one person is a team of one.

### People

`wiki/people/README.md` is the hub: who is who. Each person gets `wiki/people/<name>.md` with **every git email they use**, their preferences, and how they like work done: in [home](development/home.md), the owner and the people in their life; in a work repo, each teammate and the customers and contacts who matter.

Find the current person by `git config user.email`. When no page lists it, write a short one (name and email) in the next wiki save, without asking; the first page also makes the hub and links it from [the wiki's root](README.md).

When a person asks for more detail than [plain words](../.agents/skills/explore/references/asking-the-user.md#write-in-plain-words) from now on, such as branch names, write it on their page; never infer it from one message.

### Where a fact goes

1. **About one person → their page. About everyone → a topic page.**
2. **Different preferences are not contradictions:** keep each on its own page. Newest wins only between facts about the same person, or the whole team.
3. **Private life stays home.** Health, family, and money go only in the person's [home](development/home.md); a work preference may go in a work repo.
4. **A shared repo merges wiki edits through git**, like code.

## Adding a page — the checklist

**Prefer extending an existing page.** Otherwise place the new one at the right layer, linked from its parent's step, and hold it to the rules above.

## Keeping it tidy

Garden [the wiki](README.md) as explicit work: extend each fact's owning page, merge duplicates, resolve contradictions newest-wins, prune stale content, repair links.
