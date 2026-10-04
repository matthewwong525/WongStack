import test from 'node:test';
import assert from 'node:assert/strict';
import { ownerSetup } from '../employee-owner-setup.mjs';
test('consumes independently pinned owner activation with the existing private app transport', async () => {
  const calls = [];
  const identity = { subject: 'verified-owner', email: 'owner@example.com', origin: 'https://business.example.com' };
  const client = { ownerSetup: async action => { calls.push(action); return action === 'identity' ? identity : { code: 'owner_activated' }; } };
  assert.deepEqual(await ownerSetup(client, 'identity'), identity);
  assert.deepEqual(await ownerSetup(client, 'activate'), { code: 'owner_activated' });
  assert.deepEqual(calls, ['identity', 'identity', 'activate']);
  for (const value of [{}, { subject: 'owner' }, { subject: 'owner', email: 'owner@example.com' }]) {
    await assert.rejects(ownerSetup({ ownerSetup: async () => value }, 'activate'), /identity unavailable/);
  }
});
