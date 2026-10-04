import { defineConfig } from "vitest/config";

// Every page test renders in jsdom. A test that only reads files names the
// node environment at its top.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
