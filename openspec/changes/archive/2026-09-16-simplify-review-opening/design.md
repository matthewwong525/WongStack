## Context

See proposal.md for the problem. The fixed review kit has a shared router and a wrapping toolbar. The `.claude` path is a symlink to the tracked `.agents` directory. The kit itself is the existing screen used as the reference. The archived add-review-html change has no review file in this checkout.

## Goals / Non-Goals

Reuse the existing bullet navigation and browser-only controls. Keep the styling and saved annotation format. Do not change the host application's toolbar shown above the HTML preview.

## Decisions

- Route an empty fragment through the first bullet, using the same text fallback as a click. Keep explicit visual/state/mark links. Replace the landing content with short guidance, with a separate empty-proposal message. Disable Previous at bullet one.
- At phone widths, keep Changes, the stepper, and Tools on one row. Hide the long title and hint. Put state selection and note actions in a collapsible tools region. Keep desktop controls exposed. Recalculate toolbar height when controls change so the Changes sheet stays aligned.
- Use the fixed kit's current components and native buttons. This requires no dependencies. A welcome screen was offered; the user chose to see the first change immediately.

## Risks / Trade-offs

- Secondary phone actions need one extra tap → keep a visible Tools label and an expanded state for assistive technology.
- Long state names can wrap → allow wrapping inside the expanded region only.
- Old review files embed the old kit → update the shared copies and this review file; preserve archives.

## UX

### Use-case brief

A reviewer opens each proposal on a laptop or phone and scans the changes. Assume navigation is frequent and annotation/state selection is occasional. Done means the reviewer has read the relevant visual and can copy feedback. Mirror the review kit.

### Flow

Open → first change → Next or Changes → inspect another change. On phone: Tools → state or note action → close Tools → continue reading. An empty proposal shows a short message. No network loading state is needed.

### Hierarchy

The current visual is the main content. Next is the main navigation action. Changes opens the navigation sheet on phone. Tools holds secondary controls and can be closed.

### Components

Existing panel, stage, stepper, state buttons, annotation controls, and a native Tools toggle with an expanded region.

### Review

See [opening](review.html#/opening/first), [invalid-link fallback](review.html#/fallback/invalid/guidance), [empty proposal](review.html#/fallback/empty/guidance), [phone toolbar](review.html#/phone/collapsed/compact), and [expanded tools](review.html#/phone/expanded/compact).
