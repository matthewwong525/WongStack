# Prototypes

A prototype is a throwaway copy of the app that draws real *Before* and *After* pictures. [`prototype.mjs`](../scripts/prototype.mjs) runs each step, unasked; git never takes the copy.

1. `prototype.mjs start <change>` makes `.scratch/<change>-prototype`, with earlier rounds' edits. Edit the screen there, with sample data for each state; add no database migration.
2. Draw it as [a web app](#a-web-app) or by [a screen test](#an-app-the-preview-cant-serve): one picture per state in `<change>/pictures/`, in the bullet's `picture` fence after *Before*, which stays from the first round.
3. Notes change the copy: draw again and rebuild the page. `prototype.mjs finish <change>` keeps the edits as a diff for the build.

## A web app

`prototype.mjs upload <change>` puts the copy on the change's preview address, or `serve <change>` prints `PROTOTYPE_URL=` here. Add `Try it: <https address>`.

## An app the preview can't serve

Draw a phone or desktop app by its own screen test: *Before* first, then each *After*. Use the real app with a fake data source, its real fonts, screen size and platform, and no debug marks; no *Try it*. Remove the test and its pictures before `finish`: the diff holds only the screen's edits. Follow the repo's steps a path rule names; else work them out and write them, with their rule, in this plan. A system part, such as the keyboard, gets a `screen` sketch with `No real picture: <the part>, which only the phone draws`.
