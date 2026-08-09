import { defineConfig } from "vitest/config";

// The suite exercises the scripts the payload ships. Several of them are shell,
// so tests invoke them rather than importing them — coverage follows what is
// shipped, not what is convenient to import. That makes the tests slower than
// pure unit tests and worth more: they run the same entry point a target repo
// runs.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    testTimeout: 60_000,
  },
});
