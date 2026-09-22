# Author a review visual

Write only `review-visuals.html` using these classes and [examples](review-examples.html). The builder reads [the kit](review-kit.html) and inserts the proposal text. Inspect kit source only for a question this guide and the examples cannot answer. Do not copy its chrome, CSS, script, proposal, fallback stages, or closing tags.

Draw one visual that carries the change by default, or each new or restructured user-facing screen. State why any further visual is needed; leave other bullets as text. Return a bullet-to-anchor map using `(review.html#/<id>[/<state>][/<mark>])`. Each visual has one owning bullet. The viewer shows that bullet's text; do not repeat it. A `data-mark="<mark>"` name cannot match a state name. Number important `.callout` choices and explain them in `.notes`. The page must stand alone without `design.md`.

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

Run one browser structural check, or report it unverified. The reviewer annotates meaning and layout; a structural pass does not prove the visual explains the change.
