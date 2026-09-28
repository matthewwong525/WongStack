# Drawing in plans and explore

This guide is how [`/plan`](../SKILL.md#draw-in-the-proposal-then-build-the-page) draws a What Changes picture and how [`/explore`](../../explore/SKILL.md#questions-during-standalone-exploration) draws in chat: a fenced `text` block, one width rule, five patterns.

## Characters

Boxes `┌ ─ ┐ │ └ ┘`, joins `├ ┤ ┬ ┴ ┼`, arrows `▶ ◀ ▲ ▼`, and `═` under a title. No emoji or wide characters: each takes two columns and pushes every edge after it out of line.

## Width

Aim for 40 columns, the width of a phone. Go up to 56 for options side by side, a table, or a before-and-after. The page's builder warns past 60. Prefer one column when it reads as well.

## Patterns

Pick the pattern that shows the point; copy its shape, not its words.

**Titled frame**: one flow, named.
```text
┌─────────────────────────┐
│       SAVE A NOTE       │
├─────────────────────────┤
│ type ──▶ save ──▶ copy  │
└─────────────────────────┘
```

**Side by side**: options next to each other.
```text
┌──────────┐    ┌──────────┐
│ keep     │    │ sync     │
│ local    │    │ them     │
└──────────┘    └──────────┘
```

**Split and join**: a branch that meets again.
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

**Labels under boxes**: what each option costs.
```text
┌────────┐  ┌────────┐  ┌────────┐
│ manual │  │ hybrid │  │  auto  │
└────────┘  └────────┘  └────────┘
 slow, safe   balanced  fast, risky
```

**Comparison table**: several options on several points.
```text
          │ keep local │ sync
──────────┼────────────┼─────────
login     │ none       │ needed
offline   │ yes        │ cached
```

## Screens

A screen sketch is low fidelity: boxes and labels, no brand. Draw a changed screen before and after, side by side within 56 columns, else one above the other. Draw a new screen once for each state its flow names, such as empty, loading, or error. [The review file](../../../../wiki/ux-principles.md#the-review-file) owns what a sketch holds.

```text
   BEFORE              AFTER
┌────────────┐    ┌────────────┐
│ Notes      │    │ Notes    3 │
│            │    │ • fix it   │
│ [Copy]     │    │ [Save]     │
└────────────┘    └────────────┘
```

## Count before you close a box

Every line of a box is the same length. Count the `─` in the top edge, then pad each line inside to match before you type its `│`. The builder warns when a right edge misses its corner's column, and still builds the page.
