import { afterAll, beforeAll } from "vitest";

/** The longest a full runtime run may take, the build included: it is what a person waits for. wiki/stack/testing.md */
export const BUDGET_MS = 30_000;
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** Times each app's `describe` and the whole run, from when it is made. `now` is a clock a test may stand in for. */
export function budget(apps: readonly string[], now = () => performance.now()) {
  const started = now();
  const spent = new Map<string, number>();
  return {
    /** Called first inside an app's `describe`: Vitest runs after-hooks in reverse, so this one runs last. */
    track(name: string) {
      let from = 0;
      beforeAll(() => { from = now(); });
      afterAll(() => { spent.set(name, now() - from); });
    },
    /** Prints the times, and throws over the budget naming the three slowest apps. A run that skipped an app, as
     *  `-t <name>` does, is not held to it. */
    check() {
      const total = now() - started;
      const slowest = [...spent].sort((a, b) => b[1] - a[1]).slice(0, 3);
      console.info(`runtime timing: ${seconds(total)} in all; ${[...spent].map(([name, ms]) => `${name} ${seconds(ms)}`).join(", ")}`);
      if (spent.size < apps.length || total <= BUDGET_MS) return;
      throw new Error(`The real-database tests took ${seconds(total)}; the limit is ${BUDGET_MS / 1000} s. Slowest:\n${
        slowest.map(([name, ms]) => `  ${name.padEnd(10)} ${seconds(ms)}`).join("\n")}`);
    },
  };
}
