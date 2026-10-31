# Service key guides

The service key guides are public pages at [wongstack.com/guides](https://wongstack.com/guides). Each one shows a person, or their AI agent, how to make one tool's key, save it, check it, and replace it if it leaks. They are part of [the landing page](landing-page.md) site, so no install receives them, and they follow every rule of that site.

## What a guide holds

Each guide is one Markdown file in [`site/guides/`](../../site/guides/). The file name is the address: `shopify.md` is `/guides/shopify`.

The front matter holds `title`, `name`, `summary`, `order`, `minutes`, `needs`, `lastChecked`, and `env` (the `.env` names it saves). Then these parts, in this order:

1. `## What you make`: what the key is, and what it can and can not do.
2. `## Steps`, or two step parts such as `## Steps: Google Workspace` and `## Steps: personal Gmail`. Each step is a numbered `###` heading with one picture.
3. `## Permissions to choose`: the least access, as a table.
4. `## Save it`: the `.env` lines, and a link to `/guides/keep-keys-safe`.
5. `## Check it works`: one command, and what a good answer and each common error look like.
6. `## If it leaks`: make a new key, put it in `.env`, then delete the old key.
7. `## Sources`: the tool's own help pages.

The build adds [`site/guides/_agent.md`](../../site/guides/_agent.md) at the top of every guide: the rules an AI agent follows. [`keep-keys-safe.md`](../../site/guides/keep-keys-safe.md) is a plain page that every guide links. [`site/src/guides.test.tsx`](../../site/src/guides.test.tsx) fails on a missing part and names the guide and the part.

**A guide never names WongStack**, and names no one agent as needed. Anyone can use it, with any agent. The test reads every guide for the name.

## How the pages are built

[`site/scripts/build-guides.mjs`](../../site/scripts/build-guides.mjs) runs after `vite build`. It writes a static page for each guide that reads in full with no script, a plain-text `.md` copy with full addresses, the `/guides` list, `guides.md`, and `llms.txt`. Each page loads one script, the site's own [`copy.js`](../../site/public/guides/copy.js), which adds a *Copy* button to each code box; a test fails on any other script, or if it stores or sends anything. The header and footer links are copies of [`SiteHeader.tsx`](../../site/src/SiteHeader.tsx) and [`SiteFooter.tsx`](../../site/src/SiteFooter.tsx); the test fails when the two differ. [`Site.test.tsx`](../../site/src/Site.test.tsx) reads the built guides for hosting words, prices, and outside files, as it reads every page: [no hosting offer](landing-page.md#no-hosting-offer).

## Add a guide

1. Read the tool's own help pages. Write the current path, and the address of each page you used.
2. Copy a short guide, such as [`slack.md`](../../site/guides/slack.md), and change it. Give it the next `order`.
3. Take the pictures (next part).
4. Add its name to `TOOLS` in [`guides.test.tsx`](../../site/src/guides.test.tsx), and run the site's tests and build.
5. Before you publish, the owner makes a real key with the guide and runs its check, so each step matches the screen.

## Take the pictures

Take each step's picture with the owner's saved browser logins, through [the browser helper](../development/browsing.md#saved-browser-logins). Pictures go in `site/public/guides/<id>/` as `01.webp`, `02.webp`, and so on, each under 150 KB.

- **Stop before any button that makes or shows a key or secret.** Take the picture of the form, with the button marked, and do not press it. Leave the form without saving.
- **Draw every screen that shows a key** as an SVG, never a photo. A photo of a key leaks it, and so does a blurred one.
- If no saved login works for a tool, ask the owner to sign in. Never make a picture look like a real screen.
- **A picture the owner will take goes on the shot list**, [`site/guides/shot-list.json`](../../site/guides/shot-list.json): its address, the page to open, what to show, and where to stop. The guide still names the picture; the build leaves it out until the file exists, so the guide can go live first. When the owner sends the screenshot, crop, mark, and blur it, save it under its address, and delete its entry. A check fails on an entry whose file exists, or a missing picture with no entry.

### Crop, mark, and blur

Blur every name, email, store, project, and account ID that is not the reader's own. Crop to the part the step is about, mark the button with a red box, and make it at most 1200 pixels wide. With ImageMagick:

```bash
magick shot.png \
  -region 224x20+528+324 -blur 0x12 -blur 0x12 +region \
  -fill none -stroke '#ff4830' -strokewidth 4 -draw "roundrectangle 326,194 814,242 10,10" \
  -crop 560x520+284+150 +repage -resize '1200x>' -quality 80 site/public/guides/google/03.webp
```

`-region` takes `width x height + left + top`, so blur a box a little bigger than the text. Look at the result before you save it: a blur that misses one letter shows the whole name.

### Draw a key screen

A drawing uses the site's dark look: background `#141414`, boxes `#1f1f1f`, lines `#333`, text `#f5f5f5`, quiet text `#a3a3a3`, and marks `#ff4830`. The title bar shows the tool's web address and the word *Drawing*, so no one takes it for a photo. Every key, token, or secret shows as dots. Copy an existing one, such as [`slack/07.svg`](../../site/public/guides/slack/07.svg), and change the words to the real labels on the screen.

Look at a drawing in a browser before you save it. ImageMagick draws SVG lines wrong, so its picture is not a check.

## Recheck a guide

Tools move their buttons. Recheck each guide at least once a year, and when a reader says a step is wrong:

1. Walk the steps with a saved login, to the stop point.
2. Change any step, label, or picture that moved.
3. Run the check with a real key, if the owner has one.
4. Change `lastChecked` to the date you checked. The page shows it to the reader.

Part of [Maintaining WongStack](README.md).
