# One command for screen work, a design guide, and a friendlier starter look

**Status:** ready-to-ship
**Branch:** ui-skill-design-guide
**Open questions:** none

## Why

WongStack has no single place that says how a screen should look. Advice on screens sits in three places, the starter app is plain black and grey, and the assistant builds each screen from old web habits. So two screens in one install look unlike each other, and none of them feels friendly.

## What Changes

- **One command opens all screen work.** Before the assistant designs, builds, or changes a screen, it loads `/ui`. That command sends it to four sources, in this order. You can type `/ui` too.
  ```mermaid
  flowchart LR
    A[Screen work] --> B["/ui"]
    B --> C[UX principles: the job]
    B --> D[Design guide: the look]
    B --> E[Ready-made parts]
    B --> F[Web guidance, at need]
  ```
- **A design guide gives the feel, in your own colours.** One new wiki page holds the look every install shares: calm, roomy, and friendly, as Airbnb's screens feel. It uses no Airbnb font, colour, or code rule. Each install keeps its own brand.
  | Section | What it says |
  |---|---|
  | Colour | One accent colour for the main action. Grey for the rest. Red only for a problem. |
  | Type | The sizes and weights for a title, a heading, and text. |
  | Space | Much white space. More space between groups than inside them. |
  | Shape and depth | Large round corners. Soft, wide shadows. Few borders. |
  | Pictures | Big pictures with round corners, in a few fixed shapes. |
  | Words | Short, friendly words, as a person speaks. |
  | Motion | Small and quick. Off when the person turns motion off. |
  | Set your brand | The short list of values an install changes. |
  | The check | The design rules, and how to read a failure. |
- **The starter app wears the look.** Main buttons take the violet from the WongStack logo. Corners are rounder, shadows are softer, and titles are larger. The font stays the device's own. No screen gets a new layout.
  ```picture
  Before, Home: pictures/before-home.png
  After, Home: pictures/after-home.png
  Before, Hello: pictures/before-hello.png
  After, Hello: pictures/after-hello.png
  After, Hello dark: pictures/after-hello-dark.png
  ```
- **Your brand is one short list in one place.** An install changes these values once, and every screen and ready-made part follows. The plan's review page and the private pages follow too. A check fails when text on your accent colour is hard to read.
  | Value | Starter default |
  |---|---|
  | Accent colour | Violet from the logo, a little darker |
  | Text on the accent | Near white |
  | Font | The device's own |
  | Corner size | Larger than today |
  | Shadows | Three soft ones: low, card, raised |
- **The assistant looks up Google's web guidance when it needs it.** These are about 250 short guides from the Chrome, Edge, Firefox, and MDN teams: forms, dark mode, motion, access for everyone. The assistant asks for one guide at a time. WongStack copies none of them, and it names one fixed version of the tool, so a new version can't change your builds without a WongStack update. Where a guide and a ready-made part disagree, the part wins. With no internet, the work goes on without it.
- **Four design rules join the app's checks.** They flag nothing in the starter app today, so no screen changes. A new screen that breaks one fails the check, and the message names the fix.
  | Rule | What it stops |
  |---|---|
  | No raw colours | A colour outside your own set, such as a stray pink |
  | No inline styles | A style written on one element, outside the shared look |
  | No unknown classes | A misspelt style name that does nothing |
  | Classes the check can read | A style name built in a way the check can't see |
- **Each install gets all of this on its next update.** The update brings the command and the guide. It shows the starter look as a choice: an install that has its own colours keeps them. If the four rules flag an install's own screens, its update plan lists them.

**Non-goals:** a new layout for any single screen; Airbnb's font, brand colour, or code style guide; a copy of Google's guides inside WongStack; a font file that ships in the app; the two stricter design rules (made-up sizes, and restyling a ready-made part); the Claymoo look, which is its own part and builds on this one.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

- `design-guide`: one command that opens all screen work and names its four sources; the guide page that holds the shared feel with no install's brand in it; web guidance looked up at one fixed version, with nothing copied.

### Modified Capabilities

