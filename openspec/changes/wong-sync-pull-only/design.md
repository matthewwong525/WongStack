## Context

Change 3 of the arc, and the only one independent of the Cloudflare stack — it could have shipped first. `/wong-sync` was built as a "round trip": pull, then curate local drift and offer it upstream. In practice the contribute leg is declined most runs, so a command people invoke to *get updates* ends with a curation step they didn't ask for. The machinery is good; the trigger is wrong.

The fix is deliberately small: gate an existing step behind an argument, then make the prose stop promising it. The risk here is not implementation — it's **discoverability**, since removing a prompt removes the only place most people would learn the capability exists.

## Goals / Non-Goals

**Goals:**
- A bare `/wong-sync` pulls and stops. No curation, no contribute prompt.
- `/wong-sync contribute` runs the existing leg unchanged, still pulling first.
- Replace the prompt's discovery role with a documented page that ships to target repos.
- Reword every surface that implies a plain sync contributes.

**Non-Goals:**
- No behavior change inside the contribute leg (curation bar, opt-in-per-file, fork-aware PR, release ritual all stay).
- No change to the pull leg, three-way classification, fresh mode, manifest schema, or the stack pack.
- Not removing the capability — this is a trigger change, not a deprecation.

## Decisions

**1. Argument-gated, not deleted.** `/wong-sync contribute` keeps the whole Step 4–5 flow intact; a bare run skips to Step 6. Deleting the machinery would have been simpler but throws away working fork-aware PR + release-ritual code that has no other home. *Alternative — a `--contribute` flag:* same thing, but the skills in this payload take bare-word arguments (`/save <note>`, `/continue <name>`), so a bare word matches the house style.

**2. An explicit contribute run still pulls first.** The pull-before-contribute ordering is what makes local drift that already landed upstream self-cancel instead of being re-offered. That's a correctness property of the classification, not a UX nicety, so it survives the gating — `/wong-sync contribute` is "sync, then also contribute," never "contribute only."

**3. The contributing page is a *synced* doc, not a meta-repo page.** This is the load-bearing choice. `wiki/development/` documents working on WongStack itself and does **not** sync to targets; a contributing page that lives only there would be invisible to exactly the people who need it — someone in a target repo who improved a skill. So it joins the manifest's synced docs list (alongside `wiki-style.md`, `voice.md`, `secrets.md`, `ux-principles.md`) and installs into every target. Without this, removing the prompt genuinely loses the capability.

**4. Reword prose everywhere, in one pass.** Six surfaces currently promise the round trip: the `wong-sync` skill `description` + opener + the Step-1-through-6 diagram, `CLAUDE.md`'s "What this is" sentence and its `WONG-STACK` block bullet, `wiki/development/README.md`, `README.md`'s skill table, `wong-setup`'s installed-repo hand-off line, and `required-tools.md`'s `gh` row (which cites "the `/wong-sync` contribution leg" as a reason `gh` is required — still true, but should read as the explicit action). A spec scenario asserts none of them describe a bare sync as contributing, so this can't half-land.

**5. `gh` stays required.** It's needed for the pull leg's clone refresh and for the delivery gate regardless; the contribute leg was never its only justification. Only the wording of that row changes.

## Risks / Trade-offs

- **Discoverability loss** → the prompt was the only place most users met the contribute capability; a page can go unread. *Mitigation:* Decision 3 (ship the page into targets), plus naming `/wong-sync contribute` in the skill's own description and report so an agent reading the skill still surfaces it on request. Accepted: fewer accidental contributions is the point, and a contribution someone had to seek out is a better contribution.
- **Fewer upstream contributions overall** → the honest consequence of making it opt-in-by-invocation. *Trade accepted:* the prompt was mostly generating declines, and the curation bar already made most drift a skip.
- **Skill prose drift** → six surfaces reworded by hand can half-land. *Mitigation:* the spec scenario "No payload prose implies automatic contribution" makes the sweep verifiable, and a task enumerates every file.
- **Someone's muscle memory** → a user who relied on the automatic prompt now has to know the word. *Mitigation:* the pull-only report ends by naming `/wong-sync contribute` as the way to send improvements up — one line, no prompt, no decision to make.

## Open Questions

- None blocking.
