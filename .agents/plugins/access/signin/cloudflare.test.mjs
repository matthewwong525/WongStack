import { expect, test } from 'vitest';
import { callerOf, machineOf, personOf } from './cloudflare.mjs';

const claims = { email: 'Ana@Example.com', sub: 'ana-subject', iss: 'https://team.cloudflareaccess.com', aud: 'app', exp: 9999999999 };
const person = { kind: 'user', id: 'ana@example.com', claims };
const machine = { kind: 'service', id: 'checker.access', claims: { common_name: 'checker.access', sub: '', exp: 9999999999 } };

test('reads a verified person, a machine, or nobody, and a sign-in that is neither is a caller with no name', () => {
  expect(callerOf(person)).toEqual({ email: 'ana@example.com', subject: 'ana-subject' });
  expect(callerOf(machine)).toEqual({ machine: 'checker.access' });
  expect(callerOf(null)).toBeNull();
  for (const odd of [{ ...person, claims: { ...claims, sub: '' } }, { ...person, claims: { ...claims, exp: 1 } },
    { ...person, claims: { ...claims, nbf: 9999999999 } }, { ...person, claims: { ...claims, email: 'bo@example.com' } },
    { ...machine, id: 'another.access' }, { ...machine, claims: { ...machine.claims, email: 'ana@example.com' } }]) {
    expect(callerOf(odd)).toEqual({ machine: '' });
  }
});

test('never takes a machine for a person, or a person for a machine', () => {
  expect(personOf(machine)).toBeNull();
  expect(personOf({ ...person, claims: { ...claims, common_name: 'machine' } })).toBeNull();
  expect(machineOf(person)).toBeNull();
  expect(machineOf(null)).toBeNull();
});
