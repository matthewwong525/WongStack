# Prototypes

A prototype is a throwaway copy of the app that a plan changes and draws, so the plan's card shows real *Before* and *After* pictures, not a sketch. [Review pages](review-pages.md#the-prototype) owns what a card shows; this page owns how you make its pictures. Part of [the WongStack wiki](README.md).

[`prototype.mjs`](../.agents/plugins/loop/skills/plan/scripts/prototype.mjs) runs the copy's steps. No step needs a go from the person, and git never takes the copy.

## Make the copy

`prototype.mjs start <change>` makes the copy at `.scratch/<change>-prototype` and prints its path. When an earlier `finish` left a diff, the new copy starts with those edits. Edit the screen in the copy.

Write sample data into the screen for each state and for data the copy can't reach, such as another service's: the copy changes no database. Add no file in `schema/migrations`.

Then take the pictures by the route that fits the app: [a web app](#a-web-app), or [an app the preview can't serve](#an-app-the-preview-cant-serve).

## A web app

1. `prototype.mjs upload <change>` puts the copy on the change's preview address. A new file in `schema/migrations` stops it, because the preview shares the practice database. When `upload` can't run, `prototype.mjs serve <change>` runs the copy on this computer and prints `PROTOTYPE_URL=`: take the pictures there, and stop it when you are done.
2. Take one picture per state the plan names, with [the browser](development/browsing.md) (`browse.mjs screenshot`), at phone width and the visible part only. Copy them to `<change>/pictures/`, and write them in the bullet's `picture` fence after the *Before* picture, with a `Try it: <https address>` line. *Try it* opens a new tab; an address that is not `https://` stops the builder.

*Before* is a screenshot of today's screen, by [the review file's rules](ux-principles.md#the-review-file).

## An app the preview can't serve

A phone app, a desktop app, or any app the browser can't open fails `upload` and `serve`. Don't stop at the sketch: draw the app with its own screen test, in the same copy. Examples: a Flutter widget test that saves a picture, an iOS or Android UI test screenshot, or a desktop app's window capture.

1. **Draw *Before* first.** Run the screen test in the copy before you edit the screen.
2. **Edit the screen, then draw *After*** with the same test, one picture per state the plan names.
3. **Remove the picture test and the pictures it saved from the copy** before `finish`, so the diff the build reads holds only the screen's edits.

Every screen test follows the same rules:

- **Run the real app with a fake data source and sample data**, not a mock of the screen.
- **Load the app's real fonts.** A test font can draw letters and icons as blocks, and a block picture looks real but is wrong.
- **Set the app's real screen size and platform**, such as an iPhone's or a desktop window's, so the layout is the one people see.
- **Hide debug marks**, such as a debug banner.
- **Save one PNG per state at the app's own width**, and copy each to `<change>/pictures/`. The card has no *Try it* link, because nothing is online.

In a later round, *Before* stays from the first round, and `start` brings back the earlier edits.

### The repo's own steps

Each test kit runs differently, so each repo writes its own steps once. Follow the page the repo names for that app, linked from a path rule, `.agents/rules/<app>.md`, whose `paths:` match the app's folder.

No page yet → work the route out, and don't give up at the first failed step. Once a picture is right, write that page and its rule in the same plan: it is [repeatable knowledge](wiki-style.md#repeatable-knowledge). Example: Relay Everything keeps its Flutter steps in `wiki/development/phone-pictures.md`, with `.agents/rules/mobile.md` pointing at it; a picture takes about 2 seconds, with no phone.

## What no test can draw

A screen test draws the app, not the phone or computer around it. It can't draw the system's own parts: the text menu, the share sheet, the keyboard, permission questions, or the file picker.

Show the real *Before* and the real *After* of the app's own screen. Sketch only the system's part, in a `screen` fence, and add a line `No real picture: <the part>, which only the phone draws`. Where the repo has a device check, the build's run of it gives the *Built* picture.

## Notes and the build

1. Notes on the plan change the copy too: draw new pictures, by upload or screen test, and rebuild the page.
2. `prototype.mjs finish <change>` keeps the copy's changes as `.scratch/<change>-prototype.diff` and removes the copy. [`/apply`](../.agents/plugins/loop/skills/apply/SKILL.md#build-in-a-helper) runs it when the copy is still there, and [its build](../.agents/plugins/loop/skills/apply/references/build-helper.md) reads that diff first and builds the same screens properly, with real data and tests.
3. After the build, draw the built screen by the same route, and run `preview-review.mjs --approved "<title>|<After picture>|<built picture>"`. It shows the approved picture and the built screen side by side, as *Approved* and *Built*.

A website this app doesn't run has its own route: [a website prototype](review-pages.md#a-website-prototype).

## When every way fails

Only when no route draws the screen, keep the `screen` sketch and add a line `No real picture: <the step that failed>` to the bullet. [The builder](../.agents/plugins/loop/skills/plan/scripts/build-review.mjs) warns on a sketch with neither a picture nor that line. [The drawing guide](../.agents/plugins/loop/skills/plan/references/drawings.md) says how to write the sketch.
