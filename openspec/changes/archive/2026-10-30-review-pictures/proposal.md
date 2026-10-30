# Proposal

**Status:** ready-to-ship
**Branch:** review-pictures
**Open questions:** none

## Why

You review a code change twice: the plan before the build, and the preview before you publish. A plan page shows only sketches and can not hold a real picture. After a build you get a preview link and one or two pictures in chat, with no easy way to point at the part to fix. You want to see the real screen and say exactly what to change.

## What Changes

- **A plan can show real pictures.** A picture file in the change's own folder shows on its page, open at the start. Two pictures sit side by side, each with its label, such as *Before* and *After*. The page keeps every picture inside itself, so it opens with no internet. A tap on a spot in a picture leaves a note there, as on a drawing.
  | Picture | Allowed |
  |-|-|
  | A file in the change's folder | Yes, up to 300 KB |
  | Over 150 KB | Yes, with a warning |
  | A web address, or a file outside the folder | No: the build stops |
  | A page over 500 KB, too big for the Inbox | No: the build stops |
- **A plan that changes a screen you can open today shows a screenshot of it.** The plan step opens the screen as you and takes a picture. That picture is the *Before*, above the sketch of the new screen. When the screen can not open, the plan says why and shows the sketch alone.
  ```mermaid
  flowchart TD
    plan["/plan"] --> live{"screen opens?"}
    live -->|yes| shot["screenshot"] --> pair["Before, then sketch"]
    live -->|no| why["say why"] --> mock["sketch alone"]
  ```
- **Sketches use real words.** A screen sketch uses real labels and the app's parts; a gray bar shows only text that is not known yet. The rule that asked for low detail on purpose goes.
- **After a build, one review page shows the changed screens.** Each changed screen shows *Live now* beside *Preview*, on a phone, and on a computer too where the layout differs and the page has room. A new screen shows its preview alone. You tap a spot to leave a note, such as *this button is too small*. **Send notes** sends your notes to the chat, which changes the build; **Publish** asks *This goes live and can't be undone* first. This page takes the place of the pictures in chat.
  ```screen
  <div class="card col gap phone">
    <b>Built: look, then publish?</b>
    <div class="row gap">
      <div class="card col gap grow"><span class="muted">Live now</span><div class="skeleton"></div></div>
      <div class="card col gap grow"><span class="muted">Preview</span><div class="skeleton"></div></div>
    </div>
    <span class="tag-outline">Note: "this button is too small"</span>
    <div class="row gap"><button class="btn-primary grow">Send notes</button><button class="btn-ghost grow">Publish</button></div>
  </div>
  ```
  ```picture
  Built with this change: pictures/preview-page.png
  ```
- **A page shows only the buttons its link offers.** Before, *Build it* and *Build and publish* showed only when the link offered both. A plan page still offers both, so it looks as before.

Non-goals: no review kit or framework for other skills; no new layout for the plan page; no picture shrinking.

## Capabilities

### New Capabilities

### Modified Capabilities
- `ux-wireframes`: *A visual is a narrow drawing* adds the `picture` fence; *Screen sketches show each state and the change* adds the Before screenshot and drops low fidelity; *A plan on a reply link can start its build* shows each build button when the link offers it.
- `apply`: *Preview pictures precede the publish choice* moves the pictures from chat to a preview review page with notes and Publish.

## Impact

- `.agents/skills/plan/scripts/build-review.mjs`: the `picture` fence and a `preview` page kind.
- `.agents/skills/plan/references/review-kit.html`: picture styles, buttons per offered action, and the preview page's words.
- New `.agents/skills/apply/scripts/preview-review.mjs`; it ships with the `apply` skill folder.
- `.agents/skills/plan/SKILL.md`, `references/drawings.md`, `.agents/skills/apply/SKILL.md` and `wiki/ux-principles.md`.
- Tests: `review-pictures`, `review`, `review-browser`, `preview-review` and `cli-conventions`.
- Reply link and Inbox: no new message type; a preview page offers only `publish`.
- No new dependency: screenshots use the browser helper's `screenshot`.

## Decision log

- **2026-10-30** — Asked what pictures a plan shows → chose Before screenshots, real screen sketches and flow pictures, with less text.
- **2026-10-30** — Asked whether to build a review kit for every skill → chose the smaller version: real pictures in plans, a Before screenshot, real-word sketches, and a review page for the built screens.
- **2026-10-30** — Assumed: a picture over 300 KB warns, over 1 MB stops the build, and a page stops at 3 MB, with no shrinking, because each page stays in git, must open fast on a phone, and WongStack has no image tool.
- **2026-10-30** — Assumed: the preview page and its pictures live in the checkout's `.scratch/` folder, outside git, because they are for one moment.
- **2026-10-30** — Assumed: a preview page offers Send notes and Publish only, and Publish runs `/ship`, because the build is done.
- **2026-10-30** — Assumed: a Before screenshot sits above its sketch, not in one frame with it, because a picture and a sketch are drawn differently.
- **2026-10-30** — Assumed: the page's messages to the reply link and the Inbox stay the same, because both already take a page's own list of next steps.
- **2026-10-30** — Assumed: a picture warns over 150 KB and stops over 300 KB, and a page stops over 500 KB, replacing the 300 KB / 1 MB / 3 MB limits above, because the Inbox refuses a page over 512 KB and a larger page silently fell back to a tunnel link (found in the second look).
- **2026-10-30** — Assumed: the drawing guide keeps its free-drawing (`svg`) example and the plan skill's sample flow keeps its archive step, trimming other words to stay in WongStack's skill text budget, because the build had cut them only for the budget (found in the second look).
- **2026-10-30** — Archived for release 45.1.0 from branch `review-pictures`; WongOS takes it through `/wong-sync` for its plan `visual-review-kit`.