- `shared-look`: the starter shows one accent colour with readable text on it; an install's brand (accent, font, corner size, shadows) is one list in the app's stylesheet that every screen and standalone page follows; design rules in the app's checks hold a screen to that list.

## Impact

- New skill `.agents/skills/ui/SKILL.md`; `payload-files.json` (`core.skillDirs`, `ui.files`), `payload-manifest.md`, `.agents/rules/payload.md` paths.
- New page `wiki/design-guide.md`; links from `wiki/README.md`, `wiki/ux-principles.md`, `.agents/rules/code.md`, the plan skill's screen line, and setup's seed wiki README.
- `app/src/index.css` (brand values, shadows, type sizes), `app/src/style.test.ts` (updated look checks, a readable-accent check), `app/.oxlintrc.json` (four `shadcn/*` rules).
- `.agents/plugins/loop/skills/plan/references/look.css` (takes the app's font and shadows), `review-kit.html` beside it (each font rule reads the app's font first), `scripts/tests/look.test.mjs`, `scripts/tests/review-browser.test.mjs`.
- `scripts/check-app-checks.mjs` and its test (one bad sample for each design rule).
- New `scripts/tests/ui-skill.test.mjs`; `.agents/memory/areas.json` (a `ui` area for the new spec); `.agents/skills/update-dependencies/SKILL.md` (the fixed version); `scripts/fixtures/context-baseline.json` only through `measure-context.mjs`.
- `CHANGELOG.md`: `## Next (minor)`.
- Outside tool: `modern-web-guidance@1.0.0` from npm, run with `npx`; Apache-2.0; not a dependency of the app.

## Decision log

