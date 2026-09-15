---
slug: fix-review-kit-and-rules
started: 2026-09-15
updated: 2026-09-15
---

# Four silent failures, and how each one was found

## How this started

The user asked for a sample review page to look at: *"can you generate a sample html review thing
for me to view"*. The sample was built from the real `add-review-html` change. Then:

> "why is 5 and 6 blank here"

Two of the nine What Changes entries opened an empty frame. Everything downstream of that question
came out of chasing it.

## The four defects, in the order they surfaced

1. **A screen state could only be named one of four things.** The kit hid every `.state` block and
   revealed four by name (`default`, `empty`, `loading`, `error`) with hard-coded CSS. But
   `data-states` accepts any name, the router validates against whatever the visual declares, and
   the kit's own fill rules say `data-states="a b c"`. The sample declared `annotating` and `phone`;
   both blocks existed and both computed `display:none`.
2. **The critic was checking the wrong property.** Its check was *a state named in `data-states`
   with no matching `.state-<name>` block*. The blocks were there, so it passed — it passed defect 1
   directly. Markup presence answers "did the author write it", not "does a reviewer see it", and
   only the second is what the requirement is about.
3. **`openspec/config.yaml` had not parsed since 13.0.0 merged.** Found seconds later, when
   `openspec new change` printed `Warning: could not parse … ignoring it`. The design rule contained
   `…/review-kit.html: one visual per`, and a colon-space inside an unquoted YAML scalar starts a
   mapping key. The CLI drops the whole config and carries on with defaults, so **every change
   drafted since #78 was written against no per-artifact rules at all.** `git log` attributes the
   line to that merge.
4. **The text stage left `.marked` on the visual it came from.** No visible effect, because that
   visual is hidden. Kept in scope anyway: state that outlives the thing that set it is a bug in
   waiting.

## The lesson that ties them together

**Every one of these failed silently.** Nothing errored, nothing logged above a warning nobody was
reading, and each artifact quietly did less than it claimed. A silent failure deserves a higher
priority than a loud one, because nobody reports it — the blank frames were only ever going to be
found by a human looking at the page.

**Verify the property the requirement names, not a proxy for it.** Defect 2 is the general form.
The walk asserted markup existed; the requirement was about rendering. Checking computed style is
what found it, and the spec now says the check holds *whether or not the markup is present*.

## The check that shipped broken, and why the plan caught it

`scripts/check-openspec-config.mjs` first ran `openspec list` — which **does not read the config at
all**, so it happily passed a file `pyyaml` rejected. Task 4.2 existed to try the negative case, and
that is the only reason it was caught. A sweep of the CLI's read-only commands:

| Command | Surfaces the parse warning |
|---|---|
| `openspec doctor` | yes |
| `openspec context --json` | yes |
| `openspec instructions <artifact> --change <name>` | yes |
| `openspec list` | no |
| `openspec status --change <name> --json` | no |
| `openspec validate --specs` | no |

It now runs `openspec context --json` — read-only and needs no active change. The reason is a comment
in the script, because "ask a command that actually reads the file" *is* the correctness of it.

**Always test a detector against the failure it exists to detect.** A check that has only ever been
run against a passing input is not known to work.

## A second self-inflicted slip

Inserting the new release check into the payload rule's existing link-checker bullet left that
bullet's trailing sentence ("It resolves every internal link…") attached to the wrong script. Caught
by reading the file back after the edit. **When you splice a sentence into an existing bullet, re-read
the whole bullet** — the surrounding prose may now describe your insertion instead of its subject.

## Decisions

- **One change, not four.** Same release, same class, and defect 3 silently disables the rules
  governing how every future change is drafted — including one that would have fixed the others.
- **Rephrase the YAML, do not quote it.** Quoting the scalar would work and leave the next author one
  keystroke from the same bug. Removing the colon removes the hazard.
- **Ask the CLI, do not parse YAML.** No dependency enters the repo, and the check agrees with the
  parser that actually matters by construction. A hand-rolled parser could accept a file the CLI
  rejects, which is a check that lies.
- **The release checks are meta-repo, not payload.** Recorded in the manifest so a future sync does
  not try to ship them to a target.

## Open threads

- **A target that synced 13.0.0 or 14.0.0 has the broken config stanza** and has been drafting
  changes with no rules. The changelog says so and the next `/wong-sync` proposes the fix, but nobody
  can see the symptom by inspection — only by running the new check.
- **The kit's WebKit confirmation is still outstanding**, carried over from `add-review-html`.
- **`review-sample.html`** is untracked at the worktree root, rebuilt on the fixed kit. It is the
  only filled review page that exists; no change has yet been planned through the new review stage.
- **Two release checks now**, and no test harness for either. If a third lands, a runner is worth it.

## Process notes

- **Main moved under this session.** `#79` retired `/improve` and `/dream` and took `VERSION` to
  14.0.0, so this patch is 14.0.1 rather than the 13.0.1 discussed with the user before branching.
- The branch was cut from `origin/main` after that merge, so the fix sits on top of the retirement
  rather than beside it.
