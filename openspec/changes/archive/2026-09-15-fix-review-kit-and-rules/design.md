# Design: fixing four silent failures

## Context

See `proposal.md` — Why. All four defects shipped in 13.0.0 and survived its verification, which is the part worth understanding before fixing them.

**Why the state defect got through.** The walk asserted that every state named in `data-states` had a matching `.state-<name>` block. It did. The blocks were present and invisible, because the reveal was four hard-coded CSS rules and the names were not among them. Checking markup presence answers "did the author write it", not "does a reviewer see it" — and only the second is the thing the requirement cares about.

**Why the config defect got through.** Nothing checks it. The CLI prints `Warning: could not parse … ignoring it` and carries on with defaults, so the only symptom is rules quietly not applying to artifacts nobody was comparing against the rules.

Constraints unchanged from 13.0.0: no network, no dependency, renders from `file://` years from now, and no top-level statement that can throw before the first render.

## Goals / Non-Goals

**Goals:**

- Any state name renders, with the four standard names behaving exactly as before.
- The critic's checks judge the rendered page, not its markup.
- A broken planning config fails the release rather than degrading silently.

**Non-Goals:**

- Validating `config.yaml` against a schema. "The CLI can read it" is the property that matters; anything more duplicates the CLI's own rules.
- Reworking the verification approach generally. Two checks change; the walk stays as it is.

## Decisions

1. **The router marks the live state; one CSS rule reveals it.** CSS cannot match "the class whose name equals this attribute's value" without a rule per name, which is what produced the bug. So the reveal moves to where the name is already known:

   ```css
   .state { display:none; }
   .state[data-on] { display:block; }
   ```

   and `show()` toggles `data-on` onto the block whose class matches. Alternatives: add rules for the names we happen to use (the same trap, one release later); or drop `.state` blocks and let the filler write one screen per state (doubles the states and lets the per-state primary-action count drift between copies). The four standard names are a subset of "any name", so every page written under 13.0.0 renders identically.

2. **The critic's state check becomes a rendering check.** The instruction changes from *a state named in `data-states` with no matching `.state-<name>` block* to *a declared state that renders an empty frame*, and the spec gains a scenario saying it holds whether or not the markup is there. A check phrased against markup can only find the failure the author already avoided.

3. **`showText` clears highlights.** One line, matching what `show()` already does. The stale marks sat on a hidden section so nothing was visible, but state that outlives the thing that set it is the shape of a future bug, not a cosmetic nit.

4. **The config check shells out to the CLI rather than parsing YAML.** `scripts/check-openspec-config.mjs` runs the OpenSpec CLI and fails if the output mentions that it could not parse the config. No YAML dependency enters the repo, and the check agrees with the parser that actually matters by construction — a hand-rolled parser could accept a file the CLI rejects. It is a separate script rather than another job inside `check-payload-links.mjs`, because that script's contract is links and a name that lies is its own silent failure.

5. **The config line is rephrased, not quoted.** `review-kit.html: one visual per` becomes `review-kit.html — one visual per`. Quoting the whole scalar would work and would leave the next author one keystroke from the same bug; removing the colon removes the hazard. The rule's prose is unchanged in meaning.

6. **One change, not four.** Same release, same class, and the config defect silently disables the rules that govern how every future change is drafted — including any change that would have fixed the others.

## Risks / Trade-offs

- **A target has already synced the broken config.** → The next `/wong-sync` proposes the fixed stanza like any payload update; the changelog says what the symptom was, since a repo cannot see it by inspection.
- **The new check is one more thing to run at release.** → It runs in under a second, and the payload rule already names a release check, so the ritual gains a line rather than a step.
- **A rendering check is weaker to state than a markup check.** → It has to be performed in a browser, which the walk already does. That is the cost of asking a question worth asking.

## Migration Plan

None. Patch release; every existing review page renders unchanged.