- **2026-11-13** — Asked (first chat) what "Airbnb-like" means → chose the feel of Airbnb's screens: much white space, large rounded cards, big pictures, one accent colour, soft shadows, short friendly words; not its font, brand colour, or code style guide.
- **2026-11-13** — Asked (first chat) how far this part goes → chose the guide plus the shared look (colours, font, corners, shadows), with no new layout for single screens.
- **2026-11-13** — Asked (first chat) what shape the UI skill takes → chose one new skill as the door for all screen work, pointing to the UX principles, the design guide, the ready-made parts, and the Google guidance.
- **2026-11-13** — Asked (first chat) how the skill builds on Google's Modern Web Guidance → chose a lookup at need with `npx modern-web-guidance search|retrieve`, nothing copied, one fixed version, and the ready-made parts win a disagreement.
- **2026-11-13** — Asked (first chat) where this lands → chose WongStack first, then Claymoo through its update.
- **2026-11-13** — Asked which sections the guide has → chose the whole feel: colour, type, space, shape and depth, pictures, words, motion, set your brand, the check.
- **2026-11-13** — Asked which accent the starter gets → chose the violet from the WongStack logo, made a little darker so white text on it stays readable.
- **2026-11-13** — Asked which font the starter uses → chose the device's own font, with the guide's sizes and weights.
- **2026-11-13** — Asked which design rules the check turns on → chose the four that flag nothing today: no raw colours, no inline styles, no unknown classes, and classes the check can read.
- **2026-11-13** — Assumed: the skill is named `ui`, because it is the shortest name a person will type and no WongStack skill has it.
- **2026-11-13** — Assumed: the guide is one wiki page, `wiki/design-guide.md`, in the `ui` payload group beside the UX principles, because that group already reaches each install and the skill-text size check does not count wiki pages.
- **2026-11-13** — Assumed: the skill stays under about 150 words and its description under about 27, because WongStack's size check has that much room left and a longer skill would need a cut elsewhere.
- **2026-11-13** — Assumed: the fixed version is `1.0.0`, because it is the newest, published 2026-11-10, and the search and retrieve commands were run against it for this plan.
- **2026-11-13** — Assumed: WongStack does not install Google's own skill file, because it tells the assistant to run first on every web task and to add a report section to each reply; the `ui` skill calls the tool's two commands only.
- **2026-11-13** — Assumed: the brand values (font, corner size, shadows) move into the same block as the colours, because the review page already copies every value in that block, so standalone pages follow a rebrand with no change to the reader.
- **2026-11-13** — Assumed: a repo with no app keeps today's plain grey review page, because the fallback copy is for a repo that set no look of its own.
- **2026-11-13** — Assumed: the readable-accent check reads colours written as `oklch()` or hex and fails on another form by name, because a silent skip would let an unreadable accent pass.
- **2026-11-13** — Assumed: the design gets no `## UX` section, because no screen is added or restructured; only the shared look changes.
- **2026-11-13** — Assumed: the page has no *Try it* link, because this clone holds no key for the preview address; the After pictures come from the prototype run on this computer.
- **2026-11-13** — Assumed: WongStack ships no shadcn skill, so "leave the shadcn skill as written" needs no task here; the code rule already says to leave each ready-made part as its command wrote it.
- **2026-11-13** — Check: `app/.oxlintrc.json` turns on four `shadcn/*` design rules at `error` (`no-raw-colors`, `no-inline-styles`, `no-unknown-classes`, `require-static-classes`), because the plan chose them to hold each screen to the brand list, and they flag nothing in the starter app today.
- **2026-11-13** — Assumed: each task's own check ran once at the end, not between tasks, because the build brief writes all source and tests before any check runs.
- **2026-11-13** — Assumed: the plan skill links `/ui` by its full GitHub address, because a module's pages may not use a relative link that leaves the module.
- **2026-11-13** — Assumed: the skill's description is 18 words, because the start-up size check has 96 bytes of room, which is less than 27 words.
- **2026-11-13** — Assumed: the updater moves the fixed version in its own `web-guidance-pin` stage and hands the search and the retrieve command to the agent, on a rerun too, because the design moves the version only with a change that runs both commands.
- **2026-11-13** — Assumed: the brand-list check asks for all eight values in the light set only, because the dark set sits on the same element and takes over a value it does not set.
- **2026-11-13** — Assumed: `wiki/stack/mini-apps.md` now says *one accent colour on primary actions*, not *black or white primary actions*, because the old words are wrong once the starter is violet.
- **2026-11-13** — Assumed: the loop module goes from 3.0.0 to 3.1.0, because its plan skill and its `look.css` changed and the module check needs a higher version for a changed folder.
- **2026-11-13** — Assumed: `scripts/check-app-checks.mjs` and its test gain one bad sample for each of the four design rules, because the plan's scenario needs a rule that fires, and a match on the settings' text passes when a rule is silent. It only adds a test.
- **2026-11-13** — Assumed: the review kit's own font rules read `--font` first, a diagram's font too, because the kit's `body` rule beat the look's and a built page stayed in the device's font. `/apply`'s preview page is built from the same kit, so it follows; the key link, the live view and a closed link's page set no font of their own.
- **2026-11-13** — Assumed: the readable-colour check also reads `#rgb` and an `oklch()` alpha of exactly 1, and says *write it solid, as oklch(L C h), #rgb or #rrggbb*, because the old message named a form the value already used.
- **2026-11-13** — Asked whether the starter's font check passes with an install's own font → chose any font passes: the check asks only that the font is set once in the brand list and that every screen reads it from there.
- **2026-11-13** — Check: `app/src/style.test.ts` no longer requires the device's font (`system-ui, sans-serif`); it requires a `--font` value in the brand list and `--font-sans: var(--font)`, because the design guide tells an install to set its own font and the old line failed on it with no fix named.
- **2026-11-13** — Assumed: an install whose screens can't meet a design rule yet turns it off for those files alone, in an `overrides` entry, because turning the rule off for the whole app fails the proof of the checks, and letting that proof skip a rule would weaken it.
- **2026-11-13** — Assumed: the readable-colour check also reads `none`, a signed hue, a hue unit, and a chroma in percent, and fails on a mistyped number by name, because a tool writes those solid forms and a mistyped number passed with no word.
- **2026-11-13** — Assumed: a source-only check in `scripts/tests/look.test.mjs` holds the starter to the device's font, because the app's own check now takes any font and the starter still ships the device's.
- **2026-11-13** — Archive checkpoint: every task is done, the preview showed the violet primary button, round corners, and soft shadows on Home and Hello in light and in dark, and the release is numbered 61.6.0.
