---
slug: simplify-review-opening
started: 2026-09-16
updated: 2026-09-16
---

The desktop screenshot showed the proposal for exploration question changes. The phone screenshot showed a different proposal, explore-video-briefs-shade, inside an HTML preview. These are examples of the shared review kit; their source files are not active changes in this checkout. The host application's header above review.html is outside this repo's review toolbar.

Browser evidence from the shared kit and this change's review page:

- At 390px, the old toolbar with a long title and screen states was 165px tall. The new closed toolbar is 52px tall at both 320px and 390px, with no horizontal page overflow.
- Opening without a fragment selects bullet one and its marked visual. Previous is disabled. Next and the sidebar navigate correctly. Direct visual/state/mark links still open their target.
- Temporary text-only, invalid-anchor, and empty-proposal fixtures showed the correct text or empty fallback. Reloading an invalid-anchor bullet retained its text fallback.
- Tools exposed state and note controls. On 320px, the expanded toolbar and Changes sheet top were both 152px. Selecting a bullet closed the sheet. Closing Tools restored the 52px row.
- A phone annotation saved a pin and Copy notes produced the expected continue command. Desktop controls remained exposed at 1440px, with correct sidebar offset after a state change.
- Payload link, OpenSpec config, and strict change checks passed. No local app build was run.

The design and critic agents completed one review round. The revision removed inline styles and prevented the drawn phone counter from wrapping. Browser screenshots were captured under /tmp for inspection; the durable review artifact is in the change folder.
