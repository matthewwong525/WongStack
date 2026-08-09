import { defineConfig } from "vitest/config";

// A config of its own, rather than reusing `vite.config.ts`: that config loads
// the Cloudflare plugin, which builds and serves the Worker. The suite here
// imports the Worker's modules directly and needs no runtime around them, so
// this keeps the test run free of the dev-server machinery.
export default defineConfig({
  test: {
    include: ["worker/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
