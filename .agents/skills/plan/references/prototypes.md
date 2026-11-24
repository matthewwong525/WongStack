# Prototypes

A prototype is the screen as an HTML page in the app's real look, written while you plan. Run no app and change no database: sample data stands in.

1. Write *Before*, today's screen, and one *After* for each state the plan names, as files in `openspec/changes/<change>/pages/`, with the real words and sample data. Name them in one `page` fence: `Before: pages/inbox.html`, `After: pages/inbox-new.html`.
2. Give each page [the app's look](#the-apps-look), or [another app's look](#another-apps-look). A screen to try, such as a drag, is a `live` card with its own script.
3. Notes change the pages: rebuild the review page. The build makes each screen match its approved page.

Sign-in, missing data, or a change not live yet is no reason for a sketch: a page needs none of them.

## The app's look

Copy the screen's real class names onto the page, then run `node .claude/skills/plan/scripts/look.mjs page <file.html>`. It writes `<file>.css` beside it: the app's colors and parts, and the Tailwind rules the page's classes name. Link it: `<link rel="stylesheet" href="<file>.css">`.

## Another app's look

A phone or desktop app: copy its theme's colors, corners, and fonts into the page's own CSS, its font files beside it.

## What a page can't show

A part the system draws, such as the keyboard or the share sheet, may be a `screen` sketch, only beside the page, with one line that names the part.
