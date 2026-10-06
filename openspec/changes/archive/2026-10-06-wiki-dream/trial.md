# Trial record

These two runs tested a nightly script on a small model, the plan's first shape. They are why the plan became a `/dream` skill on the person's own assistant: the small models wrote well and cheaply but judged poorly what was worth keeping.

## Writing trial, first run (2026-10-06): no verdict on writing, a clear one on cost

Task 1.2, run ahead of task 1.1 at the person's choice. Both models through the Workers AI REST API on account ending `d442`, with the prompts of design Decision 4, 60 recent live facts, and this repo's 10 own pages. The run was capped at 9,000 neurons and stopped there.

| Step | Model | Tokens in | Tokens out | Neurons | Seconds | Answer |
|---|---|---|---|---|---|---|
| Place 60 facts | `@cf/zai-org/glm-5.3-flash` | 10,085 | 8,000 (limit) | 501 | 170 | none: the limit was reached while thinking |
| Place 60 facts | `@cf/zai-org/glm-5.3` | 10,085 | 8,000 (limit) | 4,484 | 86 | none: same |
| Rewrite `maintaining/README.md` | flash, whole page | 2,906 | 9,000 (limit) | 449 | 192 | none: same |
| Rewrite `maintaining/README.md` | full, changed lines | 2,945 | 5,000 (limit) | 2,375 | 46 | none: same |
| Rewrite `maintaining/adding-a-skill.md` | flash | 3,170 | 1,126 | 94 | 25 | `UNCHANGED` |
| Rewrite `maintaining/adding-a-skill.md` | full | 3,209 | 2,962 | 1,593 | 35 | `{"edits": []}` |

Total 9,496 neurons: 496 over the run's cap, because the cap was checked before each call and not against the call's own cost.

**What it shows.**

- **Both models think before they answer, and thinking is billed as output.** Each answer carried 4,000 to 39,000 characters of reasoning. Four of six calls spent their whole output limit thinking and returned nothing.
- **The plan's cost figures were wrong.** They counted the page and the answer, not the thinking. An answer of one word cost 94 neurons on Flash and 1,593 on the full model, against the planned 300 and 950 for a real edit.
- **The full GLM 5.3 does not fit the free allowance as called here.** Six no-edit answers would spend a day's 10,000 neurons.
- **Nothing is known yet about writing quality.** No page was rewritten. The two `unchanged` answers were given facts found by keyword, not placed facts, so they prove little.
- **The response reports its own neurons** (`usage.neurons`), so the dream needs no rate table.

**Thinking switches, one tiny question each on Flash (too few to conclude):** no parameter removed the reasoning. `reasoning_effort: "low"` gave the shortest (21 characters against 116 with none set); `chat_template_kwargs.enable_thinking: false` gave the longest and no answer.

**Before the next run:** set `reasoning_effort: "low"` and measure it on the real prompts; place facts ten at a time, not sixty; raise the output limit so a call that thinks still answers; count a call's cost against the cap before it is sent, from the last call of its kind.

## Writing trial, second run (2026-10-06): Flash is cheap and safe but over-eager; the full model is richer, dearer, and leaked a private name

Same prompts, facts, and pages, with `reasoning_effort: "low"`, facts placed ten at a time, and larger output limits. The person chose to run it past the day's free allowance. 38 calls, 13,900 neurons, about 15 cents; every call finished.

| Step | GLM 5.3 Flash (whole page) | GLM 5.3 (changed lines) |
|---|---|---|
| Place 10 facts | 90 neurons, 10 s | 735 neurons, 11 s |
| Rewrite one page | 56 on average, 121 at most, 6 s | 439 on average, 924 at most, 13 s |
| Re-check one page with its linked files | 142, 10 s | 1,189, 15 s |
| A night of 100 facts, 10 pages, 3 re-checks | about 1,900 | about 15,300 |

**Thinking.** `reasoning_effort: "low"` cut reasoning from thousands of characters to under a thousand on every call.

