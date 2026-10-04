# Drawing in plans and explore

How [`/plan`](../SKILL.md#draw-in-the-proposal-then-build-the-page) and [`/explore`](../../explore/SKILL.md#questions-during-standalone-exploration) draw: a fenced `text` block in `┌─┐│└┘├┤┬┴┼` and `▶◀▲▼`, no emoji (two columns wide). Aim for 40 columns; up to 56 side by side; the builder warns past 60. Pad every box line to its top edge's length: the builder flags a crooked edge. Pick the pattern by what the bullet explains, not a top-to-bottom chain.

**Steps**: usual path in one line, failures below.
```text
publish ─▶ lands? ─▶ live
             │ no
             ▼
          say why ─▶ fix
```

**Back and forth**: who asks whom, in order.
```text
you         assistant
 │── ask ──────▶│
 │◀── a plan ───│
```

**States**: where a thing stands, what moves it.
```text
draft ─▶ saved ─▶ live
           ▲        │
           └─ undo ─┘
```

**Side by side, labels under**
```text
┌────────┐  ┌────────┐
│ manual │  │  auto  │
└────────┘  └────────┘
 slow, safe  fast, risky
```

**Comparison table**
```text
        │ local │ sync
────────┼───────┼───────
login   │ none  │ needed
offline │ yes   │ cached
```

**Before and after**: a changed flow or screen, `+` on new parts. Screens: low fidelity, a new one per named state ([what it holds](../../../../wiki/ux-principles.md#the-review-file)).
```text
  BEFORE         AFTER
save ─▶ live   save ─▶ +check ─▶ live
┌─────────┐    ┌─────────┐
│ Notes   │    │ Notes 3 │
│ [Copy]  │    │ +[Save] │
└─────────┘    └─────────┘
```
