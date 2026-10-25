import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// The screens in a real browser, for what the test DOM can't see: layout. playwright brings no browser, so this drives
// the machine's Chrome, or the Chromium at CHROME_PATH; tests/browser.mjs skips a local run with neither.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `@/` is app/src/, as in vite.config.ts.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.browser.test.tsx"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" } }),
      instances: [{ browser: "chromium" }],
      // A phone, as the person holds one.
      viewport: { width: 390, height: 844 },
    },
  },
});
