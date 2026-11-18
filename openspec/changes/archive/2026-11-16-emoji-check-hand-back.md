<!-- openspec-archive v1 2026-11-16-emoji-check-hand-back -->
<!-- file proposal.md utf8 2639 -->
# The Hand back button looks exactly like ✅

**Status:** ready-to-ship
**Branch:** match-handback-check-emoji
**Open questions:** none

## Why

Each line that gives you the browser says *tap ✅ at the top right*. But the button there is a dark green circle, and ✅ is a lighter green square with round corners. So the button you must find does not look like the one the line names.

## What Changes

- **The Hand back button becomes the ✅ emoji itself.** It is the same drawing the browser uses when it shows ✅ in a page: a light green square with round corners and a white check. It stays at the top right, still counts the tabs that wait on you, and is still grey when nothing waits.
  ```picture
  Before: pictures/before.png
  After: pictures/after.png
  ```

**Non-goals:** new words in the lines; a new place for the button; a different look on each computer.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the toolbar's Hand back shows the browser's own ✅ emoji drawing, not a green circle.

## Impact

- `.agents/plugins/browser/addon/check.svg`: replaced by the ✅ glyph from the browser's emoji font, Twemoji Mozilla, with its CC-BY 4.0 credit.
- `scripts/tests/addons.test.mjs`: checks the copied icon is the ✅ drawing.
- `.agents/plugins/browser/VERSION` and `CHANGELOG.md`: a `patch` entry. The new icon shows at the browser's next start.

## Decision log

- **2026-11-15** — Assumed: the icon copies the ✅ that the agent's browser draws, from its own emoji font, Twemoji Mozilla, because it is the one drawing we may ship; Apple's ✅ may not be copied. On a phone or a Mac, the ✅ in the chat is Apple's, which has the same shape and colours, a slightly different green.
- **2026-11-15** — Assumed: the drawing ships as an SVG file, not ✅ drawn as text at each start, because a file looks the same on every computer and needs no new code.
- **2026-11-15** — Assumed: the credit for the Twemoji drawing goes in a comment inside the icon file, because it then travels with every copy of the file.
- **2026-11-16** — Assumed: the icon's `viewBox` is the glyph's own 512-unit square, `0 0 512 512`, so the y flip uses the square's top (448), not the font's ascent (477), which would leave a 29-unit gap. Checked in Camoufox: the icon and the font's ✅ render the same.
- **2026-11-16** — Archive checkpoint: built and archived inside /ship. The live check started a separate test browser from this build, so no other chat's browser stopped: the toolbar ends with 1Password, then ✅, faded while nothing waits.

<!-- end proposal.md -->
<!-- file design.md utf8 2464 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 876 -->
# Tasks

## 1. The icon

- [x] 1.1 Replace `.agents/plugins/browser/addon/check.svg` with the `u2705` glyph from Camoufox's `TwemojiMozilla.ttf`, y-down paths in their CPAL colours, with the CC-BY 4.0 credit comment; verify a render beside the font's own ✅ matches.
- [x] 1.2 In `scripts/tests/addons.test.mjs`, assert the copied `check.svg` has the `#77B255` and `#FFFFFF` fills and no `<circle>`; verify `node --test scripts/tests/addons.test.mjs` passes.
- [x] 1.3 Add a `## Next (patch) — The Hand back button looks exactly like ✅` entry to `CHANGELOG.md` with a nothing-to-do **Updating.** note, and raise `.agents/plugins/browser/VERSION` to 3.4.1; verify `node scripts/check-payload-links.mjs` passes.

## 2. Checks

- [x] 2.1 Restart the agent's browser from this build and screenshot its toolbar; verify the button is the ✅ drawing, grey while nothing waits.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 2080 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A bell marks each tab that waits on the person, and one Hand back ends them all

While a chat's turn is open, in a live view or in the browser window, that chat's tab title SHALL begin with a bell, kept through page changes and removed when the turn ends; no other tab SHALL show a bell. The browser SHALL show one *Hand back* button in its own toolbar, which no site can see, with the number of open turns. The button SHALL look like the ✅ emoji as the browser draws it in a page, a green square with round corners and a white check, never a bell or a circle, and SHALL be grey and do nothing while no turn is open. Every line that gives the person the browser, in a live view or in the chat for the browser window, SHALL tell them, in as few words as it can, to tap or click the green check when they are done, and where it is; a watch link's line SHALL name its own *Hand back* instead. Clicking it SHALL end every open turn and SHALL tell each of their chats, and each agent SHALL read its page afresh and ask in the chat before a further step on a page whose step is not finished. *Done* in a chat, a close, or a time limit SHALL end only that chat's turn. The watch link SHALL take no bell, and the toolbar *Hand back* SHALL NOT end it.

#### Scenario: Two chats wait, one Hand back

- **WHEN** one chat waits on a sign-in and another on a card, each tab with its bell, and the person finishes both and clicks *Hand back* in the toolbar
- **THEN** both bells go, both chats are told and carry on, and each reads its page afresh

#### Scenario: Hand back before a step is done

- **WHEN** the person clicks *Hand back* while the card tab still shows its card page
- **THEN** the card's chat presses nothing on that page and asks in the chat what to do

#### Scenario: The line names the green check

- **WHEN** a chat gives the person the browser to sign in to Netflix
- **THEN** its line tells them in one short line to sign in, then to tap ✅ at the top right, and the toolbar shows the same ✅ with the count 1

<!-- end specs/browser-logins/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-15