**Placing 60 facts.** Both returned valid JSON for every batch and agreed on 54 of 60. Flash: 38 `none`, 15 on `wiki/people/matthew-wong.md`, 6 on shipped pages, 1 on an own hub. Full: 39 `none`, 16 on the person page, 4 on shipped pages, and 1 new own page for the repo's Cloudflare addresses.

**Rewriting 10 own pages.**

| | Flash | Full |
|---|---|---|
| Pages changed | 2 | 4 |
| Pages left unchanged | 8 | 6 |
| Passed the wiki check | all | all |
| Changed-line edits that landed in exactly one place | n/a | all 8 |
| Sentences with no fact behind them | none found | none found |
| Private detail | none | none in rewrites |

**Re-checking 3 pages.** Flash: one sound addition, two unchanged. Full: four additions, of which one named a private downstream repo and its database on a public page (the repo's private-names test would have failed the change), and one carried no fact id.

**Against the bar.**

- **Flash: safe, not yet publishable unread.** Nothing invented, quotes kept exact, voice matched. Its one large edit, the person page, went from 478 to 912 words in a night: ten new bullets from twelve facts, about four of them one change's product decisions and not lasting preferences. It restated two facts marked *Interpretation, not his words* as his preference, and put blank lines between list items where the page has none.
- **Full: better edits, fails the bar.** It merged into existing bullets, kept the page's format, and found more real additions on the maintaining pages. It also leaked the private name above, rewrote one sentence no fact contradicted, and costs eight times as much: a night does not fit the free allowance.

**The weak step is deciding what is worth keeping, on both models,** not the writing. Placing sent nearly every feedback fact to its author's page.

**Not run:** a new page and its hub line; a page near the 3,000-word limit; facts by more than one author.

## Acceptance: `/dream --dry-run` on the person's own assistant (2026-10-06)

Task 5.2, run in this repo by the steps of `.agents/skills/dream/SKILL.md`. No file, publish, or memory write.

**Gathered.** No earlier dream, so facts from 2026-09-06: 29 feedback, 32 reference, and 200 project facts (the search limit). The feedback and reference facts were each judged; the project facts were not read one by one in this run. `dream.mjs pages` listed 12 own pages and 37 shipped.

**Edits it would make, own pages.**

| Page | Edit | Fact |
|---|---|---|
| `wiki/people/matthew-wong.md` | The staging bullet gains its exception: memory and kept pictures stay live-only | #1054; source read: *staging doesn't need memory and kept pictures that's fine* |
| same | New bullet: ask in the chat; a private form only for sensitive things, and one form, not two | #1108, #1116, both his words |
| same | New bullet: a step handed back to the person comes with numbered steps and links | #1088, his words |
| same | New bullet: one ready draft to react to, not a menu | #900; source read: *why is this so much work* |
| same | The stray blank lines between bullets go | format |
| `wiki/maintaining/adding-a-skill.md` | A step for the text budget and the spec's area, which this build hit and the page does not name | this change's own build |

**Left in memory, from the same 29 feedback facts:** 8 product decisions (#1132, #1133, #1109, #1092, #1091, #1089, #1077, #1075), 11 interpretations his words do not carry (#1093, #1110, #1161, #1150, #1156, #1041, #999, #993, #939, #908, #1017), and 5 the page already says (#1011, #1010, #1074, #1076, #934 in part).

**Shipped pages, listed and not edited.** `wiki/development/required-tools.md` does not say *download a tool only when a task needs it, never during setup* (#934). `wiki/stack/cloudflare-credentials.md` does not say the user token can mint a short-lived token for a permission it lacks (#957).

**The other ten own pages:** read against their linked files and each other; no discrepancy found.

**Against the trial's faults.** The person page would grow from 478 to about 600 words, not 912; no product decision and no interpretation is written as a preference; no private name appears; every own page was read.

**Limit of this run.** The 200 project facts were not judged, so a first real dream will take longer and may find more for the maintaining pages.
