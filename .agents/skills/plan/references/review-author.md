# Author a review visual

The reviewer reads `review.html`. Write only `review-visuals.html` for each new change, using the documented classes below. See [examples of all four visual kinds](review-examples.html); they are author guidance, not part of the output. The builder reads [the kit](review-kit.html); authors need no full viewer-source read. Inspect a specific kit section only when the guide and examples cannot answer a concrete question. Do not copy the kit's chrome, CSS, script, proposal, fallback stages, or closing layout tags. The builder inserts the fragment into the kit and reads Why and What Changes from `proposal.md`.

Give each proposal bullet a visual anchor `(review.html#/<id>[/<state>][/<mark>])`, or leave it unanchored when text alone explains it. Each pictured bullet owns one visual. The viewer puts its full text above that visual; do not copy the text or draw another change list inside it. A mark identifies the changed element through `data-mark="<mark>"`; it cannot have the same name as a state of that visual. Put a numbered `.callout` on a choice that matters and explain the matching number in a `.notes` list. Make the page understandable without opening `design.md`.

Use these forms:

- `screen`: a low-fidelity page or component with meaningful default, empty, loading, and error states where the design needs them. Put each state in `.state.state-<name>`. Show at most one `.btn.primary` per visible state. Use `data-local-state="<state>"` for local controls; only the outer change list selects another item.
- `flow`: connected `.flow-card` steps with a title, short description, change label, and in-card `details`. Put today and after paths in `.state.state-today` and `.state.state-after` when both exist. Use `.flow-branches` for labeled paths that split and rejoin. Give annotatable steps and branches stable `data-target-id` values.
- `diff`: two `.diff` columns containing a label and a `pre` with `.line.add` or `.line.del`.
- `tree`: `.tree` or a tree-like `ul` with `.add`, `.edit`, and `.del` items and optional `.why`.

Available primitives include `.topbar`, `.nav`, `.btn`, `.input`, `table`, `.box`, `.skeleton`, `.hero`, `.kv`, `.tag`, `.row`, `.muted`, `.caption`, `.phone-only`, and `.desktop-only`. Keep all controls within their item, and use ordinary vertical scrolling. Match an existing screen when there is one. Do not add CSS, inline style, event handlers, scripts, external assets, or product branding. The builder enforces the source boundary.

Run the builder after proposal anchors and the fragment exist:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" "openspec/changes/<name>" --require-current
```

Then run the structural check in a browser and inspect every rendered state at desktop and phone width. A structural pass does not prove that the visual explains the change. One critic review and one revision round cover meaning, hierarchy, empty frames, and overflow.
