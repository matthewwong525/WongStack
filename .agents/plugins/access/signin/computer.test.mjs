import { expect, test } from 'vitest';
import { headers, signInHelp, tokenClaims } from './computer.mjs';

const ORIGIN = 'https://app.example.com';
const token = claims => `eyJ.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

test('sends the saved sign-in while it is valid or near its end, and nothing once it is missing or expired', () => {
  const read = state => () => ({ state, origin: ORIGIN, token: 'the-token' });
  expect(headers(ORIGIN, read('valid'))).toEqual({ 'cf-access-token': 'the-token' });
  expect(headers(ORIGIN, read('near'))).toEqual({ 'cf-access-token': 'the-token' });
  expect(headers(ORIGIN, read('expired'))).toBeNull();
  expect(headers(ORIGIN, read('missing'))).toBeNull();
});

test('reads a token\'s claims without verifying them, and a malformed token as none', () => {
  expect(tokenClaims(token({ sub: 'ana', email: 'ana@example.com' }))).toEqual({ sub: 'ana', email: 'ana@example.com' });
  expect(tokenClaims('not a token')).toBeNull();
  expect(signInHelp(ORIGIN)).toContain(`cloudflared access login ${ORIGIN}`);
});
