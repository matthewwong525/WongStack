// A stand-in for agent-browser in scripts/tests/verify-journeys.test.mjs. It answers the few commands
// verify-runner.sh sends, and loads pages with plain requests, so a kept check replays against the
// practice site with no Chrome. It runs no page script, so a control that needs one is not found.
// Each call is logged to calls.txt in FAKE_BROWSER_STATE. Meta-only: no target receives it.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('agent-browser 0.0.0-fake');
  process.exit(0);
}
const [, session, command] = args;
const stateDir = process.env.FAKE_BROWSER_STATE;
const stateFile = join(stateDir, `${session}.json`);
appendFileSync(join(stateDir, 'calls.txt'), `${session} ${command}\n`);

let page = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { url: '', html: '' };

async function load(url, init) {
  const response = await fetch(url, init);
  page = { url: response.url, html: await response.text() };
}

// What a person would read: no scripts, no hidden elements, no tags.
const shown = () => page.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<(\w+)[^>]*\shidden[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');

// Submit the form that holds a button with this label or text.
async function press(name) {
  for (const [, method, action, inner] of page.html.matchAll(/<form method="(\w+)" action="([^"]+)">([\s\S]*?)<\/form>/g)) {
    const buttons = [...inner.matchAll(/<button(?: aria-label="([^"]*)")?[^>]*>([^<]*)<\/button>/g)];
    if (!buttons.some(([, label, words]) => (label ?? words) === name)) continue;
    const post = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' };
    return load(new URL(action, page.url).href, method.toLowerCase() === 'post' ? post : undefined);
  }
  throw new Error(`Element not found: ${name}`);
}

async function step([verb, ...more]) {
  if (verb === 'open') return load(more[0]);
  if (verb === 'find' && more.slice(0, 3).join(' ') === 'role button click') return press(more[more.indexOf('--name') + 1]);
  if (verb !== 'wait') throw new Error(`Unknown command: ${verb}`);
  if (/^\d+$/.test(more[0])) return new Promise(done => setTimeout(done, Number(more[0])));
  const late = new Error(`Wait timed out after ${more[more.indexOf('--timeout') + 1]}ms`);
  if (more[0] === '--text' && !shown().includes(more[1])) throw late;
  if (more[0] === '--fn' && shown().includes(JSON.parse(/includes\((".*")\)$/.exec(more[1])[1]))) throw late;
  return undefined;
}

if (command === 'get') console.log(page.url);
if (command === 'batch') {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const results = [];
  for (const entry of JSON.parse(input)) {
    try {
      await step(entry);
      results.push({ command: entry, error: null, result: {}, success: true });
    } catch (error) {
      results.push({ command: entry, error: error.message, result: null, success: false });
      break;
    }
  }
  writeFileSync(stateFile, JSON.stringify(page));
  console.log(JSON.stringify(results));
  process.exitCode = results.every(result => result.success) ? 0 : 1;
}
