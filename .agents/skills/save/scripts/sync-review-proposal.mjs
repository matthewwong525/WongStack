#!/usr/bin/env node
// Compatibility entry point for older save instructions.
import { buildReview } from '../../plan/scripts/build-review.mjs';

const root = process.argv[2];
if (!root) { console.error('usage: sync-review-proposal.mjs <change-root>'); process.exitCode = 2; }
else {
  try {
    const result = buildReview(root);
    console.log(`review: ${result.kind}, ${result.changed ? 'updated' : 'unchanged'}`);
  } catch (error) { console.error(`review: ${error.message}`); process.exitCode = 1; }
}
