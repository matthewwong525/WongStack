# Prototypes

A prototype is a screen a plan changes, written as an HTML page in the app's real look, so the plan's card shows the screen as it will go live, not a sketch. [Review pages](review-pages.md#the-prototype) owns what a card shows; this page owns how you make its pages. Part of [the WongStack wiki](README.md).

A page runs no copy of the app and changes no database, so no step needs a go from the person. Sign-in, missing data, or another change that isn't live yet is no reason for a sketch: a page needs none of them.

## Write the page

[The plan's prototype rules](../.agents/plugins/loop/skills/plan/references/prototypes.md) own every step: *Before* and each *After* state as files in the change's `pages/` folder, with real words and sample data, in one `page` card. A screen you need to try, such as a drag, is a [live card](review-pages.md#the-live-card) with its own script.

## The app's look

For a screen of this app, copy the screen's real Tailwind class names onto the page, then run [`look.mjs page`](../.agents/plugins/loop/skills/plan/scripts/look.mjs). It writes a stylesheet beside the page with the app's colors and parts from [`app/src/index.css`](../app/src/index.css), and the rules for each class the page names, made by the app's own Tailwind. The shadcn parts' exact spacing and colors are hard to copy by hand; the app's own Tailwind gets them right. With no `app/node_modules`, it writes only the colors and parts, and says to run `npm ci` in `app/`.

## Another app's look

A phone or desktop app, such as a Flutter app, has no Tailwind. Copy its theme's colors, corners, and fonts into the page's own CSS, with its font files beside the page. Example: Relay Everything's Settings page takes its colors from `mobile/lib/brand.dart` and its Inter font file.

## What a page can't show

The system's own parts, such as the keyboard or the share sheet, are not the app's. Draw one as a `screen` sketch only beside the page, with one line that names the part. It shows real words, never gray bars, and its label is *Sketch*. A card with a sketch alone doesn't build.

## Notes and the build

Notes change the pages: the chat updates the plan and the page, then rebuilds the review page. [`/apply`'s build](../.agents/plugins/loop/skills/apply/references/build-helper.md) makes each screen match its approved page, and [its preview](../.agents/plugins/loop/skills/apply/SKILL.md#finish-with-a-preview) shows *Approved* beside *Built*, so a gap shows before you publish. A website this app doesn't run has its own route: [a website prototype](review-pages.md#a-website-prototype).
