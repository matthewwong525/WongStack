# Design

## Context

See proposal.md for why. The README's first screen (title block, "What you can ask", "Start in three steps") is pinned by `open-source-release`; its link to the philosophy page is pinned by `knowledge-center`. The private-name matcher is one regex in `scripts/tests/private-names.test.mjs`, the only list of private names. The landing page's copy (wongstack-cloud, change `claymoo-landing`, `design.md` copy table) is the source for the story and the three example apps.

## Goals / Non-Goals

**Goals:**

- The README and the landing page tell one story in the same words where they overlap.
- Everything below "Start in three steps" in the README stays as it is, except "What you get".

**Non-Goals:**

- No change to anything that ships to an install: the `WONG-STACK` block, `wiki/`, skills, and the starter app.

## Decisions

### README copy

`/apply` uses this word for word; a reviewer changes a word here.

| Place | Today | After |
|---|---|---|
| Lead line | **Your own AI assistant that remembers you and gets things done.** Ask in plain words… | **The setup I use to run Claymoo. Now yours.** I run Claymoo, a clay-kit company, with a small team. We ask for what the business needs in plain words, the way you'd message a coworker. It builds our tools, runs our errands, and remembers how we work. Everything it builds and learns lives in accounts you own. — Matt |
| "What you can ask" bullet 1 | *"Find three quiet cafés near the office that open before 8."* | *"Time each order we pack, and tell me what packing costs us."* Our warehouse team packs every order with the app it built. |
| Bullet 2 | *"Plan my week around the Thursday deadline."* | *"Show our profit for each sales channel, after ads, shipping, and fees."* I check it on my phone every morning before I decide where to spend on ads. |
| Bullet 3 | *"Make me a page that splits a restaurant bill."* You read a short plan… | *"Make a brief page for our designers."* You read a short plan, get a link to try it, and say publish to put it live. |
| Bullet 4 | *"Every weekday at 9, list what is due today."* With the optional Paseo app… | *"Every weekday at 9, list the orders that haven't shipped."* With the optional [Paseo](https://paseo.sh) app, it runs on a schedule. |
| Bullet 5 | *"Remember that I prefer short answers."* It still knows next week. | *"Remember that the ops lead signs off on refunds."* The whole team's chats know it next week. |
| After the list | It asks before it sends, buys, or deletes anything. | unchanged |
| "What you get" · apps | **Small apps from one request.** | **Tools that fit your business, from one request.** (rest of the bullet unchanged) |
| "What you get" · memory | **An assistant that remembers.** Each chat starts with what earlier chats learned about you and your work. | **One memory for the whole team.** Each chat starts with what earlier chats learned about your business and the people in it. (memory link unchanged) |
| "What you get" · notebook | …how you like work done, who is who… | …how your business runs, who is who… |
| Other "What you get" bullets | — | unchanged |

### The matcher narrows, not a per-file exemption

`PRIVATE` becomes `/claymooapp|wongos|wongstack-cloud/i`. The first unit test gains `{ path: 'wiki/company.md', text: 'I run Claymoo, a clay-kit company.' }`, which is not flagged. It keeps `ClaymooApp` in `wiki/example.md` flagged.

- Alternative: exempt `README.md`. Rejected: the README could then name the private repositories too, which is what the check exists to stop.

### AGENTS.md

In "What this is" only: "a **personal AI assistant and knowledge center** that lives in a repo" becomes "an **AI assistant and knowledge center a business owner and their team run their business on**, living in a repo". The `WONG-STACK` block is untouched.

## Risks / Trade-offs

- [The README and the landing page drift as either one changes] → The README reuses the landing page's words for the story and the three apps. A later landing-page edit is a one-line README follow-up.
- [Developers who arrive from GitHub read a business pitch] → "For developers" is unchanged and still one scroll down.
- [A narrower matcher lets "Claymoo" through in text that means the private app] → The app's name, `ClaymooApp`, is still blocked. Prose saying "Claymoo's app" is about the company.
