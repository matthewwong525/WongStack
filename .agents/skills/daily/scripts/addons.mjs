// Add-ons: an install's own Node scripts that the daily runs at the morning and on each watch pass.
// The contract: wiki/development/daily.md#add-ons. A failing add-on is one `not-read` and never stops the daily.
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ADDON_MS = 60e3;
const OUT_BYTES = 1024 * 1024;
const LINE_CHARS = 300;
const AGENT_ID = /^[A-Za-z0-9._-]{1,128}$/;
const oneLine = value => String(value).split('\n')[0].slice(0, 200);

/** Runs one script with `input` on stdin; resolves to its stdout, or throws with its first error line. */
export function runNode({ file, cwd, input, timeout = ADDON_MS }) {
  return new Promise((done, failed) => {
    const child = execFile(process.execPath, [file], { cwd, timeout, maxBuffer: OUT_BYTES, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) failed(new Error(oneLine(String(stderr ?? '').trim() || error.message)));
      else done(stdout);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(input));
  });
}

/** One add-on's stdout as `{lines, events, skip}`; a line that is no JSON object of these keys is refused. */
export function readOutput(stdout) {
  const out = { lines: [], events: [], skip: [] };
  for (const raw of String(stdout).split('\n').map(each => each.trim()).filter(Boolean)) {
    let item;
    try { item = JSON.parse(raw); } catch { throw new Error(`printed a line that is not JSON: ${raw.slice(0, 80)}`); }
    if (typeof item?.line === 'string' && item.line.trim() && !item.line.includes('\n')) out.lines.push(item.line.trim().slice(0, LINE_CHARS));
    else if (item?.event && typeof item.event === 'object' && typeof item.event.event === 'string') out.events.push(item.event);
    else if (Array.isArray(item?.skip) && item.skip.every(id => AGENT_ID.test(String(id)))) out.skip.push(...item.skip.map(String));
    else throw new Error(`printed a line with no line, event or skip: ${raw.slice(0, 80)}`);
  }
  return out;
}

// Runs each add-on in order with `context` on stdin: `{lines, events, skip, failed}`, with one `{addon, error}` in
// `failed` per add-on that did not run. `run` is for tests.
export async function runAddons({ list = [], repo, context, run = runNode }) {
  const result = { lines: [], events: [], skip: [], failed: [] };
  for (const addon of list) {
    try {
      const file = join(repo, addon);
      if (!existsSync(file)) throw new Error('no such file');
      const out = readOutput(await run({ file, cwd: repo, input: { ...context, addon } }));
      result.lines.push(...out.lines);
      result.events.push(...out.events.map(event => ({ ...event, addon })));
      result.skip.push(...out.skip);
    } catch (error) { result.failed.push({ addon, error: oneLine(error.message) }); }
  }
  return result;
}
