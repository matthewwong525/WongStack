import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// browse.mjs names its files from the home folder as it loads, so the test gets its own first.
process.env.HOME = mkdtempSync(join(tmpdir(), 'refs-test-'));
const { buildSnapshot } = await import('../../.agents/skills/browser/scripts/refs.mjs');
const { relabel } = await import('../../.agents/skills/browser/scripts/browse.mjs');

test('a page over 500 boxes gets 500 refs, and a date picker or a frame past them gets none', () => {
  const main = [...Array.from({ length: 600 }, (_, at) => `- button "Item ${at}"`), '- button "Open date picker"'].join('\n');
  const { snapshot, refs } = buildSnapshot(main, [{ label: 'late', yaml: '- textbox "Late"', frame: null }]);
  assert.equal(refs.size, 500);
  assert.match(snapshot, /^- button "Item 499" \[e500\]$/m);
  assert.match(snapshot, /^- button "Item 500"$/m);
  assert.match(snapshot, /^- button "Open date picker"$/m);
  assert.match(snapshot, /^- iframe "late":\n {2}- textbox "Late"$/m);
  // An unnamed box counts every box of its role before it, as `getByRole(role)` finds them.
  const mixed = buildSnapshot('- button "Calendar"\n- button "Go"\n- button').refs;
  assert.deepEqual([...mixed.values()].map(({ name, nth }) => [name, nth]), [['Go', 0], ['', 2]]);
});

test('a frame\'s boxes come after the main page\'s and keep their frame', () => {
  const { snapshot, refs } = buildSnapshot('- textbox "Email"\n- button "Next"', [{ label: 'login.example.com', yaml: '- textbox "Password"', frame: 'the frame' }]);
  assert.equal(snapshot, '- textbox "Email" [e1]\n- button "Next" [e2]\n- iframe "login.example.com":\n  - textbox "Password" [e3]');
  assert.deepEqual(refs.get('e3'), { role: 'textbox', name: 'Password', nth: 0, frame: 'the frame' });
  assert.equal(refs.get('e1').frame, null);
  assert.equal(relabel(snapshot, refs.size), snapshot, 'the client leaves a snapshot whose count agrees byte for byte');
});

test('a name with a colon, a quote or an apostrophe gets the name and count that getByRole finds', () => {
  const { snapshot, refs } = buildSnapshot([
    `- 'button "Step 1: pay"'`,
    '- button',
    '- button "Say hello"',
    '- button "Say \\"hi\\""',
    `- 'link "Jo''s page: home"':`,
    '  - /url: /home',
    '- button "Say \\"hi\\""',
  ].join('\n'));
  const got = Object.fromEntries([...refs].map(([ref, { role, name, nth }]) => [ref, { role, name, nth }]));
  assert.deepEqual(got, {
    e1: { role: 'button', name: 'Step 1: pay', nth: 0 },
    e2: { role: 'button', name: '', nth: 1 },
    e3: { role: 'button', name: 'Say hello', nth: 0 },
    e4: { role: 'button', name: 'Say "hi"', nth: 0 },
    e5: { role: 'link', name: "Jo's page: home", nth: 0 },
    e6: { role: 'button', name: 'Say "hi"', nth: 1 },
  });
  assert.match(snapshot, /^- 'button "Step 1: pay" \[e1\]'$/m);
  assert.match(snapshot, /^- button "Say \\"hi\\"" \[e4\]$/m);
  assert.match(snapshot, /^- 'link "Jo''s page: home" \[e5\]':$/m);
  assert.equal(relabel(snapshot, refs.size), snapshot, 'the client reads the quoted lines the same way');
});
