// Runs the screens' real-browser tests (vitest.config.browser.ts). With no browser a local run skips with one line and
// CI fails: an install may lack Chrome, and CI always has it.
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const where = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' };
try {
  await (await chromium.launch({ headless: true, ...where })).close();
} catch (error) {
  const why = `(${error.message.split('\n')[0]}; install Chrome or set CHROME_PATH)`;
  if (process.env.CI) {
    console.error(`no browser to drive — CI must run these tests ${why}`);
    process.exit(1);
  }
  console.log(`no browser to drive — skipped ${why}`);
  process.exit(0);
}
const run = spawnSync('vitest', ['run', '--config', 'vitest.config.browser.ts'], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(run.status ?? 1);
