import { expect, test } from 'vitest';
import { everyKey, heldLevels, holds, keyIds, keyTitle, levelName, madeBySetup, offered, registered, saved } from './levels.mjs';

const keys = {
  stripe: { title: 'Stripe', purpose: 'Payments', secrets: ['STRIPE_SECRET_KEY'] },
  bank: { title: 'Bank', purpose: 'Banking', secrets: ['BANK_ID', 'BANK_SECRET'] },
  cloudflare: { title: 'Cloudflare', purpose: 'Hosting', secrets: ['WONG_CLOUDFLARE_READ'], levels: ['read'], setup: true },
};

test('reads titles, offered levels and who makes a key from the registry', () => {
  expect(keyIds(keys)).toEqual(['stripe', 'bank', 'cloudflare']);
  expect([registered(keys, 'stripe'), registered(keys, 'unknown'), registered(keys, 'constructor')]).toEqual([true, false, false]);
  expect(keyTitle(keys, 'bank')).toBe('Bank');
  expect(offered(keys, 'stripe')).toEqual(['read', 'write']);
  expect(offered(keys, 'cloudflare')).toEqual(['read']);
  expect([madeBySetup(keys, 'cloudflare'), madeBySetup(keys, 'stripe')]).toEqual([true, false]);
  expect([levelName('read'), levelName('write')]).toEqual(['Read', 'Read & write']);
});

test('lets Read look up, Read & write also change, and no level do neither', () => {
  expect([holds('read', 'read'), holds('write', 'read'), holds('write', 'write')]).toEqual([true, true, true]);
  expect([holds('read', 'write'), holds(undefined, 'read'), holds(undefined, 'write')]).toEqual([false, false, false]);
});

test('gives the owner every key at its highest level and reads stored levels as they count now', () => {
  expect(everyKey(keys)).toEqual(new Map([['stripe', 'write'], ['bank', 'write'], ['cloudflare', 'read']]));
  // A key no longer registered is ignored; Read & write on a key that offers only Read reads as Read.
  expect(heldLevels(keys, { stripe: 'read', retired: 'write', cloudflare: 'write', bank: 'write' }))
    .toEqual(new Map([['stripe', 'read'], ['cloudflare', 'read'], ['bank', 'write']]));
  expect(heldLevels(keys, {})).toEqual(new Map());
});

test('calls a key saved when every secret is a non-empty string, or as the project says', () => {
  const secret = name => ({ STRIPE_SECRET_KEY: 'value', BANK_ID: 'id', BANK_SECRET: '' })[name];
  expect([saved(keys, secret, 'stripe'), saved(keys, secret, 'bank'), saved(keys, secret, 'unknown')]).toEqual([true, false, false]);
  expect(saved({ code: { title: 'Code', purpose: 'Code', secrets: ['NONE'], saved: true } }, () => undefined, 'code')).toBe(true);
});
