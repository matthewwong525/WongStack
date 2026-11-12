import test from 'node:test';
import assert from 'node:assert/strict';
import { findKeys, maskKeys } from '../../.agents/skills/browser/scripts/mask-keys.mjs';

// Every value here is made up; none is a real key.
test('known prefixes and random mixed runs are hidden to their last four characters', () => {
  for (const key of ['sk_' + 'live_MADEUPa1b2c3d4e5f6g7h8', 'rk_' + 'test_FAKEFAKEFAKE00001111', 'ntn_madeup0000111122223333',
    'secret_notReal123notReal456', 'figd_madeup-value-0000-1111', 'gh' + 'p_FAKEfake0000FAKEfake1111', 'github_' + 'pat_11MADEUP_xyz0000aaaa',
    'xo' + 'xb-0000-1111-madeupvalue', 'gl' + 'pat-MADEUPvalue000011', 'Zq8vR2mXw9TbL4nKp7Yc3Hd6']) {
    const { text, found } = maskKeys(`Your key: ${key} (copy it now)`);
    assert.equal(text, `Your key: [key …${key.slice(-4)}] (copy it now)`, key);
    assert.equal(found, 1);
  }
});

test('ordinary prose, addresses and short or lowercase ids stay as they are on a page not about keys', () => {
  const page = [
    'Create a restricted key that only reads charges and customers.',
    'https://dashboard.stripe.com/apikeys/create?name=assistant',
    'cus_NffrFeUfNV2Hib  pi_3MtwBwLkdIwHu7ix  2b8c1d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
    'state-of-the-art-reporting-dashboard  getElementsByClassName  1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
  ].join('\n');
  assert.deepEqual(maskKeys(page), { text: page, found: 0 });
  assert.deepEqual(maskKeys(page, { url: 'https://example.com/orders', title: 'Orders' }), { text: page, found: 0 });
});

test('on a key page, found by its address, title or a heading, a long hex run and a UUID are hidden anywhere', () => {
  const hex = '0123456789abcdef0123456789abcdef01234567';
  const uuid = '2b8c1d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e';
  const snapshot = `- heading "Developer" [level=1, ref=e1]\n- StaticText "API token"\n- StaticText "${hex}"\n- StaticText "Client ID ${uuid}"`;
  for (const page of [{ url: 'https://app.todoist.com/app/settings/integrations/developer', title: 'Developer' },
    { url: 'https://example.com/settings', title: 'Settings' }]) {
    const { text, found } = maskKeys(snapshot, page);
    assert.equal(found, 2, page.url);
    assert.ok(!text.includes(hex) && !text.includes(uuid), page.url);
    assert.match(text, /StaticText "\[key …4567\]"/);
  }
  // A short hex run, or one inside a longer word, is not a key by itself.
  const short = '- heading "API keys"\n- StaticText "commit 0123abcd and x0123456789abcdef0123456789abcdef0"';
  assert.deepEqual(maskKeys(short), { text: short, found: 0 });
});

test('on a key page a long text box value is hidden, with its text copy; elsewhere a lowercase value stays', () => {
  const snapshot = '- heading "API tokens" [level=1, ref=e1]\n- textbox [ref=e2]: madeuptokenvalueforatest\n' +
    '  - StaticText "madeuptokenvalueforatest"\n- textbox "Name" [ref=e3]: assistant read-only key\n- textbox "Email" [ref=e4]: ada@example.com';
  const onKeyPage = maskKeys(snapshot, { url: 'https://www.figma.com/settings', title: 'Personal access tokens' });
  assert.equal(onKeyPage.found, 2);
  assert.match(onKeyPage.text, /textbox \[ref=e2\]: \[key …test\]\n {2}- StaticText "\[key …test\]"/);
  assert.match(onKeyPage.text, /ada@example\.com/);
  const profile = snapshot.replace('API tokens', 'Profile');
  assert.deepEqual(maskKeys(profile, { url: 'https://example.com/profile', title: 'Profile' }), { text: profile, found: 0 });
});

test('a key inside a longer one is hidden whole, and keys come longest first', () => {
  const short = 'sk_' + 'test_MADEUP0000aaaa1111';
  assert.deepEqual(findKeys(`${short} and ${short}EXTRA9999`), [`${short}EXTRA9999`, short]);
  assert.equal(maskKeys(`${short}EXTRA9999`).text, '[key …9999]');
});
