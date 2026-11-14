# Design

## Context

See proposal.md, Why. [`wiki/maintaining/service-guides.md`](../../../wiki/maintaining/service-guides.md) owns the picture rules: the stop point, what to blur, the red box, the size, and the ImageMagick command. This design adds only how the pictures arrive over chat and how a partial set ships.

The build already hides a step's picture while its address is on [`site/guides/shot-list.json`](../../../site/guides/shot-list.json) (`withoutPending` in `site/scripts/build-guides.mjs`). `site/src/guides.test.tsx` fails on a picture over 150 KB, a shot-list entry whose file exists, and a named picture with neither a file nor an entry. So each picture is safe to add alone.

## Goals / Non-Goals

**Goals:** each sent screenshot ends as `site/public/guides/<id>/NN.webp` with its entry deleted, and each guide publishes once its group is complete.

**Non-goals:** no new code or test, no change to the build, no browsing. The agent never opens these tools.

## Decisions

### Find the screenshot as a file

A picture sent in chat is saved by the chat app as a file: Paseo puts uploads under `~/.paseo/uploads/upload_<id>/`. Use the path the chat gives, else the newest upload folder. Copy it to `.scratch/shots/` (git-ignored) to work on it, and never commit the raw file. If no file can be found, ask the person to send it as a file attachment. Match each screenshot to its shot-list entry by what it shows; when a message holds several, confirm the match in the reply.

### Clean each picture by the wiki command

Read the raw screenshot first to find the button and every private text. Run the wiki's `magick` command with one `-region … -blur 0x12 -blur 0x12` per private text, one red `roundrectangle` around the button, a `-crop` to the step's part, `-resize '1200x>'`, and `-quality 80` to WebP. Then read the result and zoom on each blur. A letter that still shows means a bigger region and a new run. Over 150 KB → lower `-quality`, then crop tighter.

Alternative: a script that takes boxes and writes the picture. Rejected: the boxes come from looking at each picture, and the one command is already in the wiki.

### Refuse a key or the wrong screen

A screenshot that shows any key, token, password, or secret, whole or in part, is never saved: delete the raw file from `.scratch/` and ask for a retake before the button. A screenshot of another screen than the entry's `show` gets a retake request that quotes the entry.

### Fix a step that moved

If the screen's labels differ from the step's words in `site/guides/<id>.md`, change the words to the screen's, keep the `### N.` heading shape, update the picture's alt text, and set `lastChecked` to the date of the screenshot.

### Ship a guide at a time

Each guide is one task group. When a group is complete and the person chooses to publish, any group still open moves out first: `openspec new change "guide-screenshots-<n>"`, copy this proposal and design, and move the open groups' tasks there. Then this change has only finished tasks and ships through `/ship`. The next change repeats the same steps. Alternative: one change for all 16. Rejected by the person's choice to publish each guide when done.

## Risks / Trade-offs

- [A blur misses part of a name] → read each blur zoomed in before saving; the person sees every picture on the preview before publish.
- [The chat app does not keep the picture as a file] → ask for a file attachment instead.
- [A screenshot is wider than tall phone pictures] → crop to the step's part; the page scales it to the column.
- [Several small publishes] → each runs the site's checks only, since only `site/` changes.

## Migration Plan

None: a picture appears when its file lands. Rollback is putting the entry back on the shot list and deleting the file.
