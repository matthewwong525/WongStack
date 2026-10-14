// Owner setup readies cloudflared and signs the owner in once, so memory needs no key on a private site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(join(repo, '.agents/skills/wong-setup/references', path), 'utf8');
const section = (text, heading) => text.slice(text.indexOf(heading), text.indexOf('\n#', text.indexOf(heading) + heading.length));

test('the tool check readies cloudflared with the other tools and says memory waits without it', () => {
  const helpers = section(read('tools.md'), '### The helpers');
  assert.match(helpers, /\*\*`cloudflared`:\*\*.*signs the owner in/);
  assert.match(helpers, /Without `cloudflared`, memory waits/);
});

test('the first deploy signs the owner in once, showing the link, before memory is checked', () => {
  const smoke = section(read('cloudflare.md'), '### 4g.');
  const signIn = smoke.indexOf('company-api.mjs login --origin');
  assert.ok(signIn > 0 && signIn < smoke.indexOf('$M digest'));
  assert.match(smoke, /show the link it prints in the chat/);
});

test('a private site issues no memory key; only an open site keeps the admin key', () => {
  const store = section(read('cloudflare.md'), '### 4b.');
  assert.match(store, /\*\*No memory key\.\*\*/);
  assert.equal(store.match(/member admin/g)?.length, 1);
  assert.match(store, /Only an open site[^.]*`memory\.mjs member admin`/);
});

test('the closing report says memory is on only once the signed-in digest answered', () => {
  const report = section(read('cloudflare.md'), '## Step 5');
  assert.match(report, /Session memory: on[^\n]*only when 4g's digest answered/);
  assert.doesNotMatch(report, /memory key|\.env file/);
});
