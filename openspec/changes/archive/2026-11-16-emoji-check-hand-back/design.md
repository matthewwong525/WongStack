# Design

## Context

The toolbar's *Hand back* icon is `.agents/plugins/browser/addon/check.svg`: a `#1a7f37` circle with a stroked white check, named by `manifest.json` as `browser_action.default_icon` and `icons.48`. `addons.mjs` copies the add-on folder at each start, so a new file shows at the browser's next start. Camoufox draws ✅ in pages with its bundled `fonts/TwemojiMozilla.ttf`, a COLR/CPAL colour font: glyph `u2705` is two layers, a `#77B255` rounded square and a `#FFFFFF` check.

## Goals / Non-Goals

**Goals:** the icon is the same drawing as the browser's own ✅.

**Non-Goals:** a per-system icon; changes to `manifest.json`, `background.js`, the badge, or the lines.

## Decisions

- **Copy the glyph out of the font, once, at build time.** Read `u2705`'s two COLR layers with fontTools, write each as a path in its CPAL colour, and flip the font's y-up units to SVG's y-down (a `TransformPen` with `(1, 0, 0, -1, 0, 448)`, the square's top), so the file has plain paths and a `viewBox` of the glyph's 512-unit square. The script is a one-off, not shipped. *Alternative:* draw ✅ as text on a canvas in `background.js` and `setIcon({ imageData })` at each start: exact in Camoufox too, but more code, and a font change in a later Camoufox build would change the icon without a review. *Alternative:* hand-draw a look-alike: not *exactly* the same.
- **Keep the file name `check.svg`.** `manifest.json`, the test, and `retired-names.json` already name it.
- **Credit inside the file.** Twemoji's art is CC-BY 4.0: a leading `<!-- ✅ from Twemoji (https://github.com/twitter/twemoji), © Twitter, Inc and other contributors, CC-BY 4.0 -->` comment travels with every copy.
- **Test the drawing, not the bytes.** `addons.test.mjs` asserts the copied `check.svg` has the `#77B255` and `#FFFFFF` fills and no `<circle>`, so a later swap back to a circle fails.

## Risks / Trade-offs

- [The ✅ in a chat on an Apple device is Apple's, a slightly different green] → same shape and white check; Apple's art may not be shipped.
- [The square reads smaller than the circle at 16 px] → the glyph fills its square edge to edge, so it is no smaller; checked in the live browser after build.

## Migration Plan

Ships with the browser module; the new icon shows at the browser's next start. After merge, `/ship` restarts the agent's browser and looks at the toolbar: the button is ✅, grey while nothing waits. Rollback: the old `check.svg`.
