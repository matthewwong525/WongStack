# Drawing in plans and explore

How [`/plan`](../SKILL.md#draw-in-the-proposal-then-build-the-page) and [`/explore`](../../explore/SKILL.md#questions-during-standalone-exploration) draw: a fenced `text` block in `┌─┐│└┘├┤┬┴┼` and `▶◀▲▼`, no emoji (two columns wide). Aim for 40 columns; up to 56 side by side; the builder warns past 60. Pad every box line to its top edge's length: the builder flags a crooked edge.

**Titled frame**
```text
  SAVE A NOTE
  ═══════════════════════
  type ──▶ save ──▶ copy
```

**Split and join**
```text
      request
         │
    ┌────┴────┐
    ▼         ▼
 cached     fresh
    │         │
    └────┬────┘
         ▼
      answer
```

**Side by side, labels under**
```text
┌────────┐  ┌────────┐  ┌────────┐
│ manual │  │ hybrid │  │  auto  │
└────────┘  └────────┘  └────────┘
 slow, safe   balanced  fast, risky
```

**Comparison table**
```text
          │ keep local │ sync
──────────┼────────────┼─────────
login     │ none       │ needed
offline   │ yes        │ cached
```

**Screen**: low fidelity; a changed one before and after, a new one per named state ([what it holds](../../../../wiki/ux-principles.md#the-review-file)).
```text
   BEFORE              AFTER
┌────────────┐    ┌────────────┐
│ Notes      │    │ Notes    3 │
│            │    │ • fix it   │
│ [Copy]     │    │ [Save]     │
└────────────┘    └────────────┘
```
