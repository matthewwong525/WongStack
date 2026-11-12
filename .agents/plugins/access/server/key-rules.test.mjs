import { expect, test } from 'vitest';
import { address, forwardProblem, keyProblems, undescribed } from './key-rules.mjs';

const notion = { title: 'Notion', purpose: 'Team notes', docs: 'https://developers.notion.com/reference', secrets: ['NOTION_TOKEN'],
  forward: { base: 'https://api.notion.example/v1/', secret: 'NOTION_TOKEN', header: 'Authorization', prefix: 'Bearer ', lookups: ['POST search', 'POST databases/*/query'] } };
const wrong = change => forwardProblem('notion', notion, { ...notion.forward, ...change });

test('a clean direct-use setup breaks no rule, nor does a public service with no key', () => {
  expect(wrong({})).toBeNull();
  expect(wrong({ base: 'https://ledger.example/', lookups: undefined })).toBeNull();
  expect(forwardProblem('open', { purpose: 'Public', docs: 'https://open.example/docs', secrets: [] }, { base: 'https://open.example/' })).toBeNull();
  // A key with no secrets names no secret, header or prefix.
  for (const change of [{ secret: 'DOCS_TOKEN' }, { header: 'Authorization' }, { prefix: 'Bearer ' }]) {
    expect(forwardProblem('docs', { secrets: [] }, { base: 'https://docs.example/', ...change }), JSON.stringify(change)).toBe('a key with no secrets names no secret, header or prefix');
  }
});

test('names the first rule a direct-use setup breaks', () => {
  for (const base of ['http://api.notion.example/v1/', 'https://api.notion.example/v1', 'https://api.notion.example', 'https://api.notion.example/v1/?x=1',
    'https://user@api.notion.example/', 'https://[/', 'https://api.notion.example/a%2Fb/', '//api.notion.example/', 'not an address']) {
    expect(wrong({ base }), base).toBe('base must be an HTTPS address ending in /');
  }
  expect(wrong({ secret: 'STRIPE_SECRET_KEY' })).toBe("secret must be one of the key's own secrets");
  for (const header of ['', 'X Api Key', 'X-Key: value']) expect(wrong({ header }), header).toBe('header must be one request header name');
  for (const entry of ['search', 'post search', 'FETCH search', 'POST', 'POST /search', 'POST ../admin', 'POST databases/../../admin', 'POST search?x=1', 'POST a//b', 'POST search more']) {
    expect(wrong({ lookups: ['POST search', entry] }), entry).toBe(`the look-up "${entry}" must be METHOD path, with a path that stays under base`);
  }
  for (const kind of [{ setup: true }, { alone: true }]) {
    expect(forwardProblem('notion', { ...notion, ...kind }, notion.forward)).toBe("a key setup makes, or the Worker's own route uses, takes no forward");
  }
  expect(forwardProblem('Notion_Key', notion, notion.forward)).toBe('a key used directly needs an id in lowercase letters, digits and hyphens');
});

test('a key that trades an ID and a secret for a token names both, on its own HTTPS host', () => {
  const shop = (forward, secrets = ['SHOP_KEY', 'SHOP_KEY_ID']) => keyProblems({ shop: { purpose: 'Store orders', docs: 'https://shop.example/docs', secrets,
    forward: { base: 'https://shop.example/admin/', secret: 'SHOP_KEY', header: 'X-Shop-Token', ...forward } } });
  const token = 'https://shop.example/admin/oauth/access_token';
  expect(shop({ exchange: { url: token } })).toEqual([]);
  expect(shop({ exchange: { url: token } }, ['SHOP_KEY'])).toEqual(["shop: a token address needs the ID's secret too: the secret's name and _ID"]);
  for (const url of ['http://shop.example/token', 'https://other.example/token', 'https://user:pass@shop.example/token', 'not an address']) {
    expect(shop({ exchange: { url } })).toEqual([`shop: the token address ${url} must be HTTPS on base's own host`]);
  }
});

test('every key says what it is for, and a key used directly links its API guide', () => {
  expect(keyProblems({ notion: { purpose: 'Team notes', docs: 'https://developers.notion.example/', secrets: ['NOTION_TOKEN'],
    forward: { base: 'http://api.notion.example/', secret: 'NOTION_TOKEN', header: 'Authorization' } } })).toEqual(['notion: base must be an HTTPS address ending in /']);
  expect(keyProblems({ stripe: { purpose: 'Payments', secrets: ['STRIPE_SECRET_KEY'] } })).toEqual([]);
  expect(undescribed({ stripe: {}, blank: { purpose: ' ' }, long: { purpose: 'x'.repeat(81) }, two: { purpose: 'a\nb' } })).toEqual([
    'stripe: needs a purpose of one line, at most 80 characters', 'blank: needs a purpose of one line, at most 80 characters',
    'long: needs a purpose of one line, at most 80 characters', 'two: needs a purpose of one line, at most 80 characters']);
  expect(undescribed({ notion: { purpose: 'Team notes', forward: {} } })).toEqual(["notion: a key used directly needs docs, the service's API guide"]);
  expect(undescribed({ notion: { purpose: 'Team notes', forward: {}, docs: 'http://developers.notion.com' } })).toEqual(['notion: docs must be an HTTPS address']);
  expect(undescribed({ notion: { purpose: 'Team notes', forward: {}, docs: 'https://developers.notion.com/reference' } })).toEqual([]);
});

test('an address stays under the service base, with the query set', () => {
  expect(String(address(notion.forward, 'pages/abc', 'a=1'))).toBe('https://api.notion.example/v1/pages/abc?a=1');
  for (const path of ['/pages', '//evil.example/x', 'https://evil.example/x', 'http:[x', '..', 'pages/../../v2', 'pages//x', '%2e%2e/v2', 'pages?x=1', 'pages x']) {
    expect(address(notion.forward, path), path).toBeNull();
  }
});
