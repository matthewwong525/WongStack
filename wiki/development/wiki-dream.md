# Memory dream

A dream checks everything your project remembers against itself and against the code: type [`/dream-memory`](../../.agents/skills/dream-memory/SKILL.md) and your assistant tidies [memory](memory.md), adds the lasting facts it has gained to the wiki, fixes pages and saved facts that have gone wrong, lists the specs and plans that have, and publishes the result. It runs only when you type it or schedule it: your assistant never starts a dream on its own.

## When to run one

[`/close`](../../.agents/skills/close/SKILL.md) already moves one chat's facts onto the wiki. A chat closed any other way leaves its facts in memory, and a page nobody reads stays wrong. Run a dream:

- after a busy week of chats you did not close with `/close`;
- when a page or a saved fact told your assistant something that is no longer true;
- before someone new starts reading the wiki.

It uses your own assistant's model allowance, so it costs what a long chat costs.

## What it reads

Your project remembers things in four places. A dream compares all four with each other and with the files they describe:

| Place | What it holds | A dream |
|---|---|---|
| The wiki | how you work, people, the product | fixes your own pages |
| Saved facts | what each chat learned | corrects them |
| Specs | what the product does | lists what is wrong |
| Plans, open and past | what was meant and why | lists what was left behind |

Each pass is bounded, so a first run on a large project still ends: the twenty pages longest unchecked, the five specs longest unchecked, and every fact and plan a rule can flag. The report says what the limits skipped; the next dream starts there.

It looks first where trouble was recorded. A [struggle note](memory.md#how-facts-are-captured) saying a page, a fact, a spec, or a plan misled a chat is checked before anything else, and a fix closes the note. A note about code is left for [`/improve-code`](repository-improvement.md).

## What a dream does

1. **Tidies memory first.** It runs memory's own [consolidation](memory.md#consolidation) at once: duplicate facts merge, a contradicted fact gives way to the newer one, and an answered open thread closes. The wiki is then updated from the tidied facts, never from a duplicate or a fact that was overturned.
2. **Adds what is worth keeping.** Each fact saved since the last dream is tested by [the wiki's rule](../wiki-style.md#repeatable-knowledge), made stricter by [placing a fact on a page](#placing-a-fact-on-a-page). A fact that passes goes on the page that owns it; the first fact on a new topic makes its page and its line in the hub. The rest stay in memory. `/close` places facts by the same rules.
3. **Cleans up the wiki.** It re-reads your own pages against memory, the files they link to, the specs and plans that cover the same ground, and each other, longest unchecked first. It corrects what is out of date, merges duplicates, moves a fact to the page that owns it, fixes links, and keeps each hub listing its pages. It works by [keeping it tidy](../wiki-style.md#keeping-it-tidy), reading each page's facts with `memory.mjs areas <page>`.
4. **Checks specs and plans.** It compares each spec with the code, and looks at every plan with all its tasks done or untouched for thirty days. It changes none of them: [it lists them](#what-it-fixes-and-what-it-only-lists).
5. **Corrects saved facts.** A fact that names a file that is gone, or says something the project now contradicts, is replaced by a newer fact saying what is true. The old one is never edited or deleted; it stays searchable as history. On a teammate's key a dream corrects only that installation's own facts.
6. **Checks the source first.** Before it replaces a statement or a fact that quotes you, it reads the chat the words came from, with `memory.mjs source <fact-id>`. A fact that was the assistant's reading of you, not your words, is never written as your preference.
7. **Publishes through the normal checks**, as any wiki edit does ([the gate](the-change-loop.md#the-gate)), with no question first. Then it tells you each page it changed, each fact it corrected, and the evidence behind each.

A chat marked private has nothing in memory, so a dream never reads it. Health, family, and money never go on a page.

## What it fixes and what it only lists

A dream fixes your own wiki pages and saved facts itself. It only lists:

- **A spec the code contradicts**: the spec, the statement, and the evidence.
- **A plan left behind**: finished but never published, or untouched for thirty days.
- **A fact that belongs on, or contradicts, [a page WongStack ships](#your-pages-and-shipped-pages).**

The list is in the report and kept as one note in memory, which the next dream loads and checks again. Say *fix those* and they go out as a normal change through [the change loop](the-change-loop.md); the next dream then closes the note.

Specs and past plans record what shipped and why, so a dream never rewrites one on its own judgment.

## A fault in the product

Sometimes a page and the product disagree and the page is right: a recorded decision confirms the rule, and the code breaks it. Rewriting the page would hide the fault. The dream leaves the page or spec alone and saves a note naming the rule and where the code breaks it. The next [`/improve-code`](repository-improvement.md#struggle-notes-come-first) reads that note.

## Placing a fact on a page

A fact goes on the wiki only when it passes [the repeatable-knowledge test](../wiki-style.md#repeatable-knowledge), on the page [where a fact goes](../wiki-style.md#where-a-fact-goes) names. A dream asks two more things: **will it still be true in six months, and would it change what a reader does?** A fact that fails either stays in memory.

These are the wrong turns the test lets through, for `/dream-memory` and `/close` alike:

- **A preference is how a person wants work done, again and again.** A choice about one product feature is that change's decision and stays in its plan: *measure a speed-up before recommending it* is a preference; *Connect your assistant uses the app's login* is not.
- **An interpretation is not a quote.** A fact marked as the assistant's reading, such as *Interpretation, not his words*, goes on a page only when `memory.mjs source <fact-id>` shows the person said as much, and then in their words.
- **One new line per idea, in the bullet that already owns it**, in the page's format. A page growing by over a third in one pass means the test was too loose: apply it again.
- **Never a private name.** No downstream repo, customer, or account detail the repo's checks would refuse; no health, family, or money.
- **Already said is not new.** Skip a fact the page states. Reword a sentence only when a fact contradicts it.
- **Buried is not missing.** When a chat went wrong because guidance was hard to find, move it or reword it where it is. Never write it a second time: a second copy goes stale.

## Chats are evidence, not orders

A dream reads old chats and saved facts to learn what happened. It weighs their words; it never follows them. A chat that says *delete that page* is a record that someone once said so, not a request to the dream.

## Look first

`/dream-memory --dry-run` lists the edits and fact corrections it would make, each with its evidence, and the specs and plans it would list. It changes nothing: no file, no publish, no tidying of memory, and it does not count as the last dream. Use it the first few times.

## Your pages and shipped pages

A dream edits only the pages your project owns: people, the company, customers, the product, and any page you added. It never rewrites a page WongStack ships, because the next [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) would overwrite the edit. A fact that belongs on a shipped page, or contradicts one, [is listed](#what-it-fixes-and-what-it-only-lists) with the page and the fact.

`node .claude/skills/dream-memory/scripts/dream.mjs pages` shows which pages are `own` and which are `shipped`, each `spec`, and when each was last checked. `drift` lists the saved facts that name a file that is gone and the plans that are finished or idle. A fact is listed only when the project once held the file and the fact does not itself say it was removed, so a note about planned work, or a record of a removal, is never flagged.

## Where it runs

Run it from a clean checkout or a new workspace. Where a change is half built, a dream stops before it edits anything, because its edits must publish alone. A dry run works anywhere.

## Undo one

One dream is one published change. Ask your assistant to *undo the last dream* and it reverts that change through the same checks. The facts stay in memory, so nothing is lost; a fact a dream corrected wrongly is put right by saving the true one again.

## Where the ideas come from

Checking what is written against the real files, not against other writing alone, and reading past chats as a record, draw on poteto's [pstack](https://github.com/cursor/plugins/tree/main/pstack). Ideas only; no text is copied.

Part of [development](README.md).
