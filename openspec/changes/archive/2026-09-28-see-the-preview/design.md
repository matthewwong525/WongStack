## Context

`/apply` ends a build by writing the preview URL as chat text, then asking *publish it?* through the question tool. Some hosts (Paseo's app among them) hide chat text written just before a question card, so the link never shows. The plan's review link had the same problem; [`asking-the-user.md` *Print the plan's link*](../../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link) fixed it with a *Review the plan* option whose reply prints the link and asks nothing.

## Decisions

- **Mirror *Review the plan* in the shared convention.** Add a short *Print the preview's link* section under *Print the plan's link* in `asking-the-user.md`: the fixed line *Click here to see the preview:* plus the URL (a mini app's `/apps/<name>/` URL on the next line), above the question, never inside it; a closing question below a preview link offers *See the preview*; picking it ends the next reply with those lines and no question, starting nothing. One copy, so `/apply` and a direct `/save` share it.
- **Link the page that shows the change.** The preview line carries the full URL of the changed page (`/apps/<name>/`, `/settings`), since the upload's URL is the home page and leaves the person hunting. The home page only when the change has no page.
- **A blank line before the next-step line.** Markdown joins two adjacent lines into one paragraph, so `build-review.mjs` prints `\n\n` between the plan's link line and *When you're ready…*; the convention says to copy both with the gap.
- **Allow it as a fourth option.** `/apply`'s finish already has three choices (publish, change more, save); *See the preview* makes four, like *Review the plan*. Update the fourth-option bullet and the "only the reply to *Review the plan* ends without a question" line.
- **`/apply` step 4 links the rule** rather than restating it, and offers the choice only when a preview was uploaded.
- **Stay inside the context budget.** Offset the added words with cuts in the same files so `measure-context.mjs --check` passes.

## Risks

- A fourth option crowds the question on a phone. Accepted: the same trade *Review the plan* already makes.
