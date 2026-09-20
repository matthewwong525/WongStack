# Author a review visual

The reviewer reads `review.html`. Write only `review-visuals.html` for each new change, using the fixed classes in [the kit](review-kit.html). See [examples of all four visual kinds](review-examples.html); they are author guidance, not part of the output. Do not copy the kit's chrome, CSS, script, proposal, fallback stages, or closing layout tags. The builder inserts the fragment into the kit and reads Why and What Changes from `proposal.md`.

Give each proposal bullet a visual anchor `(review.html#/<id>[/<state>][/<mark>])`, or leave it unanchored when text alone explains it. Two bullets can share a visual. A mark identifies the changed element through `data-mark="<mark>"`; it cannot have the same name as a state of that visual. Put a numbered `.callout` on a choice that matters and explain the matching number in a `.notes` list. Make the page understandable without opening `design.md`.

Use these forms:

- `screen`: a low-fidelity page or component with meaningful default, empty, loading, and error states where the design needs them. Put each state in `.state.state-<name>`. Show at most one `.btn.primary` per visible state. Use `data-go="<visual-id>"` for the primary route.
- `flow`: `.lane` rows of `.step` boxes and `.arrow` separators. For today and after, set `data-states="after today"` and mark the old lane `.today`.
- `diff`: two `.diff` columns containing a label and a `pre` with `.line.add` or `.line.del`.
- `tree`: `.tree` or a tree-like `ul` with `.add`, `.edit`, and `.del` items and optional `.why`.

Available primitives include `.topbar`, `.nav`, `.btn`, `.input`, `table`, `.box`, `.skeleton`, `.hero`, `.kv`, `.tag`, `.row`, `.muted`, `.caption`, `.phone-only`, and `.desktop-only`. Match an existing screen when there is one. Do not add CSS, inline style, event handlers, scripts, external assets, or product branding. The builder enforces the source boundary.

Run the builder after proposal anchors and the fragment exist:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "openspec/changes/<name>" --require-current
```

Then run the structural check in a browser and inspect every rendered state at desktop and phone width. A structural pass does not prove that the visual explains the change. One critic review and one revision round cover meaning, hierarchy, empty frames, and overflow.
