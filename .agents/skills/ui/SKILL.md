---
name: ui
description: Load before screen work, to design, build, or change a screen, a page, a part, or a style.
user-invocable: true
---

# /ui

Before you design, build, or change a screen, read four sources, in order:

1. [UX principles](../../../wiki/ux-principles.md): the job, the flow, one primary action.
2. [Design guide](../../../wiki/design-guide.md): the look and the brand values.
3. The ready-made parts, by [the code rule](../../rules/code.md#where-things-go).
4. Web guidance, at need: `npx -y modern-web-guidance@1.0.0 search "<2 to 5 words>"`, then `retrieve "<id>"`. A part wins a disagreement: it is the app's look. No answer → go on, and say the web guidance was not read.

Finish with `npm run lint` in `app/`: a design-rule failure names the fix.
