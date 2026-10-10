import { enableCompileCache } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Cache bytecode for the already-installed tools; keep it inside the app's ignored dependency folder.
const cache = enableCompileCache(fileURLToPath(new URL("./node_modules/.cache/runtime", import.meta.url)));
if (cache.directory) process.env.NODE_COMPILE_CACHE = cache.directory;

// Assertions stay in Node; setup builds only the real Worker and starts workerd once.
export default defineConfig({
  test: {
    reporters: ["verbose"],
    include: ["tests/runtime/runtime.test.ts"],
    environment: "node",
    disableConsoleIntercept: true,
    fileParallelism: false,
    retry: 0,
    hookTimeout: 30_000,
    testTimeout: 10_000,
    passWithNoTests: false,
  },
});