~~~
<!-- end .openspec.yaml -->
<!-- file pictures/after.png base64 8904 -->
iVBORw0KGgoAAAANSUhEUgAAAIwAAACCEAIAAABLOGtaAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRP///////wlY99wAAAAHdElNRQfqCw8XMgJOrzOrAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI2LTExLTE1VDIzOjUwOjAyKzAwOjAwi3uEMQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNi0xMS0xNVQyMzo1MDowMiswMDowMPomPI0AAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjYtMTEtMTVUMjM6NTA6MDIrMDA6MDCtMx1SAAAY9klEQVR42u3dZ1gUV9sH8PvMNlh6R3onNJWIilFUsGMNosYWjTWWGGOiRo0mxhiT2GsQkxiNsQMW1NgAlWLDAiIgSxekSNkFl61z3g+b503yPCkaZ51l9/w+8Ilr7nvOxZ9pZ86g5ubm5tZWIAjiJVBsN0AQ+oAEiSAYQIJEEAwgQSIIBpAgEQQDSJAIggEkSATBABIkgmAACRJBMIAEiSAYQIJEEAwgQSIIBpAgEQQDSJAIggEkSATBABIkgmAAl+0G/pnKgf5EsaHCW3y68GpB3/r9tzMe95FkFa2TRMmljRJVMP2l4jCeihNxCNudEv8G2grRKJV7gPMO39F8pqDYKt452lzlI/KPt40OM3HfaXn8tU68WVS6wJHtTv92L3T0DdlSaIIHNaj1TPmy69mVXc76ldxuWp5rITdXfdBWynZzxKvAX8QdYbTMK8BSHbwtfJhrYbSiwzAzqWdvGAg+MInt7v6b7gVpAPyIhfnX62fe9k9dUjrvaLmYK4t5OpLttgg2mV8XWFq79I3z7DCmPNDKflP3QcgI1qGJbPf1G527Rso/WD/6luKCo+jo/lwSIUJDEi5vbnx8Mag4/EDEw6/qIq6Hst3Rf9OhINVsaV1eVpmqLj15bLt0mtKmdTLbHRG6pW2xcu+zzLQHpW7HE6vnt0wrsWW7o9/oRJBUMXS84tH1qZWfnasV75W5Pb3JdkeE7pJ0kTc2Fl/Pqww/21kZoTaVv8d2RwA6EqTyI80fFXiV2DbtfaATg0LovtK9TXPyFpdea17x8ADbvQDoSJAKzzwtyZ4sX6MKkL7Gdi9E+6A4pE6VHS70err91vds9wKgI0F6PEGSV3SM7S6I9udxscRRNI7tLgB0JEgtgfLaxhy2uyDan5Y8eWTTaba7ANCRIClN6aWKVWx3QbQ/6kt0rOoM210A6EiQ8CC8D5ux3QXRDrWBEnRiOoFOBIkg2jsSJIJgAAkS8SIwYMCwB7Lw5/gkjqIn06FYQV+ml2Iv2g7PhqM4EhSgBjkgAEBst/vqtIPXKAiW8YEDAjwY4rATtscrcJERl/ejMWWx2ajUZoKRM08srFHWqrspCsVVbTsb3KRPlO4t42E4BKGpqACWI7Nfo6XXSJCIv8YDDvBxEo6kJ5pcEHxufqfTEKeuPUeGWDvNDHewO29KOc/i+3BWGIWoy3BPVYemgdJDdTdy7lWvzlqTPb0yKy25pVb2RtNPaBLKoE6DGmhQsb1L2kKCRPwZPnDBCB/CvehR9iqzBS4fDJ8azJma5dto59cpEH0IIjQFAAA2/vrTEW4ACNUWYArO3hZrPJ/6XbZP77z11NLcs98PqDkuGVEhROPQVeq4vh6dyDUS8UcUIOBgDizE18zuG+VaDRzlGjJphq/fh3YZnS3RWhCh6n/YQjGsRLbeHjaVQTWj8kPCZtwxn28cZC3AjrASl+jrtRMJEvFHD+AJXKe2o8eUrNcdL9HQK94Jtl2Cv/13G/PMsvEIDA/b5do18hPIhkp8BeSgBhnbO8k8EiTiP3jAAQE9GpvRtd6LbW2DR3fr6J7Q/zzYgSk4/8ttmgAfzAO/d/To2l94i7feLAIvhVM4lu1dZR4JEqE5naOwD6zBT80WCIQWX0e95vvR6JNCc95J020vv3lrM2G4wxbzVKMJ1u9jW7wCP2J7h5lHgkQAPIZmKEbbYDSc617pcWCgyGupTUtAHlOb513kJPLqjGJ4vsb+sAcy8Wq2d5h55K6dYeMDBwT0OGxBN3i22vwSMPqNCI85gw5DAUQiHlNFVMPpJ6opimzVUbknvAkCtAM2QwXbu84sEiRDhQABwiNgD/YSJvHrTVVRXX0/j1ljel8QaclYhDSazkvD694V18uWNJSiRuSIWgFgIujVggLk1M5QiaENGuAKFMPJrt+73YzK8Fto93qn29oo9dCopvft9c+iFc0t36HdMA6lsb3zzCNBMjw84ACfnoedaYHLeos4rwW9pJ4tQ1tRGbKk3mK2VDUtGVS2Kju7kkrDUAaNUADGwAUTtoeAeSRIhgQBAMKL4SSOMXqPG2Y8ODLWVx1zxEJiLLBpZLaU0ledJE9KG1M0PSmwMVaK62qREHahYYABALM9EMwjQTIkmoeh/ngtFoeau2RGvBkwx3FR2DVtlLr3cZVDxs48x5rkW5Op2egWugI0YKDZHgJtIUEyDFzgAJ/eiDvSnR3SzRe7ne3d27v3iDucIHSLI2W2VP3E1tQqyZXW4hEnQ1VJ6s2KPfAWvI4WsD0E2kWCZAgQfAvpeAV/GsdUcLGvjc+gUQ42i0woxxHMllHJ6HPKZ1dOiwJOltaNb7lc1fTrvG8V0KBkexC0iwTJEGD6Eh6M54cMcNoXvqvjCKeDPfZpo0zerJo3b35236l6UeY7lDPah6YBB5BhPGIhQdJfXKCAh8/gAfR0286mCzr06iv0iRplyr1KneK1MFuqKVhaU3cudWzRjKRgebpqmawrfAz90S59vbXwv0iQ9NcpeID3cg5yLHmb+wzx7j+iyGGUWRdXH2aL0EvwFnXu1WslsckfPtkuiS8Lp9agIqoSlKAGBdtD8OqQIOkjDlDApVdgH9whcIzD7C7HQi1csiJGa6NUwft1u++uvzOicljafoiHcSgNhMADg1tczSDOXw0IByjg4Ap4m4634gq97IIiR/iGxezjf8PJMJrPbCnJTtnDRkXqD4/uJJa3bVNmSudS36GOlD9gUBvG6dzvkSOSfrkJ5XCZ6oL6cNJ6IS/5UOT8jcW3XgxHCB+CCPxmxojSjHP7K/Y3Ty0aSu1F9ZQRKPXzNfLnQYKkLzQTf8ZjK7rZd7SdZ6dDXeNdr0emaaNU8WdPq3N/vHmrfOSl3lAJTSACOzAFJ7aHgE0kSO2f5rU8C1iKc82vGt20ej2K6/tOzFqjap7QxIPZUs/iFOslKSnFjzYnjnmmVFxr6YEyYSFqA6zPsxaeBwlS+1cMTyEPCWAnGtxjkMeCQbs9DlrXv7aF4So74Rosvz6gbNHFcSW7Gmwf9qQSUAvVQV9XBXpRJEjtGf//V1l44jncpihwX/gjj70D78OHEAlbmC1VvraxY+GhrH1la38ZgpthNj4OPmALIWwPga4gd+3aJwQIKPwGbMVCkxr+HrPkfv5+nWKQiZzfZN6d2VKy7iqBlJfCL9qcsF/iIfNtmkKVoq+psUAb1pOiv0eOSO3TU2iFanAGc/DoFuh+rP8Z7z22ASGfa6PUrZ0VMSnLH31an37fnTqImigLQ3vY+jxIkNobzaJZU7EdLXMba/md7/GeVz37D1mE3oZMxPAnt6qSxRtKytPLS6RnCulL+Jw6CLqDOwxgewh0EQlS+6FZZWEGHMK9jD/m3RJ+G3ner1uMv/lHRp2srZgtpViiHibLTU0vskxa3KSWvl1/CXnAAWqOfq/f/TJIkNoPKSigBd6Fozjq9Yuu5/vOeW2n/ZzQFdoodTfo8YRr0ocLaz++bUqtQSL0mETo75GbDe2B5mHrh9iddnEqsnjfQ9S7j9fHwzZRN5A1J4jZUrXNLeLHwVd3Fx8/9Z36a3WFcjSKQanUdFAZ9nOif0KOSLpNs+T8OriI5wiiuZuNRJG/+B5484nVDaG1fS9mS6km0lOUoVesRHdO2NXvbl305FM0HF2mfjSE1/JeniEFCQECCpqgDepxJUyhv6Ov4ovqLrQEP1S/T5vjavVW+hL+RR2EE3BfejxUgRhKNPMGWOtZBRhUdA2ehvd3Ejr/1PN28JeOB7rP1kapXHH1yqzEnJXVPbNcqN4oGW0CBIb1F/ISDGOYBMAFYzwAdmF7yIZKSLN5IjztuK/zD85fRmT0s/FTxOYPmO8/YlxWN1v3H/rvdnAzd3Ctgo0wCk7g12EDxpotvNKeNa/l7cc96Gj7+2YTnAf0GeCdM9KBo6KiuAwfHxpuSt1rVGkPRMdO3FCsUlfI3WA+9EbrAMBAXst7efp+jWQEXBDiMphMxwkf8+6a5bxh5bl/8JwuW11bIhdbrRI62/6IjoKYsv3192nYBHMlQbKAxm7ZKyqfpDlfCyoJTP7+2Ql5lCQTjUIp1M8gBxW0ab3zg5CNt3Dncs7yu/UJ9k4fucaun6mFUxGzRdRPcZTa/2ql6OHp0BosUVaMoJagVCpX86Exre+jHtHfIxIHKOBiK1iGH5ouFVhY7njTqWP9rHf6H/EvG5tjHSgcbJ/8hwhpXIA5UGO+zaivdbfIHN/TMfyYYZ3iZpdaHDQW2W6lF2MP2kozMUeLnVOAgKJ34C64R1Cg48JuzzqPd77bs6M2SuU/qDlx++u7Z6scr06He2gJ4rFw7NUL+hukTCiFcxxblMot7DfHN340t2OEU8ce2cga9qBxz7WFG7AIlME+jnT3kNiRnYLe9bKRmFxwTNK8qqAJKsM9a8KfDTH0apuJJjMcxJE3fBPfVPJSOH0FDAdJ3Edm1zAyNb5IkRgpW6j8pW0j2gSj0CnDWWWBWXobJHo19qc9XSOsNvpsCB3n0tQ7AQT//nTFT2QPnbePudWZmks7LDE752JDR2MjWsTwn10aiOAEJw/t4X4T4eoVP2xmhw3mS92bmB0Z3BnL6UvpwSUeZ7o97ikeWDKE2oWqKaUhv5b38vQxSJoVPUPACXr4dbQz67TMeA4v1oSB9US9Rtq8F1g5Jil0zTwn5wiLIs9sOhoLaBHIQfWSn3PkAgU8eiZ2oGn/jvYdQ+VdsGtp3xRtDM+jK/V1OR/c6lzRIUUFYeAGUWAJxmD78ls2ZPoYpEaQQi1nETWNY24733RLh3XMbt6Na4l9vxyjDk2a94l7lJWXXy79Nraln4EYZND4wh8b1nz8WAnz8XkLX+Pt1o1RV/16xXQR5HIXGF9ntvPWUfL7Yp+UpqK4hHlSR8XM1r3oDMxC5YABk9O5l6OPQdIcH/bCBJTFodEprlb+rzsh8/Meq8ckh345z9P7E9svg5zpDTiE7ghVIIZSzby459pQHtTATfQ1lKKnPXd5Bkf3cn1kWe07iuF2O8M3WJVVVHbwl23lExvtChdRR5GYsiWv5TFFH4NkCybgSJfi2+pxLYPkt5sdtVfKfojpD85FYx52Nppr4l9mT4XG4QI8nt4E+VAD2b8+Av4rv338uMbH3/ZJsLjbDPdb/dXgBBbgyWyfJQcaXPOHX1eWDb4gxzPhMI4AV7AEhte4M2T6GCTN49e1OID2Lfdq+rJwLq3GxfRK7RW0LhUmOXwbO7Nz+Lt9gqZ32NKtJ46G3dgVMqAEzv7J3AjNKgv+sBaLTbsL6iz6RwX6LRmdLIzk3TG9z2xvUlo5tnVVSk7RVwkDW1bIa8UTUDGsQvb6/W2IV08fgwQAAJqHp6KAep+c1seTm2+IwrRd0SLTqNHmXMycjo6z0js/c/bvJYEakOBySIIcvAc4gIDz669WgRhK0WcwBPaG/+zx+YDNXhk2boHdGG6oFeQgvllaPuHSuOIPnpY82EQloBbKkdyd0wb9DVIWfIBkLWrZ/uZLF6YV7jwil/jJ4hoXaruuKS2YaBkx8mnIiWmHwr52S406DmdhNqqEHZCOl4Mx8MCEfgtb0g3ur1n/5C/psdTj68F5UAdrkS+znVS+1xxZZJTpV5p47n16EramWyAYOkC4tkfAMOltkEANNKjReJROnSiS1hvlJCf2ykmOv9U0qY1Tx/AS8v9LuJbXauY3TBbEmfKsh6XnyMFj0GWkooJxFoyklwt38983hSjad/LoVWYmgmmWw5mtLh+hOtD2TkrEo4zE280/tEU3ZCBj2IWGAg0Y1Nred8Okv0HScAAzcEEH4W10L/9YTfztscfS7l7atbBub2tslTan+QAAgNF47gXhwiFxAU4TUnrP8r46PJUzGT3hdQkTuC6ONPZLtZvSSSsTf7K9KsPS5hVurjt29zS1G9VQmLwKoW36HiTNExJPsIYANAFdo06ITj3lPCg9uuwuZ3t+1RDxyJJJ2m6Bv4xz1Mihf6PfkjF1MdadPp61q+dhr6zobagNuVKLma31ZJMkrvz1a5dLRiXPVzviiaopEAm+EKPtfST0PUgamok8ViAEO+pn1EiZVxxumi6KOTLhrnhHUum0BtlDrf+35pVxYgVvhdm5rox0tmo23mUXzOz2lf3UafLc1MCi6KTWhm+ebaxtQF0hiVpNXhF/NQwjSL/HAw7wqQtIQQXUdJZ8UdHr6Mx763aqC2R1Y+9IIR9qIVuL1cPAFSI1kWZ2w/c2V/lknM7LrFl3U0bNQ9kok9zgfpUML0gaNGBQU8eQhLJvCHs2qXZ1wtb71+LO5gysXp8ZBx1gJS5lu8XnVT+u9XJVw5XrxV1PKlV71GsUq2ECdEEL2e7LsOj7i31/TwFqkFNfIBFVLTnRVtYYmXQn1/a7KzJQxbahrnzX8khPpEDu1DK2G/1zqkr6uFKUtk7kefJCnUnLL1UVlAhlUjmg+t0zK+KVMNQj0u/JQQVtmge40pUK0xZRsiqvbZ8yfUnp0LM71OuxiSqR7Rb/3AOTJy43zHKCqz/JXEq5of1opuF8/FjXkCD9hyZO9vADmiQ/rypve3JekX/zUHjKjEePEtXKeLVY0ZftFn/TmCw9UOeZNkw05YSHvFq1QTYFlkA/tIO8lscWEqQ/UoAKZKgYViI75dv0VEW31O+KlIn9zt8oSDqkknurNrYxfLftRdFheK569dW+xcJT956oxflll6jPUCFVRtbjZhcJ0p9Rghrk6DBMQTmar3ZnnC1dcLby9IO80h9vSF0UD1tmsNVa/pJas+zYOw8ex12NhpNoBirWTDtie8gMHQnSX9PMBlgOA1AcNsdL6fu3HStMU0qSEnLX7vlWskKW1Vj4KtsRx8sGN1xJGVB0I/GhjK/8RCpAOyEWXSSnc7qABOmfqIEGNYyGTuhd6AZuqF/Orurzmcrjy+6fjYtr7CGdUvuVtlvAPTBNZ6V3LPE60+Px6WZF8Y9UPKqhgMzj1h0kSM9H83AzDNwgEqlgE9WzgKqddIdzdOzdT3fW1b7VsqdygfaKP4qvf5ATeaug4knKRvADe+gEViAEe7YHhfgNCdKL0MzccwMr8KMWoxzqfkl4Q9nDrCNj7jbuOFpZ3LxatIPZgi018l3N+1N2F72bAFJ7xfTW79FZmIUqycePdQ0J0ovTXJOYgRFYUYmoherw2K759WLno5/dFewoK85tsM9jYI1SXAaTcVzmg1LLc4PLExv7FxRSR5CYsiGrLOgmEqSXwwEKuNR5pKD8a1e1RD4uOZZ3N2vnN/lDa6ffLoFEyIH4f7dh0ez6QTmRNwaUf3jxLbwL0mEFODO/lgPBFBIkJqiBBhX1E2qkTJumSHl10oRB9wN3776XUXUy/QwugUl45/NvrKawZXTF3XO5+dt+/qpVJr8i6YbuwEcIkUmouowEiTmah7kfozwqvyVBvrjprZPJuc7fV1z5RmR9MuHZHsUGyZW/CoPKkg5TPMhfWftptsuRc3d2bq+qsm++VjKJWoUKKBE5ndN9ZF4W0zRTjfrCGWqLNFy5uTXs/K0C7qHeuRerV2QF+nxhFxJy2OaEiV+H76lDqImyEs9tS2lML5/UpCpIKgtrvFBIyWcr35PWoSnoAnXuHxb0InQGCZJ2aOJ0DRYgBS7EdfiLyvjmuuKMyrjm90SfUn1RKRUCEeCFhtJinEGHgD3Mxi5ULCqiDqOl6Aa1E1TwYiu2EqwiQdImzWIjvmAHnaj1qIxqBAAneB+mgz3IgAaAjtRB1EgZAwIX+BA+BBcA8rXW9ogEiQ3kM156h5x/EwQDdCJI6DAai4rZ7oJoh3ha/nric9OJIHHTqQ/4/djugmh/OJbUVi6P7S4AdCRI5p8K6qwvsd0F0f6Y3edvtSpguwsAHQmSc6h5szcJEvHCnI+aH/UWst0FgI4Eyd/f1iLsA4Gcu904kO1eiPaBX8bhGJ33T7CNDfNiuxcAHQmSO21ZEXDRs8GqNIhcKRHPxf1tS+uAcM8yq8IgrX+w53noRJB44dRxflF4osu6IUHmIYJ+1j+y3RGhu8yOCFZa/hTu7ZoefY0/iRNlNJHtjgB0JEgaHarMBngJ+lp55o0JNd7Ae8ekJ9sdEbrFaD23RFjXx93jrdESF675RJ97bHf0Gx0KkkZgmP3e7osHbPT+aeIMs/mCcqsDbHdEsM90KH+45Wv9J3nzJzwIHu1wtmdvsAUhOLPd129Qc3Nzc2sr2238j5NQAHHV5i3JJTVZXSqrzkwqm9808mGoIkBNyWLZbo54FXjTOdcEth5rLf0C5vfIdnUe+pNztLnSpwiWQx/Yx3Z3/01Xg/Q7yg5qhbx3mUfzsYdu+Qn1Y29xqjIlZqIeLWLFyKZ8dR09TyVhu0fiZXFKqWXcTLPT/NWWJ5zSzM94+73mYbul60XP7VYng7L5H3FGGK1gu8e/0w6CRBC6T+eukQiiPSJBIggGkCARBANIkAiCASRIBMEAEiSCYAAJEkEwgASJIBhAgkQQDCBBIggGkCARBANIkAiCASRIBMEAEiSCYAAJEkEwgASJIBjwf4Mf/dkSX2Y4AAAAAElFTkSuQmCC
<!-- end pictures/after.png -->
<!-- file pictures/before.png base64 6224 -->
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
<!-- end pictures/before.png -->
<!-- file review.html utf8 125145 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-16-emoji-check-hand-back</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. The app's font, corner size and
   shadows come in the same sets; the font and the shadows below fall back to their own values without them. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.875rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.24 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.24 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.24 0 0);
  --primary: oklch(0.54 0.22 292);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.24 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.52 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.24 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.62 0.19 292);
  --font: system-ui, sans-serif;
  --shadow-low: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.06);
  --shadow-raised: 0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.12);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.76 0.13 292);
  --primary-foreground: oklch(0.2 0.03 292);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.62 0.19 292);
  --shadow-low: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.3), 0 6px 20px rgb(0 0 0 / 0.3);
  --shadow-raised: 0 2px 4px rgb(0 0 0 / 0.3), 0 12px 32px rgb(0 0 0 / 0.5);
}

