## 1. The planning config

- [x] 1.1 `openspec/config.yaml`: rephrase the design rule so no unquoted scalar contains a colon-space (`review-kit.html: one visual per` → an em dash), and scan the rest of the file for the same hazard
- [x] 1.2 Confirm the CLI reads it: `openspec list` emits no "could not parse" warning, and `openspec instructions design --change fix-review-kit-and-rules --json` returns the design rules rather than nothing

## 2. The kit (`.agents/skills/plan/references/review-kit.html`)

- [x] 2.1 Replace the four hard-coded state rules with `.state { display:none; }` + `.state[data-on] { display:block; }`, and have `show()` toggle `data-on` onto the block whose class matches the current state
- [x] 2.2 `showText()` clears `.marked` the way `show()` does
- [x] 2.3 Update the kit's header comment where it explains `data-states`, so it says plainly that any name works and that each state needs its own `.state-<name>` block
- [x] 2.4 Drive the kit from `file://` with agent-browser: the four example states render as before; a scratch screen given `data-states="default annotating phone"` renders each state by computed style, not by markup presence; opening the text bullet leaves nothing highlighted; no state shows two primary actions; the document holds no network reference

## 3. The critic

- [x] 3.1 `.agents/skills/plan/SKILL.md`: the state check becomes "a declared state that renders an empty frame", named whether or not the markup is present

## 4. The release check

- [x] 4.1 Write `scripts/check-openspec-config.mjs`: run the OpenSpec CLI, fail with a named file and a non-zero exit when it reports it could not parse the config, pass quietly otherwise
- [x] 4.2 Check it both ways by hand — against the fixed file, and against a scratch copy with a colon-space reintroduced
- [x] 4.3 Name it beside the link checker in `.agents/rules/payload.md` and `wiki/development/README.md`, and add it to the skill-scripts list in `.agents/skills/wong-sync/references/payload-manifest.md`

## 5. Release

- [x] 5.1 `VERSION` 14.0.0 → 14.0.1 and a newest-first `CHANGELOG.md` entry that says what each silent failure did, and that a target which synced 13.0.0 or 14.0.0 has the broken config stanza
- [x] 5.2 Both release checks pass: `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 5.3 Regenerate the untracked `review-sample.html` from the fixed kit so the sample and the kit agree
