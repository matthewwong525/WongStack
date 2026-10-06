# Wiki dream

A dream brings your knowledge up to date from what your chats learned: type [`/dream`](../../.agents/skills/dream/SKILL.md) and your assistant tidies [memory](memory.md), adds the lasting facts it has gained to the wiki, fixes pages that have gone wrong, and publishes the result. It runs only when you ask.

## When to run one

[`/close`](../../.agents/skills/close/SKILL.md) already moves one chat's facts onto the wiki. A chat closed any other way leaves its facts in memory, and a page nobody reads stays wrong. Run a dream:

- after a busy week of chats you did not close with `/close`;
- when a page told your assistant something that is no longer true;
- before someone new starts reading the wiki.

It uses your own assistant's model allowance, so it costs what a long chat costs.

## What a dream does

1. **Tidies memory first.** It runs memory's own [consolidation](memory.md#consolidation) at once: duplicate facts merge, a contradicted fact gives way to the newer one, and an answered open thread closes. The wiki is then updated from the tidied facts, never from a duplicate or a fact that was overturned.
2. **Adds what is worth keeping.** Each fact saved since the last dream is tested by [the wiki's rule](../wiki-style.md#repeatable-knowledge): will this help a future task that is not this one? A fact that passes goes on the page that owns it; the first fact on a new topic makes its page and its line in the hub. The rest stay in memory. [Placing a fact on a page](#placing-a-fact-on-a-page) adds the test's wrong turns, and `/close` places facts by the same rules.
3. **Cleans up the wiki.** This is the main job. It re-reads your own pages against memory, the files they link to, and each other, longest unchecked first: all of them at twenty or fewer, else the twenty most overdue. It corrects what is out of date, merges duplicates, moves a fact to the page that owns it, fixes links, and keeps each hub listing its pages. It works by [keeping it tidy](../wiki-style.md#keeping-it-tidy), reading each page's facts with `memory.mjs areas <page>`.
4. **Checks the source first.** Before it replaces or removes a statement, it reads the chat the newer fact came from, with `memory.mjs source <fact-id>`. A fact that was the assistant's reading of you, not your words, is never written as your preference.
5. **Publishes through the normal checks**, as any wiki edit does ([the gate](the-change-loop.md#the-gate)), with no question first. Then it tells you each page it changed and the fact behind each edit.

A chat marked private has nothing in memory, so a dream never reads it. Health, family, and money never go on a page.

## Placing a fact on a page

A fact goes on the wiki only when it passes [the repeatable-knowledge test](../wiki-style.md#repeatable-knowledge), on the page [where a fact goes](../wiki-style.md#where-a-fact-goes) names. These are the wrong turns that test lets through, for `/dream` and `/close` alike:

- **A preference is how a person wants work done, again and again.** A choice about one product feature is that change's decision and stays in its plan: *measure a speed-up before recommending it* is a preference; *Connect your assistant uses the app's login* is not.
- **An interpretation is not a quote.** A fact marked as the assistant's reading, such as *Interpretation, not his words*, goes on a page only when `memory.mjs source <fact-id>` shows the person said as much, and then in their words.
- **One new line per idea, in the bullet that already owns it**, in the page's format. A page growing by over a third in one pass means the test was too loose: apply it again.
- **Never a private name.** No downstream repo, customer, or account detail the repo's checks would refuse; no health, family, or money.
- **Already said is not new.** Skip a fact the page states. Reword a sentence only when a fact contradicts it.

## Look first

`/dream --dry-run` lists the edits it would make, each with its fact, and changes nothing: no file, no publish, no tidying of memory, and it does not count as the last dream. Use it the first few times.

## Your pages and shipped pages

A dream edits only the pages your project owns: people, the company, customers, the product, and any page you added. It never rewrites a page WongStack ships, because the next [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) would overwrite the edit.

When a fact belongs on a shipped page, or contradicts one, the dream lists it in its report with the page and the fact, and keeps the list as a note in memory. Say *fix those* and they go out as a normal change through [the change loop](the-change-loop.md).

`node .claude/skills/dream/scripts/dream.mjs pages` shows which pages are `own` and which are `shipped`, and when each was last checked.

## Where it runs

Run it from a clean checkout or a new workspace. Where a change is half built, a dream stops before it edits anything, because its edits must publish alone. A dry run works anywhere.

## Undo one

One dream is one published change. Ask your assistant to *undo the last dream* and it reverts that change through the same checks. The facts stay in memory, so nothing is lost.

Part of [development](README.md).