/* The app's three shadows (--shadow-low, --shadow-card, --shadow-raised), else Tailwind's shadow-xs, shadow-sm and
   shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the bottom, so a layer reads as above
   the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: var(--shadow-low, 0 1px 2px 0 rgb(0 0 0 / 0.05));
  --look-shadow-sm: var(--shadow-card, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1));
  --look-shadow-lg: var(--shadow-raised, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1));
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  /* The app's font (--font, from the look) leads every font rule below, so none beats it; each keeps its own stack for a repo with no app. */
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  /* A card on a phone: its words, a row of small pictures, then OK and Note. At 900px and wider the pictures sit right. */
  .item.card { padding:0; overflow:hidden; }
  .words { display:grid; grid-template-columns:26px minmax(0,1fr); align-content:start; gap:0 10px; min-width:0; padding:var(--pad); }
  .words > .table, .words > .live-said { grid-column:1 / -1; margin-top:10px; }
  .item > .verdict { padding:0 var(--pad) var(--pad); }
  .text { position:relative; }
  .clamp { display:block; }
  .text:not(.folded) .clamp { display:inline; }
  .text.folded .clamp { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .more { min-width:0; min-height:0; padding:0; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font:inherit; font-weight:400; text-decoration:underline; }
  .text:not(.folded) .more { margin-left:.4em; }
  .text.folded .more { position:absolute; right:0; padding-left:1.6em; background:linear-gradient(to right, transparent, var(--card) 1.2em); }
  .view { min-width:0; padding:0 var(--pad) 10px calc(var(--pad) + 36px); }
  .stage { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
  /* A part: one labelled picture, drawing, page, or live card; a click opens it full screen. */
  .part { flex:none; width:84px; margin:0; text-align:center; cursor:zoom-in; }
  .part .clip { position:relative; width:84px; height:112px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--card); }
  .part .clip:not(.big) * { pointer-events:none; }
  .part .clip:not(.big) .pin { pointer-events:auto; }
  .part figcaption { margin-top:3px; color:var(--muted-foreground); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .part:hover figcaption, .part:focus-visible figcaption { color:var(--foreground); }
  .part:hover .clip:not(.big) { outline:2px solid var(--ring); outline-offset:2px; }
  .part .art { margin:0; font-size:var(--f, 13px); }
  .part .art.screen:not([style]) { width:49.2em; }
  /* A page or live card taller than its space shows its top; a fade says there is more. */
  .clip.tall::after { content:""; position:absolute; left:0; right:0; bottom:0; height:48px; background:linear-gradient(to bottom, transparent, var(--card)); pointer-events:none; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .art { position:relative; display:block; width:max-content; margin:0 auto; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-font:var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* A picture file: as wide in em as its file is in px, so the fit and zoom scale it like a drawing. */
  .art.photo { padding:0; line-height:0; }
  .art.photo img { display:block; width:20em; height:auto; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art .pin.spot, .page .pin.spot { position:absolute; z-index:2; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture. */
  .art.ad { width:20em; padding:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; white-space:normal; line-height:1.3; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .ad img { display:block; width:100%; aspect-ratio:4 / 5; object-fit:cover; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  /* A page or a live card: drawn at a phone or computer width, scaled; a cover over a page takes a tap as a spot note. */
  .page, .live { position:relative; overflow:hidden; margin:0 auto; background:white; }
  .page iframe, .live iframe { display:block; border:0; transform-origin:0 0; }
  .live iframe { background:var(--background); }
  .cover { position:absolute; top:0; left:0; right:0; bottom:0; cursor:crosshair; }
  .verdict { display:flex; align-items:center; gap:8px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .words > .table { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  /* Full screen: the labels and Close on top; the part's own frame fills the middle; what changes it sits at the foot. */
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--muted); }
  #viewer .vtop { flex:none; display:flex; align-items:center; gap:8px; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); background:var(--background); }
  #viewer .names { flex:1 1 0; min-width:0; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
  #viewer .name { flex:none; min-width:0; padding:0 12px; border:0; background:transparent; box-shadow:none; color:var(--muted-foreground); font-weight:400; white-space:nowrap; }
  #viewer .name[aria-selected="true"] { background:var(--muted); color:var(--foreground); font-weight:600; }
  #viewer .vspace { flex:1; min-height:0; }
  #viewer .vfoot { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); background:var(--background); }
  #viewer .vhint { flex:1 1 220px; margin:0; color:var(--muted-foreground); font-size:13px; }
  .zoom, .sizes { display:flex; align-items:center; gap:6px; }
  .zoom .level { color:var(--muted-foreground); font-size:13px; }
  .sizes { gap:0; padding:2px; border-radius:var(--radius); background:var(--muted); }
  .sizes button { min-height:36px; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font-weight:400; }
  .sizes button[aria-pressed="true"] { background:var(--card); color:var(--foreground); font-weight:600; box-shadow:var(--look-shadow-xs); }
  .clip.big { position:fixed; left:0; right:0; top:var(--vtop, 52px); bottom:var(--vfoot, 52px); z-index:9; width:auto !important; height:auto !important; max-height:none !important;
    padding:12px; overflow:auto; border:0; border-radius:0; background:var(--muted); cursor:auto; touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  .clip.big::after { display:none; }
  .clip.big > .art, .clip.big > .page, .clip.big > .live { margin:0 auto; }
  .clip.big > :is(.art.photo, .art.ad, .art.pic, .page) { cursor:crosshair; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px var(--font, system-ui, sans-serif); vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 var(--font, system-ui, sans-serif); resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  /* Files and the needs list: the look's parts. */
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100% - 700px) / 2 + 12px)); padding-right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
  /* Wide screen: every part and the bar share one 1160px column; a card's words and buttons sit left, and its
     pictures sit right, side by side, as tall as the words (the kit sets the height). */
  @media (min-width:900px) {
    main { max-width:1160px; padding:0 24px; }
    .bar { padding-left:max(24px, calc((100% - 1160px) / 2 + 24px)); padding-right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    #ready-confirm, #ready-says { right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    .item.has-view { display:grid; grid-template-columns:minmax(280px, 380px) minmax(0, 1fr); grid-template-rows:auto 1fr; align-items:start; }
    .item.has-view > .words { grid-column:1; grid-row:1; padding:20px 20px 12px; }
    .item.has-view > .verdict { grid-column:1; grid-row:2; padding:0 20px 20px; }
    .item.has-view > .view { grid-column:2; grid-row:1 / span 2; display:flex; padding:0; border-left:1px solid var(--border); background:var(--muted); }
    .stage { flex:1; min-width:0; gap:16px; padding:16px; align-items:center; }
    .stage > .part:first-child { margin-left:auto; } .stage > .part:last-child { margin-right:auto; }
    .part { width:auto; }
    .part .clip { width:auto; height:auto; border:0; border-radius:0; background:none; }
    .part[data-kind="draw"] .clip:not(.big) { border:1px solid var(--border); border-radius:var(--radius); background:var(--card); }
    .part:is([data-kind="page"], [data-kind="live"]) .clip:not(.big) { border:1px solid var(--border); border-radius:12px; background:var(--card); }
    .part figcaption { margin-top:6px; font-size:14px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-16-emoji-check-hand-back" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-16-emoji-check-hand-back</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Tap a picture to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Each line that gives you the browser says <i>tap ✅ at the top right</i>. But the button there is a dark green circle, and ✅ is a lighter green square with round corners. So the button you must find does not look like the one the line names.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card has-view" id="item-1"><div class="words"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The Hand back button becomes the ✅ emoji itself.</b> It is the same drawing the browser uses when it shows ✅ in a page: a light green square with round corners and a white check. It stays at the top right, still counts the tabs that wait on you, and is still grey when nothing waits.</div></div></div><div class="view"><div class="stage"><figure class="part" data-kind="photo"><div class="clip"><div class="art photo" data-note="item-1-picture-1" data-label="Before" tabindex="0"><img src="data:image/png;base64,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" alt="Before"></div></div><figcaption>Before</figcaption></figure><figure class="part" data-kind="photo"><div class="clip"><div class="art photo" data-note="item-1-picture-2" data-label="After" tabindex="0"><img src="data:image/png;base64,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" alt="After"></div></div><figcaption>After</figcaption></figure></div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> new words in the lines; a new place for the button; a different look on each computer.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="none"><p><b>Nothing.</b></p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-15</p>Assumed: the icon copies the ✅ that the agent's browser draws, from its own emoji font, Twemoji Mozilla, because it is the one drawing we may ship; Apple's ✅ may not be copied. On a phone or a Mac, the ✅ in the chat is Apple's, which has the same shape and colours, a slightly different green.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-15</p>Assumed: the drawing ships as an SVG file, not ✅ drawn as text at each start, because a file looks the same on every computer and needs no new code.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-15</p>Assumed: the credit for the Twemoji drawing goes in a comment inside the icon file, because it then travels with every copy of the file.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-16</p>Assumed: the icon's <code>viewBox</code> is the glyph's own 512-unit square, <code>0 0 512 512</code>, so the y flip uses the square's top (448), not the font's ascent (477), which would leave a 29-unit gap. Checked in Camoufox: the icon and the font's ✅ render the same.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-16</p>Archive checkpoint: built and archived inside /ship. The live check started a separate test browser from this build, so no other chat's browser stopped: the toolbar ends with 1Password, then ✅, faded while nothing waits.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Full screen" hidden>
  <div class="vtop"><div class="names" role="tablist" aria-label="Pictures"></div><button type="button" class="primary" data-close>✕ Close</button></div>
  <div class="vspace"></div>
  <div class="vfoot"><p class="vhint"></p>
    <span class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button></span>
    <span class="sizes" role="group" aria-label="Width"><button type="button" data-size="0" aria-pressed="true">Phone</button><button type="button" data-size="1" aria-pressed="false">Computer</button></span>
    <a class="try" target="_blank" rel="noopener noreferrer" hidden>Try it ↗</a></div>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    // A browser notice that a resize watcher waited a frame is no script error.
    if (/ResizeObserver loop/.test(e.message)) return;
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Note on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, files: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  const QID = /^need-\d+-q-\d+$/;
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, .more, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot. A screen's words sit in many small boxes: join every piece with a space.
    // A picture file, an ad, and a page read as their label.
    const row = el.tagName === 'TR', named = el.getAttribute('data-label');
    const cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = named !== null ? named : Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); })
      .join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add, .more'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      // An item's words take their note through the Note button beside OK; a part takes its notes full screen.
      if (el.closest('.art, .stage') || el.matches('.items > .item .text') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    const answers = replies();
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), held = data.files[id] || [];
      if (!held.length) return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = asker(id) + ', "' + q.getAttribute('data-label') + '"', done = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (done ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(held.map(function (f) { return f.name; }).join(', ')) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    drawFiles();
    views.forEach(counts);
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('.clip.big') || (e.pointerType === 'mouse' && !el.closest('.stage')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a whole part full screen notes that spot of it, kept in percent so it holds at any size; a drawing's line is a line.
  function spotAt(el, target, e) {
    if (!el.parentNode.classList.contains('big')) return null;
    const r = el.getBoundingClientRect(), fig = el.closest('.part');
    const pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: 0, x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: fig.querySelector('figcaption').firstChild.textContent };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el, rec && rec.k); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if (view && !open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && V.f <= V.lo * 1.001) {
      openViewer(view.c, view.i + (e.key === 'ArrowRight' ? 1 : -1));
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    const note = noteOf(id), draft = data.drafts[id];
    if (el) reveal(el, extra ? extra.k : (draft || note || {}).k);
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── OK and Note on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Note on ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Note</button>';
    item.appendChild(v);
  });

  // ── the card view: each part sits in a labelled frame, sized by the card's words; a click opens it full screen ──
  const BASE = 13, PAGE_W = [390, 1280], FIRST_SCREEN = 760;
  const WIDE = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: false };
  const later = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return setTimeout(fn, 16); };
  const views = [];
  // Each page frame's height, as its page posted it at 1 px tall; and each overflow seen at full height, measured once.
  const pageH = new WeakMap(), pageOver = new WeakMap(), PAGE_MAX = 40000;
  let view = null, queued = false;
  // A resize watcher's work waits for the next frame, so a size it sets never loops back into the same frame.
  function queue() {
    if (queued) return;
    queued = true;
    later(function () { queued = false; views.forEach(layout); if (view && big().paged) fitBig(); });
  }
  // A new width measures a page again from 1 px tall, so a shorter page doesn't keep the old height.
  function pageWidth(f, w) {
    if (f.style.width === w + 'px') return;
    f.style.width = w + 'px'; f.style.height = '1px'; pageH.delete(f);
  }
  // A page or live card drawn w px wide and h px tall, scaled by k; a page keeps the height its page posted.
  function frameAt(p, w, h, k) {
    const f = p.el.querySelector('iframe');
    if (!f) return;
    if (p.kind === 'page') pageWidth(f, w); else { f.style.width = w + 'px'; f.style.height = h + 'px'; }
    f.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    p.el.style.width = w * k + 'px'; p.el.style.height = h * k + 'px';
  }
  // A part's own size: a drawing or picture at the base size, a page or live card at a phone's width.
  function natural(p) {
    if (p.kind === 'page') return { w: PAGE_W[0], h: pageH.get(p.el.querySelector('iframe')) || 200 };
    if (p.kind === 'live') return { w: PAGE_W[0], h: +p.el.getAttribute('data-height') || 640 };
    p.clip.style.setProperty('--f', BASE + 'px');
    return { w: p.el.offsetWidth, h: p.el.offsetHeight };
  }
  // On a computer the parts are as tall as the words, at least 420 px and at most the window, each shrunk whole
  // to fit the row down to about 110 px wide, past which the row scrolls. On a phone each is a small picture.
  function layout(c) {
    const wide = WIDE.matches, bar = document.querySelector('.bar'), verdict = c.item.querySelector('.verdict');
    const H = Math.min(Math.max(420, c.words.offsetHeight + (verdict ? verdict.offsetHeight : 0)), Math.max(240, window.innerHeight - (bar ? bar.offsetHeight : 0) - 32));
    c.el.style.height = wide ? H + 'px' : '';
    const room = wide ? H - 32 - 30 : 112;
    const sized = c.parts.map(function (p) {
      if (p.clip.classList.contains('big')) return null;
      const s = natural(p);
      if (!s.w || !s.h) return null;
      s.p = p;
      s.k = !wide ? (p.paged ? 84 / s.w : Math.min(84 / s.w, 112 / s.h))
        : p.paged ? Math.min(1, room / Math.min(s.h, FIRST_SCREEN)) : Math.min(p.kind === 'draw' ? 1.25 : 1, room / s.h);
      return s;
    }).filter(Boolean);
    if (wide) shrink(sized, c.stage.clientWidth - 32 - 16 * (c.parts.length - 1));
    sized.forEach(function (s) {
      const p = s.p;
      if (p.paged) frameAt(p, s.w, s.h, s.k); else p.clip.style.setProperty('--f', BASE * s.k + 'px');
      const h = s.h * s.k, shown = wide ? Math.min(room, Math.ceil(h)) : 112;
      p.clip.style.height = wide ? shown + 'px' : '';
      p.fig.style.width = wide ? Math.ceil(s.w * s.k) + 2 + 'px' : '';
      p.clip.classList.toggle('tall', h > shown + 2);
    });
  }
  // Parts too wide for the row shrink by one factor; one that would fall under 110 px keeps 110, and the rest share what is left.
  function shrink(sized, row) {
    let small = [], f = 1;
    for (let i = 0; i < sized.length; i += 1) {
      const rest = sized.filter(function (s) { return small.indexOf(s) < 0; });
      f = Math.min(1, (row - 110 * small.length) / Math.max(1, rest.reduce(function (t, s) { return t + s.w * s.k; }, 0)));
      const more = rest.filter(function (s) { return s.w * s.k * f < 110; });
      if (!more.length) break;
      small = small.concat(more);
    }
    sized.forEach(function (s) { s.k *= small.indexOf(s) >= 0 ? Math.min(1, 110 / (s.w * s.k)) : Math.max(f, 0); });
  }
  function counts(c) {
    c.parts.forEach(function (p) {
      const k = p.clip.querySelectorAll('.pin').length;
      p.count.textContent = k ? ' · ' + k : '';
      p.fig.setAttribute('aria-label', p.label + (k ? ', ' + plural(k) : '') + ', open full screen');
    });
  }
  all('.view', function (v) {
    const item = v.closest('.item'), c = { el: v, item: item, stage: v.querySelector('.stage'), words: item.querySelector('.words'),
      try: v.getAttribute('data-try') || '', at: 0, parts: [] };
    Array.prototype.forEach.call(c.stage.children, function (fig) {
      const cap = fig.querySelector('figcaption'), kind = fig.getAttribute('data-kind');
      const p = { fig: fig, clip: fig.querySelector('.clip'), el: fig.querySelector('.clip').firstElementChild, kind: kind, paged: kind === 'page' || kind === 'live', label: cap.textContent };
      p.count = document.createElement('span'); p.count.className = 'count'; cap.appendChild(p.count);
      fig.tabIndex = 0; fig.setAttribute('role', 'button');
      c.parts.push(p);
    });
    c.stage.addEventListener('click', function (e) {
      const fig = e.target.closest('.part');
      if (fig && !e.target.closest('.clip.big, [data-open]')) openViewer(c, partIndex(c, fig));
    });
    c.stage.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('part')) { e.preventDefault(); openViewer(c, partIndex(c, e.target)); }
    });
    if (window.ResizeObserver) { const watch = new ResizeObserver(queue); watch.observe(c.words); watch.observe(c.stage); }
    views.push(c);
  });
  const partIndex = function (c, fig) { return c.parts.map(function (p) { return p.fig; }).indexOf(fig); };
  // A picture file is as wide in em as its file is in px, so it scales like a drawing.
  all('.art.photo img', function (img) {
    const size = function () { if (img.naturalWidth) { img.style.width = img.naturalWidth / BASE + 'em'; queue(); } };
    if (img.complete) size(); else img.addEventListener('load', size);
  });
  // A note's target shows: folded words unfold.
  function reveal(el) {
    folds.forEach(function (f) { if (f.text === el && !f.open) { f.open = true; measure(f); } });
  }

  // ── full screen: one part over everything, the card's labels on top, its changes at the foot; it zooms and scrolls natively ──
  const vtop = viewer.querySelector('.vtop'), vfoot = viewer.querySelector('.vfoot'), names = viewer.querySelector('.names');
  const vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button'), sizes = viewer.querySelector('.sizes'), tryIt = viewer.querySelector('.try');
  const V = { f: BASE, lo: BASE, hi: BASE };
  const HINTS = { draw: ['Drag to move · pinch or + to zoom', 'tap a line or picture to note it'], photo: ['Pinch or + to zoom', 'tap a spot to note it'],
    page: ['Scroll to read', 'tap a spot to note it'], live: ['Try it here: it sends nothing', ''] };
  function big() { return view && view.c.parts[view.i]; }
  function scale(f, cx, cy) {
    const box = big().clip;
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (box.scrollLeft + cx) * k - cx, y = (box.scrollTop + cy) * k - cy;
    V.f = f; box.style.setProperty('--f', f + 'px');
    box.scrollLeft = x; box.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  // A drawing fits the screen's width; a picture fits whole; a page or live card shows at the picked width, shrunk to fit.
  function fitBig() {
    const p = big();
    root.style.setProperty('--vtop', vtop.offsetHeight + 'px'); root.style.setProperty('--vfoot', vfoot.offsetHeight + 'px');
    const aw = p.clip.clientWidth - 24, ah = p.clip.clientHeight - 24;
    V.f = V.lo = V.hi = BASE;
    if (p.paged) {
      const w = PAGE_W[view.c.at], k = Math.min(1, aw / w), f = p.el.querySelector('iframe');
      frameAt(p, w, p.kind === 'live' ? ah / k : pageH.get(f) || ah / k, k);
      return;
    }
    p.clip.style.setProperty('--f', BASE + 'px');
    const w = p.el.offsetWidth, h = p.el.offsetHeight;
    if (!w || !h || aw <= 0) return;
    V.lo = BASE * (p.kind === 'draw' ? aw / w : Math.min(aw / w, ah / h)); V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    p.clip.scrollLeft = p.clip.scrollTop = 0;
    scale(V.lo, 0, 0);
  }
  function openViewer(c, i) {
    hideChip();
    if (view) big().clip.classList.remove('big');
    view = { c: c, i: (i + c.parts.length) % c.parts.length };
    const p = big(), hint = HINTS[p.kind];
    viewer.hidden = false; document.body.classList.add('viewing');
    names.innerHTML = c.parts.map(function (q, k) {
      return '<button type="button" class="name" role="tab" data-i="' + k + '" aria-selected="' + (k === view.i) + '">' + esc(q.label) + '</button>';
    }).join('');
    viewer.querySelector('.vhint').innerHTML = esc(hint[0]) + (hint[1] ? '<span class="note-it"> · ' + esc(hint[1]) + '</span>' : '');
    vbar.hidden = p.paged; sizes.hidden = !p.paged; tryIt.hidden = !c.try;
    if (c.try) tryIt.href = c.try;
    Array.prototype.forEach.call(sizes.children, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-size') === c.at)); });
    p.clip.classList.add('big');
    layout(c); fitBig();
    viewer.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const c = view.c, p = big();
    p.clip.classList.remove('big'); p.clip.scrollLeft = p.clip.scrollTop = 0;
    view = null; c.at = 0;
    viewer.hidden = true; document.body.classList.remove('viewing');
    layout(c); bar();
    if (restore) p.fig.focus({ preventScroll: true });
  }
  viewer.querySelector('[data-close]').addEventListener('click', function () { closeViewer(true); });
  names.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) openViewer(view.c, +b.getAttribute('data-i')); });
  sizes.addEventListener('click', function (e) {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    view.c.at = +b.getAttribute('data-size');
    Array.prototype.forEach.call(sizes.children, function (s) { s.setAttribute('aria-pressed', String(s === b)); });
    fitBig();
  });
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target), box = big().clip;
    if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], box.clientWidth / 2, box.clientHeight / 2);
  });
  const zoomable = function (e) { return view && !big().paged && e.target.closest && e.target.closest('.clip.big'); };
  document.addEventListener('wheel', function (e) {
    if (!zoomable(e) || (!e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    const r = big().clip.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively, or swipes to the next part at fit; two fingers pinch around their midpoint.
  // A swipe starts only on the shown part, so a swipe along the scrolling label row keeps the part.
  let pinch = null, swipe = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  document.addEventListener('touchstart', function (e) {
    const t = e.touches, on = e.target.closest && e.target.closest('.clip.big');
    swipe = view && on && t.length === 1 ? { x: t[0].clientX, y: t[0].clientY } : null;
    if (zoomable(e) && t.length === 2) pinch = { f: V.f, dist: span(t) };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = big().clip.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    const s = swipe, t = e.changedTouches[0];
    if (e.touches.length < 2) pinch = null;
    swipe = null;
    if (!s || !view || !t || V.f > V.lo * 1.001) return;
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(t.clientY - s.y)) openViewer(view.c, view.i + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });

  // ── page parts: a page posts its height at 1 px tall; a cover over it takes taps ──
  // A page frame is sealed from this page, so the kit's one script in it posts its height, and the link under a point.
  // Only a message from one of this page's own page frames counts; a height for an old width is dropped.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || (m.type !== 'review:page' && m.type !== 'review:link')) return;
    const f = Array.prototype.find.call(document.querySelectorAll('.page iframe'), function (x) { return x.contentWindow === e.source; });
    if (!f) return;
    if (m.type === 'review:link') {
      const cover = f.parentNode.querySelector('.cover'), href = typeof m.href === 'string' ? m.href.slice(0, 2000) : '';
      if (cover) { cover.title = href; cover.style.cursor = href ? 'pointer' : ''; }
      return;
    }
    if (typeof m.h !== 'number' || !isFinite(m.h) || typeof m.vh !== 'number' || m.w + 'px' !== f.style.width) return;
    const h = Math.max(1, Math.min(PAGE_MAX, Math.round(m.h)));
    // A height counts only when measured 1 px tall; a page past its full-height frame grew late, so it measures again.
    if (m.vh > 1) {
      if (m.vh === pageH.get(f) && h > m.vh && pageOver.get(f) !== h) { pageOver.set(f, h); f.style.height = '1px'; }
      return;
    }
    pageH.set(f, h); f.style.height = h + 'px';
    if (!f.parentNode.querySelector('.cover')) f.parentNode.insertAdjacentHTML('beforeend', '<span class="cover"></span>');
    queue();
  });
  // A link in a page goes nowhere: hovering over it shows its address.
  document.addEventListener('mousemove', function (e) {
    const cover = e.target.classList && e.target.classList.contains('cover') ? e.target : null, f = cover && cover.parentNode.querySelector('iframe');
    if (!f || !f.contentWindow) return;
    const r = cover.getBoundingClientRect(), k = r.width / f.offsetWidth;
    f.contentWindow.postMessage({ type: 'review:point', x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }, '*');
  });

  // ── long words fold after about two lines behind More, on a phone only; a note on hidden words unfolds them ──
  const folds = [];
  function measure(f) {
    // The fold never cuts the bold first sentence: it keeps at least the lines that sentence takes.
    f.text.classList.remove('folded');
    f.more.style.top = '';
    if (WIDE.matches) { f.more.hidden = true; return; }
    const lead = f.clamp.querySelector(':scope > b:first-child'), line = parseFloat(getComputedStyle(f.clamp).lineHeight) || 24;
    const leadLines = lead ? Math.ceil((lead.getBoundingClientRect().bottom - f.clamp.getBoundingClientRect().top - 1) / line) : 0;
    f.clamp.style.webkitLineClamp = String(Math.max(2, leadLines));
    f.text.classList.add('folded');
    const long = f.clamp.scrollHeight > f.clamp.clientHeight + 2;
    f.text.classList.toggle('folded', long && !f.open);
    f.more.hidden = !long;
    f.more.textContent = f.open ? 'Less' : 'More';
    f.more.setAttribute('aria-expanded', String(f.open));
    // Folded, More sits on the last shown line, at its end.
    if (long && !f.open) f.more.style.top = f.clamp.offsetTop + f.clamp.clientHeight - line + 'px';
  }
  all('.items > .item .text', function (text) {
    const clamp = document.createElement('span'), more = document.createElement('button'), f = { text: text, clamp: clamp, more: more, open: false };
    clamp.className = 'clamp';
    while (text.firstChild) clamp.appendChild(text.firstChild);
    text.appendChild(clamp);
    more.type = 'button'; more.className = 'more';
    text.appendChild(more);
    more.addEventListener('click', function () { f.open = !f.open; measure(f); });
    folds.push(f);
    measure(f);
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length || replies().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  // ── answers: the files a need asks for, sent with the notes under their question; a sent file never goes again ──
  const asker = function (id) { return 'Need #' + /^need-(\d+)/.exec(id)[1]; };
  function answered(q) { const id = q.getAttribute('data-q'); return !!(data.files[id] && data.files[id].length); }
  // Each question with files the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
      if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
        line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, to try; it sends this page nothing ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) return;
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) f.remove(); else mount(c);
    });
    c.box.replaceChildren(f);
    queue();
  }
  // The card's view sizes the frame; a live card never moves, since a moved frame loads again.
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), said = document.createElement('p');
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, doc: old.getAttribute('srcdoc'), title: old.title, said: said, resets: 0 };
    box.closest('.item').querySelector('.words').appendChild(said);
    cards.push(c);
    mount(c);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      folds.forEach(measure);
    }
    queue();
    if (view) fitBig();
    if (open) place();
    bar();
  });
  window.addEventListener('load', queue);
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as its Archive shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
